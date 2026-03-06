/**
 * Meta (Facebook) Pixel event helpers.
 * The base pixel script is injected via TrackingPixelsInjector (admin Pixels tab).
 * These helpers fire standard e-commerce events when `fbq` is available on window.
 */

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

function fire(event: string, params?: Record<string, any>) {
  try {
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", event, params);
    }
  } catch {
    // silently ignore if pixel not loaded
  }
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
