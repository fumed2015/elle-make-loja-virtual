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
    `📋 *Copie o código PIX abaixo e pague pelo app do seu banco:*\n\n` +
    `{pix_code}\n\n` +
    `⚠️ O código expira em breve. Pague agora e garanta seus produtos! 💕`,
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
      // Schedule: notification_count 0 → 30min, 1 → 2h, 2 → 24h, 3 → 48h, 4 → 72h
      const SCHEDULE_DELAYS_MS = [
        30 * 60 * 1000,       // 0 → 30 min after creation
        2 * 60 * 60 * 1000,   // 1 → 2h after creation
        24 * 60 * 60 * 1000,  // 2 → 24h after creation
        48 * 60 * 60 * 1000,  // 3 → 48h after creation
        72 * 60 * 60 * 1000,  // 4 → 72h after creation
      ];
      const MAX_NOTIFICATIONS = SCHEDULE_DELAYS_MS.length;
      const maxAge = new Date(Date.now() - 73 * 60 * 60 * 1000).toISOString(); // 73h max window
      const MAX_WHATSAPP_PER_PHONE_PER_DAY = 3; // daily limit per phone number

      const { data: events, error } = await supabase
        .from("cart_abandonment_events")
        .select("*")
        .is("recovered_at", null)
        .lt("notification_count", MAX_NOTIFICATIONS)
        .gt("created_at", maxAge)
        .order("created_at", { ascending: true })
        .limit(50);

      if (error) return jsonResponse({ error: error.message }, 500);
      if (!events || events.length === 0) return jsonResponse({ processed: 0, message: "No carts to recover" });

      // Filter events that are ready based on their schedule
      const now = Date.now();
      const readyEvents = events.filter((e: any) => {
        const createdAt = new Date(e.created_at).getTime();
        const nextDelay = SCHEDULE_DELAYS_MS[e.notification_count] || Infinity;
        return now >= createdAt + nextDelay;
      });

      if (readyEvents.length === 0) return jsonResponse({ processed: 0, message: "No carts ready for notification yet" });

      // ── DEDUPLICATE: only keep the LATEST event per user ──
      const latestByUser = new Map<string, typeof readyEvents[0]>();
      for (const event of readyEvents) {
        const existing = latestByUser.get(event.user_id);
        if (!existing || new Date(event.created_at) > new Date(existing.created_at)) {
          latestByUser.set(event.user_id, event);
        }
      }

      // Mark duplicate (older) events as fully notified
      const duplicateIds = readyEvents
        .filter((e: any) => latestByUser.get(e.user_id)?.id !== e.id)
        .map((e: any) => e.id);
      if (duplicateIds.length > 0) {
        await supabase
          .from("cart_abandonment_events")
          .update({ notification_count: 99 })
          .in("id", duplicateIds);
      }

      const uniqueEvents = Array.from(latestByUser.values());

      // ── Check per-phone daily WhatsApp limit ──
      const userIds = uniqueEvents.map((e: any) => e.user_id);

      // Get profiles for phone numbers
      const { data: profilesForLimit } = await supabase
        .from("profiles")
        .select("user_id, phone")
        .in("user_id", userIds)
        .not("phone", "is", null);

      const phoneByUser = new Map<string, string>();
      for (const p of (profilesForLimit || [])) {
        if (p.phone) {
          let clean = p.phone.replace(/\D/g, "");
          if (!clean.startsWith("55")) clean = "55" + clean;
          phoneByUser.set(p.user_id, clean);
        }
      }

      // Count today's WhatsApp sends per phone
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const uniquePhones = [...new Set(phoneByUser.values())];
      const phoneUsageMap = new Map<string, number>();

      if (uniquePhones.length > 0) {
        const { data: todayNotifs } = await supabase
          .from("notifications")
          .select("phone")
          .in("phone", uniquePhones)
          .eq("status", "sent")
          .gt("created_at", todayStart.toISOString());

        for (const n of (todayNotifs || [])) {
          const clean = n.phone.replace(/\D/g, "");
          phoneUsageMap.set(clean, (phoneUsageMap.get(clean) || 0) + 1);
        }
      }

      const tmplFirst = await loadTemplate(supabase, "cart.recovery.first");
      const tmplSecond = await loadTemplate(supabase, "cart.recovery.second");

      let sent = 0;
      let skipped = 0;
      for (const event of uniqueEvents) {
        // Verify cart items still exist
        const { data: cartItems } = await supabase
          .from("cart_items")
          .select("id, quantity, product_id, products(id, name, price, images, is_active)")
          .eq("user_id", event.user_id);

        const activeCartItems = (cartItems || []).filter(
          (ci: any) => ci.products?.is_active === true
        );

        if (activeCartItems.length === 0) {
          await supabase
            .from("cart_abandonment_events")
            .update({ notification_count: 99 })
            .eq("id", event.id);
          continue;
        }

        // Check if user already completed an order recently
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

        // Check per-phone daily limit
        const userPhone = phoneByUser.get(event.user_id);
        if (userPhone) {
          const usage = phoneUsageMap.get(userPhone) || 0;
          if (usage >= MAX_WHATSAPP_PER_PHONE_PER_DAY) {
            skipped++;
            continue;
          }
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

        // Send WhatsApp if phone available and within daily limit
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

          // Use first template for count 0, second for count >= 1
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

          // Update daily usage tracking
          if (!whatsappResult?.error && userPhone) {
            phoneUsageMap.set(userPhone, (phoneUsageMap.get(userPhone) || 0) + 1);
          }
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
      const mpToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");

      let sent = 0;
      for (const order of dedupedToNotify) {
        // Re-verify order is still pending (could have been cancelled/deleted between query and notification)
        const { data: freshOrder } = await supabase.from("orders").select("status").eq("id", order.id).maybeSingle();
        if (!freshOrder || freshOrder.status !== "pending") continue;

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

        // Fetch PIX code from Mercado Pago using external_reference (order_id)
        let pixCode = "";
        if (mpToken) {
          try {
            const searchRes = await fetch(
              `https://api.mercadopago.com/v1/payments/search?external_reference=${order.id}&status=pending&sort=date_created&criteria=desc`,
              { headers: { Authorization: `Bearer ${mpToken}` } }
            );
            const searchData = await searchRes.json();
            const mpPayment = searchData?.results?.[0];
            if (mpPayment?.point_of_interaction?.transaction_data?.qr_code) {
              pixCode = mpPayment.point_of_interaction.transaction_data.qr_code;
            }
          } catch (e) {
            console.error("Error fetching PIX code from MP:", e);
          }
        }

        // If no PIX code found, send fallback with link
        if (!pixCode) {
          pixCode = `Acesse ${SITE_URL}/pedidos para copiar o código`;
        }

        const productsList = items.map((i: any) => `• ${i.name || "Produto"} (${i.quantity || 1}x)`).join("\n");

        const vars = {
          first_name: profile.full_name?.split(" ")[0] || "Cliente",
          merchant: MERCHANT_NAME,
          total: Number(order.total).toFixed(2).replace(".", ","),
          products_list: productsList,
          pix_code: pixCode,
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
    // ACTION: process-checkout-leads (Ghost Lead Recovery)
    // ══════════════════════════════════════════════════════════
    if (action === "process-checkout-leads") {
      const cutoff30min = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const maxAge = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const MAX_WHATSAPP_PER_PHONE_PER_DAY = 3;

      // Find leads older than 30 min, not converted, not notified
      const { data: leads, error } = await supabase
        .from("checkout_leads")
        .select("*")
        .is("converted_at", null)
        .is("notified_at", null)
        .lt("updated_at", cutoff30min)
        .gt("created_at", maxAge)
        .order("created_at", { ascending: true })
        .limit(30);

      if (error) return jsonResponse({ error: error.message }, 500);
      if (!leads || leads.length === 0) return jsonResponse({ processed: 0, message: "No checkout leads to recover" });

      // Check if user completed an order after the lead was created
      const userIds = leads.map((l: any) => l.user_id);
      const { data: recentOrders } = await supabase
        .from("orders")
        .select("user_id, created_at")
        .in("user_id", userIds)
        .not("status", "eq", "cancelled")
        .order("created_at", { ascending: false });

      const usersWithOrders = new Set<string>();
      for (const lead of leads) {
        const hasOrder = (recentOrders || []).some(
          (o: any) => o.user_id === lead.user_id && new Date(o.created_at) > new Date(lead.created_at)
        );
        if (hasOrder) usersWithOrders.add(lead.user_id);
      }

      // Check daily phone limit
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const phones = [...new Set(leads.map((l: any) => {
        let p = l.phone.replace(/\D/g, "");
        if (!p.startsWith("55")) p = "55" + p;
        return p;
      }))];

      const phoneUsageMap = new Map<string, number>();
      if (phones.length > 0) {
        const { data: todayNotifs } = await supabase
          .from("notifications")
          .select("phone")
          .in("phone", phones)
          .eq("status", "sent")
          .gt("created_at", todayStart.toISOString());

        for (const n of (todayNotifs || [])) {
          const clean = n.phone.replace(/\D/g, "");
          phoneUsageMap.set(clean, (phoneUsageMap.get(clean) || 0) + 1);
        }
      }

      const ghostTemplate =
        `Oi, *{first_name}*! 💄\n\n` +
        `Vimos que você esqueceu seus itens no carrinho da *${MERCHANT_NAME}*!\n\n` +
        `💰 Seu carrinho: R$ {total} ({items_count} {items_label})\n\n` +
        `🎁 Use o cupom *VOLTEI5* e ganhe *5% OFF* para finalizar agora!\n\n` +
        `🔗 ${SITE_URL}/checkout\n\n` +
        `Corre que o cupom é por tempo limitado! ⏳💕`;

      let sent = 0;
      let skipped = 0;
      for (const lead of leads) {
        // Skip converted users
        if (usersWithOrders.has(lead.user_id)) {
          await supabase.from("checkout_leads").update({ converted_at: new Date().toISOString() }).eq("id", lead.id);
          continue;
        }

        let cleanPhone = lead.phone.replace(/\D/g, "");
        if (!cleanPhone.startsWith("55")) cleanPhone = "55" + cleanPhone;

        // Check daily limit
        const usage = phoneUsageMap.get(cleanPhone) || 0;
        if (usage >= MAX_WHATSAPP_PER_PHONE_PER_DAY) {
          skipped++;
          continue;
        }

        const firstName = lead.first_name || "Cliente";
        const message = ghostTemplate
          .replace(/{first_name}/g, firstName)
          .replace(/{total}/g, Number(lead.cart_total || 0).toFixed(2).replace(".", ","))
          .replace(/{items_count}/g, String(lead.items_count || 0))
          .replace(/{items_label}/g, (lead.items_count || 0) === 1 ? "item" : "itens");

        const result = await sendWhatsApp(lead.phone, message);

        await supabase.from("notifications").insert({
          event_type: "checkout.ghost_lead",
          phone: cleanPhone,
          message,
          status: result?.error ? "failed" : "sent",
          zapi_response: result,
          user_id: lead.user_id,
        });

        await supabase.from("checkout_leads").update({ notified_at: new Date().toISOString() }).eq("id", lead.id);

        if (!result?.error) {
          phoneUsageMap.set(cleanPhone, usage + 1);
          sent++;
        }
      }

      return jsonResponse({ processed: leads.length, sent, skipped });
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
