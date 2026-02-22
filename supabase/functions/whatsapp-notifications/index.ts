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
    .replace(/{link}/g, data.link || "https://ellemake2.lovable.app");
}

const FALLBACK_TEMPLATES: Record<string, string> = {
  "order.created":
    "🛒 Oi {first_name}! Seu pedido na *{merchant}* foi recebido! 🎉\n\n{products_list}\n\n💰 Total: R$ {total}\n\nVamos te avisar! 💕",
  "order.paid":
    "✅ {first_name}, pagamento *confirmado*! 🎉\n\n{products_list}\n\nPreparando com carinho! 💖",
  "order.shipped":
    "📦 {first_name}, produtos *a caminho*! 🚚\n\n{products_list}\n\nRastreio: *{tracking_code}*\n{tracking_url}",
  "order.delivered":
    "🎉 {first_name}, pedido *entregue*! 💖\n\n{products_list}\n\nConta o que achou! ⭐",
  "order.cancelled":
    "❌ {first_name}, seu pedido na *{merchant}* foi cancelado.\n\nSe tiver dúvidas, fale conosco! 💬",
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
      return `• ${name} (${qty}x) — R$ ${Number(price).toFixed(2).replace(".", ",")}`;
    })
    .join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

      const messageData = {
        first_name: firstName,
        products_list: productsList,
        total: totalFormatted,
        tracking_code: order.tracking_code || "",
        tracking_url: order.tracking_url || "",
        link: "https://ellemake2.lovable.app/pedidos",
      };

      const message = await buildMessage(event_type, messageData, supabase);
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
