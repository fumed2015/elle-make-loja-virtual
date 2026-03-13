/**
 * Meta (Facebook) Pixel event helpers.
 * The base pixel script is injected via TrackingPixelsInjector (admin Pixels tab).
 * These helpers fire standard e-commerce events when `fbq` is available on window.
 *
 * Because the pixel script loads asynchronously from the database, we queue events
 * and retry until `fbq` becomes available (up to 10 seconds).
 */

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

/** Queue of events waiting for fbq to load */
const pendingEvents: Array<{ method: string; event: string; params?: Record<string, any> }> = [];
let retryTimer: ReturnType<typeof setInterval> | null = null;

function flushQueue() {
  if (typeof window === "undefined" || !window.fbq) return;
  while (pendingEvents.length > 0) {
    const ev = pendingEvents.shift()!;
    try {
      if (ev.params) {
        window.fbq(ev.method, ev.event, ev.params);
      } else {
        window.fbq(ev.method, ev.event);
      }
    } catch {
      // silently ignore
    }
  }
  if (retryTimer) {
    clearInterval(retryTimer);
    retryTimer = null;
  }
}

function startRetry() {
  if (retryTimer) return;
  let attempts = 0;
  retryTimer = setInterval(() => {
    attempts++;
    if (window.fbq) {
      flushQueue();
    } else if (attempts > 50) {
      // Give up after ~10 seconds
      pendingEvents.length = 0;
      if (retryTimer) {
        clearInterval(retryTimer);
        retryTimer = null;
      }
    }
  }, 200);
}

function fire(event: string, params?: Record<string, any>) {
  try {
    if (typeof window === "undefined") return;
    if (window.fbq) {
      if (params) {
        window.fbq("track", event, params);
      } else {
        window.fbq("track", event);
      }
    } else {
      // Queue and retry
      pendingEvents.push({ method: "track", event, params });
      startRetry();
    }
  } catch {
    // silently ignore
  }
}

function fireCustom(event: string, params?: Record<string, any>) {
  try {
    if (typeof window === "undefined") return;
    if (window.fbq) {
      if (params) {
        window.fbq("trackCustom", event, params);
      } else {
        window.fbq("trackCustom", event);
      }
    } else {
      pendingEvents.push({ method: "trackCustom", event, params });
      startRetry();
    }
  } catch {
    // silently ignore
  }
}

/** Page view — should be called on every route change */
export function fbTrackPageView() {
  fire("PageView");
}

/** Product page view */
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
    content_category: [product.brand, product.category].filter(Boolean).join(" > "),
    value: product.price,
    currency: "BRL",
  });
}

/** Item added to cart */
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

/** Checkout initiated */
export function fbTrackInitiateCheckout(params: {
  value: number;
  itemCount: number;
  contentIds: string[];
}) {
  fire("InitiateCheckout", {
    content_ids: params.contentIds,
    content_type: "product",
    value: params.value,
    currency: "BRL",
    num_items: params.itemCount,
  });
}

/** Payment info added */
export function fbTrackAddPaymentInfo(params: {
  value: number;
  contentIds: string[];
  paymentMethod?: string;
}) {
  fire("AddPaymentInfo", {
    content_ids: params.contentIds,
    content_type: "product",
    value: params.value,
    currency: "BRL",
  });
}

/** Purchase completed */
export function fbTrackPurchase(params: {
  orderId: string;
  value: number;
  itemCount: number;
  contentIds: string[];
}) {
  fire("Purchase", {
    content_ids: params.contentIds,
    content_type: "product",
    value: params.value,
    currency: "BRL",
    num_items: params.itemCount,
    order_id: params.orderId,
  });
}

/** Search */
export function fbTrackSearch(query: string) {
  fire("Search", {
    search_string: query,
  });
}

/** Add to wishlist */
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
  });
}

/** Lead — e.g. newsletter signup */
export function fbTrackLead(params?: { value?: number }) {
  fire("Lead", params);
}

/** Contact — e.g. WhatsApp click */
export function fbTrackContact() {
  fire("Contact");
}

/** Custom click event */
export function fbTrackCustomClick(eventName: string, params?: Record<string, any>) {
  fireCustom(eventName, params);
}
