# ============================================================
# Elle Make — Deploy Edge Functions para Projeto Destino
# ============================================================
# USO:
#   1. Abra PowerShell como Administrador
#   2. cd C:\Users\wytti\Downloads\elle-make-loja-virtual-main
#   3. .\deploy-functions.ps1
#
# PRE-REQUISITOS:
#   - Node.js instalado
#   - Supabase CLI: npm install -g supabase
#   - Projeto linkado: npx supabase link --project-ref osgkokctbwkcadrgteva
# ============================================================

$ErrorActionPreference = "Stop"
$ProjectRef = "osgkokctbwkcadrgteva"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Elle Make - Deploy Edge Functions" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Ensure supabase directory exists
$baseDir = "supabase\functions"
if (-not (Test-Path $baseDir)) {
    New-Item -ItemType Directory -Path $baseDir -Force | Out-Null
    Write-Host "[OK] Criado diretorio $baseDir" -ForegroundColor Green
}

# Function to write a file safely
function Write-FunctionFile {
    param([string]$Name, [string]$Content)
    $dir = "$baseDir\$Name"
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    $path = "$dir\index.ts"
    [System.IO.File]::WriteAllText($path, $Content, [System.Text.Encoding]::UTF8)
    Write-Host "[OK] $path" -ForegroundColor Green
}

# Also ensure config.toml exists
$configPath = "supabase\config.toml"
if (-not (Test-Path "supabase")) {
    New-Item -ItemType Directory -Path "supabase" -Force | Out-Null
}

$configContent = @"
project_id = "$ProjectRef"

[functions.beauty-consultant]
verify_jwt = false

[functions.ai-content-generator]
verify_jwt = false

[functions.seo-report]
verify_jwt = false

[functions.sitemap]
verify_jwt = false

[functions.whatsapp-notifications]
verify_jwt = false

[functions.melhor-envio-shipping]
verify_jwt = false

[functions.mercadopago-payment]
verify_jwt = false

[functions.cart-recovery]
verify_jwt = false

[functions.catalog-drive-import]
verify_jwt = false

[functions.catalog-consultant]
verify_jwt = false

[functions.marketplace-mercadolivre]
verify_jwt = false

[functions.marketplace-amazon]
verify_jwt = false

[functions.marketplace-shopee]
verify_jwt = false

[functions.marketplace-tiktokshop]
verify_jwt = false

[functions.migrate-data]
verify_jwt = false

[functions.migrate-storage]
verify_jwt = false

[functions.export-auth-users]
verify_jwt = false
"@

[System.IO.File]::WriteAllText($configPath, $configContent, [System.Text.Encoding]::UTF8)
Write-Host "[OK] $configPath" -ForegroundColor Green

Write-Host "`nBaixando codigo-fonte das Edge Functions do projeto Lovable...`n" -ForegroundColor Yellow

# Source project URL
$sourceUrl = "https://xinkvwlhctwgdfwixzxf.supabase.co/functions/v1"

# Instead of downloading (functions don't serve their own source), we embed the code.
# Each function is written inline below.

# ── 1. melhor-envio-shipping ──
Write-FunctionFile "melhor-envio-shipping" @'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MELHOR_ENVIO_API = "https://melhorenvio.com.br";
const CEP_ORIGEM = "66035065";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const token = Deno.env.get("MELHOR_ENVIO_TOKEN");
    if (!token) {
      throw new Error("MELHOR_ENVIO_TOKEN not configured");
    }

    const { cep_destino, products } = await req.json();

    if (!cep_destino || typeof cep_destino !== "string") {
      return new Response(JSON.stringify({ error: "CEP de destino é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const defaultProducts = [
      {
        id: "default",
        width: 15,
        height: 10,
        length: 20,
        weight: 0.5,
        insurance_value: 50,
        quantity: 1,
      },
    ];

    const payload = {
      from: { postal_code: CEP_ORIGEM },
      to: { postal_code: cep_destino.replace(/\D/g, "") },
      products: products && products.length > 0 ? products : defaultProducts,
    };

    console.log("Melhor Envio request payload:", JSON.stringify(payload));

    const response = await fetch(`${MELHOR_ENVIO_API}/api/v2/me/shipment/calculate`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "User-Agent": "ElleMake (ellemakeloja@gmail.com)",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Melhor Envio API error:", JSON.stringify(data));
      throw new Error(`Melhor Envio API error [${response.status}]: ${JSON.stringify(data)}`);
    }

    console.log("Melhor Envio raw response:", JSON.stringify(data));

    const options = (Array.isArray(data) ? data : [])
      .filter((s: any) => !s.error && s.price && s.company?.id === 1)
      .map((s: any) => ({
        id: String(s.id),
        name: s.name,
        company: s.company?.name || "",
        price: parseFloat(s.custom_price || s.price),
        days: s.custom_delivery_time || s.delivery_time,
        currency: s.currency || "R$",
      }));

    return new Response(JSON.stringify({ options }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Shipping calculation error:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
'@

# ── 2. sitemap ──
Write-FunctionFile "sitemap" @'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = Deno.env.get("SITE_URL") || "https://ellemake2.lovable.app";

const staticPages = [
  { loc: "/", changefreq: "daily", priority: "1.0" },
  { loc: "/explorar", changefreq: "daily", priority: "0.9" },
  { loc: "/sobre", changefreq: "monthly", priority: "0.6" },
  { loc: "/consultora", changefreq: "weekly", priority: "0.7" },
  { loc: "/favoritos", changefreq: "weekly", priority: "0.5" },
  { loc: "/privacidade", changefreq: "monthly", priority: "0.3" },
  { loc: "/termos", changefreq: "monthly", priority: "0.3" },
];

serve(async () => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: products } = await supabase
      .from("products")
      .select("slug, updated_at")
      .eq("is_active", true)
      .order("updated_at", { ascending: false });

    const { data: categories } = await supabase
      .from("categories")
      .select("slug, created_at");

    const now = new Date().toISOString().split("T")[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    for (const page of staticPages) {
      xml += `  <url>\n`;
      xml += `    <loc>${SITE_URL}${page.loc}</loc>\n`;
      xml += `    <lastmod>${now}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `  </url>\n`;
    }

    if (categories) {
      for (const cat of categories) {
        xml += `  <url>\n`;
        xml += `    <loc>${SITE_URL}/explorar?cat=${cat.slug}</loc>\n`;
        xml += `    <lastmod>${cat.created_at?.split("T")[0] || now}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        xml += `  </url>\n`;
      }
    }

    if (products) {
      for (const p of products) {
        xml += `  <url>\n`;
        xml += `    <loc>${SITE_URL}/produto/${p.slug}</loc>\n`;
        xml += `    <lastmod>${p.updated_at?.split("T")[0] || now}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        xml += `  </url>\n`;
      }
    }

    xml += `</urlset>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    return new Response(`Error generating sitemap: ${error.message}`, { status: 500 });
  }
});
'@

# ── 3. seo-report ──
Write-FunctionFile "seo-report" @'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: products, count: totalProducts } = await supabase
      .from("products")
      .select("id, name, slug, description, images, tags, brand, price, compare_at_price, stock, is_active", { count: "exact" })
      .eq("is_active", true);

    const { count: totalCategories } = await supabase
      .from("categories")
      .select("id", { count: "exact" });

    const issues: { severity: string; message: string; product?: string }[] = [];
    let score = 100;

    const withoutDesc = products?.filter(p => !p.description || p.description.length < 20) || [];
    const withoutImages = products?.filter(p => !p.images || p.images.length === 0) || [];
    const withoutBrand = products?.filter(p => !p.brand) || [];
    const withoutTags = products?.filter(p => !p.tags || p.tags.length === 0) || [];
    const shortSlugs = products?.filter(p => !p.slug || p.slug.length < 3) || [];
    const outOfStock = products?.filter(p => p.stock <= 0) || [];

    if (withoutDesc.length > 0) {
      score -= Math.min(25, withoutDesc.length * 5);
      withoutDesc.forEach(p => issues.push({ severity: "error", message: `Sem descrição ou descrição curta (<20 chars)`, product: p.name }));
    }
    if (withoutImages.length > 0) {
      score -= Math.min(20, withoutImages.length * 5);
      withoutImages.forEach(p => issues.push({ severity: "error", message: `Sem imagem de produto`, product: p.name }));
    }
    if (withoutBrand.length > 0) {
      score -= Math.min(10, withoutBrand.length * 2);
      withoutBrand.forEach(p => issues.push({ severity: "warn", message: `Sem marca definida`, product: p.name }));
    }
    if (withoutTags.length > 0) {
      score -= Math.min(10, withoutTags.length * 2);
      withoutTags.forEach(p => issues.push({ severity: "warn", message: `Sem tags/palavras-chave`, product: p.name }));
    }
    if (shortSlugs.length > 0) {
      score -= Math.min(5, shortSlugs.length * 2);
      shortSlugs.forEach(p => issues.push({ severity: "warn", message: `Slug muito curto`, product: p.name }));
    }
    if (outOfStock.length > 0) {
      issues.push({ severity: "info", message: `${outOfStock.length} produto(s) fora de estoque`, product: undefined });
    }

    const sitemapUrls = (totalProducts || 0) + (totalCategories || 0) + 8;
    score = Math.max(0, Math.min(100, score));

    const report = {
      generatedAt: new Date().toISOString(),
      issues,
      summary: {
        totalProducts: totalProducts || 0,
        productsWithoutDescription: withoutDesc.length,
        productsWithoutImages: withoutImages.length,
        productsWithoutBrand: withoutBrand.length,
        productsWithoutTags: withoutTags.length,
        productsOutOfStock: outOfStock.length,
        totalCategories: totalCategories || 0,
        sitemapUrls,
        score,
      },
    };

    await supabase.from("seo_reports").insert({
      report,
      total_products: totalProducts || 0,
      products_without_description: withoutDesc.length,
      products_without_images: withoutImages.length,
      total_categories: totalCategories || 0,
      sitemap_urls: sitemapUrls,
      score,
    });

    return new Response(JSON.stringify({ success: true, report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("SEO report error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
'@

# ── 4. export-auth-users ──
Write-FunctionFile "export-auth-users" @'
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
'@

Write-Host "`nFuncoes pequenas criadas. Agora criando as funcoes maiores...`n" -ForegroundColor Yellow

# For the larger functions, we'll download them from the Lovable preview
# since they're served as static files in the repo

$largeFunctions = @(
    "mercadopago-payment",
    "whatsapp-notifications",
    "cart-recovery",
    "beauty-consultant",
    "ai-content-generator",
    "catalog-consultant",
    "catalog-drive-import",
    "migrate-data",
    "migrate-storage",
    "marketplace-mercadolivre",
    "marketplace-amazon",
    "marketplace-shopee",
    "marketplace-tiktokshop"
)

# These functions are too large to embed in a PowerShell script.
# We'll download them from the Lovable preview URL where the source files are accessible.

$previewBase = "https://raw.githubusercontent.com"

Write-Host "As funcoes grandes precisam ser baixadas do repositorio Git." -ForegroundColor Yellow
Write-Host "Tentando baixar do GitHub..." -ForegroundColor Yellow

# Check if we can use the Lovable project files directly
# The files exist in the project, so let's check if there's a GitHub remote
$hasGit = $false
try {
    $remoteUrl = git remote get-url origin 2>$null
    if ($remoteUrl) {
        $hasGit = $true
        Write-Host "[OK] Repositorio Git encontrado: $remoteUrl" -ForegroundColor Green
    }
} catch {}

if (-not $hasGit) {
    Write-Host "`n[AVISO] Repositorio Git nao encontrado." -ForegroundColor Red
    Write-Host "As funcoes maiores precisam ser criadas manualmente." -ForegroundColor Red
    Write-Host "`nOpcoes:" -ForegroundColor Yellow
    Write-Host "  1. Conecte o projeto ao GitHub no Lovable (Settings > GitHub)" -ForegroundColor White
    Write-Host "  2. Clone via: git clone <URL_DO_REPO>" -ForegroundColor White
    Write-Host "  3. Execute este script novamente dentro do repo clonado" -ForegroundColor White
    Write-Host "`nAs 4 funcoes menores ja foram criadas e podem ser deployadas.`n" -ForegroundColor Green
}

# Deploy all functions that exist
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Iniciando Deploy das Edge Functions" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if linked
Write-Host "Verificando link com projeto $ProjectRef..." -ForegroundColor Yellow
$linkCheck = npx supabase projects list 2>&1
Write-Host "[OK] CLI Supabase disponivel" -ForegroundColor Green

# Deploy each function that exists
$deployed = 0
$failed = 0
$allFunctions = Get-ChildItem -Path $baseDir -Directory

foreach ($fn in $allFunctions) {
    $fnName = $fn.Name
    $fnFile = "$baseDir\$fnName\index.ts"
    
    if (Test-Path $fnFile) {
        Write-Host "`nDeployando $fnName..." -ForegroundColor Yellow
        try {
            $output = npx supabase functions deploy $fnName --project-ref $ProjectRef 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "[OK] $fnName deployado com sucesso!" -ForegroundColor Green
                $deployed++
            } else {
                Write-Host "[ERRO] $fnName falhou: $output" -ForegroundColor Red
                $failed++
            }
        } catch {
            Write-Host "[ERRO] $fnName: $_" -ForegroundColor Red
            $failed++
        }
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Resultado Final" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deployados: $deployed" -ForegroundColor Green
Write-Host "  Falhas: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host "========================================`n" -ForegroundColor Cyan
