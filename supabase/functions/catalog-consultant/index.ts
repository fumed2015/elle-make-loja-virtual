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
6. **Simulação de Compra** — Dado um orçamento, simule quanto comprar de cada item considerando custos fixos, frete, taxas e margem desejada
7. **Análise de Rentabilidade** — Compare margem de contribuição real (preço venda - custo - frete - taxa gateway - embalagem) entre produtos

## Inteligência Financeira
- Sempre considere as premissas financeiras ao recomendar (margem desejada, custos fixos, taxas de gateway)
- Calcule margem de contribuição quando tiver dados de custo: MC = Preço Venda - Custo Base - Frete Unitário - Taxa Gateway - Embalagem (por pedido, não por produto)
- Alerte quando o preço de compra + custos operacionais não atingem a margem desejada
- Use o ticket médio necessário para sugerir combos/kits que atinjam esse valor
- Considere o orçamento de marketing ao sugerir volumes de compra

## Tom e Linguagem
- Direta, prática, sem enrolação
- Use emojis estratégicos para marcar vereditos
- Fale como uma executiva experiente que já viu muita coisa no mercado
- Quando tiver dados do catálogo importado e premissas financeiras, use-os para embasar suas análises com números reais
- Sempre que possível, apresente cálculos de margem e ROI esperado

## DADOS DO CATÁLOGO E FINANCEIROS (contexto real da empresa)
{{CATALOG_CONTEXT}}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Admin authentication check ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = claimsData.claims.sub as string;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json();
    const isAnalysisMode = body.mode === "analysis";
    const messages = body.messages || [];

    // Fetch catalog context
    const { data: items } = await supabase
      .from("catalog_items")
      .select("brand, product_name, price, compare_at_price, category, tags, description")
      .order("created_at", { ascending: false })
      .limit(200);

    // Fetch real products with costs
    const { data: products } = await supabase
      .from("products")
      .select("name, brand, price, compare_at_price, stock, category_id, is_active, tags")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(100);

    const { data: productCosts } = await supabase
      .from("product_costs")
      .select("product_id, cost_base, freight_per_unit, notes");

    let catalogContext = "Nenhum produto importado ainda.";
    if (items && items.length > 0) {
      const brands = [...new Set(items.map(i => i.brand))];
      const categories = [...new Set(items.map(i => i.category).filter(Boolean))];
      const priced = items.filter(i => i.price);
      const avgPrice = priced.length > 0 ? (priced.reduce((s, i) => s + Number(i.price), 0) / priced.length).toFixed(2) : "N/A";

      catalogContext = `Total catálogo importado: ${items.length} produtos, ${brands.length} marcas, ${categories.length} categorias. Preço médio: R$${avgPrice}.

Marcas: ${brands.join(", ")}
Categorias: ${categories.join(", ")}

Produtos do catálogo (amostra):
${items.slice(0, 50).map(i => `- ${i.brand} | ${i.product_name} | R$${i.price || "N/A"} | ${i.category || "sem categoria"} | Tags: ${(i.tags || []).join(", ")}`).join("\n")}`;
    }

    // Add real store products with stock and costs
    if (products && products.length > 0) {
      const costsMap = new Map((productCosts || []).map(c => [c.product_id, c]));
      catalogContext += `\n\n## PRODUTOS DA LOJA (estoque atual):
${products.map(p => {
        const cost = costsMap.get((p as any).id);
        return `- ${p.name} | ${p.brand || "sem marca"} | Venda: R$${p.price} | Estoque: ${p.stock} un${cost ? ` | Custo: R$${cost.cost_base} + Frete: R$${cost.freight_per_unit}` : ""}`;
      }).join("\n")}`;
    }

    // Fetch FULL financial premises for budget-aware recommendations
    const { data: premises } = await supabase
      .from("financial_premises")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (premises) {
      const fixedCosts = [
        { label: premises.fixed_cost_platform_label || "Plataforma", value: premises.fixed_cost_platform },
        { label: premises.fixed_cost_whatsgw_label || "WhatsGW", value: premises.fixed_cost_whatsgw },
        { label: premises.fixed_cost_extra1_label, value: premises.fixed_cost_extra1 },
        { label: premises.fixed_cost_extra2_label, value: premises.fixed_cost_extra2 },
        { label: premises.fixed_cost_extra3_label, value: premises.fixed_cost_extra3 },
        { label: premises.fixed_cost_other_label || "Outros", value: premises.fixed_cost_other },
      ].filter(c => c.value > 0);

      const totalFixed = fixedCosts.reduce((s, c) => s + c.value, 0);

      catalogContext += `\n\n## PREMISSAS FINANCEIRAS COMPLETAS:
- Meta de faturamento mensal: R$${premises.monthly_revenue_goal}
- Meta de pedidos/mês: ${premises.order_target}
- Margem desejada: ${premises.desired_margin}%
- Orçamento de marketing: R$${premises.marketing_budget}
- Custo embalagem por pedido: R$${premises.packaging_cost} (sacola R$0,92 + adesivo/cartão R$1,00)
- Taxas gateway: Pix ${premises.gateway_rate_pix}% | Cartão ${premises.gateway_rate_credit}% + R$${premises.gateway_rate_credit_fixed} | Débito ${premises.gateway_rate_debit}%
- Comissão influencer: ${premises.influencer_commission_rate}%
- Frete lote (SP→PA): R$${premises.freight_batch_total} para ${premises.freight_batch_items} itens (R$${premises.freight_batch_items > 0 ? (premises.freight_batch_total / premises.freight_batch_items).toFixed(2) : "0"}/un)
- Custos fixos mensais: R$${totalFixed.toFixed(2)} (${fixedCosts.map(c => `${c.label}: R$${c.value}`).join(", ")})
- Ticket médio necessário: R$${premises.order_target > 0 ? (premises.monthly_revenue_goal / premises.order_target).toFixed(2) : "N/A"}`;
    }

    const systemPrompt = SYSTEM_PROMPT.replace("{{CATALOG_CONTEXT}}", catalogContext);

    if (isAnalysisMode) {
      const analysisPrompt = `Analise o portfólio completo do catálogo e da loja com foco em ORÇAMENTO e RENTABILIDADE. Retorne APENAS um JSON válido (sem markdown, sem \`\`\`) com esta estrutura exata:
{
  "summary": "Resumo executivo de 2-3 frases sobre o estado do portfólio e saúde financeira",
  "budget_health": {
    "status": "healthy|warning|critical",
    "label": "Saudável|Atenção|Crítico",
    "message": "Explicação de 1-2 frases sobre a situação orçamentária",
    "margin_avg": 35.5,
    "revenue_gap": 0,
    "ticket_gap": 0
  },
  "risk_alerts": [
    {
      "severity": "high|medium|low",
      "title": "Título curto do alerta",
      "detail": "Explicação detalhada com números",
      "action": "Ação recomendada concreta"
    }
  ],
  "top_opportunities": [
    {
      "type": "margin|volume|trend|bundle",
      "title": "Título da oportunidade",
      "detail": "Explicação com números",
      "estimated_impact": "R$ X/mês ou X% de margem"
    }
  ],
  "recommended_bundles": [
    {
      "name": "Nome do Kit/Bundle",
      "products": ["Produto 1", "Produto 2"],
      "strategy": "anti-encalhe|ticket-booster|seasonal|cross-sell",
      "suggested_price": 89.90,
      "estimated_margin": 42,
      "rationale": "Por que esse bundle funciona"
    }
  ],
  "verdicts": [
    {
      "product_name": "Nome do produto",
      "brand": "Marca",
      "verdict": "safe|moderate|risk",
      "verdict_label": "🟢 Compra Segura|🟡 Compra Moderada|🔴 Alto Risco",
      "margin_contribution": 35.5,
      "market_analysis": "Análise breve do mercado",
      "selling_point": "Ponto forte de venda",
      "mix_suggestion": "Sugestão de cross-sell",
      "risk_alert": "Alerta de risco ou string vazia"
    }
  ]
}

REGRAS:
- Analise até 15 produtos mais relevantes nos verdicts
- Inclua pelo menos 3 alertas de risco com severidade e ação
- Inclua pelo menos 3 oportunidades com tipo e impacto estimado
- Sugira 2-4 bundles estratégicos com preço e margem estimada
- Calcule margin_contribution real usando as premissas financeiras (MC% = (Preço - Custo - Frete - Taxa - Embalagem) / Preço * 100)
- budget_health.revenue_gap = meta mensal - faturamento estimado (0 se positivo)
- budget_health.ticket_gap = ticket médio necessário - ticket médio atual (0 se positivo)
- Baseie-se nos dados reais do catálogo e premissas financeiras`;

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
            { role: "user", content: analysisPrompt },
          ],
          stream: false,
        }),
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("AI analysis error:", response.status, t);
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
        throw new Error("Erro na análise IA");
      }

      const aiResult = await response.json();
      const raw = aiResult.choices?.[0]?.message?.content || "{}";
      
      let parsed;
      try {
        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = { summary: raw, budget_health: null, risk_alerts: [], top_opportunities: [], recommended_bundles: [], verdicts: [] };
      }

      // Ensure arrays exist
      parsed.risk_alerts = parsed.risk_alerts || [];
      parsed.top_opportunities = parsed.top_opportunities || [];
      parsed.recommended_bundles = parsed.recommended_bundles || [];
      parsed.verdicts = parsed.verdicts || [];

      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Chat streaming mode (existing)
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
