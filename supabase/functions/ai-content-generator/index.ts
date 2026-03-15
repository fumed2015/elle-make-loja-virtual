import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin - REQUIRED
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: hasRole } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!hasRole) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, product_id, product_ids, force_all, product_name, brand, barcode, ref_code, offset = 0, chunk_size = 3, title: blogTitle, tags: blogTags } = body;

    // Action: blog_post - Generate blog content
    if (action === "blog_post") {
      if (!blogTitle) {
        return new Response(JSON.stringify({ error: "Título obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tagsContext = blogTags?.length ? `Tags sugeridas: ${blogTags.join(", ")}.` : "";
      const prompt = `Você é uma redatora especialista em beleza e maquiagem para o blog da Elle Make, uma loja de cosméticos em Belém do Pará.

Crie um artigo completo para o título: "${blogTitle}"
${tagsContext}

Requisitos:
- Artigo com 800-1200 palavras em português brasileiro
- Use headings com ## e ### para organizar o conteúdo
- Inclua dicas práticas e linguagem acessível
- Use **negrito** para destacar termos importantes
- Inclua listas com - quando apropriado
- Mencione produtos e categorias de maquiagem naturalmente
- Tom amigável e profissional, como uma consultora de beleza

Retorne um JSON com:
- content: o artigo completo formatado
- excerpt: resumo de 1-2 frases (max 160 chars)
- seo_title: título SEO otimizado (max 60 chars)
- seo_description: meta description (max 160 chars)
- tags: array de 3-6 tags relevantes em lowercase`;

      const aiResp = await fetch("https://apim.lovable.dev/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }],
          tools: [{
            type: "function",
            function: {
              name: "save_blog_content",
              parameters: {
                type: "object",
                properties: {
                  content: { type: "string" },
                  excerpt: { type: "string" },
                  seo_title: { type: "string" },
                  seo_description: { type: "string" },
                  tags: { type: "array", items: { type: "string" } },
                },
                required: ["content", "excerpt", "seo_title", "seo_description", "tags"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "save_blog_content" } },
        }),
      });

      if (!aiResp.ok) {
        if (aiResp.status === 402) {
          return new Response(JSON.stringify({ error: "Créditos de IA esgotados" }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (aiResp.status === 429) {
          return new Response(JSON.stringify({ error: "Limite de requisições atingido" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("AI error: " + aiResp.status);
      }

      const aiData = await aiResp.json();
      const tc = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!tc) throw new Error("AI não retornou conteúdo do blog");

      const result = JSON.parse(tc.function.arguments);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: generate - Generate content for a single product
    if (action === "generate") {
      const { data: product, error } = await supabase
        .from("products")
        .select("*, categories(name)")
        .eq("id", product_id)
        .single();

      if (error || !product) {
        return new Response(JSON.stringify({ error: "Produto não encontrado" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const prompt = `Você é uma copywriter especialista em e-commerce de maquiagem e cosméticos brasileiros. Gere conteúdo otimizado para SEO para o seguinte produto:

Nome: ${product.name}
Marca: ${product.brand || "N/A"}
Categoria: ${(product.categories as any)?.name || "Maquiagem"}
Preço: R$ ${Number(product.price).toFixed(2)}
Tags: ${(product.tags || []).join(", ")}
Ingredientes: ${product.ingredients || "N/A"}

Gere EXATAMENTE o seguinte conteúdo usando a function tool:
1. description: Descrição persuasiva do produto (150-250 palavras). Use linguagem sensorial. Mencione benefícios, não apenas características. Inclua palavras-chave naturais para SEO. Foque no público brasileiro.
2. sensorial_description: Descrição sensorial curta (2-3 frases) focada na textura, fragrância e sensação ao aplicar.
3. how_to_use: Instruções de uso detalhadas (3-5 passos). Comece cada passo com um verbo no imperativo. Inclua dicas de aplicação profissional. Seja prática e objetiva.
4. seo_title: Título SEO otimizado (máx 60 chars) com palavra-chave principal + marca.
5. meta_description: Meta descrição (máx 155 chars) com CTA e palavra-chave.
6. tags: Array de 5-8 tags relevantes para filtros e SEO (ex: "pele oleosa", "longa duração", "vegano").`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "Você é uma copywriter expert em cosméticos e SEO para e-commerce brasileiro." },
            { role: "user", content: prompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "save_product_content",
                description: "Save generated product content",
                parameters: {
                  type: "object",
                  properties: {
                    description: { type: "string", description: "Product description 150-250 words" },
                    sensorial_description: { type: "string", description: "Sensorial description 2-3 sentences" },
                    how_to_use: { type: "string", description: "How to use instructions 3-5 steps" },
                    seo_title: { type: "string", description: "SEO title max 60 chars" },
                    meta_description: { type: "string", description: "Meta description max 155 chars" },
                    tags: { type: "array", items: { type: "string" }, description: "5-8 relevant tags" },
                  },
                  required: ["description", "sensorial_description", "how_to_use", "seo_title", "meta_description", "tags"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "save_product_content" } },
        }),
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("AI error:", response.status, t);
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Limite de requisições atingido. Aguarde." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("AI gateway error: " + response.status);
      }

      const aiResult = await response.json();
      const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("AI did not return structured content");

      const content = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ content, product_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    // Action: bulk-complete - Generate descriptions for all products (chunked, text only)
    if (action === "bulk-complete") {
      const limit = Math.min(chunk_size, 5);

      let query = supabase
        .from("products")
        .select("id, name, brand, slug, price, tags, ingredients, description, sensorial_description, how_to_use, categories(name)")
        .eq("is_active", true);

      if (!force_all) {
        query = query.or("description.is.null,description.eq.");
      }

      const { data: products, error } = await query.order("name").range(offset, offset + limit - 1);
      if (error) throw error;
      if (!products || products.length === 0) {
        return new Response(JSON.stringify({ message: "Todos os produtos já estão completos!", updated: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results: any[] = [];

      for (const product of products) {
        try {
          const needsDescription = force_all || !product.description || product.description.length < 50;

          const updateData: any = {};

          // Generate description if needed
          if (needsDescription) {
            const prompt = `Gere conteúdo SEO para este produto de maquiagem:
Nome: ${product.name}
Marca: ${product.brand || "N/A"}
Categoria: ${(product.categories as any)?.name || "Maquiagem"}
Preço: R$ ${Number(product.price).toFixed(2)}
Tags: ${(product.tags || []).join(", ")}
Ingredientes: ${product.ingredients || "N/A"}

Gere: description (150-250 palavras, sensorial, SEO), sensorial_description (2-3 frases), how_to_use (3-5 passos com verbos imperativos), tags (5-8 tags).`;

            const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-3-flash-preview",
                messages: [
                  { role: "system", content: "Copywriter expert em cosméticos e SEO para e-commerce brasileiro." },
                  { role: "user", content: prompt },
                ],
                tools: [{
                  type: "function",
                  function: {
                    name: "save_content",
                    description: "Save product content",
                    parameters: {
                      type: "object",
                      properties: {
                        description: { type: "string" },
                        sensorial_description: { type: "string" },
                        how_to_use: { type: "string" },
                        tags: { type: "array", items: { type: "string" } },
                      },
                      required: ["description", "sensorial_description", "how_to_use", "tags"],
                      additionalProperties: false,
                    },
                  },
                }],
                tool_choice: { type: "function", function: { name: "save_content" } },
              }),
            });

            if (aiResp.ok) {
              const aiData = await aiResp.json();
              const tc = aiData.choices?.[0]?.message?.tool_calls?.[0];
              if (tc) {
                const content = JSON.parse(tc.function.arguments);
                if (force_all || !product.description || product.description.length < 50) updateData.description = content.description;
                if (force_all || !product.sensorial_description) updateData.sensorial_description = content.sensorial_description;
                if (force_all || !(product as any).how_to_use) updateData.how_to_use = content.how_to_use;
                if (force_all || !product.tags || product.tags.length === 0) updateData.tags = content.tags;
              }
            }
            await new Promise(r => setTimeout(r, 800));
          }


          if (Object.keys(updateData).length > 0) {
            const { error: updateError } = await supabase
              .from("products").update(updateData).eq("id", product.id);

            if (updateError) {
              results.push({ id: product.id, name: product.name, status: "update_error" });
            } else {
              results.push({ id: product.id, name: product.name, status: "updated", fields: Object.keys(updateData) });
            }
          } else {
            results.push({ id: product.id, name: product.name, status: "skipped" });
          }
        } catch (err) {
          console.error(`Error processing ${product.id}:`, err);
          results.push({ id: product.id, name: product.name, status: "error" });
        }
      }

      const hasMore = products.length === limit;
      return new Response(JSON.stringify({
        message: `Processados ${results.length} produtos`,
        results,
        updated: results.filter(r => r.status === "updated").length,
        has_more: hasMore,
        next_offset: offset + limit,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Action: bulk-seo - Auto-optimize products missing content (text only)
    if (action === "bulk-seo") {
      const targetIds = product_ids as string[] | undefined;
      const seoLimit = Math.min(chunk_size, 10);
      
      let query = supabase
        .from("products")
        .select("id, name, brand, price, tags, ingredients, description, sensorial_description, how_to_use, categories(name)")
        .eq("is_active", true);

      if (targetIds && targetIds.length > 0) {
        query = query.in("id", targetIds);
      } else if (!force_all) {
        query = query.or("description.is.null,description.eq.,sensorial_description.is.null,how_to_use.is.null");
      }

      const { data: products, error } = await query.order("name").range(offset, offset + seoLimit - 1);
      if (error) throw error;
      if (!products || products.length === 0) {
        return new Response(JSON.stringify({ message: "Todos os produtos já possuem descrições!", updated: 0, has_more: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results: any[] = [];

      for (const product of products) {
        try {
          const prompt = `Gere conteúdo SEO para este produto de maquiagem:
Nome: ${product.name}
Marca: ${product.brand || "N/A"}
Categoria: ${(product.categories as any)?.name || "Maquiagem"}
Preço: R$ ${Number(product.price).toFixed(2)}
Tags: ${(product.tags || []).join(", ")}
Ingredientes: ${product.ingredients || "N/A"}
Descrição atual: ${product.description || "NENHUMA"}

Gere: description (150-250 palavras, sensorial, SEO), sensorial_description (2-3 frases), how_to_use (3-5 passos com verbos imperativos, dicas profissionais), tags (5-8 tags).`;

          const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: "Copywriter expert em cosméticos e SEO para e-commerce brasileiro. Gere conteúdo persuasivo e sensorial." },
                { role: "user", content: prompt },
              ],
              tools: [{
                type: "function",
                function: {
                  name: "save_content",
                  description: "Save product content",
                  parameters: {
                    type: "object",
                    properties: {
                      description: { type: "string" },
                      sensorial_description: { type: "string" },
                      how_to_use: { type: "string" },
                      tags: { type: "array", items: { type: "string" } },
                    },
                    required: ["description", "sensorial_description", "how_to_use", "tags"],
                    additionalProperties: false,
                  },
                },
              }],
              tool_choice: { type: "function", function: { name: "save_content" } },
            }),
          });

          if (!aiResp.ok) {
            console.error(`AI error for product ${product.id}:`, aiResp.status);
            results.push({ id: product.id, name: product.name, status: "error" });
            continue;
          }

          const aiData = await aiResp.json();
          const tc = aiData.choices?.[0]?.message?.tool_calls?.[0];
          if (!tc) {
            results.push({ id: product.id, name: product.name, status: "no_content" });
            continue;
          }

          const content = JSON.parse(tc.function.arguments);
          
          const updateData: any = {};
          if (force_all || !product.description || product.description.length < 50) updateData.description = content.description;
          if (force_all || !product.sensorial_description) updateData.sensorial_description = content.sensorial_description;
          if (force_all || !(product as any).how_to_use) updateData.how_to_use = content.how_to_use;
          if (force_all || !product.tags || product.tags.length === 0) updateData.tags = content.tags;

          if (Object.keys(updateData).length > 0) {
            const { error: updateError } = await supabase.from("products").update(updateData).eq("id", product.id);
            if (updateError) {
              results.push({ id: product.id, name: product.name, status: "update_error" });
            } else {
              results.push({ id: product.id, name: product.name, status: "updated", fields: Object.keys(updateData) });
            }
          } else {
            results.push({ id: product.id, name: product.name, status: "skipped" });
          }

          await new Promise(r => setTimeout(r, 1000));
        } catch (err) {
          console.error(`Error processing ${product.id}:`, err);
          results.push({ id: product.id, name: product.name, status: "error" });
        }
      }

      const seoHasMore = products.length === seoLimit;
      return new Response(JSON.stringify({
        message: `Processados ${results.length} produtos`,
        results,
        updated: results.filter(r => r.status === "updated").length,
        has_more: seoHasMore,
        next_offset: offset + seoLimit,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Action: generate-reviews
    if (action === "generate-reviews") {
      const { data: product, error: pErr } = await supabase
        .from("products")
        .select("name, brand, price, description, tags, categories(name)")
        .eq("id", product_id)
        .single();

      if (pErr || !product) {
        return new Response(JSON.stringify({ error: "Produto não encontrado" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const reviewPrompt = `Você é uma geradora de avaliações realistas para um e-commerce brasileiro de maquiagem.

Produto: ${product.name}
Marca: ${product.brand || "N/A"}
Categoria: ${(product.categories as any)?.name || "Maquiagem"}
Preço: R$ ${Number(product.price).toFixed(2)}
Descrição: ${product.description || "N/A"}

Gere exatamente 5 avaliações REALISTAS de clientes brasileiras. Cada avaliação deve:
- Ter um nome feminino brasileiro realista (primeiro nome + sobrenome)
- Ter uma nota de 3 a 5 estrelas (maioria 4-5, mas varie)
- Ter um comentário autêntico de 1-3 frases em português brasileiro coloquial
- Parecer escrita por uma pessoa real (com gírias leves, emojis ocasionais, erros mínimos naturais)
- Mencionar aspectos específicos do produto (textura, cor, duração, cobertura, etc.)
- Variar entre experiências positivas e neutras (nunca extremamente negativas)`;

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "Gere avaliações realistas de produtos de maquiagem." },
            { role: "user", content: reviewPrompt },
          ],
          tools: [{
            type: "function",
            function: {
              name: "save_reviews",
              description: "Save generated reviews",
              parameters: {
                type: "object",
                properties: {
                  reviews: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Reviewer full name" },
                        rating: { type: "number", description: "Rating 1-5" },
                        comment: { type: "string", description: "Review comment" },
                      },
                      required: ["name", "rating", "comment"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["reviews"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "save_reviews" } },
        }),
      });

      if (!aiResp.ok) {
        const t = await aiResp.text();
        console.error("AI reviews error:", aiResp.status, t);
        if (aiResp.status === 429) {
          return new Response(JSON.stringify({ error: "Limite de requisições atingido." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("AI gateway error: " + aiResp.status);
      }

      const aiData = await aiResp.json();
      const tc = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!tc) throw new Error("AI did not return reviews");

      const { reviews: generatedReviews } = JSON.parse(tc.function.arguments);
      const insertedReviews: any[] = [];

      for (const rev of generatedReviews) {
        const fakeUserId = crypto.randomUUID();
        await supabase.from("profiles").insert({ user_id: fakeUserId, full_name: rev.name });
        const { error: revErr } = await supabase.from("reviews").insert({
          user_id: fakeUserId,
          product_id: product_id,
          rating: Math.max(1, Math.min(5, Math.round(rev.rating))),
          comment: rev.comment,
          is_approved: true,
        });
        if (!revErr) insertedReviews.push({ name: rev.name, rating: rev.rating });
        else console.error("Review insert error:", revErr);
      }

      return new Response(JSON.stringify({
        message: `${insertedReviews.length} avaliações geradas!`,
        reviews: insertedReviews,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Action: generate-swatches - AI-powered color detection from product info
    if (action === "generate-swatches") {
      const prompt = `Você é um especialista em catálogo de cosméticos e maquiagem brasileiros. Analise as informações abaixo e identifique TODAS as variações de cores disponíveis para este produto.

Nome do produto: ${product_name || "N/A"}
Marca: ${brand || "N/A"}
Códigos de barras conhecidos: ${barcode || "nenhum"}
Códigos de referência conhecidos: ${ref_code || "nenhum"}

IMPORTANTE:
- Produtos de maquiagem geralmente vêm em múltiplas cores/tons (nude, rosa, vermelho, marrom, etc.)
- Se o nome mencionar "kit", "paleta" ou número de cores, gere essa quantidade de tons
- Se o nome contém uma categoria (batom, blush, sombra, base, corretivo), gere cores típicas dessa categoria
- Para batons: nude, rosa, vermelho, vinho, coral, marsala, etc.
- Para bases/corretivos: bege claro, bege médio, bege escuro, caramelo, etc.
- Para blush: rosa, pêssego, coral, malva, etc.
- Para sombras: marrom, dourado, bronze, preto, cinza, etc.
- Gere cores HEX realistas para cada tom
- Se houver códigos de referência, use-os para nomear as variações

Gere entre 3 e 12 variações de cores típicas para este tipo de produto.`;

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "Especialista em catálogo de cosméticos. Retorne cores realistas." },
            { role: "user", content: prompt },
          ],
          tools: [{
            type: "function",
            function: {
              name: "save_swatches",
              description: "Save detected color swatches",
              parameters: {
                type: "object",
                properties: {
                  swatches: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Color name in Portuguese (e.g. Nude Claro, Rosa Médio)" },
                        color: { type: "string", description: "HEX color code (e.g. #c8a98a)" },
                        ref_code: { type: "string", description: "Reference code if detectable" },
                        barcode: { type: "string", description: "Barcode if detectable" },
                      },
                      required: ["name", "color"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["swatches"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "save_swatches" } },
        }),
      });

      if (!aiResp.ok) {
        if (aiResp.status === 429) {
          return new Response(JSON.stringify({ error: "Limite de requisições atingido." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("AI error: " + aiResp.status);
      }

      const aiData = await aiResp.json();
      const tc = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!tc) throw new Error("AI não retornou cores");

      const { swatches } = JSON.parse(tc.function.arguments);
      return new Response(JSON.stringify({ swatches }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("ai-content-generator error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
