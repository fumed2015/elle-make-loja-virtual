import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MP_API = "https://api.mercadopago.com";

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Map Mercado Pago status to our order status */
function mapMpStatusToOrderStatus(mpStatus: string): string {
  switch (mpStatus) {
    case "approved": return "confirmed";
    case "in_process": case "pending": case "authorized": return "pending";
    case "rejected": case "cancelled": return "cancelled";
    case "refunded": case "charged_back": return "cancelled";
    default: return "pending";
  }
}

/** Validate the declared total against real product prices in DB */
async function validateOrderTotal(
  supabaseAdmin: any,
  orderId: string,
  declaredAmount: number
) {
  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("items, discount, payment_method, shipping_address")
    .eq("id", orderId)
    .single();

  if (error || !order) {
    console.error("Order lookup failed:", error);
    return { valid: false, reason: "Pedido não encontrado" };
  }

  const items = order.items as any[];
  const productIds = items.map((i: any) => i.product_id).filter(Boolean);

  const { data: products } = await supabaseAdmin
    .from("products")
    .select("id, price")
    .in("id", productIds);

  if (!products) return { valid: false, reason: "Produtos não encontrados" };

  let calculatedSubtotal = 0;
  for (const item of items) {
    const dbProduct = products.find((p: any) => p.id === item.product_id);
    if (!dbProduct) return { valid: false, reason: `Produto ${item.product_id} não encontrado` };
    calculatedSubtotal += Number(dbProduct.price) * item.quantity;
  }

  const discount = Number(order.discount) || 0;
  const afterDiscount = Math.max(0, calculatedSubtotal - discount);

  const isPix = order.payment_method === "pix";
  const afterPix = isPix ? afterDiscount * 0.95 : afterDiscount;

  const minExpected = Math.floor(afterPix * 100) / 100 - 0.01;
  const maxExpected = afterPix + 500;

  if (declaredAmount < minExpected) {
    console.error(`Total mismatch: declared=${declaredAmount}, min=${minExpected}`);
    return { valid: false, reason: `Total do pedido não confere (esperado mín R$${minExpected.toFixed(2)})` };
  }
  if (declaredAmount > maxExpected) {
    console.error(`Total suspiciously high: declared=${declaredAmount}, max=${maxExpected}`);
    return { valid: false, reason: "Total do pedido suspeito" };
  }

  return { valid: true };
}

/** Build the webhook notification URL for this edge function */
function getNotificationUrl(): string {
  const projectId = Deno.env.get("SUPABASE_URL")?.match(/https:\/\/([^.]+)/)?.[1] || "";
  return `https://${projectId}.supabase.co/functions/v1/mercadopago-payment`;
}

/** Verify Mercado Pago webhook HMAC signature */
async function verifyWebhookSignature(req: Request, body: string): Promise<boolean> {
  const secret = Deno.env.get("MERCADO_PAGO_WEBHOOK_SECRET");
  if (!secret) {
    console.warn("MERCADO_PAGO_WEBHOOK_SECRET not set, skipping signature verification");
    return true; // Allow if secret not configured (backwards compat)
  }

  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");

  if (!xSignature || !xRequestId) {
    console.warn("Missing x-signature or x-request-id headers");
    return false;
  }

  // Parse x-signature: "ts=...,v1=..."
  const parts: Record<string, string> = {};
  for (const part of xSignature.split(",")) {
    const [key, val] = part.split("=", 2);
    if (key && val) parts[key.trim()] = val.trim();
  }

  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) {
    console.warn("Invalid x-signature format");
    return false;
  }

  // Extract data.id from query params
  const url = new URL(req.url);
  const dataId = url.searchParams.get("data.id") || "";

  // Build the manifest string as per MP docs
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

  // HMAC-SHA256
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(manifest));
  const hex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (hex !== v1) {
    console.error("Webhook signature mismatch");
    return false;
  }

  console.log("Webhook signature verified successfully");
  return true;
}

/** Handle Mercado Pago webhook/IPN notifications */
async function handleWebhook(req: Request, rawBody: string, accessToken: string) {
  const url = new URL(req.url);
  const topic = url.searchParams.get("topic") || url.searchParams.get("type");
  
  let paymentId: string | null = null;
  let parsedBody: any = null;

  try {
    parsedBody = JSON.parse(rawBody);
  } catch { /* no body */ }

  if (topic === "payment" || topic === "payment.updated" || topic === "payment.created") {
    paymentId = url.searchParams.get("id") || url.searchParams.get("data.id");
    if (!paymentId && parsedBody?.data?.id) {
      paymentId = String(parsedBody.data.id);
    }
  } else {
    if (parsedBody?.type === "payment" && parsedBody?.data?.id) {
      paymentId = String(parsedBody.data.id);
    }
  }

  if (!paymentId) {
    console.log("Webhook received but no payment ID found. Topic:", topic);
    return jsonResponse({ received: true });
  }

  console.log(`Webhook: processing payment ${paymentId}`);

  // Fetch payment details from MP
  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!res.ok) {
    console.error(`Failed to fetch payment ${paymentId}: ${res.status}`);
    return jsonResponse({ error: "Failed to fetch payment" }, 500);
  }

  const paymentData = await res.json();
  const mpStatus = paymentData.status;
  const externalReference = paymentData.external_reference;
  const orderStatus = mapMpStatusToOrderStatus(mpStatus);

  console.log(`Payment ${paymentId}: MP status=${mpStatus}, order status=${orderStatus}, order=${externalReference}`);

  if (!externalReference) {
    console.log("No external_reference, skipping order update");
    return jsonResponse({ received: true, status: mpStatus });
  }

  // Update order status using service role
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const { error: updateError } = await supabaseAdmin
    .from("orders")
    .update({
      status: orderStatus,
      notes: `MP Payment #${paymentId} - ${mpStatus} (${paymentData.status_detail || ""})`,
    })
    .eq("id", externalReference);

  if (updateError) {
    console.error("Order update error:", updateError);
    return jsonResponse({ error: "Failed to update order" }, 500);
  }

  console.log(`Order ${externalReference} updated to ${orderStatus}`);

  // ─── Meta CAPI: Send Purchase event server-side ───────────────
  if (mpStatus === "approved") {
    try {
      // Get order details for the event
      const { data: orderData } = await supabaseAdmin
        .from("orders")
        .select("id, total, items, user_id, shipping_address")
        .eq("id", externalReference)
        .single();

      if (orderData) {
        const items = (orderData.items as any[]) || [];
        const contentIds = items.map((i: any) => i.product_id).filter(Boolean);
        const contents = items.map((i: any) => ({ id: i.product_id, quantity: i.quantity || 1 }));
        const addr = (orderData.shipping_address as any) || {};

        // Get user profile for PII
        let profileData: any = null;
        if (orderData.user_id) {
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("phone, full_name, cpf, address, birthday")
            .eq("user_id", orderData.user_id)
            .maybeSingle();
          profileData = profile;
        }

        const payer = paymentData.payer || {};
        const nameParts = (profileData?.full_name || payer.first_name || "").split(" ");

        const capiEvent = {
          event_name: "Purchase",
          event_id: `purchase_${externalReference}`,
          event_time: Math.floor(Date.now() / 1000),
          action_source: "website",
          event_source_url: "https://ellemake2.lovable.app/checkout",
          user_data: {
            email: payer.email || "",
            phone: payer.phone?.number ? `${payer.phone.area_code || ""}${payer.phone.number}` : (profileData?.phone || ""),
            first_name: payer.first_name || nameParts[0] || "",
            last_name: payer.last_name || nameParts.slice(1).join(" ") || "",
            external_id: orderData.user_id || "",
            country: "br",
            state: addr.state || "",
            city: addr.city || "",
            zip: addr.zip || addr.cep || "",
          },
          custom_data: {
            content_ids: contentIds,
            content_type: "product",
            value: orderData.total,
            currency: "BRL",
            num_items: items.length,
            contents: contents,
            order_id: externalReference,
            delivery_category: "home_delivery",
          },
        };

        const capiRes = await fetch(
          `${supabaseUrl}/functions/v1/meta-capi`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ events: [capiEvent] }),
          }
        );
        console.log("Meta CAPI Purchase event sent:", capiRes.status);
      }
    } catch (capiErr) {
      console.error("Meta CAPI error (non-blocking):", capiErr);
    }
  }

  // Trigger WhatsApp notification via whatsapp-notifications function
  const eventMap: Record<string, string> = {
    approved: "order.paid",
    rejected: "order.cancelled",
    cancelled: "order.cancelled",
    refunded: "order.cancelled",
  };
  const notifEvent = eventMap[mpStatus];
  if (notifEvent) {
    try {
      const notifRes = await fetch(
        `${supabaseUrl}/functions/v1/whatsapp-notifications`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            action: "notify-order",
            order_id: externalReference,
            event_type: notifEvent,
          }),
        }
      );
      console.log("WhatsApp notification triggered:", notifRes.status);
    } catch (notifErr) {
      console.error("WhatsApp notification error:", notifErr);
    }
  }

  return jsonResponse({ received: true, order_status: orderStatus });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const ACCESS_TOKEN = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
  if (!ACCESS_TOKEN) {
    return jsonResponse({ error: "MERCADO_PAGO_ACCESS_TOKEN not configured" }, 500);
  }

  // Handle webhook notifications (POST from MP without auth header, or GET with query params)
  const url = new URL(req.url);
  const hasWebhookParams = url.searchParams.has("topic") || url.searchParams.has("type") || url.searchParams.has("data.id");
  const authHeader = req.headers.get("Authorization");
  const isWebhook = hasWebhookParams || (req.method === "POST" && !authHeader);

  if (isWebhook && !authHeader) {
    const rawBody = await req.text();
    
    // Verify webhook signature
    const isValid = await verifyWebhookSignature(req, rawBody);
    if (!isValid) {
      console.error("Webhook signature verification failed");
      return jsonResponse({ error: "Invalid signature" }, 403);
    }
    
    return await handleWebhook(req, rawBody, ACCESS_TOKEN);
  }

  try {
    const body = await req.json();
    const { action } = body;

    // Check if body looks like a webhook payload (has type + data.id)
    if (!action && body?.type && body?.data?.id) {
      const rawBody = JSON.stringify(body);
      const isValid = await verifyWebhookSignature(req, rawBody);
      if (!isValid) {
        return jsonResponse({ error: "Invalid signature" }, 403);
      }
      return await handleWebhook(req, rawBody, ACCESS_TOKEN);
    }

    // Public key doesn't need auth
    if (action === "get-public-key") {
      const publicKey = Deno.env.get("MERCADO_PAGO_PUBLIC_KEY");
      if (!publicKey) return jsonResponse({ error: "MERCADO_PAGO_PUBLIC_KEY not configured" }, 500);
      return jsonResponse({ public_key: publicKey });
    }

    // Status check doesn't need auth either (polling)
    if (action === "get-status") {
      return await getPaymentStatus(body, ACCESS_TOKEN);
    }

    // Payment creation requires authentication
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Não autenticado" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !authUser) {
      return jsonResponse({ error: "Token inválido" }, 401);
    }

    // Use service role for order validation
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Validate order total for payment actions
    if (body.external_reference && body.amount) {
      const validation = await validateOrderTotal(supabaseAdmin, body.external_reference, body.amount);
      if (!validation.valid) {
        return jsonResponse({ error: validation.reason }, 400);
      }
    }

    const notificationUrl = getNotificationUrl();

    if (action === "create-pix") {
      return await createPixPayment(body, ACCESS_TOKEN, notificationUrl);
    } else if (action === "create-card") {
      return await createCardPayment(body, ACCESS_TOKEN, notificationUrl);
    } else if (action === "create-boleto") {
      return await createBoletoPayment(body, ACCESS_TOKEN, notificationUrl);
    } else {
      return jsonResponse({ error: "Invalid action" }, 400);
    }
  } catch (err) {
    console.error("MercadoPago error:", err);
    return jsonResponse({ error: err.message || "Internal error" }, 500);
  }
});

async function createPixPayment(body: any, token: string, notificationUrl: string) {
  const { amount, description, payer_email, payer_cpf, payer_first_name, payer_last_name, external_reference } = body;
  const parsedAmount = Math.round(Number(amount) * 100) / 100;
  if (!parsedAmount || parsedAmount <= 0 || isNaN(parsedAmount)) {
    throw new Error("transaction_amount deve ser maior que zero");
  }
  const payload = {
    transaction_amount: parsedAmount,
    description: description || "Pedido Elle Make",
    payment_method_id: "pix",
    notification_url: notificationUrl,
    payer: {
      email: payer_email,
      first_name: payer_first_name || "Cliente",
      last_name: payer_last_name || "",
      identification: { type: "CPF", number: payer_cpf || "" },
    },
    external_reference: external_reference || "",
  };

  const res = await fetch(`${MP_API}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("MP PIX error:", JSON.stringify(data));
    throw new Error(data.message || `MP API error ${res.status}`);
  }

  return jsonResponse({
    id: data.id,
    status: data.status,
    qr_code: data.point_of_interaction?.transaction_data?.qr_code,
    qr_code_base64: data.point_of_interaction?.transaction_data?.qr_code_base64,
    ticket_url: data.point_of_interaction?.transaction_data?.ticket_url,
  });
}

async function createCardPayment(body: any, token: string, notificationUrl: string) {
  const {
    amount, description, token: cardToken, installments, payment_method_id,
    payer_email, payer_cpf, payer_first_name, payer_last_name, external_reference,
    issuer_id,
  } = body;

  const parsedAmount = Math.round(Number(amount) * 100) / 100;
  if (!parsedAmount || parsedAmount <= 0 || isNaN(parsedAmount)) {
    throw new Error("transaction_amount deve ser maior que zero");
  }
  const payload = {
    transaction_amount: parsedAmount,
    token: cardToken,
    description: description || "Pedido Elle Make",
    installments: Number(installments) || 1,
    payment_method_id,
    issuer_id: issuer_id || undefined,
    notification_url: notificationUrl,
    payer: {
      email: payer_email,
      first_name: payer_first_name || "Cliente",
      last_name: payer_last_name || "",
      identification: { type: "CPF", number: payer_cpf || "" },
    },
    external_reference: external_reference || "",
  };

  const res = await fetch(`${MP_API}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("MP Card error:", JSON.stringify(data));
    throw new Error(data.message || `MP API error ${res.status}`);
  }

  return jsonResponse({
    id: data.id,
    status: data.status,
    status_detail: data.status_detail,
  });
}

async function createBoletoPayment(body: any, token: string, notificationUrl: string) {
  const { amount, description, payer_email, payer_cpf, payer_first_name, payer_last_name, external_reference } = body;
  const parsedAmount = Math.round(Number(amount) * 100) / 100;
  if (!parsedAmount || parsedAmount <= 0 || isNaN(parsedAmount)) {
    throw new Error("transaction_amount deve ser maior que zero");
  }
  const payload = {
    transaction_amount: parsedAmount,
    description: description || "Pedido Elle Make",
    payment_method_id: "bolbradesco",
    notification_url: notificationUrl,
    payer: {
      email: payer_email,
      first_name: payer_first_name || "Cliente",
      last_name: payer_last_name || "",
      identification: { type: "CPF", number: payer_cpf || "" },
    },
    external_reference: external_reference || "",
  };

  const res = await fetch(`${MP_API}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("MP Boleto error:", JSON.stringify(data));
    throw new Error(data.message || `MP API error ${res.status}`);
  }

  return jsonResponse({
    id: data.id,
    status: data.status,
    barcode: data.barcode?.content,
    boleto_url: data.transaction_details?.external_resource_url,
  });
}

async function getPaymentStatus(body: any, token: string) {
  const { payment_id } = body;
  const res = await fetch(`${MP_API}/v1/payments/${payment_id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`MP API error ${res.status}`);

  return jsonResponse({ id: data.id, status: data.status, status_detail: data.status_detail });
}
