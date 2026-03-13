import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = Deno.env.get("SITE_URL") || "https://www.ellemake.com.br";

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

    // Static pages
    for (const page of staticPages) {
      xml += `  <url>\n`;
      xml += `    <loc>${SITE_URL}${page.loc}</loc>\n`;
      xml += `    <lastmod>${now}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `  </url>\n`;
    }

    // Category pages
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

    // Product pages
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
