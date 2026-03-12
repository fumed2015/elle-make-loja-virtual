-- Fix: Allow authenticated users to insert influencer commissions (from checkout flow)
-- The service_role-only policy was too restrictive for client-side order placement
DROP POLICY IF EXISTS "Service role inserts commissions" ON public.influencer_commissions;

-- Authenticated users can insert commissions (order placement creates them)
CREATE POLICY "Authenticated users insert commissions" ON public.influencer_commissions
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Keep service_role access too
CREATE POLICY "Service role manages commissions" ON public.influencer_commissions
  FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Fix: Allow authenticated users to insert loyalty points (for order rewards)
DROP POLICY IF EXISTS "Service role inserts points" ON public.loyalty_points;

CREATE POLICY "Authenticated users insert own points" ON public.loyalty_points
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages points" ON public.loyalty_points
  FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');