-- Fix 1: Coupons - create a secure validation function and restrict SELECT
CREATE OR REPLACE FUNCTION public.validate_coupon(p_code text, p_order_total numeric DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'valid', true,
    'code', c.code,
    'discount_type', c.discount_type,
    'discount_value', c.discount_value,
    'min_order_value', c.min_order_value
  ) INTO result
  FROM coupons c
  WHERE c.code = UPPER(p_code)
    AND c.is_active = true
    AND (c.expires_at IS NULL OR c.expires_at > now())
    AND (c.max_uses IS NULL OR c.current_uses < c.max_uses);

  IF result IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Cupom inválido ou expirado');
  END IF;

  IF p_order_total > 0 AND p_order_total < COALESCE((result->>'min_order_value')::numeric, 0) THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Valor mínimo do pedido não atingido');
  END IF;

  RETURN result;
END;
$$;

-- Remove the permissive SELECT policy for authenticated users
DROP POLICY IF EXISTS "Authenticated users validate active coupons" ON public.coupons;

-- Fix 2: site_settings - restrict public SELECT to non-sensitive keys only
DROP POLICY IF EXISTS "Public can read site settings" ON public.site_settings;
CREATE POLICY "Public can read non-sensitive settings" ON public.site_settings
  FOR SELECT TO anon, authenticated
  USING (key NOT IN ('newsletter_popup_coupon_code'));