/**
 * Meta (Facebook) Pixel – Standard Event Helpers
 *
 * The base pixel script (init + PageView) is hardcoded in index.html so it
 * fires immediately on every page load — no async DB fetch needed.
 *
 * These helpers call fbq('track', …) for each standard e-commerce event,
 * following the official Meta Pixel conversion-tracking spec:
 * https://developers.facebook.com/docs/meta-pixel/implementation/conversion-tracking
 *
 * All monetary values use currency: "BRL".
 */

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

const PIXEL_ID = "1447990610311925";

// ─── Advanced Matching ─────────────────────────────────────────────────
/**
 * Re-initialises the pixel with user PII so Meta can match conversions
 * to real people (improves Event Match Quality / EMQ score).
 *
 * Data is sent in clear-text to fbq(); the JS SDK hashes it
 * automatically before transmitting.
 *
 * Normalisation follows Meta's spec (the CSV reference):
 *  - email: trim + lowercase
 *  - phone: digits only, strip leading zeros, prepend country code 55 (BR)
 *  - names / city: trim + lowercase
 *  - state: 2-letter lowercase
 *  - zip: digits only
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
}) {
  try {
    if (typeof window === "undefined" || typeof window.fbq !== "function") return;

    const ud: Record<string, string> = {};

    if (data.email) ud.em = data.email.trim().toLowerCase();

    if (data.phone) {
      let ph = data.phone.replace(/\D/g, "").replace(/^0+/, "");
      // Prepend BR country code if not present
      if (ph.length === 10 || ph.length === 11) ph = "55" + ph;
      if (ph) ud.ph = ph;
    }

    if (data.firstName) ud.fn = data.firstName.trim().toLowerCase();
    if (data.lastName) ud.ln = data.lastName.trim().toLowerCase();
    if (data.city) ud.ct = data.city.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (data.state) ud.st = data.state.trim().toLowerCase().slice(0, 2);
    if (data.zip) ud.zp = data.zip.replace(/\D/g, "");
    ud.country = (data.country || "br").toLowerCase();

    if (Object.keys(ud).length > 1) {
      // Re-init with user data for Advanced Matching
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
      if (params) {
        window.fbq("track", event, params);
      } else {
        window.fbq("track", event);
      }
    }
  } catch {
    // silently ignore
  }
}

function fireCustom(event: string, params?: Record<string, any>) {
  try {
    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      if (params) {
        window.fbq("trackCustom", event, params);
      } else {
        window.fbq("trackCustom", event);
      }
    }
  } catch {
    // silently ignore
  }
}

// ─── Standard Events ───────────────────────────────────────────────────

/**
 * PageView – already fired by the base code in index.html on first load.
 * Call this on SPA route changes so Meta sees each "virtual" page.
 */
export function fbTrackPageView() {
  fire("PageView");
}

/**
 * ViewContent – When a visitor views a product page.
 * @see https://developers.facebook.com/docs/meta-pixel/reference#standard-events
 */
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

/**
 * AddToCart – When an item is added to the shopping cart.
 */
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

/**
 * InitiateCheckout – When a visitor starts the checkout flow.
 */
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

/**
 * AddPaymentInfo – When payment information is submitted.
 */
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
 * Purchase – When a purchase is completed (order confirmed).
 * This is the most important conversion event for ROAS tracking.
 */
export function fbTrackPurchase(params: {
  orderId: string;
  value: number;
  itemCount: number;
  contentIds: string[];
  contents?: Array<{ id: string; quantity: number }>;
}) {
  fire("Purchase", {
    content_ids: params.contentIds,
    content_type: "product",
    value: params.value,
    currency: "BRL",
    num_items: params.itemCount,
    contents: params.contents,
    delivery_category: "home_delivery",
  });
}

/**
 * Search – When a search is performed.
 */
export function fbTrackSearch(query: string) {
  fire("Search", {
    search_string: query,
  });
}

/**
 * AddToWishlist – When a product is added to favorites.
 */
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

/**
 * CompleteRegistration – When a visitor completes signup.
 */
export function fbTrackCompleteRegistration(params?: { value?: number }) {
  fire("CompleteRegistration", {
    status: true,
    currency: "BRL",
    ...params,
  });
}

/**
 * Lead – When a visitor signs up for newsletter or becomes a lead.
 */
export function fbTrackLead(params?: { value?: number }) {
  fire("Lead", {
    currency: "BRL",
    ...params,
  });
}

/**
 * Contact – When a visitor initiates contact (e.g. WhatsApp click).
 */
export function fbTrackContact() {
  fire("Contact");
}

/**
 * ViewCategory – Custom event for category page views.
 */
export function fbTrackViewCategory(category: { name: string; slug: string }) {
  fireCustom("ViewCategory", {
    content_category: category.name,
    content_name: category.slug,
  });
}

/**
 * Generic custom event.
 */
export function fbTrackCustom(eventName: string, params?: Record<string, any>) {
  fireCustom(eventName, params);
}
