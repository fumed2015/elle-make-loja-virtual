import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MELHOR_ENVIO_API = "https://melhorenvio.com.br";

/**
 * Maps Melhor Envio / Correios tracking status to our order status.
 * Melhor Envio statuses: posted, in_transit, out_for_delivery, delivered, returning, etc.
 */
function mapTrackingStatus(melhorEnvioStatus: string): string | null {
  const s = melhorEnvioStatus?.toLowerCase();
  if (s === "delivered") return "delivered";
  if (["posted", "in_transit", "out_for_delivery"].includes(s)) return "shipped";
  // Don't map unknown statuses
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const melhorEnvioToken = Deno.env.get("MELHOR_ENVIO_TOKEN");
    if (!melhorEnvioToken) throw new Error("MELHOR_ENVIO_TOKEN not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch orders with tracking codes that are not yet delivered/cancelled
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, tracking_code, status, tracking_url")
      .not("tracking_code", "is", null)
      .not("tracking_code", "eq", "")
      .not("status", "in", '("delivered","cancelled","refunded")');

    if (ordersError) throw ordersError;

    if (!orders || orders.length === 0) {
      return new Response(JSON.stringify({ message: "No orders to track", updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Tracking ${orders.length} orders...`);

    let updatedCount = 0;
    const errors: string[] = [];

    // 2. Process in batches of 20 (Melhor Envio limit)
    const batchSize = 20;
    for (let i = 0; i < orders.length; i += batchSize) {
      const batch = orders.slice(i, i + batchSize);
      const trackingCodes = batch.map((o) => o.tracking_code!);

      try {
        const response = await fetch(`${MELHOR_ENVIO_API}/api/v2/me/shipment/tracking`, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": `Bearer ${melhorEnvioToken}`,
            "User-Agent": "ElleMake (ellemakeloja@gmail.com)",
          },
          body: JSON.stringify({ orders: trackingCodes }),
        });

        if (!response.ok) {
          const errBody = await response.text();
          console.error(`Melhor Envio tracking API error [${response.status}]:`, errBody);
          errors.push(`Batch ${i}: API error ${response.status}`);
          continue;
        }

        const trackingData = await response.json();

        // 3. Process each tracking result
        for (const order of batch) {
          const tracking = trackingData[order.tracking_code!];
          if (!tracking || tracking.error) {
            console.log(`No tracking data for ${order.tracking_code}`);
            continue;
          }

          // Get the latest tracking event
          const events = Array.isArray(tracking) ? tracking : tracking.tracking?.events || tracking.events || [];
          if (events.length === 0) continue;

          const latestEvent = events[0]; // Most recent event first
          const melhorEnvioStatus = latestEvent?.status || latestEvent?.tag;
          const newStatus = mapTrackingStatus(melhorEnvioStatus);

          if (!newStatus || newStatus === order.status) continue;

          // Build tracking URL if not already set
          const trackingUrl = order.tracking_url || 
            `https://www.melhorrastreio.com.br/rastreio/${order.tracking_code}`;

          // 4. Update order status
          const { error: updateError } = await supabase
            .from("orders")
            .update({
              status: newStatus,
              tracking_url: trackingUrl,
              updated_at: new Date().toISOString(),
            })
            .eq("id", order.id);

          if (updateError) {
            console.error(`Failed to update order ${order.id}:`, updateError);
            errors.push(`Order ${order.id}: ${updateError.message}`);
          } else {
            console.log(`Order ${order.id}: ${order.status} → ${newStatus}`);
            updatedCount++;
          }
        }
      } catch (batchErr) {
        console.error(`Batch error:`, batchErr);
        errors.push(`Batch ${i}: ${batchErr}`);
      }

      // Rate limiting between batches
      if (i + batchSize < orders.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    return new Response(
      JSON.stringify({
        tracked: orders.length,
        updated: updatedCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Tracking error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
