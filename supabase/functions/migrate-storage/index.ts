import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKETS = ["product-images", "ugc-images"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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
        // List all files in source bucket
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
          if (!file.name || file.id === null) continue; // skip folders metadata

          try {
            // Download from source
            const { data: blob, error: dlError } = await src.storage.from(bucket).download(file.name);
            if (dlError || !blob) {
              bucketResult.errors.push(`Download ${file.name}: ${dlError?.message || "empty"}`);
              continue;
            }

            // Upload to destination (upsert)
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
