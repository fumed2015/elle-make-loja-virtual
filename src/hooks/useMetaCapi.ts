/**
 * Meta CAPI (Conversions API) — Client-Side Sender
 *
 * Sends server-side events to meta-capi edge function for ALL standard events.
 * Uses centralized user data from useMetaUserData for maximum EMQ score.
 *
 * Deduplication with browser pixel via shared event_id.
 */

import { supabase } from "@/integrations/supabase/client";
import { getLastEventId } from "./useMetaPixel";
import { getMetaUserData, toCapiUserData } from "./useMetaUserData";

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

    // Get all available user data from centralized store
    const rawUserData = getMetaUserData();
    const capiUserData = toCapiUserData(rawUserData);

    // Merge with explicit overrides
    const finalUserData: Record<string, string> = {
      ...capiUserData,
      ...(userData || {}),
    };

    // Use the event_id from the pixel fire for deduplication
    const finalEventId = eventId || getLastEventId() || crypto.randomUUID?.() || `${Date.now()}`;

    const event = {
      event_name: eventName,
      event_id: finalEventId,
      event_time: Math.floor(Date.now() / 1000),
      action_source: "website",
      event_source_url: window.location.href,
      user_data: finalUserData,
      custom_data: customData || {},
    };

    // Fire and forget
    supabase.functions.invoke("meta-capi", {
      body: { events: [event] },
    }).then(({ error }) => {
      if (error) console.warn("[CAPI] Error:", error.message);
    });
  } catch (err) {
    console.warn("[CAPI] Send error:", err);
  }
}

// ─── Convenience wrappers ──────────────────────────────────────────────

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
