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
  const MAX_PDF_SIZE = 3 * 1024 * 1024; // 3MB limit to stay within memory constraints
  try {
    // Check file size first via metadata to avoid downloading large files
    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=size&key=${apiKey}`
    );
    if (metaRes.ok) {
      const meta = await metaRes.json();
      const fileSize = parseInt(meta.size || "0", 10);
      if (fileSize > MAX_PDF_SIZE) {
        console.warn(`PDF ${fileId} too large (${(fileSize / 1024 / 1024).toFixed(1)}MB), skipping download`);
        return null;
      }
    } else {
      await metaRes.text();
    }

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
      console.warn(`PDF ${fileId} actual size exceeded limit`);
      return null;
    }
    const encoded = base64Encode(new Uint8Array(buffer));
    // Release reference to raw buffer immediately
    return encoded;
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
  if (!exportRes.ok) {
    // Fallback: try downloading raw and extracting readable text
    const rawRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`);
    if (!rawRes.ok) { await rawRes.text(); return []; }
    const buf = await rawRes.arrayBuffer();
    // Extract printable ASCII/UTF-8 strings from binary PDF
    const bytes = new Uint8Array(buf);
    let textContent = "";
    let run = "";
    for (let i = 0; i < Math.min(bytes.length, 500000); i++) {
      const c = bytes[i];
      if (c >= 32 && c < 127) { run += String.fromCharCode(c); }
      else { if (run.length > 4) textContent += run + " "; run = ""; }
    }
    if (run.length > 4) textContent += run;
    if (textContent.length < 50) return [];
    return await callAiForText(textContent.substring(0, 12000), brandName, lovableApiKey);
  }
  const textContent = await exportRes.text();
  if (textContent.length < 20) return [];
  return await callAiForText(textContent.substring(0, 12000), brandName, lovableApiKey);
}

async function callAiForText(text: string, brandName: string, lovableApiKey: string): Promise<any[]> {
  const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        { role: "system", content: "Extraia produtos do texto de catálogo. Retorne via tool call. Se não encontrar produtos, retorne lista vazia." },
        { role: "user", content: `Marca: ${brandName}\n\n${text}` },
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

// Classify error into user-friendly category with retry guidance
function classifyError(errorMsg: string): { category: string; friendlyMessage: string; retryGuidance: string } {
  const msg = errorMsg.toLowerCase();
  if (msg.includes("abort") || msg.includes("timeout") || msg.includes("timed out")) {
    return { category: "timeout", friendlyMessage: "Download do arquivo demorou demais", retryGuidance: "Tente novamente — pode ser lentidão temporária da rede. Se persistir, verifique se o arquivo não é muito grande." };
  }
  if (msg.includes("too large") || msg.includes("size")) {
    return { category: "file_too_large", friendlyMessage: "Arquivo muito grande para processar", retryGuidance: "Este PDF excede o limite de 6MB. Divida o catálogo em partes menores ou comprima o PDF." };
  }
  if (msg.includes("403") || msg.includes("forbidden") || msg.includes("permission")) {
    return { category: "permission_denied", friendlyMessage: "Sem permissão para acessar o arquivo", retryGuidance: "Verifique se a pasta do Google Drive está com compartilhamento público ('Qualquer pessoa com o link')." };
  }
  if (msg.includes("404") || msg.includes("not found")) {
    return { category: "not_found", friendlyMessage: "Arquivo não encontrado no Drive", retryGuidance: "O arquivo pode ter sido movido ou excluído. Verifique a pasta do fornecedor." };
  }
  if (msg.includes("429") || msg.includes("rate limit") || msg.includes("quota")) {
    return { category: "rate_limit", friendlyMessage: "Limite de requisições atingido", retryGuidance: "Aguarde alguns minutos e retome a importação. O sistema continuará de onde parou." };
  }
  if (msg.includes("ai error") || msg.includes("ai gateway") || msg.includes("500")) {
    return { category: "ai_processing", friendlyMessage: "Erro no processamento de IA", retryGuidance: "O serviço de IA pode estar sobrecarregado. Retome a importação — o arquivo será reprocessado automaticamente." };
  }
  if (msg.includes("parse") || msg.includes("json") || msg.includes("unexpected token")) {
    return { category: "parse_error", friendlyMessage: "Erro ao interpretar resposta da IA", retryGuidance: "Tente novamente. Se persistir, o PDF pode ter formato não suportado (ex: imagens sem texto)." };
  }
  return { category: "unknown", friendlyMessage: `Erro inesperado: ${errorMsg.substring(0, 100)}`, retryGuidance: "Tente retomar a importação. Se o erro persistir, entre em contato com o suporte." };
}

// Process single file with retry (up to 2 attempts)
async function processFileWithRetry(
  file: { fileId: string; brandName: string; fileName: string },
  importId: string,
  supabase: any,
  GOOGLE_API_KEY: string,
  LOVABLE_API_KEY: string,
  maxRetries = 2
): Promise<{ products: number; error?: string; errorCategory?: string; retryGuidance?: string }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
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
        return { products: items.length };
      }
      return { products: 0 };
    } catch (e: any) {
      console.error(`Attempt ${attempt}/${maxRetries} failed for ${file.fileName}:`, e.message);
      if (attempt === maxRetries) {
        const errMsg = e.message || String(e);
        const classified = classifyError(errMsg);
        // Persist failure with user-friendly details
        await supabase.from("catalog_import_failures").insert({
          import_id: importId,
          file_id: file.fileId,
          file_name: file.fileName,
          brand_name: file.brandName,
          error_message: classified.friendlyMessage,
          error_category: classified.category,
          retry_guidance: classified.retryGuidance,
          attempts: maxRetries,
        }).then(() => {}).catch(() => {});
        return { products: 0, error: classified.friendlyMessage, errorCategory: classified.category, retryGuidance: classified.retryGuidance };
      }
      await new Promise(r => setTimeout(r, attempt * 1000));
    }
  }
  return { products: 0, error: "max retries exceeded" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GOOGLE_API_KEY = getEnv("GOOGLE_API_KEY");
    const LOVABLE_API_KEY = getEnv("LOVABLE_API_KEY");
    const SUPABASE_URL = getEnv("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { action, folder_id, import_id, supplier_name } = await req.json();

    // ── LIST-FOLDER ──
    if (action === "list-folder") {
      if (!folder_id) throw new Error("folder_id is required");
      const folders = await getAllDriveFiles(folder_id, "application/vnd.google-apps.folder", GOOGLE_API_KEY);
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

      // Check duplicate — warn but don't block (allow re-import)
      const { data: existing } = await supabase.from("catalog_imports").select("id").eq("folder_id", folderId).eq("status", "completed").neq("id", import_id).limit(1);
      if (existing && existing.length > 0) {
        console.warn(`Folder ${folderId} was previously imported, proceeding with new import.`);
      }

      const brands = await getAllDriveFiles(folderId, "application/vnd.google-apps.folder", GOOGLE_API_KEY);
      console.log(`Found ${brands.length} brand folders`);

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

    // ── IMPORT (step 2+: process CHUNK_SIZE files per call with retry) ──
    if (action === "import") {
      if (!import_id) throw new Error("import_id is required");
      const CHUNK_SIZE = 1; // Process 1 file at a time to avoid compute limits

      const { data: rec, error: recErr } = await supabase.from("catalog_imports").select("*").eq("id", import_id).single();
      if (recErr || !rec) throw new Error("Import not found");

      // If still pending, auto-trigger discover inline
      if (rec.status === "pending") {
        return new Response(JSON.stringify({
          success: true, done: false, needsDiscover: true,
          processedFiles: 0, totalFiles: 0, productsInChunk: 0,
          message: "Discover necessário. Executando automaticamente..."
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
        // Count failures for this import
        const { count: failCount } = await supabase.from("catalog_import_failures").select("*", { count: "exact", head: true }).eq("import_id", import_id);
        await supabase.from("catalog_imports").update({
          status: "completed",
          error_message: failCount && failCount > 0 ? `Concluído com ${failCount} arquivo(s) com falha` : null,
        }).eq("id", import_id);
        return new Response(JSON.stringify({ success: true, done: true, processedFiles: startIdx, totalFiles: manifest.length, totalFailures: failCount || 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Process files sequentially to avoid compute limits
      let productsCount = 0;
      const fileResults: { fileName: string; brandName: string; status: "ok" | "error"; products: number; durationMs: number; error?: string }[] = [];

      for (const file of chunk) {
        const t0 = Date.now();
        try {
          const result = await processFileWithRetry(file, import_id, supabase, GOOGLE_API_KEY, LOVABLE_API_KEY);
          const durationMs = Date.now() - t0;
          if (result.error) {
            fileResults.push({ fileName: file.fileName, brandName: file.brandName, status: "error", products: 0, durationMs, error: result.error });
            console.error(`✗ ${file.fileName}: ${result.error}`);
          } else {
            productsCount += result.products;
            fileResults.push({ fileName: file.fileName, brandName: file.brandName, status: "ok", products: result.products, durationMs });
            console.log(`✓ ${file.fileName} (${file.brandName}): ${result.products} products in ${durationMs}ms`);
          }
        } catch (e: any) {
          const durationMs = Date.now() - t0;
          const errMsg = e.message || String(e);
          const classified = classifyError(errMsg);
          fileResults.push({ fileName: file.fileName, brandName: file.brandName, status: "error", products: 0, durationMs, error: classified.friendlyMessage });
          console.error(`✗ ${file.fileName}: ${errMsg}`);
          await supabase.from("catalog_import_failures").insert({
            import_id, file_id: file.fileId, file_name: file.fileName, brand_name: file.brandName,
            error_message: classified.friendlyMessage, error_category: classified.category,
            retry_guidance: classified.retryGuidance, attempts: 1,
          }).then(() => {}).catch(() => {});
        }
      }

      const successCount = fileResults.filter(f => f.status === "ok").length;
      const failCount = fileResults.filter(f => f.status === "error").length;
      const processedSoFar = startIdx + chunk.length;
      const done = processedSoFar >= manifest.length;

      // Count total failures for this import
      const { count: totalFailures } = await supabase.from("catalog_import_failures").select("*", { count: "exact", head: true }).eq("import_id", import_id);

      await supabase.from("catalog_imports").update({
        processed_files: processedSoFar,
        ...(done ? { status: "completed" } : {}),
        ...(totalFailures && totalFailures > 0 ? { error_message: `${totalFailures} arquivo(s) com falha até o momento` } : {}),
      }).eq("id", import_id);

      return new Response(JSON.stringify({
        success: true,
        done,
        processedFiles: processedSoFar,
        totalFiles: manifest.length,
        productsInChunk: productsCount,
        totalFailures: totalFailures || 0,
        batchMetrics: {
          files: fileResults,
          successCount,
          failCount,
          totalDurationMs: fileResults.reduce((s, f) => Math.max(s, f.durationMs), 0),
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── LIST-FAILURES (audit view) ──
    if (action === "list-failures") {
      if (!import_id) throw new Error("import_id is required");
      const { data: failures, error: failErr } = await supabase
        .from("catalog_import_failures")
        .select("*")
        .eq("import_id", import_id)
        .order("created_at", { ascending: false });
      if (failErr) throw failErr;
      return new Response(JSON.stringify({ success: true, failures: failures || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── DELETE-IMPORT ──
    if (action === "delete-import") {
      if (!import_id) throw new Error("import_id is required");
      await supabase.from("catalog_import_failures").delete().eq("import_id", import_id);
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
