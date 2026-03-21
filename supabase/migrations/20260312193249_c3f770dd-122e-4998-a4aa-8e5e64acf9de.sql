-- Update validate_coupon to also return influencer_id
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
    'min_order_value', c.min_order_value,
    'influencer_id', c.influencer_id
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