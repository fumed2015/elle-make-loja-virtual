import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Meta Conversions API (CAPI) — Server-Side Events
 *
 * Sends conversion events directly to Meta's servers for improved
 * Event Match Quality (EMQ) and attribution accuracy.
 *
 * Called by:
 * - mercadopago-payment webhook (Purchase events)
 * - Can be extended for other server-side events
 *
 * Required secret: META_CAPI_ACCESS_TOKEN (from Meta Events Manager)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PIXEL_ID = "1447990610311925";
const META_API_VERSION = "v21.0";
const META_API_URL = `https://graph.facebook.com/${META_API_VERSION}/${PIXEL_ID}/events`;

/** Normalize and hash a string with SHA-256 */
async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input.trim().toLowerCase());
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Normalize phone: digits only, add BR code if needed */
function normalizePhone(phone: string): string {
  let ph = phone.replace(/\D/g, "").replace(/^0+/, "");
  if (ph.length === 10 || ph.length === 11) ph = "55" + ph;
  return ph;
}

interface CAPIEventData {
  event_name: string;
  event_id?: string;
  event_time?: number;
  action_source?: string;
  event_source_url?: string;
  user_data: {
    email?: string;
    phone?: string;
    first_name?: string;
    last_name?: string;
    external_id?: string;
    client_ip_address?: string;
    client_user_agent?: string;
    fbc?: string;
    fbp?: string;
    country?: string;
    state?: string;
    city?: string;
    zip?: string;
  };
  custom_data?: Record<string, any>;
}

async function buildServerEvent(data: CAPIEventData) {
  const ud: Record<string, string> = {};

  // Hash PII fields
  if (data.user_data.email) {
    ud.em = [await sha256(data.user_data.email.trim().toLowerCase())];
  }
  if (data.user_data.phone) {
    ud.ph = [await sha256(normalizePhone(data.user_data.phone))];
  }
  if (data.user_data.first_name) {
    const fn = data.user_data.first_name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    ud.fn = [await sha256(fn)];
  }
  if (data.user_data.last_name) {
    const ln = data.user_data.last_name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    ud.ln = [await sha256(ln)];
  }
  if (data.user_data.external_id) {
    ud.external_id = [await sha256(data.user_data.external_id)];
  }
  if (data.user_data.country) {
    ud.country = [await sha256(data.user_data.country.toLowerCase())];
  }
  if (data.user_data.state) {
    ud.st = [await sha256(data.user_data.state.trim().toLowerCase().slice(0, 2))];
  }
  if (data.user_data.city) {
    const ct = data.user_data.city.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    ud.ct = [await sha256(ct)];
  }
  if (data.user_data.zip) {
    ud.zp = [await sha256(data.user_data.zip.replace(/\D/g, ""))];
  }

  // Non-hashed fields
  if (data.user_data.client_ip_address) ud.client_ip_address = data.user_data.client_ip_address;
  if (data.user_data.client_user_agent) ud.client_user_agent = data.user_data.client_user_agent;
  if (data.user_data.fbc) ud.fbc = data.user_data.fbc;
  if (data.user_data.fbp) ud.fbp = data.user_data.fbp;

  return {
    event_name: data.event_name,
    event_time: data.event_time || Math.floor(Date.now() / 1000),
    event_id: data.event_id || crypto.randomUUID(),
    action_source: data.action_source || "website",
    event_source_url: data.event_source_url || "https://ellemake2.lovable.app",
    user_data: ud,
    custom_data: data.custom_data || {},
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const accessToken = Deno.env.get("META_CAPI_ACCESS_TOKEN");
  if (!accessToken) {
    console.error("META_CAPI_ACCESS_TOKEN not configured");
    return new Response(
      JSON.stringify({ error: "META_CAPI_ACCESS_TOKEN not configured. Configure it in secrets." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { events } = body as { events: CAPIEventData[] };

    if (!events || !Array.isArray(events) || events.length === 0) {
      return new Response(
        JSON.stringify({ error: "No events provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build all events with proper hashing
    const serverEvents = await Promise.all(events.map(buildServerEvent));

    // Send to Meta
    const url = `${META_API_URL}?access_token=${accessToken}`;
    const metaRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: serverEvents,
        ...(body.test_event_code ? { test_event_code: body.test_event_code } : {}),
      }),
    });

    const metaData = await metaRes.json();

    if (!metaRes.ok) {
      console.error("Meta CAPI error:", JSON.stringify(metaData));
      return new Response(
        JSON.stringify({ error: "Meta CAPI error", details: metaData }),
        { status: metaRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Meta CAPI: ${serverEvents.length} event(s) sent successfully`);

    return new Response(
      JSON.stringify({ success: true, events_received: metaData.events_received }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("CAPI error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
