-- Remove exploitable client-side INSERT policies
DROP POLICY IF EXISTS "Authenticated users insert own points" ON public.loyalty_points;
DROP POLICY IF EXISTS "Authenticated users insert commissions on own orders" ON public.influencer_commissions;

-- Re-add service_role only INSERT for loyalty_points (drop first to avoid duplicate)
DROP POLICY IF EXISTS "Service role manages points" ON public.loyalty_points;
CREATE POLICY "Service role manages points" ON public.loyalty_points
  FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Re-add service_role only INSERT for influencer_commissions (drop first to avoid duplicate)
DROP POLICY IF EXISTS "Service role manages commissions" ON public.influencer_commissions;
CREATE POLICY "Service role manages commissions" ON public.influencer_commissions
  FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Create a secure function to record commission on order placement
CREATE OR REPLACE FUNCTION public.record_influencer_commission(
  p_order_id uuid,
  p_influencer_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_total numeric;
  v_order_user_id uuid;
  v_commission_percent numeric;
  v_commission_value numeric;
BEGIN
  -- Verify the order exists and belongs to the calling user
  SELECT total, user_id INTO v_order_total, v_order_user_id
  FROM orders WHERE id = p_order_id;
  
  IF v_order_user_id IS NULL OR v_order_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Get the influencer's commission rate
  SELECT commission_percent INTO v_commission_percent
  FROM influencers WHERE id = p_influencer_id AND is_active = true;
  
  IF v_commission_percent IS NULL THEN
    RETURN; -- Influencer not found or inactive
  END IF;

  v_commission_value := v_order_total * (v_commission_percent / 100);

  -- Avoid duplicate
  IF EXISTS (SELECT 1 FROM influencer_commissions WHERE order_id = p_order_id) THEN
    RETURN;
  END IF;

  INSERT INTO influencer_commissions (influencer_id, order_id, order_total, commission_percent, commission_value)
  VALUES (p_influencer_id, p_order_id, v_order_total, v_commission_percent, v_commission_value);
END;
$$;