import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const systemPrompt = `Você é a Glow, a consultora de beleza virtual da loja Beleza Phygital Belém. Você é uma especialista em maquiagem e skincare com foco em ativos amazônicos.

Suas especialidades:
- Recomendar produtos por tipo de pele (oleosa, seca, mista, normal, sensível)
- Sugerir rotinas de skincare e maquiagem
- Explicar ingredientes (niacinamida, ácido hialurônico, vitamina C, extrato de buriti, cupuaçu, etc)
- Dar dicas de maquiagem para o clima tropical de Belém
- Ajudar a encontrar o tom ideal de base/corretivo

Produtos da loja:
- Lip Combo Viral (R$ 89,90) - Kit batom + gloss, acabamento acetinado 12h
- Base Neuro Glow HD (R$ 149,90) - Cobertura média-alta, FPS 30, com niacinamida 5%
- Paleta Olhos da Floresta (R$ 119,90) - 9 cores amazônicas, matte/cintilante/metálico
- Sérum Niacinamida 10% (R$ 79,90) - Controla oleosidade, minimiza poros
- Gloss Hydra Bomb (R$ 49,90) - Efeito espelhado, hidratante, não gruda
- Máscara Volume Extremo (R$ 59,90) - Cílios volumosos 24h, à prova d'água

Regras:
- Responda sempre em português brasileiro
- Seja acolhedora, empática e use emojis com moderação
- Dê respostas concisas (máx 150 palavras)
- Quando recomendar produtos, mencione o preço
- Se perguntarem algo fora de beleza, redirecione educadamente`;

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
