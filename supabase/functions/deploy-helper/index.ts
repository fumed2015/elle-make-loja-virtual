import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// This edge function reads all other function source files and returns them as JSON
// Used by the deploy script to transfer functions to another Supabase project

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const functions: Record<string, string> = {};
    const functionsDir = "/home/deno/functions";
    
    // Edge functions can't read other function files directly
    // Instead, this function is called from the Lovable project where
    // the source code is available in the repository
    
    return new Response(JSON.stringify({
      error: "Use the deploy-functions.js script with GitHub clone instead",
      instructions: [
        "1. Connect project to GitHub in Lovable (Settings > GitHub)",
        "2. git clone <your-repo-url>",
        "3. cd <repo-folder>",
        "4. node public/deploy-functions.js"
      ]
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
