import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const YAMPI_API_BASE = 'https://api.dooki.com.br/v2';
const YAMPI_ALIAS = 'elle-make';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const YAMPI_USER_TOKEN = Deno.env.get('YAMPI_USER_TOKEN');
  const YAMPI_USER_SECRET_KEY = Deno.env.get('YAMPI_USER_SECRET_KEY');

  if (!YAMPI_USER_TOKEN || !YAMPI_USER_SECRET_KEY) {
    return new Response(JSON.stringify({ error: 'Yampi credentials not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const yampiHeaders = {
    'Content-Type': 'application/json',
    'User-Token': YAMPI_USER_TOKEN,
    'User-Secret-Key': YAMPI_USER_SECRET_KEY,
  };

  try {
    // 1. Fetch all active products from our database
    const { data: products, error: dbError } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (dbError) throw new Error(`DB error: ${dbError.message}`);
    if (!products || products.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No products to sync', synced: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Fetch existing Yampi brands and create missing ones
    const brandMap: Record<string, number> = {};
    try {
      const brandsRes = await fetch(
        `${YAMPI_API_BASE}/${YAMPI_ALIAS}/catalog/brands?limit=100`,
        { headers: yampiHeaders }
      );
      const brandsData = await brandsRes.json();
      if (brandsData.data) {
        for (const b of brandsData.data) {
          brandMap[b.name.toLowerCase()] = b.id;
        }
      }
    } catch (e) {
      console.error('Error fetching brands:', e);
    }

    // Create missing brands
    const uniqueBrands = [...new Set(products.map(p => p.brand).filter(Boolean))] as string[];
    for (const brandName of uniqueBrands) {
      if (!brandMap[brandName.toLowerCase()]) {
        try {
          const res = await fetch(
            `${YAMPI_API_BASE}/${YAMPI_ALIAS}/catalog/brands`,
            {
              method: 'POST',
              headers: yampiHeaders,
              body: JSON.stringify({ name: brandName, active: true, featured: false }),
            }
          );
          const data = await res.json();
          if (res.ok && data.data?.id) {
            brandMap[brandName.toLowerCase()] = data.data.id;
            console.log(`Brand created: ${brandName} -> ${data.data.id}`);
          } else {
            console.error(`Failed to create brand ${brandName}:`, JSON.stringify(data));
          }
        } catch (e) {
          console.error(`Error creating brand ${brandName}:`, e);
        }
        await new Promise(r => setTimeout(r, 200));
      }
    }

    // 3. Fetch existing Yampi products to check for duplicates
    const existingYampiProducts: Record<string, any> = {};
    try {
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const res = await fetch(
          `${YAMPI_API_BASE}/${YAMPI_ALIAS}/catalog/products?limit=50&page=${page}&include=skus`,
          { headers: yampiHeaders }
        );
        const data = await res.json();
        if (data.data && data.data.length > 0) {
          for (const p of data.data) {
            if (p.slug) existingYampiProducts[p.slug] = p;
          }
          page++;
          if (!data.meta?.pagination?.links?.next) hasMore = false;
        } else {
          hasMore = false;
        }
      }
    } catch (e) {
      console.error('Error fetching existing Yampi products:', e);
    }

    // 4. Sync products
    const results: Array<{ name: string; status: string; yampi_id?: number; error?: string }> = [];

    for (const product of products) {
      try {
        const existing = existingYampiProducts[product.slug];
        const brandId = brandMap[(product.brand || '').toLowerCase()] || Object.values(brandMap)[0] || 1;

        if (existing) {
          // UPDATE existing product
          const updateRes = await fetch(
            `${YAMPI_API_BASE}/${YAMPI_ALIAS}/catalog/products/${existing.id}`,
            {
              method: 'PUT',
              headers: yampiHeaders,
              body: JSON.stringify({
                name: product.name,
                description: product.description || '',
                active: true,
                brand_id: brandId,
                seo_title: product.name.substring(0, 70),
                seo_description: (product.description || product.name).substring(0, 160),
              }),
            }
          );
          const updateData = await updateRes.json();

          if (!updateRes.ok) {
            console.error(`Failed to update ${product.name}:`, JSON.stringify(updateData));
            results.push({ name: product.name, status: 'error', error: updateData.message || 'Update failed' });
            continue;
          }

          // Update SKU stock and price
          const skuData = existing.skus?.data?.[0];
          if (skuData?.id) {
            await fetch(
              `${YAMPI_API_BASE}/${YAMPI_ALIAS}/catalog/skus/${skuData.id}`,
              {
                method: 'PUT',
                headers: yampiHeaders,
                body: JSON.stringify({
                  price_cost: Number(product.price),
                  price_sale: product.compare_at_price && product.compare_at_price > product.price
                    ? Number(product.compare_at_price) : Number(product.price),
                  price_discount: product.compare_at_price && product.compare_at_price > product.price
                    ? Number(product.price) : 0,
                  availability: product.stock || 0,
                }),
              }
            );
          }

          results.push({ name: product.name, status: 'updated', yampi_id: existing.id });
        } else {
          // CREATE new product
          const productPayload: Record<string, any> = {
            name: product.name,
            slug: product.slug,
            description: product.description || product.name,
            active: true,
            simple: true,
            searchable: true,
            brand_id: brandId,
            seo_title: product.name.substring(0, 70),
            seo_description: (product.description || product.name).substring(0, 160),
            skus: [
              {
                sku: product.slug.substring(0, 30),
                price_cost: Number(product.price),
                price_sale: product.compare_at_price && product.compare_at_price > product.price
                  ? Number(product.compare_at_price) : Number(product.price),
                price_discount: product.compare_at_price && product.compare_at_price > product.price
                  ? Number(product.price) : 0,
                weight: 200,
                height: 5,
                width: 10,
                length: 10,
                quantity_managed: true,
                blocked_sale: false,
                availability: product.stock || 0,
                availability_soldout: 0,
                images: (product.images || []).slice(0, 5).map((url: string) => ({ url })),
              },
            ],
          };

          const createRes = await fetch(
            `${YAMPI_API_BASE}/${YAMPI_ALIAS}/catalog/products`,
            {
              method: 'POST',
              headers: yampiHeaders,
              body: JSON.stringify(productPayload),
            }
          );
          const createData = await createRes.json();

          if (!createRes.ok) {
            const errDetail = createData.errors
              ? Object.entries(createData.errors).map(([k, v]) => `${k}: ${v}`).join('; ')
              : createData.message || 'Create failed';
            console.error(`Failed to create ${product.name}:`, JSON.stringify(createData));
            results.push({ name: product.name, status: 'error', error: errDetail.substring(0, 200) });
            continue;
          }

          results.push({
            name: product.name,
            status: 'created',
            yampi_id: createData.data?.id,
          });
        }

        // Rate limit protection
        await new Promise(r => setTimeout(r, 350));

      } catch (productError: any) {
        console.error(`Error syncing ${product.name}:`, productError);
        results.push({ name: product.name, status: 'error', error: productError.message });
      }
    }

    const created = results.filter(r => r.status === 'created').length;
    const updated = results.filter(r => r.status === 'updated').length;
    const errors = results.filter(r => r.status === 'error').length;

    console.log(`Yampi product sync complete: ${created} created, ${updated} updated, ${errors} errors`);

    // ===== COUPON SYNC =====
    const couponResults: Array<{ code: string; status: string; yampi_id?: number; error?: string }> = [];

    const { data: coupons, error: couponDbError } = await supabase
      .from('coupons')
      .select('*')
      .eq('is_active', true);

    if (couponDbError) {
      console.error('Error fetching coupons:', couponDbError.message);
    }

    if (coupons && coupons.length > 0) {
      // Fetch existing Yampi coupons
      const existingYampiCoupons: Record<string, any> = {};
      try {
        let page = 1;
        let hasMore = true;
        while (hasMore) {
          const res = await fetch(
            `${YAMPI_API_BASE}/${YAMPI_ALIAS}/pricing/coupons?limit=50&page=${page}`,
            { headers: yampiHeaders }
          );
          const data = await res.json();
          if (data.data && data.data.length > 0) {
            for (const c of data.data) {
              existingYampiCoupons[c.code?.toUpperCase()] = c;
            }
            page++;
            if (!data.meta?.pagination?.links?.next) hasMore = false;
          } else {
            hasMore = false;
          }
        }
      } catch (e) {
        console.error('Error fetching existing Yampi coupons:', e);
      }

      for (const coupon of coupons) {
        try {
          const existing = existingYampiCoupons[coupon.code.toUpperCase()];

          const yampiCouponPayload: Record<string, any> = {
            code: coupon.code.toUpperCase(),
            active: true,
            type: coupon.discount_type === 'percentage' ? 'percentage' : 'fixed',
            value: Number(coupon.discount_value),
            min_value: Number(coupon.min_order_value || 0),
            quantity: coupon.max_uses || 99999,
            used: coupon.current_uses || 0,
            cumulative: false,
            first_buy: false,
          };

          if (coupon.expires_at) {
            yampiCouponPayload.date_start = new Date().toISOString().split('T')[0];
            yampiCouponPayload.date_end = new Date(coupon.expires_at).toISOString().split('T')[0];
          }

          if (existing) {
            const updateRes = await fetch(
              `${YAMPI_API_BASE}/${YAMPI_ALIAS}/pricing/coupons/${existing.id}`,
              {
                method: 'PUT',
                headers: yampiHeaders,
                body: JSON.stringify(yampiCouponPayload),
              }
            );
            const updateData = await updateRes.json();
            if (updateRes.ok) {
              couponResults.push({ code: coupon.code, status: 'updated', yampi_id: existing.id });
            } else {
              couponResults.push({ code: coupon.code, status: 'error', error: updateData.message || 'Update failed' });
            }
          } else {
            const createRes = await fetch(
              `${YAMPI_API_BASE}/${YAMPI_ALIAS}/pricing/coupons`,
              {
                method: 'POST',
                headers: yampiHeaders,
                body: JSON.stringify(yampiCouponPayload),
              }
            );
            const createData = await createRes.json();
            if (createRes.ok) {
              couponResults.push({ code: coupon.code, status: 'created', yampi_id: createData.data?.id });
            } else {
              const errDetail = createData.errors
                ? Object.entries(createData.errors).map(([k, v]) => `${k}: ${v}`).join('; ')
                : createData.message || 'Create failed';
              couponResults.push({ code: coupon.code, status: 'error', error: errDetail });
            }
          }

          await new Promise(r => setTimeout(r, 300));
        } catch (couponErr: any) {
          console.error(`Error syncing coupon ${coupon.code}:`, couponErr);
          couponResults.push({ code: coupon.code, status: 'error', error: couponErr.message });
        }
      }
    }

    const couponsCreated = couponResults.filter(r => r.status === 'created').length;
    const couponsUpdated = couponResults.filter(r => r.status === 'updated').length;
    const couponsErrors = couponResults.filter(r => r.status === 'error').length;

    console.log(`Yampi coupon sync: ${couponsCreated} created, ${couponsUpdated} updated, ${couponsErrors} errors`);

    return new Response(JSON.stringify({
      success: true,
      products: { total: products.length, created, updated, errors },
      coupons: {
        total: coupons?.length || 0,
        created: couponsCreated,
        updated: couponsUpdated,
        errors: couponsErrors,
        results: couponResults,
      },
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Yampi sync error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
