import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MERCHANT_NAME = "Elle Make";

// ===== Z-API WhatsApp Helper =====
async function sendWhatsApp(phone: string, message: string): Promise<any> {
  const instanceId = Deno.env.get("ZAPI_INSTANCE_ID");
  const token = Deno.env.get("ZAPI_TOKEN");
  const clientToken = Deno.env.get("ZAPI_CLIENT_TOKEN");

  if (!instanceId || !token) {
    console.error("Z-API credentials not configured");
    return { error: "Z-API not configured" };
  }

  let cleanPhone = phone.replace(/\D/g, "");
  if (!cleanPhone.startsWith("55")) cleanPhone = "55" + cleanPhone;

  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (clientToken) headers["Client-Token"] = clientToken;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ phone: cleanPhone, message }),
    });
    const data = await res.json();
    console.log(`Z-API response for ${cleanPhone}:`, JSON.stringify(data));
    return data;
  } catch (err) {
    console.error("Z-API send error:", err);
    return { error: String(err) };
  }
}

// ===== Message Templates =====
function buildMessageFromTemplate(template: string, data: Record<string, any>): string {
  return template
    .replace(/{first_name}/g, data.first_name || "Cliente")
    .replace(/{merchant}/g, MERCHANT_NAME)
    .replace(/{products_list}/g, data.products_list || "")
    .replace(/{total}/g, data.total || "0,00")
    .replace(/{tracking_code}/g, data.tracking_code || "N/A")
    .replace(/{tracking_url}/g, data.tracking_url || "")
    .replace(/{address}/g, data.address || "")
    .replace(/{payment_method}/g, data.payment_method || "")
    .replace(/{order_id}/g, data.order_id || "")
    .replace(/{items_count}/g, data.items_count || "0")
    .replace(/{link}/g, data.link || "https://ellemake2.lovable.app")
    .replace(/{days}/g, data.days || "30");
}

const PAYMENT_LABELS: Record<string, string> = {
  pix: "Pix",
  credit_card: "Cartão de Crédito",
  debit_card: "Cartão de Débito",
  whatsapp: "Combinar pelo WhatsApp",
  boleto: "Boleto Bancário",
};

const FALLBACK_TEMPLATES: Record<string, string> = {
  "order.created":
    `✨ *Novo Pedido Recebido!* ✨\n\nOi *{first_name}*! 💕\nSeu pedido na *{merchant}* foi confirmado com sucesso!\n\n` +
    `🆔 *Pedido #{order_id}*\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `🛍️ *Itens do pedido:*\n{products_list}\n\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `💰 *Total: R$ {total}*\n` +
    `📍 *Entrega:* {address}\n` +
    `💳 *Pagamento:* {payment_method}\n\n` +
    `Vamos preparar tudo com muito carinho! 💖\nAcompanhe seu pedido pelo nosso site 🔗`,

  "order.paid":
    `✅ *Pagamento Confirmado!* 🎉\n\nOi *{first_name}*!\n\n` +
    `🆔 *Pedido #{order_id}*\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `🛍️ *Seus itens:*\n{products_list}\n\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `💰 *Total: R$ {total}*\n\n` +
    `Recebemos seu pagamento! 💸\nEstamos preparando tudo com carinho para enviar o mais rápido possível! 📦✨`,

  "order.shipped.local":
    `🛵 *Pedido Saiu para Entrega!* 🎉\n\nOi *{first_name}*!\n\n` +
    `🆔 *Pedido #{order_id}*\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `🛍️ *Itens:*\n{products_list}\n\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `📍 *Entrega em:* {address}\n\n` +
    `Nosso motoboy já saiu com seu pedido! 🏍️💨\n` +
    `Fique de olho, ele chega rapidinho! 😍\n\n` +
    `Qualquer dúvida, estamos aqui! 💬`,

  "order.shipped.national":
    `📦 *Pedido Enviado pelos Correios!* 🚀\n\nOi *{first_name}*!\n\n` +
    `🆔 *Pedido #{order_id}*\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `🛍️ *Itens:*\n{products_list}\n\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `🔎 *Código de rastreio:*\n📋 *{tracking_code}*\n\n` +
    `📍 *Entrega em:* {address}\n\n` +
    `Acompanhe a entrega aqui: 🔗 {tracking_url}\n\n` +
    `Seus produtos estão a caminho! 🎁💕`,

  "order.delivered":
    `🎉 *Pedido Entregue!* 💖\n\nOi *{first_name}*!\n\n` +
    `🆔 *Pedido #{order_id}*\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `🛍️ *Itens:*\n{products_list}\n\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `Esperamos que você ame tudo! 😍\n\n` +
    `⭐ *Avalie seus produtos:* {link}\n` +
    `📸 Mostra pra gente! Marca *@ellemakebelem* no Instagram 🤳\n\n` +
    `Obrigada por comprar com a gente! 💕`,

  "order.cancelled":
    `😔 *Pedido Cancelado*\n\nOi *{first_name}*,\n\n` +
    `🆔 *Pedido #{order_id}*\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `Infelizmente seu pedido na *{merchant}* foi cancelado.\n\n` +
    `Se tiver alguma dúvida ou quiser fazer um novo pedido, estamos aqui! 💬\n\n` +
    `🔗 Visite nossa loja: {link}`,

  "birthday":
    `🎂 *Feliz Aniversário, {first_name}!* 🎉💖\n\n` +
    `A *{merchant}* deseja a você um dia maravilhoso! ✨\n\n` +
    `Para comemorar, preparamos algo especial pra você! 🎁\n\n` +
    `Acesse nossa loja e aproveite: 🔗 {link}\n\n` +
    `Parabéns! 🥳💕`,

  "repurchase.reminder":
    `💕 *Sentimos sua falta, {first_name}!*\n\n` +
    `Já faz {days} dias desde sua última compra na *{merchant}* 😢\n\n` +
    `Temos novidades incríveis esperando por você! ✨🛍️\n\n` +
    `Vem dar uma olhada: 🔗 {link}\n\n` +
    `Estamos aqui se precisar de algo! 💬`,
};

async function buildMessage(
  eventType: string,
  data: Record<string, any>,
  supabase: any
): Promise<string> {
  try {
    const { data: tmpl } = await supabase
      .from("message_templates")
      .select("template, is_active")
      .eq("event_type", eventType)
      .eq("is_active", true)
      .maybeSingle();

    if (tmpl?.template) {
      return buildMessageFromTemplate(tmpl.template, data);
    }
  } catch (e) {
    console.error("Error fetching template:", e);
  }

  const fallback =
    FALLBACK_TEMPLATES[eventType] ||
    `Oi {first_name}! Atualização do pedido na *{merchant}*: ${eventType}`;
  return buildMessageFromTemplate(fallback, data);
}

function formatProductsList(items: any[]): string {
  if (!items || items.length === 0) return "";
  return items
    .map((item: any) => {
      const name = item.name || item.product_name || "Produto";
      const qty = item.quantity || 1;
      const price = item.price || 0;
      const lineTotal = Number(price) * qty;
      return `  • ${name} (${qty}x) — R$ ${lineTotal.toFixed(2).replace(".", ",")}`;
    })
    .join("\n");
}

function formatAddress(addr: any): string {
  if (!addr) return "";
  const parts = [addr.street, addr.number].filter(Boolean).join(", ");
  const extra = [addr.neighborhood, addr.city].filter(Boolean).join(", ");
  return [parts, extra].filter(Boolean).join(" — ");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // --- Authentication check ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(authHeader.replace("Bearer ", ""));
  if (claimsError || !claimsData?.claims?.sub) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const callerUserId = claimsData.claims.sub as string;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const { action } = body;

    // ===== SEND NOTIFICATION FOR ORDER EVENT =====
    if (action === "notify-order") {
      const { order_id, event_type } = body;

      if (!order_id || !event_type) {
        return jsonResponse({ error: "order_id and event_type required" }, 400);
      }

      // Fetch order details
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .select("*")
        .eq("id", order_id)
        .single();

      if (orderErr || !order) {
        return jsonResponse({ error: "Order not found" }, 404);
      }

      // Fetch user profile for phone and name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("user_id", order.user_id)
        .maybeSingle();

      const phone = profile?.phone;
      if (!phone) {
        console.log(`No phone for user ${order.user_id}, skipping notification`);
        return jsonResponse({ sent: false, reason: "no_phone" });
      }

      const firstName = profile?.full_name?.split(" ")[0] || "Cliente";
      const items = (order.items as any[]) || [];
      const productsList = formatProductsList(items);
      const totalFormatted = Number(order.total).toFixed(2).replace(".", ",");

      const shippingAddr = order.shipping_address as any;
      const paymentLabel = PAYMENT_LABELS[order.payment_method] || order.payment_method || "";

      // Determine if local delivery (Belém metropolitan area) or national shipping
      const LOCAL_CITIES = ["belém", "belem", "ananindeua", "marituba", "benevides", "santa bárbara do pará", "santa barbara do para"];
      const shippingCity = (shippingAddr?.city || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const isLocalDelivery = LOCAL_CITIES.some(c => {
        const normalized = c.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return shippingCity.includes(normalized);
      });

      // For order.shipped, split into local vs national
      let resolvedEventType = event_type;
      if (event_type === "order.shipped") {
        resolvedEventType = isLocalDelivery ? "order.shipped.local" : "order.shipped.national";
      }

      const messageData = {
        first_name: firstName,
        order_id: order.id.slice(0, 8),
        products_list: productsList,
        total: totalFormatted,
        items_count: String(items.reduce((s: number, i: any) => s + (i.quantity || 1), 0)),
        address: formatAddress(shippingAddr),
        payment_method: paymentLabel,
        tracking_code: order.tracking_code || "",
        tracking_url: order.tracking_url || "",
        link: "https://ellemake2.lovable.app/pedidos",
      };

      const message = await buildMessage(resolvedEventType, messageData, supabase);
      const zapiResponse = await sendWhatsApp(phone, message);

      // Log notification
      await supabase.from("notifications").insert({
        event_type,
        phone,
        message,
        status: zapiResponse?.error ? "failed" : "sent",
        zapi_response: zapiResponse,
        order_id: order.id,
        user_id: order.user_id,
      });

      return jsonResponse({ sent: true, event_type });
    }

    // ===== SEND CUSTOM MESSAGE =====
    if (action === "send-custom") {
      const { phone, message } = body;
      if (!phone || !message) {
        return jsonResponse({ error: "phone and message required" }, 400);
      }
      const result = await sendWhatsApp(phone, message);
      return jsonResponse({ sent: !result?.error, result });
    }

    // ===== BIRTHDAY NOTIFICATIONS =====
    if (action === "birthday-notify") {
      const today = new Date();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");

      const { data: birthdayProfiles, error: bErr } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, birthday")
        .not("phone", "is", null)
        .not("birthday", "is", null);

      if (bErr) return jsonResponse({ error: bErr.message }, 500);

      const matches = (birthdayProfiles || []).filter((p: any) => {
        if (!p.birthday) return false;
        const bday = String(p.birthday);
        return bday.slice(5, 10) === `${mm}-${dd}`;
      });

      if (matches.length === 0) {
        return jsonResponse({ sent: 0, message: "Nenhum aniversariante hoje" });
      }

      const customMessage = body.custom_message || null;
      let sentCount = 0;

      for (const profile of matches) {
        const firstName = profile.full_name?.split(" ")[0] || "Cliente";
        const data = { first_name: firstName, merchant: MERCHANT_NAME, link: "https://ellemake2.lovable.app" };

        let msg: string;
        if (customMessage) {
          msg = buildMessageFromTemplate(customMessage, data);
        } else {
          msg = await buildMessage("birthday", data, supabase);
        }

        const result = await sendWhatsApp(profile.phone, msg);

        await supabase.from("notifications").insert({
          event_type: "birthday",
          phone: profile.phone,
          message: msg,
          status: result?.error ? "failed" : "sent",
          zapi_response: result,
          user_id: profile.user_id,
        });

        if (!result?.error) sentCount++;
      }

      return jsonResponse({ sent: sentCount, total: matches.length });
    }

    // ===== REPURCHASE REMINDER =====
    if (action === "repurchase-reminder") {
      const daysThreshold = body.days || 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);

      // Get all users with orders
      const { data: allOrders } = await supabase
        .from("orders")
        .select("user_id, created_at, status")
        .not("status", "in", "(cancelled,refunded)")
        .order("created_at", { ascending: false });

      if (!allOrders || allOrders.length === 0) {
        return jsonResponse({ sent: 0, message: "Nenhum pedido encontrado" });
      }

      // Group by user_id, get last order date
      const lastOrderByUser: Record<string, string> = {};
      for (const o of allOrders) {
        if (!lastOrderByUser[o.user_id]) {
          lastOrderByUser[o.user_id] = o.created_at;
        }
      }

      // Filter users whose last order is older than threshold
      const inactiveUserIds = Object.entries(lastOrderByUser)
        .filter(([_, date]) => new Date(date) < cutoffDate)
        .map(([uid]) => uid);

      if (inactiveUserIds.length === 0) {
        return jsonResponse({ sent: 0, message: `Nenhum cliente inativo há ${daysThreshold}+ dias` });
      }

      // Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .not("phone", "is", null)
        .in("user_id", inactiveUserIds.slice(0, 500));

      const customMessage = body.custom_message || null;
      let sentCount = 0;

      for (const profile of (profiles || [])) {
        const firstName = profile.full_name?.split(" ")[0] || "Cliente";
        const data = { first_name: firstName, merchant: MERCHANT_NAME, link: "https://ellemake2.lovable.app", days: String(daysThreshold) };

        let msg: string;
        if (customMessage) {
          msg = buildMessageFromTemplate(customMessage, data);
        } else {
          msg = await buildMessage("repurchase.reminder", data, supabase);
        }

        const result = await sendWhatsApp(profile.phone, msg);

        await supabase.from("notifications").insert({
          event_type: "repurchase.reminder",
          phone: profile.phone,
          message: msg,
          status: result?.error ? "failed" : "sent",
          zapi_response: result,
          user_id: profile.user_id,
        });

        if (!result?.error) sentCount++;
      }

      return jsonResponse({ sent: sentCount, total: profiles?.length || 0 });
    }

    // ===== MASS CAMPAIGN =====
    if (action === "mass-campaign") {
      const { message: campaignMessage, filter } = body;

      if (!campaignMessage) {
        return jsonResponse({ error: "message is required" }, 400);
      }

      // Build query for profiles with phone
      let query = supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .not("phone", "is", null);

      // Optional filters
      if (filter === "buyers") {
        const { data: buyerOrders } = await supabase
          .from("orders")
          .select("user_id")
          .not("status", "in", "(cancelled,refunded)");
        const buyerIds = [...new Set((buyerOrders || []).map((o: any) => o.user_id))];
        if (buyerIds.length > 0) {
          query = query.in("user_id", buyerIds);
        } else {
          return jsonResponse({ sent: 0, message: "Nenhum comprador encontrado" });
        }
      }

      const { data: targets, error: tErr } = await query.limit(1000);
      if (tErr) return jsonResponse({ error: tErr.message }, 500);

      let sentCount = 0;
      for (const profile of (targets || [])) {
        const firstName = profile.full_name?.split(" ")[0] || "Cliente";
        const msg = buildMessageFromTemplate(campaignMessage, {
          first_name: firstName,
          merchant: MERCHANT_NAME,
          link: "https://ellemake2.lovable.app",
        });

        const result = await sendWhatsApp(profile.phone, msg);

        await supabase.from("notifications").insert({
          event_type: "mass.campaign",
          phone: profile.phone,
          message: msg,
          status: result?.error ? "failed" : "sent",
          zapi_response: result,
          user_id: profile.user_id,
        });

        if (!result?.error) sentCount++;
      }

      return jsonResponse({ sent: sentCount, total: targets?.length || 0 });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (err: any) {
    console.error("WhatsApp notification error:", err);
    return jsonResponse({ error: err.message }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
