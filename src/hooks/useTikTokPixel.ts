/**
 * TikTok Pixel event helpers + Server-side CAPI deduplication.
 *
 * Client-side: fires via `ttq.track()` (browser pixel)
 * Server-side: sends to tiktok-capi edge function for Events API 2.0
 *
 * Both share the same `event_id` for deduplication.
 *
 * Supported events (per TikTok Ads spec):
 * ViewContent, AddToCart, AddToWishlist, Search, AddPaymentInfo,
 * InitiateCheckout, Contact, PlaceAnOrder, CompleteRegistration, CompletePayment
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

/** Get cached user PII for EMQ enrichment */
function getUserPii(): { email?: string; phone?: string; external_id?: string } {
  try {
    const raw = localStorage.getItem("sb-xinkvwlhctwgdfwixzxf-auth-token");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const user = parsed?.user;
    if (!user) return {};
    return {
      email: user.email || undefined,
      phone: user.user_metadata?.phone || user.phone || undefined,
      external_id: user.id || undefined,
    };
  } catch {
    return {};
  }
}

/** Build common server payload with user matching params */
function buildServerPayload(
  event: string,
  eventId: string,
  extra: Record<string, any> = {}
): Record<string, any> {
  const pii = getUserPii();
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
    ...pii,
    ...extra,
  };
}

/** Build standard client params with event_id */
function clientBase(eventId: string): Record<string, any> {
  return { event_id: eventId, currency: "BRL" };
}

// ─── ViewContent ──────────────────────────────────────────────────────
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
      content_type: "product",
      content_name: product.name,
      brand: product.brand,
      content_category: product.category,
      quantity: 1,
      price: product.price,
    },
  ];

  fireClient("ViewContent", {
    ...clientBase(eventId),
    content_id: String(product.id),
    content_type: "product",
    content_name: product.name,
    value: product.price,
    contents,
  });

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

// ─── AddToCart ─────────────────────────────────────────────────────────
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
      content_type: "product",
      content_name: product.name,
      quantity: product.quantity,
      price: product.price,
    },
  ];

  fireClient("AddToCart", {
    ...clientBase(eventId),
    content_id: String(product.id),
    content_type: "product",
    content_name: product.name,
    quantity: product.quantity,
    value: product.price * product.quantity,
    contents,
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

// ─── AddToWishlist ────────────────────────────────────────────────────
export function trackAddToWishlist(product: {
  id: string;
  name: string;
  price: number;
}) {
  const eventId = crypto.randomUUID();
  const contents = [
    {
      content_id: String(product.id),
      content_type: "product",
      content_name: product.name,
      price: product.price,
      quantity: 1,
    },
  ];

  fireClient("AddToWishlist", {
    ...clientBase(eventId),
    content_id: String(product.id),
    content_type: "product",
    content_name: product.name,
    value: product.price,
    contents,
  });

  fireServer(
    buildServerPayload("AddToWishlist", eventId, {
      content_ids: [String(product.id)],
      content_type: "product",
      contents,
      value: product.price,
    })
  );
}

// ─── Search ───────────────────────────────────────────────────────────
export function trackSearch(params: {
  searchString: string;
  contentIds?: string[];
  value?: number;
}) {
  const eventId = crypto.randomUUID();

  fireClient("Search", {
    ...clientBase(eventId),
    search_string: params.searchString,
    ...(params.contentIds?.length ? { content_id: params.contentIds[0] } : {}),
    value: params.value,
  });

  fireServer(
    buildServerPayload("Search", eventId, {
      search_string: params.searchString,
      content_ids: params.contentIds,
      value: params.value,
    })
  );
}

// ─── AddPaymentInfo ───────────────────────────────────────────────────
export function trackAddPaymentInfo(params: {
  value: number;
  contentIds?: string[];
  contents?: Array<{ content_id: string; quantity: number; price: number }>;
}) {
  const eventId = crypto.randomUUID();
  const contents = params.contents ||
    (params.contentIds || []).map((id) => ({
      content_id: String(id),
      content_type: "product",
      quantity: 1,
    }));

  fireClient("AddPaymentInfo", {
    ...clientBase(eventId),
    value: params.value,
    ...(params.contentIds?.length ? { content_id: params.contentIds[0] } : {}),
    contents,
  });

  fireServer(
    buildServerPayload("AddPaymentInfo", eventId, {
      content_ids: params.contentIds,
      content_type: "product",
      contents,
      value: params.value,
    })
  );
}

// ─── InitiateCheckout ─────────────────────────────────────────────────
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
      content_type: "product",
      quantity: 1,
    }));

  fireClient("InitiateCheckout", {
    ...clientBase(eventId),
    value: params.value,
    quantity: params.itemCount,
    ...(params.contentIds?.length ? { content_id: params.contentIds[0] } : {}),
    content_ids: params.contentIds,
    contents,
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

// ─── Contact ──────────────────────────────────────────────────────────
export function trackContact() {
  const eventId = crypto.randomUUID();

  fireClient("Contact", {
    ...clientBase(eventId),
  });

  fireServer(buildServerPayload("Contact", eventId, {}));
}

// ─── PlaceAnOrder ─────────────────────────────────────────────────────
export function trackPlaceAnOrder(params: {
  orderId: string;
  value: number;
  itemCount: number;
  contentIds?: string[];
  contents?: Array<{ content_id: string; quantity: number; price: number }>;
}) {
  const eventId = crypto.randomUUID();
  const contents = params.contents ||
    (params.contentIds || []).map((id) => ({
      content_id: String(id),
      content_type: "product",
      quantity: 1,
    }));

  fireClient("PlaceAnOrder", {
    ...clientBase(eventId),
    content_type: "product",
    value: params.value,
    quantity: params.itemCount,
    order_id: params.orderId,
    ...(params.contentIds?.length ? { content_id: params.contentIds[0] } : {}),
    contents,
  });

  fireServer(
    buildServerPayload("PlaceAnOrder", eventId, {
      content_ids: params.contentIds,
      content_type: "product",
      contents,
      value: params.value,
      num_items: params.itemCount,
      order_id: params.orderId,
    })
  );
}

// ─── CompleteRegistration ─────────────────────────────────────────────
export function trackCompleteRegistration() {
  const eventId = crypto.randomUUID();

  fireClient("CompleteRegistration", {
    ...clientBase(eventId),
  });

  fireServer(buildServerPayload("CompleteRegistration", eventId, {}));
}

// ─── SubmitForm (Lead / Newsletter) ──────────────────────────────────
export function trackSubmitForm(params?: { description?: string }) {
  const eventId = crypto.randomUUID();

  fireClient("SubmitForm", {
    ...clientBase(eventId),
    ...(params?.description ? { description: params.description } : {}),
  });

  fireServer(buildServerPayload("SubmitForm", eventId, {
    ...(params?.description ? { description: params.description } : {}),
  }));
}

interface TrackPurchaseParams {
  orderId: string;
  value: number;
  itemCount: number;
  contentIds?: string[];
  contents?: Array<{ content_id: string; quantity: number; price: number; content_name?: string }>;
}

export function trackPurchase(params: TrackPurchaseParams): void {
  const eventId = crypto.randomUUID();
  const contents = params.contents ||
    (params.contentIds || []).map((id) => ({
      content_id: String(id),
      content_type: "product",
      quantity: 1,
    }));

  fireClient("CompletePayment", {
    ...clientBase(eventId),
    content_type: "product",
    value: params.value,
    quantity: params.itemCount,
    order_id: params.orderId,
    ...(params.contentIds?.length ? { content_id: params.contentIds[0] } : {}),
    content_ids: params.contentIds,
    contents,
  });

  fireServer(
    buildServerPayload("CompletePayment", eventId, {
      content_ids: params.contentIds,
      content_type: "product",
      contents,
      value: params.value,
      num_items: params.itemCount,
      order_id: params.orderId,
    })
  );
}
