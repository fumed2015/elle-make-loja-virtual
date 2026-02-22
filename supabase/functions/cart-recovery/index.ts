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
    // ACTION: process-abandonments (called by cron every 30min)
    // Finds carts abandoned 30+ min ago, sends WhatsApp recovery
    // ══════════════════════════════════════════════════════════
    if (action === "process-abandonments") {
      const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 min ago
      const maxAge = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(); // max 48h

      // Find unrecovered carts, not yet notified (or notified < 2 times)
      const { data: events, error } = await supabase
        .from("cart_abandonment_events")
        .select("*")
        .is("recovered_at", null)
        .lt("notification_count", 2)
        .lt("created_at", cutoff)
        .gt("created_at", maxAge)
        .order("created_at", { ascending: true })
        .limit(20);

      if (error) {
        console.error("Fetch abandoned carts error:", error);
        return jsonResponse({ error: error.message }, 500);
      }

      if (!events || events.length === 0) {
        return jsonResponse({ processed: 0, message: "No carts to recover" });
      }

      let sent = 0;
      for (const event of events) {
        // Generate recovery token if none
        let token = event.recovery_token;
        if (!token) {
          token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
          await supabase
            .from("cart_abandonment_events")
            .update({ recovery_token: token })
            .eq("id", event.id);
        }

        // Get user profile for phone + name
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("user_id", event.user_id)
          .maybeSingle();

        if (!profile?.phone) {
          // Mark as notified so we don't keep retrying
          await supabase
            .from("cart_abandonment_events")
            .update({ notification_count: 99 })
            .eq("id", event.id);
          continue;
        }

        const firstName = profile.full_name?.split(" ")[0] || "Cliente";
        const recoveryLink = `${SITE_URL}/recuperar-carrinho?token=${token}`;
        const total = Number(event.cart_total || 0).toFixed(2).replace(".", ",");

        // Choose message based on notification count
        let message: string;
        if (event.notification_count === 0) {
          message =
            `💄 Oi ${firstName}! Notamos que você deixou ${event.items_count} ${event.items_count === 1 ? "item" : "itens"} no carrinho da *${MERCHANT_NAME}*!\n\n` +
            `💰 Total: R$ ${total}\n\n` +
            `🛒 Finalize sua compra: ${recoveryLink}\n\n` +
            `Estamos aqui se precisar de ajuda! 💕`;
        } else {
          message =
            `✨ ${firstName}, seus produtos ainda estão esperando por você na *${MERCHANT_NAME}*! 💖\n\n` +
            `🛒 ${event.items_count} ${event.items_count === 1 ? "item" : "itens"} · R$ ${total}\n\n` +
            `Aproveite antes que acabe: ${recoveryLink}\n\n` +
            `Dúvidas? Fale conosco! 😊`;
        }

        const result = await sendWhatsApp(profile.phone, message);

        // Update event
        await supabase
          .from("cart_abandonment_events")
          .update({
            notified_at: new Date().toISOString(),
            notification_count: (event.notification_count || 0) + 1,
          })
          .eq("id", event.id);

        // Log notification
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
    // ACTION: process-pix-reminders (called by cron)
    // Finds orders with PIX pending for 15+ min, sends reminder
    // ══════════════════════════════════════════════════════════
    if (action === "process-pix-reminders") {
      const cutoff15 = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Find pending PIX orders
      const { data: orders, error } = await supabase
        .from("orders")
        .select("*")
        .eq("status", "pending")
        .eq("payment_method", "pix")
        .lt("created_at", cutoff15)
        .gt("created_at", cutoff24h)
        .order("created_at", { ascending: true })
        .limit(20);

      if (error || !orders || orders.length === 0) {
        return jsonResponse({ processed: 0 });
      }

      // Check which ones already got a reminder
      const orderIds = orders.map((o) => o.id);
      const { data: existingNotifs } = await supabase
        .from("notifications")
        .select("order_id")
        .in("order_id", orderIds)
        .eq("event_type", "pix.reminder");

      const alreadyNotified = new Set(existingNotifs?.map((n) => n.order_id) || []);
      const toNotify = orders.filter((o) => !alreadyNotified.has(o.id));

      let sent = 0;
      for (const order of toNotify) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("user_id", order.user_id)
          .maybeSingle();

        if (!profile?.phone) continue;

        const firstName = profile.full_name?.split(" ")[0] || "Cliente";
        const total = Number(order.total).toFixed(2).replace(".", ",");
        const items = (order.items as any[]) || [];
        const itemsList = items.map((i: any) => `• ${i.name || "Produto"} (${i.quantity || 1}x)`).join("\n");

        const message =
          `⏳ Oi ${firstName}! Seu PIX de *R$ ${total}* na *${MERCHANT_NAME}* ainda está pendente!\n\n` +
          `${itemsList}\n\n` +
          `💡 Acesse o app para copiar o código PIX novamente:\n${SITE_URL}/pedidos\n\n` +
          `O PIX expira em breve. Não perca! 💕`;

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
    // ACTION: resolve-recovery (mark cart as recovered)
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

      // Get user's cart items
      const { data: cartItems } = await supabase
        .from("cart_items")
        .select("*, products(id, name, slug, price, images)")
        .eq("user_id", event.user_id);

      // Mark as recovered
      await supabase
        .from("cart_abandonment_events")
        .update({ recovered_at: new Date().toISOString() })
        .eq("id", event.id);

      return jsonResponse({
        recovered: true,
        user_id: event.user_id,
        items: cartItems || [],
      });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (err: any) {
    console.error("Cart recovery error:", err);
    return jsonResponse({ error: err.message }, 500);
  }
});
