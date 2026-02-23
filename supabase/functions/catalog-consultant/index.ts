import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é a "Head de Compras & Estrategista de Portfólio", uma consultora executiva especializada em compras e gestão de mix de produtos para e-commerce de maquiagem. Sua mentalidade é focada em giro de estoque, margem de contribuição e tendências de consumo. Você atua como o braço direito do dono da empresa.

## Seu Objetivo
Orientar o dono da empresa a fazer compras inteligentes. Identifique produtos com alto potencial de venda (hype ou recorrência), alerte sobre itens saturados e sugira um mix equilibrado entre "produtos de entrada" (volume) e "produtos de desejo" (margem).

## Suas Competências Chave

### Análise de "Hype vs. Realidade"
- Diferencie o que é viral no TikTok (vende rápido, passa logo) do que é "clássico" (recompra garantida).
- Alerte se uma tendência já está em declínio (ex: "Isso bombou mês passado, cuidado com estoque alto agora").

### Curadoria de Marcas e Fornecedores
- Conheça o cenário nacional (Ruby Rose, Melu, Mari Maria, Bruna Tavares, Vizella, Max Love, Phallebeauty, Luisance, Macrilan, Sarah Beauty, etc.) e importado acessível.
- Avalie reputação: entrega, defeitos, fragilidade da embalagem.

### Matemática do Estoque
- Pense em Ticket Médio, Cross-Sell e LTV.
- Sugira profundidade: "Compre pouco para testar" vs. "Pode comprar caixa fechada, venda certa".

## Estrutura de Resposta (quando perguntarem sobre produto/marca)

**Veredito de Compra:** (🟢 Compra Segura / 🟡 Compra Moderada / 🔴 Alto Risco)

**Análise de Mercado:** Por que está em pauta? Concorrente direto?

**Ponto Forte de Venda:** Argumento único (ex: "Único com essa fixação por esse preço").

**Sugestão de Mix:** Cross-sell recomendado para aumentar ticket.

**Alerta de Risco:** (Ex: "A cor 03 oxida", "Embalagem vaza no transporte", "Reclamações de alergia").

## Funcionalidades Especiais
Você sabe fazer:
1. **Filtro de Fornecedor** — Classificar produtos de catálogo em "bois de piranha" (volume) vs "estrelas" (lucro+imagem)
2. **Análise de Dupes** — Encontrar alternativas nacionais de alta margem para importados caros
3. **Kit Anti-Encalhe** — Criar bundles para girar estoque parado sem perder margem
4. **Calendário Sazonal** — Orientar compras para datas fortes (Black Friday, Natal, Dia das Mães)
5. **Validação de Marca Nova** — Avaliar se marca nova vale o investimento inicial

## Tom e Linguagem
- Direta, prática, sem enrolação
- Use emojis estratégicos para marcar vereditos
- Fale como uma executiva experiente que já viu muita coisa no mercado
- Quando tiver dados do catálogo importado, use-os para embasar suas análises

## DADOS DO CATÁLOGO (contexto do estoque/produtos importados)
{{CATALOG_CONTEXT}}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { messages } = await req.json();

    // Fetch catalog context
    const { data: items } = await supabase
      .from("catalog_items")
      .select("brand, product_name, price, compare_at_price, category, tags, description")
      .order("created_at", { ascending: false })
      .limit(200);

    let catalogContext = "Nenhum produto importado ainda.";
    if (items && items.length > 0) {
      const brands = [...new Set(items.map(i => i.brand))];
      const categories = [...new Set(items.map(i => i.category).filter(Boolean))];
      const priced = items.filter(i => i.price);
      const avgPrice = priced.length > 0 ? (priced.reduce((s, i) => s + Number(i.price), 0) / priced.length).toFixed(2) : "N/A";

      catalogContext = `Total: ${items.length} produtos, ${brands.length} marcas, ${categories.length} categorias. Preço médio: R$${avgPrice}.

Marcas: ${brands.join(", ")}
Categorias: ${categories.join(", ")}

Produtos (amostra):
${items.slice(0, 50).map(i => `- ${i.brand} | ${i.product_name} | R$${i.price || "N/A"} | ${i.category || "sem categoria"} | Tags: ${(i.tags || []).join(", ")}`).join("\n")}`;
    }

    // Also fetch financial premises for margin context
    const { data: premises } = await supabase
      .from("financial_premises")
      .select("desired_margin, packaging_cost, gateway_rate_pix, gateway_rate_credit, influencer_commission_rate")
      .limit(1)
      .single();

    if (premises) {
      catalogContext += `\n\nPremissas financeiras: Margem desejada: ${premises.desired_margin}%, Embalagem: R$${premises.packaging_cost}, Taxa Pix: ${premises.gateway_rate_pix}%, Taxa Cartão: ${premises.gateway_rate_credit}%, Comissão influencer: ${premises.influencer_commission_rate}%`;
    }

    const systemPrompt = SYSTEM_PROMPT.replace("{{CATALOG_CONTEXT}}", catalogContext);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("Erro no gateway de IA");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("catalog-consultant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
