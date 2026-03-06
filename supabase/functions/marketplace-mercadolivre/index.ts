import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ML_API = "https://api.mercadolibre.com";

function supabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function getToken(sb: ReturnType<typeof supabaseAdmin>) {
  const { data } = await sb
    .from("marketplace_tokens")
    .select("*")
    .eq("marketplace", "mercadolivre")
    .maybeSingle();
  return data;
}

async function refreshAccessToken(sb: ReturnType<typeof supabaseAdmin>, refreshToken: string) {
  const appId = Deno.env.get("ML_APP_ID");
  const clientSecret = Deno.env.get("ML_CLIENT_SECRET");
  if (!appId || !clientSecret) throw new Error("ML_APP_ID ou ML_CLIENT_SECRET não configurados");

  const res = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: appId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`ML OAuth error: ${JSON.stringify(body)}`);

  const expiresAt = new Date(Date.now() + body.expires_in * 1000).toISOString();
  await sb.from("marketplace_tokens").upsert({
    marketplace: "mercadolivre",
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_at: expiresAt,
    seller_id: String(body.user_id),
    updated_at: new Date().toISOString(),
  }, { onConflict: "marketplace" });

  return body.access_token;
}

async function getValidToken(sb: ReturnType<typeof supabaseAdmin>) {
  const token = await getToken(sb);
  if (!token?.access_token) throw new Error("Mercado Livre não conectado. Faça OAuth primeiro.");
  if (token.expires_at && new Date(token.expires_at) < new Date()) {
    return refreshAccessToken(sb, token.refresh_token!);
  }
  return token.access_token;
}

async function logSync(sb: ReturnType<typeof supabaseAdmin>, marketplace: string, operation: string, status: string, details: Record<string, unknown> = {}, error?: string) {
  await sb.from("marketplace_sync_logs").insert({
    marketplace,
    operation,
    status,
    error_message: error || null,
    details,
    items_processed: (details.processed as number) || 0,
    items_failed: (details.failed as number) || 0,
    completed_at: status !== "started" ? new Date().toISOString() : null,
  });
}

// ── OAuth Callback ──
async function handleOAuthCallback(code: string) {
  const sb = supabaseAdmin();
  const appId = Deno.env.get("ML_APP_ID");
  const clientSecret = Deno.env.get("ML_CLIENT_SECRET");
  const redirectUri = Deno.env.get("ML_REDIRECT_URI") || `${Deno.env.get("SUPABASE_URL")}/functions/v1/marketplace-mercadolivre?action=oauth_callback`;

  const res = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: appId!,
      client_secret: clientSecret!,
      code,
      redirect_uri: redirectUri,
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`ML OAuth error: ${JSON.stringify(body)}`);

  const expiresAt = new Date(Date.now() + body.expires_in * 1000).toISOString();
  await sb.from("marketplace_tokens").upsert({
    marketplace: "mercadolivre",
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_at: expiresAt,
    seller_id: String(body.user_id),
    updated_at: new Date().toISOString(),
  }, { onConflict: "marketplace" });

  await sb.from("marketplace_configs").update({ enabled: true, status: "connected" }).eq("marketplace_id", "mercadolivre");
  await logSync(sb, "mercadolivre", "oauth", "success", { user_id: body.user_id });

  return { success: true, seller_id: body.user_id };
}

// ── Sync Products → ML ──
async function syncProducts() {
  const sb = supabaseAdmin();
  const accessToken = await getValidToken(sb);
  await logSync(sb, "mercadolivre", "product_sync", "started");

  const { data: products } = await sb
    .from("products")
    .select("*, marketplace_listings!left(id, external_id, marketplace)")
    .eq("is_active", true);

  let processed = 0, failed = 0;
  for (const product of (products || [])) {
    try {
      const listing = (product as any).marketplace_listings?.find((l: any) => l.marketplace === "mercadolivre");
      const { data: config } = await sb.from("marketplace_configs").select("*").eq("marketplace_id", "mercadolivre").maybeSingle();
      
      let price = Number(product.price);
      if (config?.price_rule === "markup") {
        price = price * (1 + Number(config.markup_percent || 0) / 100);
      }

      const mlItem = {
        title: (product.name || "").substring(0, 60),
        category_id: "MLB1196", // Default beauty category
        price,
        currency_id: "BRL",
        available_quantity: product.stock,
        buying_mode: "buy_it_now",
        condition: "new",
        listing_type_id: "gold_special",
        description: { plain_text: product.description || "" },
        pictures: (product.images || []).slice(0, 10).map((url: string) => ({ source: url })),
        attributes: [
          { id: "BRAND", value_name: product.brand || "Genérica" },
        ],
      };

      if (listing?.external_id) {
        // Update existing listing
        const res = await fetch(`${ML_API}/items/${listing.external_id}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ price: mlItem.price, available_quantity: mlItem.available_quantity, title: mlItem.title }),
        });
        const body = await res.text();
        if (!res.ok) throw new Error(`Update failed: ${body}`);

        await sb.from("marketplace_listings").update({
          last_synced_at: new Date().toISOString(),
          status: "active",
          sync_error: null,
        }).eq("id", listing.id);
      } else {
        // Create new listing
        const res = await fetch(`${ML_API}/items`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(mlItem),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(`Create failed: ${JSON.stringify(body)}`);

        await sb.from("marketplace_listings").upsert({
          product_id: product.id,
          marketplace: "mercadolivre",
          external_id: body.id,
          external_url: body.permalink,
          status: "active",
          last_synced_at: new Date().toISOString(),
        }, { onConflict: "product_id,marketplace" });
      }
      processed++;
    } catch (err: any) {
      failed++;
      await sb.from("marketplace_listings").upsert({
        product_id: product.id,
        marketplace: "mercadolivre",
        status: "error",
        sync_error: err.message,
        last_synced_at: new Date().toISOString(),
      }, { onConflict: "product_id,marketplace" });
    }
  }

  await logSync(sb, "mercadolivre", "product_sync", failed > 0 ? "partial" : "success", { processed, failed });
  return { processed, failed };
}

// ── Import Orders from ML ──
async function importOrders() {
  const sb = supabaseAdmin();
  const accessToken = await getValidToken(sb);
  const token = await getToken(sb);
  await logSync(sb, "mercadolivre", "order_import", "started");

  const res = await fetch(`${ML_API}/orders/search?seller=${token!.seller_id}&sort=date_desc&limit=50`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Orders fetch failed: ${JSON.stringify(body)}`);

  let processed = 0, failed = 0;
  for (const order of body.results || []) {
    try {
      await sb.from("marketplace_orders").upsert({
        marketplace: "mercadolivre",
        external_order_id: String(order.id),
        buyer_name: order.buyer?.nickname || "",
        buyer_email: order.buyer?.email || "",
        items: order.order_items?.map((i: any) => ({
          title: i.item?.title,
          quantity: i.quantity,
          unit_price: i.unit_price,
          external_item_id: i.item?.id,
        })) || [],
        total: order.total_amount || 0,
        shipping_cost: order.shipping?.cost || 0,
        marketplace_fee: order.mediations?.[0]?.amount || 0,
        status: order.status,
        shipping_status: order.shipping?.status || "pending",
        tracking_code: order.shipping?.tracking_number || null,
        raw_data: order,
        updated_at: new Date().toISOString(),
      }, { onConflict: "marketplace,external_order_id" });
      processed++;
    } catch {
      failed++;
    }
  }

  await logSync(sb, "mercadolivre", "order_import", "success", { processed, failed, total: body.results?.length });
  return { processed, failed };
}

// ── Webhook Handler ──
async function handleWebhook(body: any) {
  const sb = supabaseAdmin();
  await logSync(sb, "mercadolivre", "webhook", "started", { topic: body.topic, resource: body.resource });

  try {
    if (body.topic === "orders_v2" || body.topic === "orders") {
      const accessToken = await getValidToken(sb);
      const res = await fetch(`${ML_API}${body.resource}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const order = await res.json();
      if (res.ok) {
        await sb.from("marketplace_orders").upsert({
          marketplace: "mercadolivre",
          external_order_id: String(order.id),
          buyer_name: order.buyer?.nickname || "",
          items: order.order_items?.map((i: any) => ({
            title: i.item?.title,
            quantity: i.quantity,
            unit_price: i.unit_price,
          })) || [],
          total: order.total_amount || 0,
          status: order.status,
          shipping_status: order.shipping?.status || "pending",
          raw_data: order,
          updated_at: new Date().toISOString(),
        }, { onConflict: "marketplace,external_order_id" });
      }
    }

    if (body.topic === "items") {
      // Item status changed on ML side
      const accessToken = await getValidToken(sb);
      const res = await fetch(`${ML_API}${body.resource}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const item = await res.json();
      if (res.ok) {
        await sb.from("marketplace_listings")
          .update({ status: item.status === "active" ? "active" : "paused", last_synced_at: new Date().toISOString() })
          .eq("external_id", item.id);
      }
    }

    await logSync(sb, "mercadolivre", "webhook", "success", { topic: body.topic });
  } catch (err: any) {
    await logSync(sb, "mercadolivre", "webhook", "error", { topic: body.topic }, err.message);
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

    // OAuth callback (GET with code param)
    if (action === "oauth_callback") {
      const code = url.searchParams.get("code");
      if (!code) return new Response(JSON.stringify({ error: "Missing code" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const result = await handleOAuthCallback(code);
      // Redirect back to admin
      return new Response(`<html><body><script>window.close();</script><p>Conectado com sucesso! Pode fechar esta janela.</p></body></html>`, {
        headers: { "Content-Type": "text/html", ...corsHeaders },
      });
    }

    // Webhook (POST without action from ML)
    if (req.method === "POST" && (!action || action === "webhook")) {
      const body = await req.json();
      if (body.topic) {
        const result = await handleWebhook(body);
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // API actions (POST with action param)
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      let result: any;

      switch (action) {
        case "sync_products":
          result = await syncProducts();
          break;
        case "import_orders":
          result = await importOrders();
          break;
        case "get_auth_url": {
          const appId = Deno.env.get("ML_APP_ID");
          const redirectUri = Deno.env.get("ML_REDIRECT_URI") || `${Deno.env.get("SUPABASE_URL")}/functions/v1/marketplace-mercadolivre?action=oauth_callback`;
          result = { url: `https://auth.mercadolibre.com.br/authorization?response_type=code&client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}` };
          break;
        }
        case "status": {
          const sb = supabaseAdmin();
          const token = await getToken(sb);
          result = {
            connected: !!token?.access_token,
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
    console.error("ML Edge Function Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
