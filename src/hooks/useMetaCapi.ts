/**
 * Meta CAPI (Conversions API) — Client-Side Sender
 *
 * Sends server-side events to meta-capi edge function for ALL standard events:
 * PageView, ViewContent, AddToCart, InitiateCheckout, AddPaymentInfo, Purchase, Search, etc.
 *
 * This dramatically improves Event Match Quality (EMQ) because:
 * 1. Server events are deduplicated with browser pixel via event_id
 * 2. Full PII (email, phone, name, birthday, etc.) is sent hashed server-side
 * 3. IPv6 client_ip_address is forwarded
 * 4. fbc/fbp attribution params are included
 *
 * Usage: call sendCapiEvent() right after each fbq('track', ...) call.
 */

import { supabase } from "@/integrations/supabase/client";
import { getCachedUserData, getLastEventId } from "./useMetaPixel";
import { getMetaParams } from "./useMetaParamBuilder";

interface CapiEventOptions {
  eventName: string;
  eventId?: string;
  customData?: Record<string, any>;
  /** Override user data (e.g. for guest checkout with explicit email/phone) */
  userData?: Record<string, string>;
}

/**
 * Send a single event to Meta CAPI via edge function.
 * Non-blocking — errors are silently logged.
 */
export async function sendCapiEvent(options: CapiEventOptions): Promise<void> {
  try {
    const { eventName, eventId, customData, userData } = options;

    // Get all available user data
    const cachedUserData = getCachedUserData();
    const metaParams = getMetaParams();

    // Merge user data: cached PII + meta params + explicit overrides
    const mergedUserData: Record<string, string> = {
      ...cachedUserData,
      ...(userData || {}),
    };

    // Ensure meta attribution params are included
    if (metaParams.fbc && !mergedUserData.fbc) mergedUserData.fbc = metaParams.fbc;
    if (metaParams.fbp && !mergedUserData.fbp) mergedUserData.fbp = metaParams.fbp;
    if (metaParams.client_ip_address && !mergedUserData.client_ip_address) {
      mergedUserData.client_ip_address = metaParams.client_ip_address;
    }
    if (metaParams.client_user_agent && !mergedUserData.client_user_agent) {
      mergedUserData.client_user_agent = metaParams.client_user_agent;
    }

    // Map our cached field names to CAPI field names
    const capiUserData: Record<string, string> = {};
    if (mergedUserData.em) capiUserData.email = mergedUserData.em;
    if (mergedUserData.ph) capiUserData.phone = mergedUserData.ph;
    if (mergedUserData.fn) capiUserData.first_name = mergedUserData.fn;
    if (mergedUserData.ln) capiUserData.last_name = mergedUserData.ln;
    if (mergedUserData.db) capiUserData.date_of_birth = mergedUserData.db;
    if (mergedUserData.ge) capiUserData.gender = mergedUserData.ge;
    if (mergedUserData.external_id) capiUserData.external_id = mergedUserData.external_id;
    if (mergedUserData.country) capiUserData.country = mergedUserData.country;
    if (mergedUserData.st) capiUserData.state = mergedUserData.st;
    if (mergedUserData.ct) capiUserData.city = mergedUserData.ct;
    if (mergedUserData.zp) capiUserData.zip = mergedUserData.zp;
    if (mergedUserData.fbc) capiUserData.fbc = mergedUserData.fbc;
    if (mergedUserData.fbp) capiUserData.fbp = mergedUserData.fbp;
    if (mergedUserData.client_ip_address) capiUserData.client_ip_address = mergedUserData.client_ip_address;
    if (mergedUserData.client_user_agent) capiUserData.client_user_agent = mergedUserData.client_user_agent;
    // fb_login_id for Facebook Login users
    if (mergedUserData.fb_login_id) capiUserData.fb_login_id = mergedUserData.fb_login_id;

    // Use the event_id from the pixel fire for deduplication
    const finalEventId = eventId || getLastEventId() || crypto.randomUUID?.() || `${Date.now()}`;

    const event = {
      event_name: eventName,
      event_id: finalEventId,
      event_time: Math.floor(Date.now() / 1000),
      action_source: "website",
      event_source_url: window.location.href,
      user_data: capiUserData,
      custom_data: customData || {},
    };

    // Fire and forget — don't await in caller
    supabase.functions.invoke("meta-capi", {
      body: { events: [event] },
    }).then(({ error }) => {
      if (error) console.warn("[CAPI] Error:", error.message);
    });
  } catch (err) {
    console.warn("[CAPI] Send error:", err);
  }
}

// ─── Convenience wrappers for each standard event ──────────────────────

export function capiPageView() {
  sendCapiEvent({ eventName: "PageView" });
}

export function capiViewContent(product: {
  id: string;
  name: string;
  price: number;
  category?: string;
  brand?: string;
}, eventId?: string) {
  sendCapiEvent({
    eventName: "ViewContent",
    eventId,
    customData: {
      content_ids: [product.id],
      content_type: "product",
      content_name: product.name,
      content_category: [product.brand, product.category].filter(Boolean).join(" > ") || undefined,
      value: product.price,
      currency: "BRL",
      contents: [{ id: product.id, quantity: 1 }],
    },
  });
}

export function capiAddToCart(product: {
  id: string;
  name: string;
  price: number;
  quantity: number;
}, eventId?: string) {
  sendCapiEvent({
    eventName: "AddToCart",
    eventId,
    customData: {
      content_ids: [product.id],
      content_type: "product",
      content_name: product.name,
      value: product.price * product.quantity,
      currency: "BRL",
      contents: [{ id: product.id, quantity: product.quantity }],
    },
  });
}

export function capiInitiateCheckout(params: {
  value: number;
  itemCount: number;
  contentIds: string[];
  contents?: Array<{ id: string; quantity: number }>;
}, eventId?: string) {
  sendCapiEvent({
    eventName: "InitiateCheckout",
    eventId,
    customData: {
      content_ids: params.contentIds,
      content_type: "product",
      value: params.value,
      currency: "BRL",
      num_items: params.itemCount,
      contents: params.contents,
    },
  });
}

export function capiAddPaymentInfo(params: {
  value: number;
  contentIds: string[];
  paymentMethod?: string;
  contents?: Array<{ id: string; quantity: number }>;
}, eventId?: string) {
  sendCapiEvent({
    eventName: "AddPaymentInfo",
    eventId,
    customData: {
      content_ids: params.contentIds,
      content_type: "product",
      value: params.value,
      currency: "BRL",
      contents: params.contents,
    },
  });
}

export function capiPurchase(params: {
  orderId: string;
  value: number;
  itemCount: number;
  contentIds: string[];
  contents?: Array<{ id: string; quantity: number }>;
}, eventId: string, userData?: Record<string, string>) {
  sendCapiEvent({
    eventName: "Purchase",
    eventId,
    userData,
    customData: {
      content_ids: params.contentIds,
      content_type: "product",
      value: params.value,
      currency: "BRL",
      num_items: params.itemCount,
      contents: params.contents,
      order_id: params.orderId,
      delivery_category: "home_delivery",
    },
  });
}

export function capiSearch(query: string, eventId?: string) {
  sendCapiEvent({
    eventName: "Search",
    eventId,
    customData: { search_string: query },
  });
}

export function capiCompleteRegistration(eventId?: string) {
  sendCapiEvent({
    eventName: "CompleteRegistration",
    eventId,
    customData: { status: true, currency: "BRL" },
  });
}

export function capiLead(eventId?: string, value?: number) {
  sendCapiEvent({
    eventName: "Lead",
    eventId,
    customData: { currency: "BRL", ...(value ? { value } : {}) },
  });
}

export function capiAddToWishlist(product: {
  id: string;
  name: string;
  price: number;
}, eventId?: string) {
  sendCapiEvent({
    eventName: "AddToWishlist",
    eventId,
    customData: {
      content_ids: [product.id],
      content_type: "product",
      content_name: product.name,
      value: product.price,
      currency: "BRL",
    },
  });
}
