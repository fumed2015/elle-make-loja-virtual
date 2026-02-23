import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getEnv(name: string): string {
  const val = Deno.env.get(name);
  if (!val) throw new Error(`${name} not configured`);
  return val;
}

async function listDriveFiles(folderId: string, mimeType: string, apiKey: string, pageToken?: string) {
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("q", `'${folderId}' in parents and mimeType='${mimeType}'`);
  url.searchParams.set("fields", "nextPageToken,files(id,name,size)");
  url.searchParams.set("pageSize", "100");
  url.searchParams.set("key", apiKey);
  if (pageToken) url.searchParams.set("pageToken", pageToken);
  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return { files: data.files || [], nextPageToken: data.nextPageToken };
}

async function getAllDriveFiles(folderId: string, mimeType: string, apiKey: string) {
  let allFiles: any[] = [];
  let pageToken: string | undefined;
  do {
    const result = await listDriveFiles(folderId, mimeType, apiKey, pageToken);
    allFiles = allFiles.concat(result.files);
    pageToken = result.nextPageToken;
  } while (pageToken);
  return allFiles;
}

async function downloadPdfAsBase64(fileId: string, apiKey: string): Promise<string | null> {
  const MAX_PDF_SIZE = 4 * 1024 * 1024; // 4MB limit to avoid memory issues
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`,
      { headers: { Accept: "application/pdf" } }
    );
    if (!res.ok) {
      console.error(`Download failed for ${fileId}: ${res.status}`);
      await res.text(); // consume body
      return null;
    }
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_PDF_SIZE) {
      console.warn(`PDF ${fileId} too large (${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB), skipping`);
      return null;
    }
    return base64Encode(new Uint8Array(buffer));
  } catch (e) {
    console.error(`Download error for ${fileId}:`, e);
    return null;
  }
}

async function extractProductsFromPdf(
  pdfBase64: string,
  brandName: string,
  fileName: string,
  lovableApiKey: string
): Promise<any[]> {
  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `Você é um especialista em análise de catálogos de produtos de beleza/cosméticos. Analise o PDF enviado e extraia TODOS os produtos encontrados. Para cada produto, identifique: nome, preço (se disponível), preço anterior/comparativo (se houver), descrição curta, categoria (ex: maquiagem, skincare, cabelo, unhas, acessórios) e tags relevantes. Retorne APENAS via tool call.`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: `Marca: ${brandName}\nArquivo: ${fileName}\n\nAnalise o PDF anexo e extraia todos os produtos.` },
            {
              type: "image_url",
              image_url: { url: `data:application/pdf;base64,${pdfBase64}` },
            },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_products",
            description: "Extract products from catalog PDF",
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
    console.error(`AI error for ${fileName}:`, aiResponse.status, errText);
    return [];
  }

  const aiData = await aiResponse.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    try {
      const parsed = JSON.parse(toolCall.function.arguments);
      return parsed.products || [];
    } catch {
      console.error("Failed to parse AI response for", fileName);
    }
  }
  return [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GOOGLE_API_KEY = getEnv("GOOGLE_API_KEY");
    const LOVABLE_API_KEY = getEnv("LOVABLE_API_KEY");
    const SUPABASE_URL = getEnv("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { action, folder_id, import_id } = await req.json();

    // ── LIST-FOLDER ──
    if (action === "list-folder") {
      if (!folder_id) throw new Error("folder_id is required");

      const folders = await getAllDriveFiles(folder_id, "application/vnd.google-apps.folder", GOOGLE_API_KEY);

      const brandsWithFiles = await Promise.all(
        folders.map(async (brand: any) => {
          const pdfs = await getAllDriveFiles(brand.id, "application/pdf", GOOGLE_API_KEY);
          return {
            id: brand.id,
            name: brand.name,
            pdfCount: pdfs.length,
            files: pdfs.map((f: any) => ({ id: f.id, name: f.name })),
          };
        })
      );

      return new Response(JSON.stringify({ success: true, brands: brandsWithFiles }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── IMPORT ──
    if (action === "import") {
      if (!import_id) throw new Error("import_id is required");

      const { data: importRecord, error: importError } = await supabase
        .from("catalog_imports")
        .select("*")
        .eq("id", import_id)
        .single();

      if (importError || !importRecord) throw new Error("Import not found");

      // Check for duplicate (same folder already completed)
      const { data: existing } = await supabase
        .from("catalog_imports")
        .select("id")
        .eq("folder_id", importRecord.folder_id)
        .eq("status", "completed")
        .neq("id", import_id)
        .limit(1);

      if (existing && existing.length > 0) {
        await supabase.from("catalog_imports").update({
          status: "completed",
          error_message: "Importação duplicada — essa pasta já foi importada anteriormente.",
        }).eq("id", import_id);

        return new Response(JSON.stringify({
          success: false,
          error: "Essa pasta já foi importada. Delete a importação anterior para reimportar.",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      await supabase.from("catalog_imports").update({ status: "processing" }).eq("id", import_id);

      const folderId = importRecord.folder_id;
      const brands = await getAllDriveFiles(folderId, "application/vnd.google-apps.folder", GOOGLE_API_KEY);

      let totalFiles = 0;
      let processedFiles = 0;
      let totalProducts = 0;

      // Count total PDFs
      const brandPdfs: { brand: any; files: any[] }[] = [];
      for (const brand of brands) {
        const pdfs = await getAllDriveFiles(brand.id, "application/pdf", GOOGLE_API_KEY);
        totalFiles += pdfs.length;
        brandPdfs.push({ brand, files: pdfs });
      }

      await supabase.from("catalog_imports").update({ total_files: totalFiles }).eq("id", import_id);

      // Process each PDF one at a time to minimize memory
      for (const { brand, files } of brandPdfs) {
        for (const file of files) {
          const batchItems: any[] = [];
          try {
            const pdfBase64 = await downloadPdfAsBase64(file.id, GOOGLE_API_KEY);

            let products: any[] = [];

            if (pdfBase64) {
              products = await extractProductsFromPdf(pdfBase64, brand.name, file.name, LOVABLE_API_KEY);
            } else {
              // Fallback: try text export
              const exportRes = await fetch(
                `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/plain&key=${GOOGLE_API_KEY}`
              );
              if (exportRes.ok) {
                const textContent = await exportRes.text();
                const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${LOVABLE_API_KEY}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    model: "google/gemini-2.5-flash",
                    messages: [
                      { role: "system", content: "Extraia produtos do texto. Retorne via tool call." },
                      { role: "user", content: `Marca: ${brand.name}\n${textContent.substring(0, 10000)}` },
                    ],
                    tools: [{
                      type: "function",
                      function: {
                        name: "extract_products",
                        description: "Extract products",
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
                    }],
                    tool_choice: { type: "function", function: { name: "extract_products" } },
                  }),
                });
                if (aiRes.ok) {
                  const d = await aiRes.json();
                  const tc = d.choices?.[0]?.message?.tool_calls?.[0];
                  if (tc?.function?.arguments) {
                    try { products = JSON.parse(tc.function.arguments).products || []; } catch {}
                  }
                } else {
                  await aiRes.text();
                }
              } else {
                await exportRes.text();
              }
            }

            for (const product of products) {
              batchItems.push({
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

            // Insert immediately per-file to free memory
            if (batchItems.length > 0) {
              const { error: insertError } = await supabase.from("catalog_items").insert(batchItems);
              if (insertError) console.error("Insert error:", insertError);
              totalProducts += batchItems.length;
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

      await supabase.from("catalog_imports").update({
        status: "completed",
        processed_files: processedFiles,
      }).eq("id", import_id);

      return new Response(
        JSON.stringify({ success: true, totalProducts, processedFiles }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── DELETE-IMPORT ──
    if (action === "delete-import") {
      if (!import_id) throw new Error("import_id is required");

      // Delete items first, then the import record
      await supabase.from("catalog_items").delete().eq("import_id", import_id);
      const { error } = await supabase.from("catalog_imports").delete().eq("id", import_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── INSIGHTS ──
    if (action === "insights") {
      const { data: items } = await supabase
        .from("catalog_items")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (!items || items.length === 0) {
        return new Response(JSON.stringify({ success: true, insights: "Nenhum produto importado ainda." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const brands = [...new Set(items.map(i => i.brand))];
      const categories = [...new Set(items.map(i => i.category).filter(Boolean))];
      const priced = items.filter(i => i.price);
      const avgPrice = priced.length > 0 ? priced.reduce((s, i) => s + Number(i.price), 0) / priced.length : 0;

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

      return new Response(JSON.stringify({
        success: true,
        insights,
        summary: { total: items.length, brands: brands.length, categories: categories.length, avgPrice },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
