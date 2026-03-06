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

const SHOPEE_API = "https://partner.shopeemobile.com/api/v2";

function supabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

function getPartnerId(): number {
  return Number(Deno.env.get("SHOPEE_PARTNER_ID") || "0");
}

function getPartnerKey(): string {
  const key = Deno.env.get("SHOPEE_PARTNER_KEY");
  if (!key) throw new Error("SHOPEE_PARTNER_KEY não configurado");
  return key;
}

async function generateSign(path: string, timestamp: number, accessToken?: string, shopId?: number): Promise<string> {
  const partnerId = getPartnerId();
  const partnerKey = getPartnerKey();
  let baseString = `${partnerId}${path}${timestamp}`;
  if (accessToken && shopId) {
    baseString += `${accessToken}${shopId}`;
  }
  return await hmacSHA256(partnerKey, baseString);
}

async function getToken(sb: ReturnType<typeof supabaseAdmin>) {
  const { data } = await sb
    .from("marketplace_tokens")
    .select("*")
    .eq("marketplace", "shopee")
    .maybeSingle();
  return data;
}

async function refreshAccessToken(sb: ReturnType<typeof supabaseAdmin>, refreshToken: string, shopId: number) {
  const partnerId = getPartnerId();
  const path = "/api/v2/auth/access_token/get";
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = await generateSign(path, timestamp);

  const res = await fetch(`${SHOPEE_API}/auth/access_token/get?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      refresh_token: refreshToken,
      partner_id: partnerId,
      shop_id: shopId,
    }),
  });
  const body = await res.json();
  if (body.error) throw new Error(`Shopee token refresh error: ${body.message || body.error}`);

  const expiresAt = new Date(Date.now() + (body.expire_in || 14400) * 1000).toISOString();
  await sb.from("marketplace_tokens").upsert({
    marketplace: "shopee",
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_at: expiresAt,
    seller_id: String(shopId),
    updated_at: new Date().toISOString(),
  }, { onConflict: "marketplace" });

  return body.access_token;
}

async function getValidToken(sb: ReturnType<typeof supabaseAdmin>) {
  const token = await getToken(sb);
  if (!token?.access_token) throw new Error("Shopee não conectada. Faça a autenticação primeiro.");
  if (token.expires_at && new Date(token.expires_at) < new Date()) {
    return refreshAccessToken(sb, token.refresh_token!, Number(token.seller_id));
  }
  return { accessToken: token.access_token, shopId: Number(token.seller_id) };
}

async function logSync(sb: ReturnType<typeof supabaseAdmin>, operation: string, status: string, details: Record<string, unknown> = {}, error?: string) {
  await sb.from("marketplace_sync_logs").insert({
    marketplace: "shopee",
    operation,
    status,
    error_message: error || null,
    details,
    items_processed: (details.processed as number) || 0,
    items_failed: (details.failed as number) || 0,
    completed_at: status !== "started" ? new Date().toISOString() : null,
  });
}

// ── OAuth: Generate auth URL ──
async function getAuthUrl() {
  const partnerId = getPartnerId();
  const path = "/api/v2/shop/auth_partner";
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = await generateSign(path, timestamp);
  const redirectUrl = Deno.env.get("SHOPEE_REDIRECT_URI") || `${Deno.env.get("SUPABASE_URL")}/functions/v1/marketplace-shopee?action=oauth_callback`;

  return `${SHOPEE_API}/shop/auth_partner?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(redirectUrl)}`;
}

// ── OAuth Callback ──
async function handleOAuthCallback(code: string, shopId: number) {
  const sb = supabaseAdmin();
  const partnerId = getPartnerId();
  const path = "/api/v2/auth/token/get";
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = await generateSign(path, timestamp);

  const res = await fetch(`${SHOPEE_API}/auth/token/get?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      partner_id: partnerId,
      shop_id: shopId,
    }),
  });
  const body = await res.json();
  if (body.error) throw new Error(`Shopee OAuth error: ${body.message || body.error}`);

  const expiresAt = new Date(Date.now() + (body.expire_in || 14400) * 1000).toISOString();
  await sb.from("marketplace_tokens").upsert({
    marketplace: "shopee",
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_at: expiresAt,
    seller_id: String(shopId),
    updated_at: new Date().toISOString(),
  }, { onConflict: "marketplace" });

  await sb.from("marketplace_configs").update({ enabled: true, status: "connected" }).eq("marketplace_id", "shopee");
  await logSync(sb, "oauth", "success", { shop_id: shopId });

  return { success: true, shop_id: shopId };
}

// ── Sync Products → Shopee ──
async function syncProducts() {
  const sb = supabaseAdmin();
  const { accessToken, shopId } = await getValidToken(sb);
  await logSync(sb, "product_sync", "started");

  const { data: products } = await sb
    .from("products")
    .select("*, marketplace_listings!left(id, external_id, marketplace)")
    .eq("is_active", true);

  const { data: config } = await sb.from("marketplace_configs").select("*").eq("marketplace_id", "shopee").maybeSingle();
  const partnerId = getPartnerId();
  let processed = 0, failed = 0;

  for (const product of (products || [])) {
    try {
      const listing = (product as any).marketplace_listings?.find((l: any) => l.marketplace === "shopee");

      let price = Number(product.price);
      if (config?.price_rule === "markup") {
        price = price * (1 + Number(config.markup_percent || 0) / 100);
      }
      // Shopee price in cents
      const priceInCents = Math.round(price * 100);

      if (listing?.external_id) {
        // Update existing: price + stock
        const timestamp = Math.floor(Date.now() / 1000);
        const path = "/api/v2/product/update_price";
        const sign = await generateSign(path, timestamp, accessToken, shopId);

        await fetch(`${SHOPEE_API}/product/update_price?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${shopId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            item_id: Number(listing.external_id),
            price_list: [{ model_id: 0, original_price: price }],
          }),
        });

        // Update stock
        const stockPath = "/api/v2/product/update_stock";
        const stockTimestamp = Math.floor(Date.now() / 1000);
        const stockSign = await generateSign(stockPath, stockTimestamp, accessToken, shopId);

        await fetch(`${SHOPEE_API}/product/update_stock?partner_id=${partnerId}&timestamp=${stockTimestamp}&sign=${stockSign}&access_token=${accessToken}&shop_id=${shopId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            item_id: Number(listing.external_id),
            stock_list: [{ model_id: 0, normal_stock: product.stock }],
          }),
        });

        await sb.from("marketplace_listings").update({
          last_synced_at: new Date().toISOString(),
          status: "active",
          sync_error: null,
        }).eq("id", listing.id);
        processed++;
      } else {
        // Create new item
        const timestamp = Math.floor(Date.now() / 1000);
        const path = "/api/v2/product/add_item";
        const sign = await generateSign(path, timestamp, accessToken, shopId);

        const shopeeItem = {
          original_price: price,
          description: product.description || product.name,
          item_name: product.name.substring(0, 120),
          normal_stock: product.stock,
          weight: 0.3, // default 300g
          category_id: 100636, // beauty default
          image: {
            image_id_list: [], // Would need to upload images to Shopee first
          },
          brand: { brand_id: 0, original_brand_name: product.brand || "" },
          item_status: "NORMAL",
          dimension: { package_length: 15, package_width: 10, package_height: 5 },
          logistic_info: [{ logistic_id: 0, enabled: true }],
        };

        const res = await fetch(`${SHOPEE_API}/product/add_item?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${shopId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(shopeeItem),
        });
        const body = await res.json();

        if (body.item_id || body.response?.item_id) {
          const itemId = body.item_id || body.response?.item_id;
          await sb.from("marketplace_listings").upsert({
            product_id: product.id,
            marketplace: "shopee",
            external_id: String(itemId),
            status: "active",
            last_synced_at: new Date().toISOString(),
          }, { onConflict: "product_id,marketplace" });
          processed++;
        } else {
          throw new Error(body.msg || body.message || JSON.stringify(body));
        }
      }
    } catch (err: any) {
      failed++;
      await sb.from("marketplace_listings").upsert({
        product_id: product.id,
        marketplace: "shopee",
        status: "error",
        sync_error: err.message,
        last_synced_at: new Date().toISOString(),
      }, { onConflict: "product_id,marketplace" });
    }
  }

  await logSync(sb, "product_sync", failed > 0 ? "partial" : "success", { processed, failed });
  return { processed, failed };
}

// ── Import Orders from Shopee ──
async function importOrders() {
  const sb = supabaseAdmin();
  const { accessToken, shopId } = await getValidToken(sb);
  await logSync(sb, "order_import", "started");

  const partnerId = getPartnerId();
  const timestamp = Math.floor(Date.now() / 1000);
  const path = "/api/v2/order/get_order_list";
  const sign = await generateSign(path, timestamp, accessToken, shopId);

  const timeFrom = Math.floor((Date.now() - 7 * 86400000) / 1000);
  const timeTo = Math.floor(Date.now() / 1000);

  const res = await fetch(
    `${SHOPEE_API}/order/get_order_list?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${shopId}&time_range_field=create_time&time_from=${timeFrom}&time_to=${timeTo}&page_size=50&order_status=READY_TO_SHIP`,
    { method: "GET" }
  );
  const body = await res.json();

  let processed = 0, failed = 0;
  const orderList = body.response?.order_list || [];

  for (const order of orderList) {
    try {
      // Get order detail
      const detailTimestamp = Math.floor(Date.now() / 1000);
      const detailPath = "/api/v2/order/get_order_detail";
      const detailSign = await generateSign(detailPath, detailTimestamp, accessToken, shopId);

      const detailRes = await fetch(
        `${SHOPEE_API}/order/get_order_detail?partner_id=${partnerId}&timestamp=${detailTimestamp}&sign=${detailSign}&access_token=${accessToken}&shop_id=${shopId}&order_sn_list=${order.order_sn}&response_optional_fields=buyer_user_id,buyer_username,item_list,recipient_address,total_amount`,
        { method: "GET" }
      );
      const detailBody = await detailRes.json();
      const orderDetail = detailBody.response?.order_list?.[0];

      if (orderDetail) {
        await sb.from("marketplace_orders").upsert({
          marketplace: "shopee",
          external_order_id: orderDetail.order_sn,
          buyer_name: orderDetail.buyer_username || "",
          items: (orderDetail.item_list || []).map((i: any) => ({
            title: i.item_name,
            quantity: i.model_quantity_purchased,
            unit_price: i.model_discounted_price,
            item_id: i.item_id,
          })),
          total: Number(orderDetail.total_amount || 0),
          status: orderDetail.order_status,
          shipping_address: orderDetail.recipient_address || null,
          raw_data: orderDetail,
          updated_at: new Date().toISOString(),
        }, { onConflict: "marketplace,external_order_id" });
        processed++;
      }
    } catch {
      failed++;
    }
  }

  await logSync(sb, "order_import", "success", { processed, failed });
  return { processed, failed };
}

// ── Webhook Handler ──
async function handleWebhook(body: any) {
  const sb = supabaseAdmin();
  const code = body.code; // Shopee push type code
  await logSync(sb, "webhook", "started", { code, shop_id: body.shop_id });

  try {
    if (code === 3) {
      // Order status update
      const orderSn = body.data?.ordersn;
      if (orderSn) {
        const { accessToken, shopId } = await getValidToken(sb);
        const partnerId = getPartnerId();
        const timestamp = Math.floor(Date.now() / 1000);
        const path = "/api/v2/order/get_order_detail";
        const sign = await generateSign(path, timestamp, accessToken, shopId);

        const res = await fetch(
          `${SHOPEE_API}/order/get_order_detail?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${shopId}&order_sn_list=${orderSn}&response_optional_fields=buyer_username,item_list,total_amount`,
          { method: "GET" }
        );
        const detail = await res.json();
        const order = detail.response?.order_list?.[0];

        if (order) {
          await sb.from("marketplace_orders").upsert({
            marketplace: "shopee",
            external_order_id: order.order_sn,
            buyer_name: order.buyer_username || "",
            status: order.order_status,
            total: Number(order.total_amount || 0),
            raw_data: order,
            updated_at: new Date().toISOString(),
          }, { onConflict: "marketplace,external_order_id" });
        }
      }
    }

    await logSync(sb, "webhook", "success", { code });
  } catch (err: any) {
    await logSync(sb, "webhook", "error", { code }, err.message);
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

    // OAuth callback
    if (action === "oauth_callback") {
      const code = url.searchParams.get("code");
      const shopIdParam = url.searchParams.get("shop_id");
      if (!code || !shopIdParam) {
        return new Response(JSON.stringify({ error: "Missing code or shop_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      await handleOAuthCallback(code, Number(shopIdParam));
      return new Response(`<html><body><script>window.close();</script><p>Shopee conectada com sucesso!</p></body></html>`, {
        headers: { "Content-Type": "text/html", ...corsHeaders },
      });
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));

      // Webhook from Shopee
      if (body.code !== undefined && body.shop_id) {
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
        case "get_auth_url":
          result = { url: await getAuthUrl() };
          break;
        case "status": {
          const sb = supabaseAdmin();
          const token = await getToken(sb);
          result = {
            connected: !!token?.access_token,
            shop_id: token?.seller_id,
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
    console.error("Shopee Edge Function Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
