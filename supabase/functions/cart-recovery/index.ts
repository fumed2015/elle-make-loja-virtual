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

const SITE_URL = "https://www.ellemake.com.br";
const MERCHANT_NAME = "Elle Make";

// ── Fallback templates ──
const FALLBACK_TEMPLATES: Record<string, string> = {
  "cart.recovery.first":
    `Oi, *{first_name}*! 💄\n\n` +
    `Você deixou {items_count} {items_label} esperando no seu carrinho da *{merchant}*!\n\n` +
    `💰 Total: R$ {total}\n\n` +
    `Finalize agora antes que acabe:\n🔗 {recovery_link}\n\n` +
    `Precisa de ajuda? Responda aqui! 💬`,

  "cart.recovery.second":
    `*{first_name}*, última chance! 🔥\n\n` +
    `Seus {items_count} {items_label} (R$ {total}) ainda estão reservados na *{merchant}*.\n\n` +
    `Use o cupom *VOLTEI10* e ganhe 10% OFF! 🎁\n\n` +
    `🔗 {recovery_link}\n\n` +
    `Corre que a promoção é por tempo limitado! ⏳💕`,

  "pix.reminder":
    `Oi, *{first_name}*! ⏳\n\n` +
    `Seu PIX de *R$ {total}* na *{merchant}* ainda está pendente.\n\n` +
    `{products_list}\n\n` +
    `Acesse para copiar o código PIX:\n🔗 {link}\n\n` +
    `Pague antes que expire e garanta seus produtos! 💕`,
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
      const cooldownCutoff = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(); // 4h cooldown

      const { data: events, error } = await supabase
        .from("cart_abandonment_events")
        .select("*")
        .is("recovered_at", null)
        .lt("notification_count", 2)
        .lt("created_at", cutoff)
        .gt("created_at", maxAge)
        .order("created_at", { ascending: true })
        .limit(50);

      if (error) return jsonResponse({ error: error.message }, 500);
      if (!events || events.length === 0) return jsonResponse({ processed: 0, message: "No carts to recover" });

      // ── DEDUPLICATE: only keep the LATEST event per user ──
      const latestByUser = new Map<string, typeof events[0]>();
      for (const event of events) {
        const existing = latestByUser.get(event.user_id);
        if (!existing || new Date(event.created_at) > new Date(existing.created_at)) {
          latestByUser.set(event.user_id, event);
        }
      }

      // Mark duplicate (older) events as fully notified so they stop being picked up
      const duplicateIds = events
        .filter((e) => latestByUser.get(e.user_id)?.id !== e.id)
        .map((e) => e.id);
      if (duplicateIds.length > 0) {
        await supabase
          .from("cart_abandonment_events")
          .update({ notification_count: 99 })
          .in("id", duplicateIds);
      }

      const uniqueEvents = Array.from(latestByUser.values());

      // ── Check cooldown: skip users who got a notification recently ──
      const userIds = uniqueEvents.map((e) => e.user_id);
      const { data: recentNotifs } = await supabase
        .from("notifications")
        .select("user_id, created_at")
        .in("user_id", userIds)
        .eq("event_type", "cart.abandoned")
        .gt("created_at", cooldownCutoff);

      const recentlyNotifiedUsers = new Set((recentNotifs || []).map((n) => n.user_id));

      const tmplFirst = await loadTemplate(supabase, "cart.recovery.first");
      const tmplSecond = await loadTemplate(supabase, "cart.recovery.second");

      let sent = 0;
      let skipped = 0;
      for (const event of uniqueEvents) {
        // Skip if user was notified in the last 4 hours
        if (recentlyNotifiedUsers.has(event.user_id)) {
          skipped++;
          continue;
        }

        // Verify cart items still exist before sending
        const { data: cartItems, error: cartError } = await supabase
          .from("cart_items")
          .select("id, quantity, product_id, products(id, name, price, images, is_active)")
          .eq("user_id", event.user_id);

        const activeCartItems = (cartItems || []).filter(
          (ci: any) => ci.products?.is_active === true
        );

        if (activeCartItems.length === 0) {
          // No active cart items — mark as done
          await supabase
            .from("cart_abandonment_events")
            .update({ notification_count: 99 })
            .eq("id", event.id);
          continue;
        }

        // Check if user already completed an order recently (converted)
        const { data: recentOrders } = await supabase
          .from("orders")
          .select("id")
          .eq("user_id", event.user_id)
          .gt("created_at", event.created_at)
          .not("status", "eq", "cancelled")
          .limit(1);

        if (recentOrders && recentOrders.length > 0) {
          await supabase
            .from("cart_abandonment_events")
            .update({ recovered_at: new Date().toISOString(), notification_count: 99 })
            .eq("id", event.id);
          continue;
        }

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

        const { data: authUser } = await supabase.auth.admin.getUserById(event.user_id);
        const userEmail = authUser?.user?.email;

        if (!profile?.phone && !userEmail) {
          await supabase.from("cart_abandonment_events").update({ notification_count: 99 }).eq("id", event.id);
          continue;
        }

        const firstName = profile?.full_name?.split(" ")[0] || "Cliente";
        const recoveryLink = `${SITE_URL}/recuperar-carrinho?token=${token}`;
        const cartTotal = Number(event.cart_total || 0).toFixed(2).replace(".", ",");

        // Send WhatsApp if phone available
        let whatsappResult: any = null;
        if (profile?.phone) {
          const vars = {
            first_name: firstName,
            merchant: MERCHANT_NAME,
            items_count: String(activeCartItems.length),
            items_label: activeCartItems.length === 1 ? "item" : "itens",
            total: cartTotal,
            recovery_link: recoveryLink,
          };

          const template = event.notification_count === 0 ? tmplFirst : tmplSecond;
          const message = fillTemplate(template, vars);
          whatsappResult = await sendWhatsApp(profile.phone, message);

          await supabase.from("notifications").insert({
            event_type: "cart.abandoned",
            phone: profile.phone,
            message,
            status: whatsappResult?.error ? "failed" : "sent",
            zapi_response: whatsappResult,
            user_id: event.user_id,
          });
        }

        // Send email if available
        if (userEmail) {
          try {
            const emailItems = activeCartItems.map((ci: any) => ({
              name: ci.products?.name || "Produto",
              price: ci.products?.price || 0,
              quantity: ci.quantity || 1,
              image: ci.products?.images?.[0] || undefined,
            }));

            const couponCode = event.notification_count >= 1 ? "VOLTEI10" : undefined;

            await supabase.functions.invoke("send-transactional-email", {
              body: {
                template: "cart-recovery",
                to: userEmail,
                data: {
                  firstName,
                  items: emailItems,
                  cartTotal,
                  recoveryLink,
                  couponCode,
                },
              },
            });
          } catch (emailErr) {
            console.error("Email send error:", emailErr);
          }
        }

        await supabase.from("cart_abandonment_events").update({
          notified_at: new Date().toISOString(),
          notification_count: (event.notification_count || 0) + 1,
        }).eq("id", event.id);

        sent++;
      }

      return jsonResponse({ processed: uniqueEvents.length, sent, skipped, duplicatesCleaned: duplicateIds.length });
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
        .not("status", "in", "(cancelled,refunded)")
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

      // Also check cooldown per user - max 1 pix reminder per 4 hours
      const cooldownCutoff = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
      const userIdsToNotify = [...new Set(toNotify.map((o) => o.user_id))];
      const { data: recentPixNotifs } = await supabase
        .from("notifications")
        .select("user_id")
        .in("user_id", userIdsToNotify)
        .eq("event_type", "pix.reminder")
        .gt("created_at", cooldownCutoff);

      const recentlyNotifiedUsers = new Set((recentPixNotifs || []).map((n) => n.user_id));
      const filteredToNotify = toNotify.filter((o) => !recentlyNotifiedUsers.has(o.user_id));

      // Deduplicate by user - only notify once per user
      const seenUsers = new Set<string>();
      const dedupedToNotify = filteredToNotify.filter((o) => {
        if (seenUsers.has(o.user_id)) return false;
        seenUsers.add(o.user_id);
        return true;
      });

      const tmplPix = await loadTemplate(supabase, "pix.reminder");

      let sent = 0;
      for (const order of dedupedToNotify) {
        // Verify order items have active products
        const items = (order.items as any[]) || [];
        const productIds = items.map((i: any) => i.product_id).filter(Boolean);
        if (productIds.length > 0) {
          const { data: activeProducts } = await supabase
            .from("products")
            .select("id")
            .in("id", productIds)
            .eq("is_active", true);

          if (!activeProducts || activeProducts.length === 0) continue;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("user_id", order.user_id)
          .maybeSingle();

        if (!profile?.phone) continue;

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

      return jsonResponse({ processed: dedupedToNotify.length, sent });
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
