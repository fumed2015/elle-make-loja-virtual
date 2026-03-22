import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MERCHANT_NAME = "Elle Make";
const SITE_URL = "https://www.ellemake.com.br";

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
    .replace(/{link}/g, data.link || SITE_URL)
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
    `✨ *Pedido Confirmado!* ✨\n\n` +
    `Oi, *{first_name}*! Que alegria ter você com a gente 💖\n\n` +
    `Seu pedido *#{order_id}* foi recebido!\n\n` +
    `🛍️ *O que você pediu:*\n{products_list}\n\n` +
    `💰 *Total:* R$ {total}\n` +
    `💳 *Pagamento:* {payment_method}\n` +
    `📍 *Enviar para:* {address}\n\n` +
    `Já estamos preparando tudo com carinho pra você! 🎁\n` +
    `Acompanhe aqui: {link}/pedidos`,

  "order.paid":
    `✅ *Pagamento Aprovado!*\n\n` +
    `*{first_name}*, recebemos seu pagamento 🎉\n\n` +
    `Pedido *#{order_id}*\n` +
    `🛍️ {products_list}\n\n` +
    `💰 *Total:* R$ {total}\n\n` +
    `Agora é com a gente! Vamos embalar tudo com muito cuidado e enviar o mais rápido possível 📦💕`,

  "order.shipped.local":
    `🛵 *Saiu pra Entrega!*\n\n` +
    `*{first_name}*, seu pedido *#{order_id}* acabou de sair! 🏍️💨\n\n` +
    `🛍️ {products_list}\n\n` +
    `📍 *Destino:* {address}\n\n` +
    `Nosso entregador já está a caminho.\n` +
    `Fique de olho que chega rapidinho! 😍\n\n` +
    `Precisa de algo? Responda aqui mesmo 💬`,

  "order.shipped.national":
    `📦 *Pedido Enviado!*\n\n` +
    `*{first_name}*, seu pedido *#{order_id}* foi postado! 🚀\n\n` +
    `🛍️ {products_list}\n\n` +
    `📋 *Rastreio:* {tracking_code}\n` +
    `🔗 *Acompanhe:* {tracking_url}\n\n` +
    `📍 *Destino:* {address}\n\n` +
    `Seus produtinhos já estão viajando até você! ✈️💕`,

  "order.delivered":
    `🎉 *Entrega Realizada!*\n\n` +
    `*{first_name}*, seu pedido *#{order_id}* chegou! 💖\n\n` +
    `🛍️ {products_list}\n\n` +
    `Esperamos que você ame cada produto! 😍\n\n` +
    `📸 Mostra pra gente o resultado! Marca *@ellemakebelem* no Insta ✨\n\n` +
    `⭐ Avalie sua experiência: {link}/pedidos\n\n` +
    `Obrigada por escolher a Elle Make 💕`,

  "order.cancelled":
    `Oi, *{first_name}* 😔\n\n` +
    `Seu pedido *#{order_id}* foi cancelado.\n\n` +
    `Se houve algum problema, estamos aqui pra ajudar! Basta responder esta mensagem 💬\n\n` +
    `Se quiser refazer seu pedido:\n🔗 {link}\n\n` +
    `Esperamos te ver de volta em breve 💕`,

  "birthday":
    `🎂 *Parabéns, {first_name}!* 🎉\n\n` +
    `A *Elle Make* deseja um dia incrível pra você! ✨\n\n` +
    `Para celebrar, preparamos uma surpresa especial! 🎁\n\n` +
    `Acesse e aproveite:\n🔗 {link}\n\n` +
    `Feliz aniversário! 💖🥳`,

  "repurchase.reminder":
    `Oi, *{first_name}*! 💕\n\n` +
    `Faz {days} dias que você não aparece por aqui, e já temos saudade! 😢\n\n` +
    `A gente trouxe novidades que são a sua cara ✨\n\n` +
    `Vem ver o que chegou:\n🔗 {link}\n\n` +
    `Precisa de uma indicação? Responda aqui que ajudamos! 💬`,
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let callerUserId: string | null = null;

  // Try to authenticate if token provided
  if (authHeader?.startsWith("Bearer ")) {
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData } = await authClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    callerUserId = (claimsData?.claims?.sub as string) || null;
  }

  try {
    const body = await req.json();
    const { action } = body;

    // notify-order is allowed for guest checkout (validated by order existence)
    // All other actions require admin auth
    if (action !== "notify-order") {
      if (!callerUserId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: callerUserId, _role: "admin" });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden: admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ===== SEND NOTIFICATION FOR ORDER EVENT =====
    if (action === "notify-order") {
      const { order_id, event_type } = body;

      if (!order_id || !event_type) {
        return jsonResponse({ error: "order_id and event_type required" }, 400);
      }

      // ── DEDUP: check if this exact notification was already sent ──
      const { data: existingNotif } = await supabase
        .from("notifications")
        .select("id")
        .eq("order_id", order_id)
        .eq("event_type", event_type)
        .eq("status", "sent")
        .limit(1);

      if (existingNotif && existingNotif.length > 0) {
        console.log(`Notification ${event_type} already sent for order ${order_id}, skipping`);
        return jsonResponse({ sent: false, reason: "already_sent", event_type });
      }

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .select("*")
        .eq("id", order_id)
        .single();

      if (orderErr || !order) {
        return jsonResponse({ error: "Order not found" }, 404);
      }

      // Block notifications for cancelled/refunded orders (except the cancellation notification itself)
      if (["cancelled", "refunded"].includes(order.status) && event_type !== "order.cancelled") {
        console.log(`Order ${order_id} is ${order.status}, skipping ${event_type}`);
        return jsonResponse({ sent: false, reason: "order_cancelled", event_type });
      }

      // For guest orders (user_id is null), allow notify-order without ownership check
      // For authenticated orders, verify caller owns the order or is admin
      if (order.user_id) {
        const { data: isAdmin } = callerUserId
          ? await supabase.rpc("has_role", { _user_id: callerUserId, _role: "admin" })
          : { data: false };
        if (order.user_id !== callerUserId && !isAdmin) {
          return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

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

      // ── PER-PHONE DAILY LIMIT ──
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      let cleanPhone = phone.replace(/\D/g, "");
      if (!cleanPhone.startsWith("55")) cleanPhone = "55" + cleanPhone;

      const { data: todayCount } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("phone", cleanPhone)
        .eq("status", "sent")
        .gt("created_at", todayStart.toISOString());

      const MAX_PER_PHONE_PER_DAY = 5;
      if ((todayCount as any)?.length >= MAX_PER_PHONE_PER_DAY) {
        console.log(`Phone ${cleanPhone} hit daily limit, skipping ${event_type}`);
        return jsonResponse({ sent: false, reason: "daily_limit", event_type });
      }

      const firstName = profile?.full_name?.split(" ")[0] || "Cliente";
      const items = (order.items as any[]) || [];
      const productsList = formatProductsList(items);
      const totalFormatted = Number(order.total).toFixed(2).replace(".", ",");

      const shippingAddr = order.shipping_address as any;
      const paymentLabel = PAYMENT_LABELS[order.payment_method] || order.payment_method || "";

      const LOCAL_CITIES = ["belém", "belem", "ananindeua", "marituba", "benevides", "santa bárbara do pará", "santa barbara do para"];
      const shippingCity = (shippingAddr?.city || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const isLocalDelivery = LOCAL_CITIES.some(c => {
        const normalized = c.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return shippingCity.includes(normalized);
      });

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
        link: SITE_URL,
      };

      const message = await buildMessage(resolvedEventType, messageData, supabase);
      const zapiResponse = await sendWhatsApp(phone, message);

      await supabase.from("notifications").insert({
        event_type,
        phone: cleanPhone,
        message,
        status: zapiResponse?.error ? "failed" : "sent",
        zapi_response: zapiResponse,
        order_id: order.id,
        user_id: order.user_id,
      });

      // Mark cart abandonment events and checkout leads as recovered when order is paid/created
      if (order.user_id && ["order.paid", "order.created"].includes(event_type)) {
        await Promise.all([
          supabase
            .from("cart_abandonment_events")
            .update({ recovered_at: new Date().toISOString(), notification_count: 99 })
            .eq("user_id", order.user_id)
            .is("recovered_at", null),
          supabase
            .from("checkout_leads")
            .update({ converted_at: new Date().toISOString() })
            .eq("user_id", order.user_id)
            .is("converted_at", null),
        ]);
      }

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
        const data = { first_name: firstName, merchant: MERCHANT_NAME, link: SITE_URL };

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

      const { data: allOrders } = await supabase
        .from("orders")
        .select("user_id, created_at, status")
        .not("status", "in", "(cancelled,refunded)")
        .order("created_at", { ascending: false });

      if (!allOrders || allOrders.length === 0) {
        return jsonResponse({ sent: 0, message: "Nenhum pedido encontrado" });
      }

      const lastOrderByUser: Record<string, string> = {};
      for (const o of allOrders) {
        if (!lastOrderByUser[o.user_id]) {
          lastOrderByUser[o.user_id] = o.created_at;
        }
      }

      const inactiveUserIds = Object.entries(lastOrderByUser)
        .filter(([_, date]) => new Date(date) < cutoffDate)
        .map(([uid]) => uid);

      if (inactiveUserIds.length === 0) {
        return jsonResponse({ sent: 0, message: `Nenhum cliente inativo há ${daysThreshold}+ dias` });
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .not("phone", "is", null)
        .in("user_id", inactiveUserIds.slice(0, 500));

      const customMessage = body.custom_message || null;
      let sentCount = 0;

      for (const profile of (profiles || [])) {
        const firstName = profile.full_name?.split(" ")[0] || "Cliente";
        const data = { first_name: firstName, merchant: MERCHANT_NAME, link: SITE_URL, days: String(daysThreshold) };

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

      let query = supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .not("phone", "is", null);

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
          link: SITE_URL,
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
