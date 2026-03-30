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
 * - User data is re-init'd on every event fire via centralized getMetaUserData()
 * - fbc/fbp/IP are always injected from cookies/localStorage
 */

import { getMetaUserData, type MetaUserDataRaw } from "./useMetaUserData";

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

const PIXEL_ID = "1447990610311925";

// ─── Event ID ─────────────────────────────────────────────────────────

function generateEventId(): string {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

let _lastEventId: string | null = null;
export function getLastEventId(): string | null {
  return _lastEventId;
}

// ─── Advanced Matching (re-init with PII on every event) ──────────────

/**
 * Re-initialises the pixel with current user data before firing an event.
 * This ensures every event carries the best available PII for matching.
 */
function reinitWithUserData(): MetaUserDataRaw {
  const ud = getMetaUserData();
  try {
    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      // Build the init object with all available fields
      const initData: Record<string, string> = {};
      if (ud.em) initData.em = ud.em;
      if (ud.ph) initData.ph = ud.ph;
      if (ud.fn) initData.fn = ud.fn;
      if (ud.ln) initData.ln = ud.ln;
      if (ud.ct) initData.ct = ud.ct;
      if (ud.st) initData.st = ud.st;
      if (ud.zp) initData.zp = ud.zp;
      if (ud.country) initData.country = ud.country;
      if (ud.db) initData.db = ud.db;
      if (ud.ge) initData.ge = ud.ge;
      if (ud.external_id) initData.external_id = ud.external_id;
      if (ud.fb_login_id) initData.fb_login_id = ud.fb_login_id;
      if (ud.fbc) initData.fbc = ud.fbc;
      if (ud.fbp) initData.fbp = ud.fbp;

      if (Object.keys(initData).length > 0) {
        window.fbq("init", PIXEL_ID, initData);
      }
    }
  } catch { /* ignore */ }
  return ud;
}

// ─── Legacy: keep fbSetUserData for backward compat (useMetaAdvancedMatching) ──
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
  dateOfBirth?: string;
  gender?: string;
  fbLoginId?: string;
}) {
  // Import saveUserDataToStorage to persist
  import("./useMetaUserData").then(({ saveFormDataForMeta }) => {
    saveFormDataForMeta({
      email: data.email,
      phone: data.phone,
      firstName: data.firstName,
      lastName: data.lastName,
      city: data.city,
      state: data.state,
      zip: data.zip,
      dateOfBirth: data.dateOfBirth,
    });
  });
  // Also do immediate init
  reinitWithUserData();
}

// ─── Internal fire helpers ─────────────────────────────────────────────

function fire(event: string, params?: Record<string, any>) {
  try {
    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      // Re-init with latest user data before every event
      reinitWithUserData();

      const eventId = generateEventId();
      _lastEventId = eventId;

      try {
        sessionStorage.setItem(`_meta_eid_${event}`, eventId);
      } catch { /* ignore */ }

      if (params) {
        window.fbq("track", event, params, { eventID: eventId });
      } else {
        window.fbq("track", event, {}, { eventID: eventId });
      }
    }
  } catch { /* ignore */ }
}

function fireCustom(event: string, params?: Record<string, any>) {
  try {
    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      // Re-init with latest user data before every event
      reinitWithUserData();

      const eventId = generateEventId();
      _lastEventId = eventId;

      if (params) {
        window.fbq("trackCustom", event, params, { eventID: eventId });
      } else {
        window.fbq("trackCustom", event, {}, { eventID: eventId });
      }
    }
  } catch { /* ignore */ }
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

export function fbTrackPurchase(params: {
  orderId: string;
  value: number;
  itemCount: number;
  contentIds: string[];
  contents?: Array<{ id: string; quantity: number }>;
}): string {
  // Re-init with latest user data
  reinitWithUserData();

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
 * Get the current user data for CAPI usage.
 * Returns data in CAPI field names.
 */
export function getCachedUserData(): Record<string, string> {
  const raw = getMetaUserData();
  // Return in the same em/ph/fn format for backward compat with CAPI hook
  const data: Record<string, string> = {};
  if (raw.em) data.em = raw.em;
  if (raw.ph) data.ph = raw.ph;
  if (raw.fn) data.fn = raw.fn;
  if (raw.ln) data.ln = raw.ln;
  if (raw.ct) data.ct = raw.ct;
  if (raw.st) data.st = raw.st;
  if (raw.zp) data.zp = raw.zp;
  if (raw.country) data.country = raw.country;
  if (raw.db) data.db = raw.db;
  if (raw.ge) data.ge = raw.ge;
  if (raw.external_id) data.external_id = raw.external_id;
  if (raw.fb_login_id) data.fb_login_id = raw.fb_login_id;
  if (raw.fbc) data.fbc = raw.fbc;
  if (raw.fbp) data.fbp = raw.fbp;
  if (raw.client_ip_address) data.client_ip_address = raw.client_ip_address;
  data.client_user_agent = navigator.userAgent;
  return data;
}
