import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use Admin API to list all users
    const allUsers: any[] = [];
    let page = 1;
    const perPage = 50;

    while (true) {
      const res = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=${perPage}`, {
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Auth API error (${res.status}): ${errText}`);
      }

      const data = await res.json();
      const users = data.users || data;

      if (!Array.isArray(users) || users.length === 0) break;

      for (const u of users) {
        allUsers.push({
          id: u.id,
          email: u.email,
          phone: u.phone || null,
          email_confirmed_at: u.email_confirmed_at,
          created_at: u.created_at,
          updated_at: u.updated_at,
          raw_user_meta_data: u.raw_user_meta_data || {},
          raw_app_meta_data: u.raw_app_meta_data || {},
          // Note: passwords are hashed and cannot be exported for re-import
          // Users will need to use "forgot password" on the new project
          encrypted_password_hash: u.encrypted_password ? "[HASHED - cannot export]" : null,
        });
      }

      if (users.length < perPage) break;
      page++;
    }

    const exportData = {
      exported_at: new Date().toISOString(),
      total_users: allUsers.length,
      note: "Passwords cannot be exported. Users must use 'Forgot Password' on the destination project.",
      instructions: [
        "1. No projeto destino, crie cada usuário via Auth Admin API com createUser()",
        "2. Use os mesmos UUIDs (id) para manter as foreign keys consistentes",
        "3. Os usuários precisarão redefinir suas senhas via 'Esqueci minha senha'",
        "4. Exemplo de criação via API: POST /auth/v1/admin/users com body { id, email, email_confirm: true, user_metadata }",
      ],
      users: allUsers,
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
