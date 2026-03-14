/**
 * Meta (Facebook) Pixel – Standard Event Helpers
 *
 * The base pixel script (init + PageView) is hardcoded in index.html so it
 * fires immediately on every page load — no async DB fetch needed.
 *
 * These helpers call fbq('track', …) for each standard e-commerce event,
 * following the official Meta Pixel conversion-tracking spec.
 *
 * All monetary values use currency: "BRL".
 *
 * OPTIMIZATIONS (EMQ improvement):
 * - Every event includes event_id (eventID) for CAPI deduplication
 * - User data (PII) is sent alongside events via userData injection
 * - fbc/fbp are read from cookies/localStorage for attribution
 */

import { getFbc, getFbp } from "./useMetaFbclid";

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

const PIXEL_ID = "1447990610311925";

// ─── Shared user data cache ───────────────────────────────────────────
// Stores the latest normalized user data for injection into every event
let _cachedUserData: Record<string, string> = {};

/**
 * Generate a unique event_id (UUID v4) for deduplication with CAPI.
 */
function generateEventId(): string {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Store the last generated event_id so it can be retrieved
 * for server-side CAPI deduplication.
 */
let _lastEventId: string | null = null;
export function getLastEventId(): string | null {
  return _lastEventId;
}

// ─── Advanced Matching ─────────────────────────────────────────────────
/**
 * Re-initialises the pixel with user PII so Meta can match conversions
 * to real people (improves Event Match Quality / EMQ score).
 *
 * Data is sent in clear-text to fbq(); the JS SDK hashes it
 * automatically before transmitting.
 *
 * Normalisation follows Meta's spec:
 *  - email: trim + lowercase
 *  - phone: digits only, strip leading zeros, prepend country code 55 (BR)
 *  - names / city: trim + lowercase, remove diacritics
 *  - state: 2-letter lowercase
 *  - zip: digits only
 *  - external_id: stable user identifier (user UUID)
 */
export function fbSetUserData(data: {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  externalId?: string;
  cpf?: string;
}) {
  try {
    if (typeof window === "undefined" || typeof window.fbq !== "function") return;

    const ud: Record<string, string> = {};

    if (data.email) ud.em = data.email.trim().toLowerCase();

    if (data.phone) {
      let ph = data.phone.replace(/\D/g, "").replace(/^0+/, "");
      if (ph.length === 10 || ph.length === 11) ph = "55" + ph;
      if (ph) ud.ph = ph;
    }

    if (data.firstName) ud.fn = data.firstName.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (data.lastName) ud.ln = data.lastName.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (data.city) ud.ct = data.city.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (data.state) ud.st = data.state.trim().toLowerCase().slice(0, 2);
    if (data.zip) ud.zp = data.zip.replace(/\D/g, "");
    ud.country = (data.country || "br").toLowerCase();

    // external_id: use user UUID or hashed CPF as stable identifier
    if (data.externalId) ud.external_id = data.externalId;

    // Inject fbc from our persistence layer
    const fbc = getFbc();
    if (fbc) ud.fbc = fbc;

    // Cache for future events
    _cachedUserData = { ..._cachedUserData, ...ud };

    if (Object.keys(ud).length > 1) {
      window.fbq("init", PIXEL_ID, ud);
    }
  } catch {
    // silently ignore
  }
}

// ─── Internal fire helpers ─────────────────────────────────────────────

function fire(event: string, params?: Record<string, any>) {
  try {
    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      const eventId = generateEventId();
      _lastEventId = eventId;

      // Store event_id in sessionStorage for CAPI deduplication
      try {
        sessionStorage.setItem(`_meta_eid_${event}`, eventId);
      } catch { /* ignore */ }

      if (params) {
        window.fbq("track", event, params, { eventID: eventId });
      } else {
        window.fbq("track", event, {}, { eventID: eventId });
      }
    }
  } catch {
    // silently ignore
  }
}

function fireCustom(event: string, params?: Record<string, any>) {
  try {
    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      const eventId = generateEventId();
      _lastEventId = eventId;

      if (params) {
        window.fbq("trackCustom", event, params, { eventID: eventId });
      } else {
        window.fbq("trackCustom", event, {}, { eventID: eventId });
      }
    }
  } catch {
    // silently ignore
  }
}

// ─── Standard Events ───────────────────────────────────────────────────

export function fbTrackPageView() {
  fire("PageView");
}

export function fbTrackViewContent(product: {
  id: string;
  name: string;
  price: number;
  category?: string;
  brand?: string;
}) {
  fire("ViewContent", {
    content_ids: [product.id],
    content_type: "product",
    content_name: product.name,
    content_category: [product.brand, product.category].filter(Boolean).join(" > ") || undefined,
    value: product.price,
    currency: "BRL",
    contents: [{ id: product.id, quantity: 1 }],
  });
}

export function fbTrackAddToCart(product: {
  id: string;
  name: string;
  price: number;
  quantity: number;
}) {
  fire("AddToCart", {
    content_ids: [product.id],
    content_type: "product",
    content_name: product.name,
    value: product.price * product.quantity,
    currency: "BRL",
    contents: [{ id: product.id, quantity: product.quantity }],
  });
}

export function fbTrackInitiateCheckout(params: {
  value: number;
  itemCount: number;
  contentIds: string[];
  contents?: Array<{ id: string; quantity: number }>;
}) {
  fire("InitiateCheckout", {
    content_ids: params.contentIds,
    content_type: "product",
    value: params.value,
    currency: "BRL",
    num_items: params.itemCount,
    contents: params.contents,
  });
}

export function fbTrackAddPaymentInfo(params: {
  value: number;
  contentIds: string[];
  paymentMethod?: string;
  contents?: Array<{ id: string; quantity: number }>;
}) {
  fire("AddPaymentInfo", {
    content_ids: params.contentIds,
    content_type: "product",
    value: params.value,
    currency: "BRL",
    contents: params.contents,
  });
}

/**
 * Purchase – returns the event_id for CAPI deduplication.
 */
export function fbTrackPurchase(params: {
  orderId: string;
  value: number;
  itemCount: number;
  contentIds: string[];
  contents?: Array<{ id: string; quantity: number }>;
}): string {
  const eventId = generateEventId();
  _lastEventId = eventId;

  try {
    sessionStorage.setItem("_meta_eid_Purchase", eventId);
    sessionStorage.setItem(`_meta_eid_order_${params.orderId}`, eventId);
  } catch { /* ignore */ }

  try {
    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      window.fbq("track", "Purchase", {
        content_ids: params.contentIds,
        content_type: "product",
        value: params.value,
        currency: "BRL",
        num_items: params.itemCount,
        contents: params.contents,
        delivery_category: "home_delivery",
      }, { eventID: eventId });
    }
  } catch { /* ignore */ }

  return eventId;
}

export function fbTrackSearch(query: string) {
  fire("Search", { search_string: query });
}

export function fbTrackAddToWishlist(product: {
  id: string;
  name: string;
  price: number;
}) {
  fire("AddToWishlist", {
    content_ids: [product.id],
    content_type: "product",
    content_name: product.name,
    value: product.price,
    currency: "BRL",
    contents: [{ id: product.id, quantity: 1 }],
  });
}

export function fbTrackCompleteRegistration(params?: { value?: number }) {
  fire("CompleteRegistration", { status: true, currency: "BRL", ...params });
}

export function fbTrackLead(params?: { value?: number }) {
  fire("Lead", { currency: "BRL", ...params });
}

export function fbTrackContact() {
  fire("Contact");
}

export function fbTrackViewCategory(category: { name: string; slug: string }) {
  fireCustom("ViewCategory", {
    content_category: category.name,
    content_name: category.slug,
  });
}

export function fbTrackCustom(eventName: string, params?: Record<string, any>) {
  fireCustom(eventName, params);
}

export function fbTrackViewCart(params: {
  value: number;
  itemCount: number;
  contentIds: string[];
  contents?: Array<{ id: string; quantity: number }>;
}) {
  fireCustom("ViewCart", {
    content_ids: params.contentIds,
    content_type: "product",
    value: params.value,
    currency: "BRL",
    num_items: params.itemCount,
    contents: params.contents,
  });
}

/**
 * Get the cached user data for CAPI usage.
 */
export function getCachedUserData(): Record<string, string> {
  return { ..._cachedUserData };
}
