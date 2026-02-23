import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!GOOGLE_API_KEY) throw new Error("GOOGLE_API_KEY not configured");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { action, folder_id, import_id } = await req.json();

    // ACTION: list-folder — list subfolders (brands) in a Drive folder
    if (action === "list-folder") {
      if (!folder_id) throw new Error("folder_id is required");

      // List subfolders (brands)
      const foldersRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${folder_id}'+in+parents+and+mimeType='application/vnd.google-apps.folder'&fields=files(id,name)&key=${GOOGLE_API_KEY}`
      );
      const foldersData = await foldersRes.json();
      if (foldersData.error) throw new Error(foldersData.error.message);

      const brands = foldersData.files || [];

      // For each brand folder, count PDFs
      const brandsWithFiles = await Promise.all(
        brands.map(async (brand: any) => {
          const filesRes = await fetch(
            `https://www.googleapis.com/drive/v3/files?q='${brand.id}'+in+parents+and+mimeType='application/pdf'&fields=files(id,name)&key=${GOOGLE_API_KEY}`
          );
          const filesData = await filesRes.json();
          return {
            id: brand.id,
            name: brand.name,
            pdfCount: (filesData.files || []).length,
            files: (filesData.files || []).map((f: any) => ({ id: f.id, name: f.name })),
          };
        })
      );

      return new Response(JSON.stringify({ success: true, brands: brandsWithFiles }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: import — process PDFs from a brand folder using AI
    if (action === "import") {
      if (!import_id) throw new Error("import_id is required");

      // Get the import record
      const { data: importRecord, error: importError } = await supabase
        .from("catalog_imports")
        .select("*")
        .eq("id", import_id)
        .single();

      if (importError || !importRecord) throw new Error("Import not found");

      // Update status to processing
      await supabase.from("catalog_imports").update({ status: "processing" }).eq("id", import_id);

      const folderId = importRecord.folder_id;

      // List all brand subfolders
      const foldersRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType='application/vnd.google-apps.folder'&fields=files(id,name)&key=${GOOGLE_API_KEY}`
      );
      const foldersData = await foldersRes.json();
      const brands = foldersData.files || [];

      let totalFiles = 0;
      let processedFiles = 0;
      const allItems: any[] = [];

      // Count total PDFs
      for (const brand of brands) {
        const filesRes = await fetch(
          `https://www.googleapis.com/drive/v3/files?q='${brand.id}'+in+parents+and+mimeType='application/pdf'&fields=files(id,name)&key=${GOOGLE_API_KEY}`
        );
        const filesData = await filesRes.json();
        totalFiles += (filesData.files || []).length;
        brand.pdfFiles = filesData.files || [];
      }

      await supabase.from("catalog_imports").update({ total_files: totalFiles }).eq("id", import_id);

      // Process each brand's PDFs
      for (const brand of brands) {
        for (const file of brand.pdfFiles) {
          try {
            // Download PDF content as text via Google Drive export
            const exportRes = await fetch(
              `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/plain&key=${GOOGLE_API_KEY}`
            );

            let textContent = "";
            if (exportRes.ok) {
              textContent = await exportRes.text();
            } else {
              // Try getting file metadata with description
              const metaRes = await fetch(
                `https://www.googleapis.com/drive/v3/files/${file.id}?fields=name,description,size&key=${GOOGLE_API_KEY}`
              );
              const meta = await metaRes.json();
              textContent = `Arquivo: ${meta.name || file.name}. Marca: ${brand.name}`;
            }

            // Use AI to extract product information
            const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  {
                    role: "system",
                    content: `Você é um especialista em análise de catálogos de produtos de beleza/cosméticos. Extraia TODOS os produtos encontrados no texto abaixo. Para cada produto, identifique: nome, preço (se disponível), preço anterior/comparativo (se houver), descrição curta, categoria (ex: maquiagem, skincare, cabelo, unhas, acessórios) e tags relevantes. Retorne APENAS um JSON array válido com os produtos encontrados. Se não encontrar produtos claros, retorne um array com pelo menos 1 item baseado no contexto.`,
                  },
                  {
                    role: "user",
                    content: `Marca: ${brand.name}\nArquivo: ${file.name}\n\nConteúdo:\n${textContent.substring(0, 15000)}`,
                  },
                ],
                tools: [
                  {
                    type: "function",
                    function: {
                      name: "extract_products",
                      description: "Extract products from catalog text",
                      parameters: {
                        type: "object",
                        properties: {
                          products: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                product_name: { type: "string" },
                                price: { type: "number" },
                                compare_at_price: { type: "number" },
                                description: { type: "string" },
                                category: { type: "string" },
                                tags: { type: "array", items: { type: "string" } },
                              },
                              required: ["product_name"],
                            },
                          },
                        },
                        required: ["products"],
                      },
                    },
                  },
                ],
                tool_choice: { type: "function", function: { name: "extract_products" } },
              }),
            });

            if (!aiResponse.ok) {
              const errText = await aiResponse.text();
              console.error(`AI error for ${file.name}:`, aiResponse.status, errText);
              processedFiles++;
              await supabase.from("catalog_imports").update({ processed_files: processedFiles }).eq("id", import_id);
              continue;
            }

            const aiData = await aiResponse.json();
            const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
            let products: any[] = [];

            if (toolCall?.function?.arguments) {
              try {
                const parsed = JSON.parse(toolCall.function.arguments);
                products = parsed.products || [];
              } catch {
                console.error("Failed to parse AI response for", file.name);
              }
            }

            // Insert extracted products
            for (const product of products) {
              allItems.push({
                import_id,
                brand: brand.name,
                product_name: product.product_name || "Produto sem nome",
                price: product.price || null,
                compare_at_price: product.compare_at_price || null,
                description: product.description || null,
                category: product.category || "geral",
                tags: product.tags || [],
                source_file: file.name,
                raw_data: product,
              });
            }

            processedFiles++;
            await supabase.from("catalog_imports").update({ processed_files: processedFiles }).eq("id", import_id);
          } catch (fileError) {
            console.error(`Error processing ${file.name}:`, fileError);
            processedFiles++;
            await supabase.from("catalog_imports").update({ processed_files: processedFiles }).eq("id", import_id);
          }
        }
      }

      // Batch insert all items
      if (allItems.length > 0) {
        const { error: insertError } = await supabase.from("catalog_items").insert(allItems);
        if (insertError) console.error("Insert error:", insertError);
      }

      // Mark import as completed
      await supabase.from("catalog_imports").update({
        status: "completed",
        processed_files: processedFiles,
      }).eq("id", import_id);

      return new Response(
        JSON.stringify({ success: true, totalProducts: allItems.length, processedFiles }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: insights — generate AI insights from catalog data
    if (action === "insights") {
      const { data: items } = await supabase.from("catalog_items").select("*").order("created_at", { ascending: false }).limit(500);

      if (!items || items.length === 0) {
        return new Response(JSON.stringify({ success: true, insights: "Nenhum produto importado ainda." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const brands = [...new Set(items.map(i => i.brand))];
      const categories = [...new Set(items.map(i => i.category).filter(Boolean))];
      const avgPrice = items.filter(i => i.price).reduce((s, i) => s + Number(i.price), 0) / items.filter(i => i.price).length;

      const summary = `Total: ${items.length} produtos, ${brands.length} marcas (${brands.join(", ")}), ${categories.length} categorias. Preço médio: R$${avgPrice.toFixed(2)}`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: "Você é um analista de mercado de cosméticos. Gere insights estratégicos em português sobre o catálogo de produtos.",
            },
            {
              role: "user",
              content: `Analise este catálogo e gere insights:\n${summary}\n\nProdutos por marca:\n${brands.map(b => `${b}: ${items.filter(i => i.brand === b).length} produtos`).join("\n")}\n\nCategorias: ${categories.join(", ")}\n\nPrimeiros 30 produtos:\n${items.slice(0, 30).map(i => `- ${i.brand} | ${i.product_name} | R$${i.price || "N/A"} | ${i.category}`).join("\n")}`,
            },
          ],
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("AI insights error:", aiResponse.status, errText);
        throw new Error("Failed to generate insights");
      }

      const aiData = await aiResponse.json();
      const insights = aiData.choices?.[0]?.message?.content || "Sem insights disponíveis.";

      return new Response(JSON.stringify({ success: true, insights, summary: { total: items.length, brands: brands.length, categories: categories.length, avgPrice } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (e) {
    console.error("catalog-drive-import error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
