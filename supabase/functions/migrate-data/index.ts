import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tables in dependency order (parents first, children after)
const TABLES_ORDER = [
  "categories",
  "products",
  "product_costs",
  "coupons",
  "influencers",
  "profiles",
  "user_roles",
  "orders",
  "financial_transactions",
  "financial_premises",
  "premises_audit_log",
  "influencer_commissions",
  "favorites",
  "cart_items",
  "cart_abandonment_events",
  "reviews",
  "returns",
  "loyalty_points",
  "saved_addresses",
  "notifications",
  "message_templates",
  "newsletter_subscribers",
  "promotions",
  "tracking_pixels",
  "site_settings",
  "blog_posts",
  "ugc_posts",
  "push_subscriptions",
  "catalog_imports",
  "catalog_items",
  "catalog_import_failures",
  "marketplace_configs",
  "marketplace_listings",
  "marketplace_orders",
  "marketplace_sync_logs",
  "marketplace_tokens",
  "seo_reports",
  "marketing_campaigns",
  "revenue_reports",
];

async function verifyAdmin(req: Request): Promise<{ userId: string } | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = claimsData.claims.sub;
  const adminClient = createClient(supabaseUrl, serviceKey);
  const { data: isAdmin } = await adminClient.rpc("has_role", { _user_id: userId, _role: "admin" });

  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Acesso negado - apenas administradores" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return { userId };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ===== AUTHENTICATION: Require admin role =====
    const authResult = await verifyAdmin(req);
    if (authResult instanceof Response) return authResult;

    // Source (current project)
    const srcUrl = Deno.env.get("SUPABASE_URL")!;
    const srcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const src = createClient(srcUrl, srcKey);

    // Destination project
    const destUrl = "https://osgkokctbwkcadrgteva.supabase.co";
    const destKey = Deno.env.get("DEST_SUPABASE_SERVICE_ROLE_KEY")!;
    if (!destKey) throw new Error("DEST_SUPABASE_SERVICE_ROLE_KEY not configured");
    const dest = createClient(destUrl, destKey);

    const results: Record<string, { migrated: number; errors: string[] }> = {};
    const summary = { total_tables: 0, total_rows: 0, total_errors: 0 };

    for (const table of TABLES_ORDER) {
      const tableResult = { migrated: 0, errors: [] as string[] };

      try {
        let allRows: any[] = [];
        let offset = 0;
        const PAGE_SIZE = 1000;

        while (true) {
          const { data, error } = await src
            .from(table)
            .select("*")
            .range(offset, offset + PAGE_SIZE - 1);

          if (error) {
            tableResult.errors.push(`Read error: ${error.message}`);
            break;
          }

          if (!data || data.length === 0) break;
          allRows = allRows.concat(data);
          offset += PAGE_SIZE;

          if (data.length < PAGE_SIZE) break;
        }

        if (allRows.length === 0) {
          results[table] = tableResult;
          summary.total_tables++;
          continue;
        }

        const BATCH_SIZE = 500;
        for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
          const batch = allRows.slice(i, i + BATCH_SIZE);

          const { error: insertError } = await dest
            .from(table)
            .upsert(batch, { onConflict: "id", ignoreDuplicates: false });

          if (insertError) {
            if (table === "site_settings") {
              const { error: retryErr } = await dest
                .from(table)
                .upsert(batch, { onConflict: "key", ignoreDuplicates: false });
              if (retryErr) {
                tableResult.errors.push(`Insert batch ${i}-${i + batch.length}: ${retryErr.message}`);
              } else {
                tableResult.migrated += batch.length;
              }
            } else {
              tableResult.errors.push(`Insert batch ${i}-${i + batch.length}: ${insertError.message}`);
            }
          } else {
            tableResult.migrated += batch.length;
          }
        }
      } catch (e) {
        tableResult.errors.push(`Exception: ${e instanceof Error ? e.message : String(e)}`);
      }

      results[table] = tableResult;
      summary.total_tables++;
      summary.total_rows += tableResult.migrated;
      summary.total_errors += tableResult.errors.length;
    }

    return new Response(JSON.stringify({ summary, results }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Migration error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
