import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Melhor Envio Webhook Receiver
 * 
 * Receives tracking status updates from Melhor Envio and:
 * 1. Updates order status in the database
 * 2. Sends WhatsApp notification to the customer via the existing whatsapp-notifications function
 * 
 * Webhook URL to configure in Melhor Envio:
 * https://xinkvwlhctwgdfwixzxf.supabase.co/functions/v1/melhor-envio-webhook
 */

// Map Melhor Envio webhook statuses to our internal order statuses
function mapMelhorEnvioStatus(meStatus: string): { orderStatus: string | null; eventType: string | null } {
  const s = meStatus?.toLowerCase();
  
  switch (s) {
    case "posted":
      return { orderStatus: "shipped", eventType: "order.shipped" };
    case "in_transit":
      return { orderStatus: "shipped", eventType: null }; // already shipped, no new notification
    case "out_for_delivery":
      return { orderStatus: "shipped", eventType: null };
    case "delivered":
      return { orderStatus: "delivered", eventType: "order.delivered" };
    case "undelivered":
    case "returned_to_sender":
      return { orderStatus: null, eventType: null }; // handle manually
    default:
      return { orderStatus: null, eventType: null };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const payload = await req.json();
    console.log("Melhor Envio webhook received:", JSON.stringify(payload));

    // Melhor Envio sends: { "event": "tracking", "data": { "tracking": "XX123456789BR", "status": "delivered", ... } }
    // Or it can send different formats depending on webhook version
    const event = payload.event || payload.type;
    const data = payload.data || payload;

    // Extract tracking code - try multiple possible fields
    const trackingCode = data.tracking || data.tracking_code || data.code || payload.tracking;
    
    if (!trackingCode) {
      console.log("No tracking code in webhook payload, ignoring");
      return new Response(JSON.stringify({ received: true, action: "ignored", reason: "no_tracking_code" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract status
    const meStatus = data.status || data.tag || event;
    const { orderStatus, eventType } = mapMelhorEnvioStatus(meStatus);

    console.log(`Tracking: ${trackingCode}, ME Status: ${meStatus}, Mapped: ${orderStatus}, Event: ${eventType}`);

    // Find the order by tracking code
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, status, user_id, tracking_code, tracking_url")
      .eq("tracking_code", trackingCode)
      .maybeSingle();

    if (orderErr || !order) {
      console.log(`Order not found for tracking code: ${trackingCode}`);
      return new Response(JSON.stringify({ received: true, action: "ignored", reason: "order_not_found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip if order is already in a terminal state
    if (["delivered", "cancelled", "refunded"].includes(order.status)) {
      console.log(`Order ${order.id} already in terminal state: ${order.status}`);
      return new Response(JSON.stringify({ received: true, action: "skipped", reason: "terminal_status" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip if no status change needed
    if (!orderStatus || orderStatus === order.status) {
      console.log(`No status change needed for order ${order.id} (current: ${order.status})`);
      return new Response(JSON.stringify({ received: true, action: "no_change" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update order status
    const trackingUrl = order.tracking_url || `https://www.melhorrastreio.com.br/rastreio/${trackingCode}`;
    
    const { error: updateErr } = await supabase
      .from("orders")
      .update({
        status: orderStatus,
        tracking_url: trackingUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (updateErr) {
      console.error(`Failed to update order ${order.id}:`, updateErr);
      throw updateErr;
    }

    console.log(`Order ${order.id} updated: ${order.status} → ${orderStatus}`);

    // Send WhatsApp notification if there's a relevant event type
    if (eventType && order.user_id) {
      try {
        const notifyResponse = await fetch(`${supabaseUrl}/functions/v1/whatsapp-notifications`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            action: "notify-order",
            order_id: order.id,
            event_type: eventType,
          }),
        });

        const notifyResult = await notifyResponse.json();
        console.log(`WhatsApp notification result for order ${order.id}:`, JSON.stringify(notifyResult));
      } catch (notifyErr) {
        // Don't fail the webhook if notification fails
        console.error(`WhatsApp notification failed for order ${order.id}:`, notifyErr);
      }
    }

    return new Response(
      JSON.stringify({
        received: true,
        action: "updated",
        order_id: order.id,
        old_status: order.status,
        new_status: orderStatus,
        notification_sent: !!eventType,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Webhook processing error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    // Return 200 even on errors to prevent Melhor Envio from retrying excessively
    return new Response(JSON.stringify({ received: true, error: message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
