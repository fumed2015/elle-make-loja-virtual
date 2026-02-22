import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SITE_URL = "https://ellemake2.lovable.app";
const MERCHANT_NAME = "Elle Make";

// ── Fallback templates ──
const FALLBACK_TEMPLATES: Record<string, string> = {
  "cart.recovery.first":
    `💄 Oi {first_name}! Notamos que você deixou {items_count} {items_label} no carrinho da *{merchant}*!\n\n💰 Total: R$ {total}\n\n🛒 Finalize sua compra: {recovery_link}\n\nEstamos aqui se precisar de ajuda! 💕`,
  "cart.recovery.second":
    `✨ {first_name}, seus produtos ainda estão esperando por você na *{merchant}*! 💖\n\n🛒 {items_count} {items_label} · R$ {total}\n\nAproveite antes que acabe: {recovery_link}\n\nDúvidas? Fale conosco! 😊`,
  "pix.reminder":
    `⏳ Oi {first_name}! Seu PIX de *R$ {total}* na *{merchant}* ainda está pendente!\n\n{products_list}\n\n💡 Acesse o app para copiar o código PIX novamente:\n{link}\n\nO PIX expira em breve. Não perca! 💕`,
};

// ── Load template from DB with fallback ──
async function loadTemplate(supabase: any, eventType: string): Promise<string> {
  const { data } = await supabase
    .from("message_templates")
    .select("template, is_active")
    .eq("event_type", eventType)
    .maybeSingle();

  if (data?.is_active && data?.template) return data.template;
  return FALLBACK_TEMPLATES[eventType] || "";
}

// ── Replace variables in template ──
function fillTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

// ── Z-API helper ──
async function sendWhatsApp(phone: string, message: string): Promise<any> {
  const instanceId = Deno.env.get("ZAPI_INSTANCE_ID");
  const token = Deno.env.get("ZAPI_TOKEN");
  const clientToken = Deno.env.get("ZAPI_CLIENT_TOKEN");
  if (!instanceId || !token) return { error: "Z-API not configured" };

  let cleanPhone = phone.replace(/\D/g, "");
  if (!cleanPhone.startsWith("55")) cleanPhone = "55" + cleanPhone;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (clientToken) headers["Client-Token"] = clientToken;

  try {
    const res = await fetch(
      `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
      { method: "POST", headers, body: JSON.stringify({ phone: cleanPhone, message }) }
    );
    return await res.json();
  } catch (err) {
    console.error("Z-API error:", err);
    return { error: String(err) };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const { action } = body;

    // ══════════════════════════════════════════════════════════
    // ACTION: process-abandonments
    // ══════════════════════════════════════════════════════════
    if (action === "process-abandonments") {
      const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const maxAge = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

      const { data: events, error } = await supabase
        .from("cart_abandonment_events")
        .select("*")
        .is("recovered_at", null)
        .lt("notification_count", 2)
        .lt("created_at", cutoff)
        .gt("created_at", maxAge)
        .order("created_at", { ascending: true })
        .limit(20);

      if (error) return jsonResponse({ error: error.message }, 500);
      if (!events || events.length === 0) return jsonResponse({ processed: 0, message: "No carts to recover" });

      // Pre-load both templates
      const tmplFirst = await loadTemplate(supabase, "cart.recovery.first");
      const tmplSecond = await loadTemplate(supabase, "cart.recovery.second");

      let sent = 0;
      for (const event of events) {
        let token = event.recovery_token;
        if (!token) {
          token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
          await supabase.from("cart_abandonment_events").update({ recovery_token: token }).eq("id", event.id);
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("user_id", event.user_id)
          .maybeSingle();

        if (!profile?.phone) {
          await supabase.from("cart_abandonment_events").update({ notification_count: 99 }).eq("id", event.id);
          continue;
        }

        const vars = {
          first_name: profile.full_name?.split(" ")[0] || "Cliente",
          merchant: MERCHANT_NAME,
          items_count: String(event.items_count),
          items_label: event.items_count === 1 ? "item" : "itens",
          total: Number(event.cart_total || 0).toFixed(2).replace(".", ","),
          recovery_link: `${SITE_URL}/recuperar-carrinho?token=${token}`,
        };

        const template = event.notification_count === 0 ? tmplFirst : tmplSecond;
        const message = fillTemplate(template, vars);

        const result = await sendWhatsApp(profile.phone, message);

        await supabase.from("cart_abandonment_events").update({
          notified_at: new Date().toISOString(),
          notification_count: (event.notification_count || 0) + 1,
        }).eq("id", event.id);

        await supabase.from("notifications").insert({
          event_type: "cart.abandoned",
          phone: profile.phone,
          message,
          status: result?.error ? "failed" : "sent",
          zapi_response: result,
          user_id: event.user_id,
        });

        sent++;
      }

      return jsonResponse({ processed: events.length, sent });
    }

    // ══════════════════════════════════════════════════════════
    // ACTION: process-pix-reminders
    // ══════════════════════════════════════════════════════════
    if (action === "process-pix-reminders") {
      const cutoff15 = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: orders, error } = await supabase
        .from("orders")
        .select("*")
        .eq("status", "pending")
        .eq("payment_method", "pix")
        .lt("created_at", cutoff15)
        .gt("created_at", cutoff24h)
        .order("created_at", { ascending: true })
        .limit(20);

      if (error || !orders || orders.length === 0) return jsonResponse({ processed: 0 });

      const orderIds = orders.map((o) => o.id);
      const { data: existingNotifs } = await supabase
        .from("notifications")
        .select("order_id")
        .in("order_id", orderIds)
        .eq("event_type", "pix.reminder");

      const alreadyNotified = new Set(existingNotifs?.map((n) => n.order_id) || []);
      const toNotify = orders.filter((o) => !alreadyNotified.has(o.id));

      const tmplPix = await loadTemplate(supabase, "pix.reminder");

      let sent = 0;
      for (const order of toNotify) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("user_id", order.user_id)
          .maybeSingle();

        if (!profile?.phone) continue;

        const items = (order.items as any[]) || [];
        const productsList = items.map((i: any) => `• ${i.name || "Produto"} (${i.quantity || 1}x)`).join("\n");

        const vars = {
          first_name: profile.full_name?.split(" ")[0] || "Cliente",
          merchant: MERCHANT_NAME,
          total: Number(order.total).toFixed(2).replace(".", ","),
          products_list: productsList,
          link: `${SITE_URL}/pedidos`,
        };

        const message = fillTemplate(tmplPix, vars);
        const result = await sendWhatsApp(profile.phone, message);

        await supabase.from("notifications").insert({
          event_type: "pix.reminder",
          phone: profile.phone,
          message,
          status: result?.error ? "failed" : "sent",
          zapi_response: result,
          order_id: order.id,
          user_id: order.user_id,
        });

        sent++;
      }

      return jsonResponse({ processed: toNotify.length, sent });
    }

    // ══════════════════════════════════════════════════════════
    // ACTION: resolve-recovery
    // ══════════════════════════════════════════════════════════
    if (action === "resolve-recovery") {
      const { token } = body;
      if (!token) return jsonResponse({ error: "token required" }, 400);

      const { data: event, error } = await supabase
        .from("cart_abandonment_events")
        .select("*")
        .eq("recovery_token", token)
        .is("recovered_at", null)
        .maybeSingle();

      if (error || !event) return jsonResponse({ error: "Invalid or expired token" }, 404);

      const { data: cartItems } = await supabase
        .from("cart_items")
        .select("*, products(id, name, slug, price, images)")
        .eq("user_id", event.user_id);

      await supabase
        .from("cart_abandonment_events")
        .update({ recovered_at: new Date().toISOString() })
        .eq("id", event.id);

      return jsonResponse({ recovered: true, user_id: event.user_id, items: cartItems || [] });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (err: any) {
    console.error("Cart recovery error:", err);
    return jsonResponse({ error: err.message }, 500);
  }
});
