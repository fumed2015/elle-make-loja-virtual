import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://www.ellemake.com.br";

// Google Product Category mapping by category slug
const CATEGORY_MAP: Record<string, { google: string; fb: string }> = {
  rosto: {
    google: "Health & Beauty > Personal Care > Cosmetics > Face Makeup",
    fb: "health & beauty > makeup & cosmetics > face makeup",
  },
  olhos: {
    google: "Health & Beauty > Personal Care > Cosmetics > Eye Makeup",
    fb: "health & beauty > makeup & cosmetics > eye makeup",
  },
  labios: {
    google: "Health & Beauty > Personal Care > Cosmetics > Lip Makeup",
    fb: "health & beauty > makeup & cosmetics > lip makeup",
  },
  sobrancelhas: {
    google: "Health & Beauty > Personal Care > Cosmetics > Eye Makeup",
    fb: "health & beauty > makeup & cosmetics > eye makeup",
  },
  acessorios: {
    google:
      "Health & Beauty > Personal Care > Cosmetics > Makeup Tools & Accessories",
    fb: "health & beauty > makeup & cosmetics > makeup tools",
  },
  skincare: {
    google: "Health & Beauty > Personal Care > Skin Care",
    fb: "health & beauty > skin care",
  },
};

const DEFAULT_CATEGORY = {
  google: "Health & Beauty > Personal Care > Cosmetics",
  fb: "health & beauty > makeup & cosmetics",
};

function escapeCSV(value: string | null | undefined): string {
  if (!value) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all active products with their categories
    const { data: products, error } = await supabase
      .from("products")
      .select("*, categories(slug, name)")
      .eq("is_active", true)
      .gt("stock", 0)
      .order("name");

    if (error) throw error;

    // CSV header
    const header =
      "id,title,description,availability,condition,price,link,image_link,brand,google_product_category,fb_product_category,quantity_to_sell_on_facebook,sale_price,sale_price_effective_date,item_group_id,gender,color,size,age_group,material,pattern,shipping,shipping_weight";

    const rows = (products || []).map((p: any) => {
      const categorySlug = p.categories?.slug || "";
      const cat = CATEGORY_MAP[categorySlug] || DEFAULT_CATEGORY;

      const availability = p.stock > 0 ? "in stock" : "out of stock";
      const price = `${p.price.toFixed(2)} BRL`;
      const salePrice =
        p.compare_at_price && p.compare_at_price > p.price
          ? "" // price is already the sale price; compare_at_price is the original
          : "";
      // In this catalog: price = cost/sale price, compare_at_price = original higher price
      // Meta expects: price = original, sale_price = discounted
      const metaPrice =
        p.compare_at_price && p.compare_at_price > p.price
          ? `${p.compare_at_price.toFixed(2)} BRL`
          : price;
      const metaSalePrice =
        p.compare_at_price && p.compare_at_price > p.price ? price : "";

      const link = `${SITE_URL}/produto/${p.slug}`;
      const imageLink =
        p.images && p.images.length > 0 ? p.images[0] : "";

      const description = (p.description || p.name)
        .replace(/\n/g, " ")
        .substring(0, 5000);

      const cols = [
        p.id,
        escapeCSV(p.name),
        escapeCSV(description),
        availability,
        "new",
        metaPrice,
        link,
        imageLink,
        escapeCSV(p.brand || ""),
        escapeCSV(cat.google),
        escapeCSV(cat.fb),
        String(p.stock),
        metaSalePrice,
        "", // sale_price_effective_date
        "", // item_group_id
        "female",
        "", // color
        "", // size
        "adult",
        "", // material
        "", // pattern
        "BR:::0.00 BRL",
        "", // shipping_weight
      ];

      return cols.join(",");
    });

    const csv = [header, ...rows].join("\n");

    return new Response(csv, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="meta-catalog-ellemake.csv"',
        "Cache-Control": "public, max-age=3600", // cache 1h
      },
    });
  } catch (err) {
    console.error("Error generating Meta catalog:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
