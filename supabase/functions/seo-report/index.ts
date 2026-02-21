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

    // Fetch products
    const { data: products, count: totalProducts } = await supabase
      .from("products")
      .select("id, name, slug, description, images, tags, brand, price, compare_at_price, stock, is_active", { count: "exact" })
      .eq("is_active", true);

    // Fetch categories
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

    // Score deductions
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
      issues.push({ severity: "info", message: `${outOfStock.length} produto(s) fora de estoque — pode afetar conversão`, product: undefined });
    }

    // Sitemap count
    const sitemapUrls = (totalProducts || 0) + (totalCategories || 0) + 8; // 8 static pages

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

    // Save to database
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
