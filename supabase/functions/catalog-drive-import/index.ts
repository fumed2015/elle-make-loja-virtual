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
  const MAX_PDF_SIZE = 4 * 1024 * 1024; // 4MB limit for safety
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`,
      { headers: { Accept: "application/pdf" }, signal: controller.signal }
    );
    clearTimeout(timeout);
    if (!res.ok) { await res.text(); return null; }
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_PDF_SIZE) {
      console.warn(`PDF ${fileId} too large (${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB), using text fallback`);
      return null;
    }
    return base64Encode(new Uint8Array(buffer));
  } catch (e) {
    console.error(`Download error for ${fileId}:`, e);
    return null;
  }
}

async function extractProductsFromPdf(pdfBase64: string, brandName: string, fileName: string, lovableApiKey: string): Promise<any[]> {
  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        { role: "system", content: `Você é um especialista em análise de catálogos de produtos de beleza/cosméticos. Analise o PDF enviado e extraia TODOS os produtos encontrados. Para cada produto, identifique: nome, preço (se disponível), preço anterior/comparativo (se houver), descrição curta, categoria (ex: maquiagem, skincare, cabelo, unhas, acessórios) e tags relevantes. Retorne APENAS via tool call.` },
        { role: "user", content: [
          { type: "text", text: `Marca: ${brandName}\nArquivo: ${fileName}\n\nAnalise o PDF anexo e extraia todos os produtos.` },
          { type: "image_url", image_url: { url: `data:application/pdf;base64,${pdfBase64}` } },
        ] },
      ],
      tools: [{
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
      }],
      tool_choice: { type: "function", function: { name: "extract_products" } },
    }),
  });
  if (!aiResponse.ok) { const e = await aiResponse.text(); console.error(`AI error for ${fileName}:`, aiResponse.status, e); return []; }
  const aiData = await aiResponse.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    try { return JSON.parse(toolCall.function.arguments).products || []; } catch { console.error("Failed to parse AI response for", fileName); }
  }
  return [];
}

async function extractViaTextFallback(fileId: string, brandName: string, apiKey: string, lovableApiKey: string): Promise<any[]> {
  const exportRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain&key=${apiKey}`);
  if (!exportRes.ok) { await exportRes.text(); return []; }
  const textContent = await exportRes.text();
  const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        { role: "system", content: "Extraia produtos do texto. Retorne via tool call." },
        { role: "user", content: `Marca: ${brandName}\n${textContent.substring(0, 8000)}` },
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
      try { return JSON.parse(tc.function.arguments).products || []; } catch {}
    }
  } else { await aiRes.text(); }
  return [];
}

async function processFile(file: { fileId: string; brandName: string; fileName: string }, importId: string, supabase: any, GOOGLE_API_KEY: string, LOVABLE_API_KEY: string): Promise<number> {
  const pdfBase64 = await downloadPdfAsBase64(file.fileId, GOOGLE_API_KEY);
  let products: any[] = [];
  if (pdfBase64) {
    products = await extractProductsFromPdf(pdfBase64, file.brandName, file.fileName, LOVABLE_API_KEY);
  } else {
    products = await extractViaTextFallback(file.fileId, file.brandName, GOOGLE_API_KEY, LOVABLE_API_KEY);
  }
  if (products.length > 0) {
    const items = products.map((p: any) => ({
      import_id: importId,
      brand: file.brandName,
      product_name: p.product_name || "Produto sem nome",
      price: p.price || null,
      compare_at_price: p.compare_at_price || null,
      description: p.description || null,
      category: p.category || "geral",
      tags: p.tags || [],
      source_file: file.fileName,
      raw_data: p,
    }));
    await supabase.from("catalog_items").insert(items);
    return items.length;
  }
  return 0;
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
      // Parallel PDF count for all brands
      const brandsWithFiles = await Promise.all(
        folders.map(async (brand: any) => {
          const pdfs = await getAllDriveFiles(brand.id, "application/pdf", GOOGLE_API_KEY);
          return { id: brand.id, name: brand.name, pdfCount: pdfs.length, files: pdfs.map((f: any) => ({ id: f.id, name: f.name })) };
        })
      );
      return new Response(JSON.stringify({ success: true, brands: brandsWithFiles }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── DISCOVER (step 1: only build manifest, no file processing) ──
    if (action === "discover") {
      if (!import_id) throw new Error("import_id is required");
      const { data: rec, error: recErr } = await supabase.from("catalog_imports").select("*").eq("id", import_id).single();
      if (recErr || !rec) throw new Error("Import not found");

      const folderId = rec.folder_id;

      // Check duplicate
      const { data: existing } = await supabase.from("catalog_imports").select("id").eq("folder_id", folderId).eq("status", "completed").neq("id", import_id).limit(1);
      if (existing && existing.length > 0) {
        await supabase.from("catalog_imports").update({ status: "completed", error_message: "Importação duplicada — essa pasta já foi importada." }).eq("id", import_id);
        return new Response(JSON.stringify({ success: false, error: "Essa pasta já foi importada.", done: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Discover brand folders
      const brands = await getAllDriveFiles(folderId, "application/vnd.google-apps.folder", GOOGLE_API_KEY);
      console.log(`Found ${brands.length} brand folders`);

      // Parallel PDF listing with concurrency limit of 5
      const CONCURRENCY = 5;
      const fileManifest: { brandName: string; fileId: string; fileName: string }[] = [];
      for (let i = 0; i < brands.length; i += CONCURRENCY) {
        const batch = brands.slice(i, i + CONCURRENCY);
        const results = await Promise.all(
          batch.map(async (brand: any) => {
            const pdfs = await getAllDriveFiles(brand.id, "application/pdf", GOOGLE_API_KEY);
            return pdfs.map((pdf: any) => ({ brandName: brand.name, fileId: pdf.id, fileName: pdf.name }));
          })
        );
        for (const r of results) fileManifest.push(...r);
      }

      console.log(`Manifest built: ${fileManifest.length} files across ${brands.length} brands`);

      // Store manifest and mark as processing
      await supabase.from("catalog_imports").update({
        status: "processing",
        total_files: fileManifest.length,
        processed_files: 0,
        folder_name: JSON.stringify({ url: rec.folder_name, manifest: fileManifest }),
      }).eq("id", import_id);

      return new Response(JSON.stringify({
        success: true,
        done: false,
        totalFiles: fileManifest.length,
        brandsCount: brands.length,
        processedFiles: 0,
        productsInChunk: 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── IMPORT (step 2+: process CHUNK_SIZE files per call) ──
    if (action === "import") {
      if (!import_id) throw new Error("import_id is required");
      const CHUNK_SIZE = 1; // Process 1 file per call to stay within 60s timeout

      const { data: rec, error: recErr } = await supabase.from("catalog_imports").select("*").eq("id", import_id).single();
      if (recErr || !rec) throw new Error("Import not found");

      // If still pending, redirect to discover first
      if (rec.status === "pending") {
        return new Response(JSON.stringify({ success: false, error: "Primeiro execute a ação 'discover' para essa importação." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (rec.status !== "processing") {
        return new Response(JSON.stringify({ success: true, done: true, processedFiles: rec.processed_files, totalFiles: rec.total_files }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let manifest: any[];
      try {
        const parsed = JSON.parse(rec.folder_name);
        manifest = parsed.manifest;
      } catch {
        throw new Error("Manifesto corrompido. Delete e reimporte.");
      }

      const startIdx = rec.processed_files || 0;
      const chunk = manifest.slice(startIdx, startIdx + CHUNK_SIZE);

      if (chunk.length === 0) {
        await supabase.from("catalog_imports").update({ status: "completed" }).eq("id", import_id);
        return new Response(JSON.stringify({ success: true, done: true, processedFiles: startIdx, totalFiles: manifest.length }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Process files sequentially to avoid memory issues (each PDF can be large)
      let productsCount = 0;
      for (const file of chunk) {
        try {
          const count = await processFile(file, import_id, supabase, GOOGLE_API_KEY, LOVABLE_API_KEY);
          productsCount += count;
          console.log(`Processed ${file.fileName} (${file.brandName}): ${count} products`);
        } catch (e) {
          console.error(`Error processing ${file.fileName}:`, e);
        }
      }

      const processedSoFar = startIdx + chunk.length;
      const done = processedSoFar >= manifest.length;

      await supabase.from("catalog_imports").update({
        processed_files: processedSoFar,
        ...(done ? { status: "completed" } : {}),
      }).eq("id", import_id);

      return new Response(JSON.stringify({
        success: true,
        done,
        processedFiles: processedSoFar,
        totalFiles: manifest.length,
        productsInChunk: productsCount,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── DELETE-IMPORT ──
    if (action === "delete-import") {
      if (!import_id) throw new Error("import_id is required");
      await supabase.from("catalog_items").delete().eq("import_id", import_id);
      const { error } = await supabase.from("catalog_imports").delete().eq("id", import_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── INSIGHTS ──
    if (action === "insights") {
      const { data: items } = await supabase.from("catalog_items").select("*").order("created_at", { ascending: false }).limit(500);
      if (!items || items.length === 0) {
        return new Response(JSON.stringify({ success: true, insights: "Nenhum produto importado ainda." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const brands = [...new Set(items.map((i: any) => i.brand))];
      const categories = [...new Set(items.map((i: any) => i.category).filter(Boolean))];
      const priced = items.filter((i: any) => i.price);
      const avgPrice = priced.length > 0 ? priced.reduce((s: number, i: any) => s + Number(i.price), 0) / priced.length : 0;
      const summary = `Total: ${items.length} produtos, ${brands.length} marcas (${brands.join(", ")}), ${categories.length} categorias. Preço médio: R$${avgPrice.toFixed(2)}`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: "Você é um consultor de compras para uma loja de cosméticos. Analise o catálogo importado e forneça insights estratégicos em português. Use markdown." },
            { role: "user", content: `Resumo do catálogo:\n${summary}\n\nProdutos (amostra):\n${JSON.stringify(items.slice(0, 50).map((i: any) => ({ nome: i.product_name, marca: i.brand, preco: i.price, cat: i.category })))}` },
          ],
        }),
      });
      if (!aiResponse.ok) { const e = await aiResponse.text(); throw new Error(`AI error: ${e}`); }
      const aiData = await aiResponse.json();
      const insightsText = aiData.choices?.[0]?.message?.content || "Sem insights disponíveis.";
      return new Response(JSON.stringify({ success: true, insights: insightsText }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err: any) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
