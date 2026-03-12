import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AMAZON_API = "https://sellingpartnerapi-na.amazon.com";

function supabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function verifyAdmin(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await sb.auth.getClaims(token);
  if (error || !data?.claims) {
    return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const adminClient = supabaseAdmin();
  const { data: isAdmin } = await adminClient.rpc("has_role", { _user_id: data.claims.sub, _role: "admin" });
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Acesso negado - apenas administradores" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  return null;
}

async function getToken(sb: ReturnType<typeof supabaseAdmin>) {
  const { data } = await sb
    .from("marketplace_tokens")
    .select("*")
    .eq("marketplace", "amazon")
    .maybeSingle();
  return data;
}

async function refreshLWAToken(sb: ReturnType<typeof supabaseAdmin>, refreshToken: string) {
  const clientId = Deno.env.get("AMAZON_CLIENT_ID");
  const clientSecret = Deno.env.get("AMAZON_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("AMAZON_CLIENT_ID ou AMAZON_CLIENT_SECRET não configurados");

  const res = await fetch("https://api.amazon.com/auth/o2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Amazon LWA error: ${JSON.stringify(body)}`);

  const expiresAt = new Date(Date.now() + body.expires_in * 1000).toISOString();
  await sb.from("marketplace_tokens").upsert({
    marketplace: "amazon",
    access_token: body.access_token,
    refresh_token: refreshToken,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }, { onConflict: "marketplace" });

  return body.access_token;
}

async function getValidToken(sb: ReturnType<typeof supabaseAdmin>) {
  const token = await getToken(sb);
  if (!token?.refresh_token) throw new Error("Amazon não conectada. Configure o Refresh Token.");
  if (!token.access_token || (token.expires_at && new Date(token.expires_at) < new Date())) {
    return refreshLWAToken(sb, token.refresh_token);
  }
  return token.access_token;
}

async function logSync(sb: ReturnType<typeof supabaseAdmin>, operation: string, status: string, details: Record<string, unknown> = {}, error?: string) {
  await sb.from("marketplace_sync_logs").insert({
    marketplace: "amazon",
    operation,
    status,
    error_message: error || null,
    details,
    items_processed: (details.processed as number) || 0,
    items_failed: (details.failed as number) || 0,
    completed_at: status !== "started" ? new Date().toISOString() : null,
  });
}

// ── Sync Products → Amazon (Listings Feed) ──
async function syncProducts() {
  const sb = supabaseAdmin();
  const accessToken = await getValidToken(sb);
  await logSync(sb, "product_sync", "started");

  const { data: products } = await sb
    .from("products")
    .select("*, marketplace_listings!left(id, external_id, marketplace)")
    .eq("is_active", true);

  const { data: config } = await sb.from("marketplace_configs").select("*").eq("marketplace_id", "amazon").maybeSingle();
  const sellerId = config?.seller_id || Deno.env.get("AMAZON_SELLER_ID") || "";

  let processed = 0, failed = 0;

  // Amazon SP-API uses JSON Listings Feed
  const listings: any[] = [];
  for (const product of (products || [])) {
    try {
      let price = Number(product.price);
      if (config?.price_rule === "markup") {
        price = price * (1 + Number(config.markup_percent || 0) / 100);
      }

      const listing = {
        sku: product.slug || product.id,
        productType: "BEAUTY",
        attributes: {
          item_name: [{ value: product.name, language_tag: "pt_BR" }],
          brand_name: [{ value: product.brand || "Genérica" }],
          list_price: [{ value: price, currency: "BRL" }],
          fulfillment_availability: [{ fulfillment_channel_code: "DEFAULT", quantity: product.stock }],
          bullet_point: product.description ? [{ value: product.description.substring(0, 500), language_tag: "pt_BR" }] : [],
          main_product_image_locator: product.images?.[0] ? [{ value: product.images[0] }] : [],
        },
      };

      // PUT listing via Listings API
      const res = await fetch(
        `${AMAZON_API}/listings/2021-08-01/items/${sellerId}/${encodeURIComponent(listing.sku)}?marketplaceIds=A2Q3Y263D00KWC`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "x-amz-access-token": accessToken,
          },
          body: JSON.stringify({
            productType: listing.productType,
            requirements: "LISTING",
            attributes: listing.attributes,
          }),
        }
      );
      const body = await res.json();

      await sb.from("marketplace_listings").upsert({
        product_id: product.id,
        marketplace: "amazon",
        external_id: listing.sku,
        status: res.ok ? "active" : "error",
        sync_error: res.ok ? null : JSON.stringify(body),
        last_synced_at: new Date().toISOString(),
        metadata: { sku: listing.sku },
      }, { onConflict: "product_id,marketplace" });

      if (res.ok) processed++;
      else failed++;
    } catch (err: any) {
      failed++;
      await sb.from("marketplace_listings").upsert({
        product_id: product.id,
        marketplace: "amazon",
        status: "error",
        sync_error: err.message,
        last_synced_at: new Date().toISOString(),
      }, { onConflict: "product_id,marketplace" });
    }
  }

  await logSync(sb, "product_sync", failed > 0 ? "partial" : "success", { processed, failed });
  return { processed, failed };
}

// ── Import Orders from Amazon ──
async function importOrders() {
  const sb = supabaseAdmin();
  const accessToken = await getValidToken(sb);
  await logSync(sb, "order_import", "started");

  const createdAfter = new Date(Date.now() - 7 * 86400000).toISOString();
  const res = await fetch(
    `${AMAZON_API}/orders/v0/orders?MarketplaceIds=A2Q3Y263D00KWC&CreatedAfter=${createdAfter}&OrderStatuses=Unshipped,PartiallyShipped,Shipped`,
    { headers: { Authorization: `Bearer ${accessToken}`, "x-amz-access-token": accessToken } }
  );
  const body = await res.json();
  if (!res.ok) throw new Error(`Amazon orders error: ${JSON.stringify(body)}`);

  let processed = 0, failed = 0;
  for (const order of body.payload?.Orders || []) {
    try {
      await sb.from("marketplace_orders").upsert({
        marketplace: "amazon",
        external_order_id: order.AmazonOrderId,
        buyer_name: order.BuyerInfo?.BuyerName || "",
        buyer_email: order.BuyerInfo?.BuyerEmail || "",
        total: Number(order.OrderTotal?.Amount || 0),
        status: order.OrderStatus,
        shipping_address: order.ShippingAddress || null,
        raw_data: order,
        updated_at: new Date().toISOString(),
      }, { onConflict: "marketplace,external_order_id" });
      processed++;
    } catch {
      failed++;
    }
  }

  await logSync(sb, "order_import", "success", { processed, failed });
  return { processed, failed };
}

// ── Webhook (Amazon SNS/SQS notification) ──
async function handleWebhook(body: any) {
  const sb = supabaseAdmin();
  await logSync(sb, "webhook", "started", { type: body.NotificationType || "unknown" });

  try {
    const notificationType = body.NotificationType;

    if (notificationType === "ORDER_STATUS_CHANGE") {
      const orderData = body.Payload?.OrderStatusChangeNotification;
      if (orderData) {
        await sb.from("marketplace_orders")
          .update({ status: orderData.OrderStatus, updated_at: new Date().toISOString() })
          .eq("marketplace", "amazon")
          .eq("external_order_id", orderData.AmazonOrderId);
      }
    }

    await logSync(sb, "webhook", "success", { type: notificationType });
  } catch (err: any) {
    await logSync(sb, "webhook", "error", {}, err.message);
  }

  return { received: true };
}

// ── Main Handler ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));

      // Webhook from Amazon
      if (body.NotificationType) {
        const result = await handleWebhook(body);
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      let result: any;
      switch (action) {
        case "sync_products":
          result = await syncProducts();
          break;
        case "import_orders":
          result = await importOrders();
          break;
        case "configure": {
          const sb = supabaseAdmin();
          const refreshToken = body.refresh_token;
          if (!refreshToken) throw new Error("refresh_token é obrigatório");
          await sb.from("marketplace_tokens").upsert({
            marketplace: "amazon",
            refresh_token: refreshToken,
            seller_id: body.seller_id || "",
            updated_at: new Date().toISOString(),
          }, { onConflict: "marketplace" });
          // Test token refresh
          const accessToken = await refreshLWAToken(sb, refreshToken);
          await sb.from("marketplace_configs").update({ enabled: true, status: "connected" }).eq("marketplace_id", "amazon");
          result = { success: true, token_valid: !!accessToken };
          break;
        }
        case "status": {
          const sb = supabaseAdmin();
          const token = await getToken(sb);
          result = {
            connected: !!token?.refresh_token,
            seller_id: token?.seller_id,
            expires_at: token?.expires_at,
          };
          break;
        }
        default:
          return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("Amazon Edge Function Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
