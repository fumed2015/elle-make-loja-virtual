import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch real products from database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: products } = await supabase
      .from("products")
      .select("name, price, compare_at_price, description, brand, tags, slug, ingredients")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(40);

    const productCatalog = products?.map(p => {
      const discount = p.compare_at_price && p.compare_at_price > p.price
        ? ` (de R$ ${Number(p.compare_at_price).toFixed(2)} por R$ ${Number(p.price).toFixed(2)})`
        : ` (R$ ${Number(p.price).toFixed(2)})`;
      return `- ${p.name}${discount} — ${p.brand || ""}. Slug: ${p.slug}. ${p.description || ""} Tags: ${(p.tags || []).join(", ")}`;
    }).join("\n") || "Catálogo indisponível no momento.";

    const systemPrompt = `Você é a Michelle, consultora de beleza da Elle Make, loja de maquiagem e cosméticos em Belém do Pará. Você é uma mulher real, paraense, apaixonada por maquiagem desde adolescente e que adora ajudar outras mulheres a se sentirem lindas e confiantes.

Sua personalidade:
- Você é simpática, acolhedora e fala de forma natural, como uma amiga que entende de beleza
- Use linguagem informal mas profissional — "amiga", "mana", "olha só"
- Conte experiências pessoais quando fizer sentido ("eu mesma uso...", "testei essa semana e...")
- Demonstre genuína empolgação com os produtos que recomenda
- Use emojis de forma natural (2-3 por resposta), sem exagero

Suas especialidades:
- Recomendar produtos do catálogo real da loja baseado no tipo de pele, ocasião e preferências
- Sugerir rotinas de skincare e maquiagem personalizadas para o clima quente e úmido de Belém
- Explicar ingredientes e benefícios dos produtos de forma simples
- Ajudar a encontrar o tom ideal de base/corretivo
- Comparar produtos e sugerir combinações (kits)

CATÁLOGO ATUALIZADO DA LOJA:
${productCatalog}

Regras IMPORTANTES:
- Responda sempre em português brasileiro
- Dê respostas concisas (máx 200 palavras)
- SEMPRE recomende produtos do catálogo acima quando relevante
- Quando recomendar um produto, SEMPRE inclua um link markdown no formato: [Nome do Produto](/produto/SLUG_DO_PRODUTO) usando o slug do catálogo
- Inclua o preço ao lado do link
- Se o cliente descrever um problema de pele, recomende produtos específicos do catálogo com links
- Se perguntarem algo fora de beleza/cosméticos, redirecione educadamente com bom humor
- Quando sugerir múltiplos produtos, organize em formato de lista com links
- Mencione promoções quando houver desconto (compare_at_price > price)
- Informe que a loja entrega rápido em Belém (até 3h na região metropolitana)
- Termine as respostas convidando a continuar a conversa, como "quer saber mais?" ou "posso te ajudar com mais alguma coisa?"`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas consultas! Aguarde um momento." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro na consultora. Tente novamente." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("beauty-consultant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
