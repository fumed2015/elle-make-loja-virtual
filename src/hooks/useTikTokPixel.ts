/**
 * TikTok Pixel event helpers + Server-side CAPI deduplication.
 *
 * Client-side: fires via `ttq.track()` (browser pixel)
 * Server-side: sends to tiktok-capi edge function for Events API 2.0
 *
 * Both share the same `event_id` for deduplication.
 */

import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    ttq?: {
      track: (event: string, params?: Record<string, any>) => void;
      page: () => void;
    };
  }
}

/** Get _ttp cookie value */
function getTtp(): string | undefined {
  try {
    const match = document.cookie.match(/_ttp=([^;]+)/);
    return match?.[1];
  } catch {
    return undefined;
  }
}

/** Get ttclid from URL or sessionStorage */
function getTtclid(): string | undefined {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("ttclid");
    if (fromUrl) {
      sessionStorage.setItem("ttclid", fromUrl);
      return fromUrl;
    }
    return sessionStorage.getItem("ttclid") || undefined;
  } catch {
    return undefined;
  }
}

/** Fire client-side pixel event */
function fireClient(event: string, params?: Record<string, any>) {
  try {
    if (typeof window !== "undefined" && window.ttq) {
      window.ttq.track(event, params);
    }
  } catch {
    // silently ignore
  }
}

/** Send server-side event via edge function (fire-and-forget) */
function fireServer(payload: Record<string, any>) {
  try {
    supabase.functions.invoke("tiktok-capi", { body: payload }).catch((err) => {
      console.warn("TikTok CAPI server-side failed:", err);
    });
  } catch {
    // silently ignore
  }
}

/** Build common server payload with user matching params */
function buildServerPayload(
  event: string,
  eventId: string,
  extra: Record<string, any> = {}
): Record<string, any> {
  return {
    event,
    event_id: eventId,
    event_time: Math.floor(Date.now() / 1000),
    url: window.location.href,
    referrer: document.referrer || undefined,
    user_agent: navigator.userAgent,
    ttp: getTtp(),
    ttclid: getTtclid(),
    locale: navigator.language,
    currency: "BRL",
    ...extra,
  };
}

/** Product page view */
export function trackViewContent(product: {
  id: string;
  name: string;
  price: number;
  category?: string;
  brand?: string;
}) {
  const eventId = crypto.randomUUID();
  const contents = [
    {
      content_id: String(product.id),
      content_type: "product" as const,
      content_name: product.name,
      brand: product.brand,
      content_category: product.category,
      quantity: 1,
      price: product.price,
    },
  ];

  // Client-side
  fireClient("ViewContent", {
    content_id: String(product.id),
    content_type: "product",
    content_name: product.name,
    value: product.price,
    currency: "BRL",
    contents,
    event_id: eventId,
  });

  // Server-side
  fireServer(
    buildServerPayload("ViewContent", eventId, {
      content_ids: [String(product.id)],
      content_type: "product",
      contents,
      value: product.price,
      description: [product.brand, product.category].filter(Boolean).join(" – "),
    })
  );
}

/** Item added to cart */
export function trackAddToCart(product: {
  id: string;
  name: string;
  price: number;
  quantity: number;
}) {
  const eventId = crypto.randomUUID();
  const contents = [
    {
      content_id: String(product.id),
      content_type: "product" as const,
      content_name: product.name,
      quantity: product.quantity,
      price: product.price,
    },
  ];

  fireClient("AddToCart", {
    content_id: String(product.id),
    content_type: "product",
    content_name: product.name,
    quantity: product.quantity,
    value: product.price * product.quantity,
    currency: "BRL",
    contents,
    event_id: eventId,
  });

  fireServer(
    buildServerPayload("AddToCart", eventId, {
      content_ids: [String(product.id)],
      content_type: "product",
      contents,
      value: product.price * product.quantity,
      num_items: product.quantity,
    })
  );
}

/** Checkout initiated */
export function trackInitiateCheckout(params: {
  value: number;
  itemCount: number;
  contentIds?: string[];
  contents?: Array<{ content_id: string; quantity: number; price: number; content_name?: string }>;
}) {
  const eventId = crypto.randomUUID();
  const contents = params.contents ||
    (params.contentIds || []).map((id) => ({
      content_id: String(id),
      content_type: "product" as const,
      quantity: 1,
    }));

  fireClient("InitiateCheckout", {
    value: params.value,
    currency: "BRL",
    quantity: params.itemCount,
    ...(params.contentIds?.length ? { content_id: String(params.contentIds[0]) } : {}),
    content_ids: params.contentIds,
    contents,
    event_id: eventId,
  });

  fireServer(
    buildServerPayload("InitiateCheckout", eventId, {
      content_ids: params.contentIds,
      content_type: "product",
      contents,
      value: params.value,
      num_items: params.itemCount,
    })
  );
}

/** Purchase completed */
export function trackPurchase(params: {
  orderId: string;
  value: number;
  itemCount: number;
  contentIds?: string[];
  contents?: Array<{ content_id: string; quantity: number; price: number; content_name?: string }>;
  email?: string;
  phone?: string;
}) {
  const eventId = crypto.randomUUID();
  const contents = params.contents ||
    (params.contentIds || []).map((id) => ({
      content_id: String(id),
      content_type: "product" as const,
      quantity: 1,
    }));

  fireClient("CompletePayment", {
    content_type: "product",
    value: params.value,
    currency: "BRL",
    quantity: params.itemCount,
    order_id: params.orderId,
    ...(params.contentIds?.length ? { content_id: String(params.contentIds[0]) } : {}),
    content_ids: params.contentIds,
    contents,
    event_id: eventId,
  });

  fireServer(
    buildServerPayload("CompletePayment", eventId, {
      content_ids: params.contentIds,
      content_type: "product",
      contents,
      value: params.value,
      num_items: params.itemCount,
      order_id: params.orderId,
      email: params.email,
      phone: params.phone,
    })
  );
}
