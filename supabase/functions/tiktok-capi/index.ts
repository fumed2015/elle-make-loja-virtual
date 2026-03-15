import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * TikTok Events API 2.0 (CAPI) — Server-Side Events
 *
 * Sends conversion events to TikTok's servers for improved attribution.
 * Follows the official spec: https://business-api.tiktok.com/open_api/v1.3/event/track/
 *
 * Required secrets: TIKTOK_PIXEL_ID, TIKTOK_ACCESS_TOKEN
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIKTOK_API_URL = "https://business-api.tiktok.com/open_api/v1.3/event/track/";

/** SHA-256 hash a string */
async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input.trim().toLowerCase());
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Normalize phone to E.164 format */
function normalizePhone(phone: string): string {
  let ph = phone.replace(/\D/g, "").replace(/^0+/, "");
  // Add BR country code if missing
  if (ph.length === 10 || ph.length === 11) ph = "55" + ph;
  return "+" + ph;
}

interface TikTokEventInput {
  event: string; // e.g. "ViewContent", "AddToCart", "InitiateCheckout", "CompletePayment"
  event_id?: string;
  event_time?: number;
  // user info (will be hashed server-side)
  email?: string;
  phone?: string;
  external_id?: string;
  ip?: string;
  user_agent?: string;
  ttclid?: string;
  ttp?: string; // _ttp cookie
  locale?: string;
  // page info
  url?: string;
  referrer?: string;
  // properties
  content_id?: string;
  content_ids?: string[];
    content_id: string;
    content_type?: string;
    content_name?: string;
    content_category?: string;
    brand?: string;
    quantity?: number;
    price?: number;
  }>;
  content_type?: string;
  currency?: string;
  value?: number;
  num_items?: number;
  order_id?: string;
  search_string?: string;
  description?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PIXEL_ID = Deno.env.get("TIKTOK_PIXEL_ID");
    const ACCESS_TOKEN = Deno.env.get("TIKTOK_ACCESS_TOKEN");

    if (!PIXEL_ID || !ACCESS_TOKEN) {
      throw new Error("Missing TIKTOK_PIXEL_ID or TIKTOK_ACCESS_TOKEN");
    }

    const input: TikTokEventInput = await req.json();
    const eventTime = input.event_time || Math.floor(Date.now() / 1000);
    const eventId = input.event_id || crypto.randomUUID();

    // Build user object with hashed PII
    const user: Record<string, any> = {};

    if (input.email) {
      user.email = await sha256(input.email.trim().toLowerCase());
    }
    if (input.phone) {
      const normalized = normalizePhone(input.phone);
      user.phone = await sha256(normalized);
    }
    if (input.external_id) {
      user.external_id = await sha256(input.external_id);
    }
    if (input.ip) user.ip = input.ip;
    if (input.user_agent) user.user_agent = input.user_agent;
    if (input.ttclid) user.ttclid = input.ttclid;
    if (input.ttp) user.ttp = input.ttp;
    if (input.locale) user.locale = input.locale;

    // Build properties object
    const properties: Record<string, any> = {};
    const normalizedContentIds = (input.content_ids || []).map((id) => String(id || "").trim()).filter(Boolean);
    const fallbackContentId =
      (typeof input.content_id === "string" && input.content_id.trim()) ||
      normalizedContentIds[0] ||
      input.contents?.find((item) => item?.content_id?.trim())?.content_id?.trim();

    if (fallbackContentId) properties.content_id = fallbackContentId;
    if (normalizedContentIds.length) properties.content_ids = normalizedContentIds;
    if (input.contents?.length) properties.contents = input.contents;
    if (input.content_type) properties.content_type = input.content_type;
    if (input.currency) properties.currency = input.currency;
    if (input.value !== undefined) properties.value = input.value;
    if (input.num_items !== undefined) properties.num_items = input.num_items;
    if (input.order_id) properties.order_id = input.order_id;
    if (input.search_string) properties.search_string = input.search_string;
    if (input.description) properties.description = input.description;

    // Build page object
    const page: Record<string, any> = {};
    if (input.url) page.url = input.url;
    if (input.referrer) page.referrer = input.referrer;

    // Construct the payload per TikTok Events API 2.0 spec
    const payload = {
      event_source: "web",
      event_source_id: PIXEL_ID,
      data: [
        {
          event: input.event,
          event_time: eventTime,
          event_id: eventId,
          user,
          properties: Object.keys(properties).length > 0 ? properties : undefined,
          page: Object.keys(page).length > 0 ? page : { url: "https://ellemake.com.br" },
        },
      ],
    };

    console.log("TikTok CAPI payload:", JSON.stringify(payload, null, 2));

    const response = await fetch(TIKTOK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Token": ACCESS_TOKEN,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log("TikTok CAPI response:", JSON.stringify(result));

    if (!response.ok || result.code !== 0) {
      console.error("TikTok CAPI error:", result);
      return new Response(
        JSON.stringify({ success: false, error: result.message || "TikTok API error", details: result }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, event_id: eventId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("TikTok CAPI error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
