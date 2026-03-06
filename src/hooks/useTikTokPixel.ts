/**
 * TikTok Pixel event helpers.
 * The base pixel script is injected via TrackingPixelsInjector (admin Pixels tab).
 * These helpers fire standard e-commerce events when `ttq` is available on window.
 */

declare global {
  interface Window {
    ttq?: {
      track: (event: string, params?: Record<string, any>) => void;
      page: () => void;
    };
  }
}

function fire(event: string, params?: Record<string, any>) {
  try {
    if (typeof window !== "undefined" && window.ttq) {
      window.ttq.track(event, params);
    }
  } catch {
    // silently ignore if pixel not loaded
  }
}

/** Product page view */
export function trackViewContent(product: {
  id: string;
  name: string;
  price: number;
  category?: string;
  brand?: string;
}) {
  fire("ViewContent", {
    content_id: product.id,
    content_type: "product",
    content_name: product.name,
    value: product.price,
    currency: "BRL",
    description: [product.brand, product.category].filter(Boolean).join(" – "),
  });
}

/** Item added to cart */
export function trackAddToCart(product: {
  id: string;
  name: string;
  price: number;
  quantity: number;
}) {
  fire("AddToCart", {
    content_id: product.id,
    content_type: "product",
    content_name: product.name,
    quantity: product.quantity,
    value: product.price * product.quantity,
    currency: "BRL",
  });
}

/** Checkout initiated */
export function trackInitiateCheckout(params: {
  value: number;
  itemCount: number;
}) {
  fire("InitiateCheckout", {
    value: params.value,
    currency: "BRL",
    quantity: params.itemCount,
  });
}

/** Purchase completed */
export function trackPurchase(params: {
  orderId: string;
  value: number;
  itemCount: number;
}) {
  fire("CompletePayment", {
    content_type: "product",
    value: params.value,
    currency: "BRL",
    quantity: params.itemCount,
    order_id: params.orderId,
  });
}
