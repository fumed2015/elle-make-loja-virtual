
-- Function to sync best sellers collection automatically
CREATE OR REPLACE FUNCTION public.sync_best_sellers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ninety_days_ago timestamptz := now() - interval '90 days';
  v_count integer := 0;
BEGIN
  -- Delete existing best sellers
  DELETE FROM product_collections WHERE collection_slug = 'mais-vendidos';

  -- Insert top 20 by sales volume from last 90 days
  INSERT INTO product_collections (collection_slug, product_id, sort_order)
  SELECT 'mais-vendidos', ranked.product_id, ranked.rn - 1
  FROM (
    SELECT 
      (item->>'product_id')::uuid AS product_id,
      SUM(COALESCE((item->>'quantity')::int, 1)) AS total_sold,
      ROW_NUMBER() OVER (ORDER BY SUM(COALESCE((item->>'quantity')::int, 1)) DESC) AS rn
    FROM orders o,
    LATERAL jsonb_array_elements(o.items) AS item
    WHERE o.status IN ('approved', 'confirmed', 'processing', 'shipped', 'delivered')
      AND o.created_at >= v_ninety_days_ago
      AND (item->>'product_id') IS NOT NULL
    GROUP BY (item->>'product_id')::uuid
  ) ranked
  JOIN products p ON p.id = ranked.product_id AND p.is_active = true
  WHERE ranked.rn <= 20;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Fallback: fill remaining spots with featured products then recent
  IF v_count < 20 THEN
    INSERT INTO product_collections (collection_slug, product_id, sort_order)
    SELECT 'mais-vendidos', id, v_count + ROW_NUMBER() OVER () - 1
    FROM products
    WHERE is_active = true
      AND id NOT IN (SELECT product_id FROM product_collections WHERE collection_slug = 'mais-vendidos')
    ORDER BY is_featured DESC NULLS LAST, created_at DESC
    LIMIT (20 - v_count);
  END IF;
END;
$$;

-- Run it once now to populate
SELECT sync_best_sellers();

-- Schedule to run every 6 hours
SELECT cron.schedule(
  'sync-best-sellers',
  '0 */6 * * *',
  $$SELECT public.sync_best_sellers()$$
);
