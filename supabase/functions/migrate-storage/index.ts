import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKETS = ["product-images", "ugc-images"];

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

    const srcUrl = Deno.env.get("SUPABASE_URL")!;
    const srcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const src = createClient(srcUrl, srcKey);

    const destUrl = "https://osgkokctbwkcadrgteva.supabase.co";
    const destKey = Deno.env.get("DEST_SUPABASE_SERVICE_ROLE_KEY")!;
    if (!destKey) throw new Error("DEST_SUPABASE_SERVICE_ROLE_KEY not configured");
    const dest = createClient(destUrl, destKey);

    const results: Record<string, { migrated: number; skipped: number; errors: string[] }> = {};

    for (const bucket of BUCKETS) {
      const bucketResult = { migrated: 0, skipped: 0, errors: [] as string[] };

      try {
        const { data: files, error: listError } = await src.storage.from(bucket).list("", {
          limit: 1000,
          sortBy: { column: "name", order: "asc" },
        });

        if (listError) {
          bucketResult.errors.push(`List error: ${listError.message}`);
          results[bucket] = bucketResult;
          continue;
        }

        if (!files || files.length === 0) {
          results[bucket] = bucketResult;
          continue;
        }

        for (const file of files) {
          if (!file.name || file.id === null) continue;

          try {
            const { data: blob, error: dlError } = await src.storage.from(bucket).download(file.name);
            if (dlError || !blob) {
              bucketResult.errors.push(`Download ${file.name}: ${dlError?.message || "empty"}`);
              continue;
            }

            const { error: upError } = await dest.storage.from(bucket).upload(file.name, blob, {
              contentType: file.metadata?.mimetype || "image/jpeg",
              upsert: true,
            });

            if (upError) {
              bucketResult.errors.push(`Upload ${file.name}: ${upError.message}`);
            } else {
              bucketResult.migrated++;
            }
          } catch (e) {
            bucketResult.errors.push(`File ${file.name}: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      } catch (e) {
        bucketResult.errors.push(`Bucket error: ${e instanceof Error ? e.message : String(e)}`);
      }

      results[bucket] = bucketResult;
    }

    const summary = {
      total_files: Object.values(results).reduce((a, r) => a + r.migrated, 0),
      total_errors: Object.values(results).reduce((a, r) => a + r.errors.length, 0),
    };

    return new Response(JSON.stringify({ summary, results }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
