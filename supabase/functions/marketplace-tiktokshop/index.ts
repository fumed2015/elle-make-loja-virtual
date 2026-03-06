import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function hmacSHA256(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", encoder.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIKTOK_API = "https://open-api.tiktokglobalshop.com";

function supabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

function getAppKey(): string {
  const key = Deno.env.get("TIKTOK_SHOP_APP_KEY");
  if (!key) throw new Error("TIKTOK_SHOP_APP_KEY não configurado");
  return key;
}

function getAppSecret(): string {
  const secret = Deno.env.get("TIKTOK_SHOP_APP_SECRET");
  if (!secret) throw new Error("TIKTOK_SHOP_APP_SECRET não configurado");
  return secret;
}

// TikTok Shop API v2 signature: HMAC-SHA256 of sorted params
async function generateSign(path: string, params: Record<string, string>, body?: string): Promise<string> {
  const appSecret = getAppSecret();
  // Sort params by key, exclude sign and access_token
  const sortedKeys = Object.keys(params)
    .filter(k => k !== "sign" && k !== "access_token")
    .sort();
  const paramString = sortedKeys.map(k => `${k}${params[k]}`).join("");
  const signString = `${appSecret}${path}${paramString}${body || ""}${appSecret}`;
  return await hmacSHA256(appSecret, signString);
}

async function getToken(sb: ReturnType<typeof supabaseAdmin>) {
  const { data } = await sb
    .from("marketplace_tokens")
    .select("*")
    .eq("marketplace", "tiktokshop")
    .maybeSingle();
  return data;
}

async function refreshAccessToken(sb: ReturnType<typeof supabaseAdmin>, refreshToken: string) {
  const appKey = getAppKey();
  const appSecret = getAppSecret();

  // TikTok uses query params for token refresh
  const url = new URL(`${TIKTOK_API}/api/v2/token/refresh`);
  url.searchParams.set("app_key", appKey);
  url.searchParams.set("app_secret", appSecret);
  url.searchParams.set("refresh_token", refreshToken);
  url.searchParams.set("grant_type", "refresh_token");

  const res = await fetch(url.toString(), { method: "GET" });
  const body = await res.json();
  if (body.code !== 0) throw new Error(`TikTok token refresh error: ${body.message || JSON.stringify(body)}`);

  const tokenData = body.data;
  const expiresAt = new Date(Date.now() + (tokenData.access_token_expire_in || 7200) * 1000).toISOString();

  await sb.from("marketplace_tokens").upsert({
    marketplace: "tiktokshop",
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: expiresAt,
    seller_id: tokenData.open_id || "",
    updated_at: new Date().toISOString(),
    extra: { shop_cipher: tokenData.shop_cipher || null },
  }, { onConflict: "marketplace" });

  return tokenData.access_token;
}

async function getValidToken(sb: ReturnType<typeof supabaseAdmin>) {
  const token = await getToken(sb);
  if (!token?.refresh_token) throw new Error("TikTok Shop não conectado. Faça a autorização OAuth primeiro.");
  if (!token.access_token || (token.expires_at && new Date(token.expires_at) < new Date())) {
    return refreshAccessToken(sb, token.refresh_token);
  }
  return token.access_token;
}

async function logSync(sb: ReturnType<typeof supabaseAdmin>, operation: string, status: string, details: Record<string, unknown> = {}, error?: string) {
  await sb.from("marketplace_sync_logs").insert({
    marketplace: "tiktokshop",
    operation,
    status,
    error_message: error || null,
    details,
    items_processed: (details.processed as number) || 0,
    items_failed: (details.failed as number) || 0,
    completed_at: status !== "started" ? new Date().toISOString() : null,
  });
}

async function tiktokFetch(path: string, accessToken: string, method: string = "GET", body?: any) {
  const appKey = getAppKey();
  const timestamp = String(Math.floor(Date.now() / 1000));
  const params: Record<string, string> = {
    app_key: appKey,
    timestamp,
  };

  const bodyString = body ? JSON.stringify(body) : undefined;
  const sign = await generateSign(path, params, bodyString);
  params.sign = sign;
  params.access_token = accessToken;

  const url = new URL(`${TIKTOK_API}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const options: RequestInit = {
    method,
    headers: { "Content-Type": "application/json", "x-tts-access-token": accessToken },
  };
  if (bodyString && method !== "GET") {
    options.body = bodyString;
  }

  const res = await fetch(url.toString(), options);
  const responseBody = await res.json();
  return responseBody;
}

// ── OAuth: exchange auth code for access token ──
async function handleOAuthCallback(authCode: string) {
  const sb = supabaseAdmin();
  const appKey = getAppKey();
  const appSecret = getAppSecret();

  const url = new URL(`${TIKTOK_API}/api/v2/token/get`);
  url.searchParams.set("app_key", appKey);
  url.searchParams.set("app_secret", appSecret);
  url.searchParams.set("auth_code", authCode);
  url.searchParams.set("grant_type", "authorized_code");

  const res = await fetch(url.toString(), { method: "GET" });
  const body = await res.json();
  if (body.code !== 0) throw new Error(`TikTok OAuth error: ${body.message || JSON.stringify(body)}`);

  const tokenData = body.data;
  const expiresAt = new Date(Date.now() + (tokenData.access_token_expire_in || 7200) * 1000).toISOString();

  await sb.from("marketplace_tokens").upsert({
    marketplace: "tiktokshop",
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: expiresAt,
    seller_id: tokenData.open_id || "",
    updated_at: new Date().toISOString(),
    extra: { shop_cipher: tokenData.shop_cipher || null },
  }, { onConflict: "marketplace" });

  await sb.from("marketplace_configs").update({ enabled: true, status: "connected" }).eq("marketplace_id", "tiktokshop");
  await logSync(sb, "oauth", "success", { open_id: tokenData.open_id });

  return { success: true, open_id: tokenData.open_id };
}

// ── Sync Products → TikTok Shop ──
async function syncProducts() {
  const sb = supabaseAdmin();
  const accessToken = await getValidToken(sb);
  await logSync(sb, "product_sync", "started");

  const { data: products } = await sb
    .from("products")
    .select("*, marketplace_listings!left(id, external_id, marketplace)")
    .eq("is_active", true);

  const { data: config } = await sb.from("marketplace_configs").select("*").eq("marketplace_id", "tiktokshop").maybeSingle();

  let processed = 0, failed = 0;

  for (const product of (products || [])) {
    try {
      const listing = (product as any).marketplace_listings?.find((l: any) => l.marketplace === "tiktokshop");

      let price = Number(product.price);
      if (config?.price_rule === "markup") {
        price = price * (1 + Number(config.markup_percent || 0) / 100);
      }
      // TikTok expects price in cents (minor units)
      const priceCents = String(Math.round(price * 100));

      const tiktokProduct = {
        product_name: (product.name || "").substring(0, 255),
        description: product.description || product.name || "",
        category_id: "600001", // Beauty & Personal Care default
        brand_id: "",
        images: (product.images || []).slice(0, 9).map((url: string) => ({ img_url: url })),
        skus: [
          {
            original_price: priceCents,
            stock_infos: [{ available_stock: product.stock }],
            seller_sku: product.slug || product.id,
          },
        ],
        is_cod_allowed: false,
        package_weight: { value: "200", unit: "GRAM" },
      };

      if (listing?.external_id) {
        // Update existing product
        const result = await tiktokFetch(
          "/api/products",
          accessToken,
          "PUT",
          { product_id: listing.external_id, ...tiktokProduct }
        );

        const success = result.code === 0;
        await sb.from("marketplace_listings").update({
          last_synced_at: new Date().toISOString(),
          status: success ? "active" : "error",
          sync_error: success ? null : (result.message || JSON.stringify(result)),
        }).eq("id", listing.id);

        if (success) processed++; else failed++;
      } else {
        // Create new product
        const result = await tiktokFetch(
          "/api/products",
          accessToken,
          "POST",
          tiktokProduct
        );

        const success = result.code === 0;
        const productId = result.data?.product_id;

        await sb.from("marketplace_listings").upsert({
          product_id: product.id,
          marketplace: "tiktokshop",
          external_id: productId || null,
          status: success ? "active" : "error",
          sync_error: success ? null : (result.message || JSON.stringify(result)),
          last_synced_at: new Date().toISOString(),
          metadata: { seller_sku: product.slug || product.id },
        }, { onConflict: "product_id,marketplace" });

        if (success) processed++; else failed++;
      }
    } catch (err: any) {
      failed++;
      await sb.from("marketplace_listings").upsert({
        product_id: product.id,
        marketplace: "tiktokshop",
        status: "error",
        sync_error: err.message,
        last_synced_at: new Date().toISOString(),
      }, { onConflict: "product_id,marketplace" });
    }
  }

  await logSync(sb, "product_sync", failed > 0 ? "partial" : "success", { processed, failed });
  return { processed, failed };
}

// ── Update Stock on TikTok Shop ──
async function updateStock(productId: string, stock: number) {
  const sb = supabaseAdmin();
  const accessToken = await getValidToken(sb);

  const { data: listing } = await sb
    .from("marketplace_listings")
    .select("external_id")
    .eq("product_id", productId)
    .eq("marketplace", "tiktokshop")
    .maybeSingle();

  if (!listing?.external_id) throw new Error("Produto não listado no TikTok Shop");

  // Get product details to find SKU ID
  const productDetail = await tiktokFetch(`/api/products/${listing.external_id}`, accessToken);
  if (productDetail.code !== 0) throw new Error(`Erro ao buscar produto: ${productDetail.message}`);

  const skuId = productDetail.data?.skus?.[0]?.id;
  if (!skuId) throw new Error("SKU não encontrado no TikTok Shop");

  const result = await tiktokFetch("/api/products/stocks", accessToken, "PUT", {
    product_id: listing.external_id,
    skus: [{ id: skuId, stock_infos: [{ available_stock: stock }] }],
  });

  if (result.code !== 0) throw new Error(`Erro ao atualizar estoque: ${result.message}`);
  return { success: true, product_id: listing.external_id };
}

// ── Import Orders from TikTok Shop ──
async function importOrders() {
  const sb = supabaseAdmin();
  const accessToken = await getValidToken(sb);
  await logSync(sb, "order_import", "started");

  const sevenDaysAgo = Math.floor((Date.now() - 7 * 86400000) / 1000);
  const result = await tiktokFetch("/api/orders/search", accessToken, "POST", {
    create_time_ge: sevenDaysAgo,
    page_size: 50,
  });

  if (result.code !== 0) throw new Error(`TikTok orders error: ${result.message || JSON.stringify(result)}`);

  let processed = 0, failed = 0;
  const orders = result.data?.order_list || [];

  for (const order of orders) {
    try {
      const items = (order.item_list || []).map((item: any) => ({
        product_name: item.product_name,
        sku_name: item.sku_name,
        quantity: item.quantity,
        sale_price: item.sale_price,
        seller_sku: item.seller_sku,
      }));

      await sb.from("marketplace_orders").upsert({
        marketplace: "tiktokshop",
        external_order_id: order.order_id,
        buyer_name: order.recipient_address?.name || "",
        buyer_phone: order.recipient_address?.phone || "",
        total: Number(order.payment_info?.total_amount || 0) / 100, // convert from cents
        status: order.order_status,
        shipping_address: order.recipient_address || null,
        shipping_cost: Number(order.payment_info?.shipping_fee || 0) / 100,
        marketplace_fee: Number(order.payment_info?.platform_discount || 0) / 100,
        items,
        raw_data: order,
        updated_at: new Date().toISOString(),
      }, { onConflict: "marketplace,external_order_id" });
      processed++;
    } catch {
      failed++;
    }
  }

  await logSync(sb, "order_import", "success", { processed, failed, total: orders.length });
  return { processed, failed };
}

// ── Handle Webhook from TikTok Shop ──
async function handleWebhook(body: any) {
  const sb = supabaseAdmin();
  const eventType = body.type || "unknown";
  await logSync(sb, "webhook", "started", { type: eventType });

  try {
    if (eventType === "ORDER_STATUS_CHANGE" || eventType === "1") {
      const orderData = body.data;
      if (orderData?.order_id) {
        await sb.from("marketplace_orders")
          .update({ status: orderData.order_status || body.data?.status, updated_at: new Date().toISOString() })
          .eq("marketplace", "tiktokshop")
          .eq("external_order_id", orderData.order_id);
      }
    }

    if (eventType === "PRODUCT_STATUS_CHANGE" || eventType === "4") {
      const productData = body.data;
      if (productData?.product_id) {
        await sb.from("marketplace_listings")
          .update({ status: productData.status === "LIVE" ? "active" : "inactive", last_synced_at: new Date().toISOString() })
          .eq("marketplace", "tiktokshop")
          .eq("external_id", productData.product_id);
      }
    }

    await logSync(sb, "webhook", "success", { type: eventType });
  } catch (err: any) {
    await logSync(sb, "webhook", "error", { type: eventType }, err.message);
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

    // OAuth callback (GET with auth_code)
    if (req.method === "GET" && action === "oauth_callback") {
      const authCode = url.searchParams.get("code");
      if (!authCode) throw new Error("Auth code não fornecido");
      const result = await handleOAuthCallback(authCode);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Generate OAuth URL
    if (req.method === "GET" && action === "oauth_url") {
      const appKey = getAppKey();
      const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/marketplace-tiktokshop?action=oauth_callback`;
      const oauthUrl = `https://services.tiktokshop.com/open/authorize?service_id=${appKey}&redirect_uri=${encodeURIComponent(redirectUri)}`;
      return new Response(JSON.stringify({ url: oauthUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));

      // Webhook from TikTok Shop
      if (body.type && !action) {
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
        case "update_stock": {
          const productId = body.product_id;
          const stock = body.stock;
          if (!productId || stock === undefined) throw new Error("product_id e stock são obrigatórios");
          result = await updateStock(productId, stock);
          break;
        }
        case "configure": {
          const sb = supabaseAdmin();
          const authCode = body.auth_code;
          if (authCode) {
            result = await handleOAuthCallback(authCode);
          } else {
            // Manual token configuration
            const accessTokenVal = body.access_token;
            const refreshTokenVal = body.refresh_token;
            if (!refreshTokenVal) throw new Error("refresh_token é obrigatório");
            await sb.from("marketplace_tokens").upsert({
              marketplace: "tiktokshop",
              access_token: accessTokenVal || "",
              refresh_token: refreshTokenVal,
              seller_id: body.seller_id || body.open_id || "",
              updated_at: new Date().toISOString(),
              extra: { shop_cipher: body.shop_cipher || null },
            }, { onConflict: "marketplace" });
            await sb.from("marketplace_configs").update({ enabled: true, status: "connected" }).eq("marketplace_id", "tiktokshop");
            result = { success: true };
          }
          break;
        }
        case "status": {
          const sb = supabaseAdmin();
          const token = await getToken(sb);
          result = {
            connected: !!token?.access_token,
            seller_id: token?.seller_id,
            expires_at: token?.expires_at,
            shop_cipher: (token?.extra as any)?.shop_cipher || null,
          };
          break;
        }
        default:
          return new Response(JSON.stringify({ error: "Unknown action. Use: sync_products, import_orders, update_stock, configure, status" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
      }

      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("TikTok Shop Edge Function Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
