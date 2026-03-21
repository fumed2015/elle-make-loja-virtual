-- Fix the overly permissive commission insert policy
DROP POLICY IF EXISTS "Authenticated users insert commissions" ON public.influencer_commissions;

-- Only allow inserting commissions linked to orders owned by the current user
CREATE POLICY "Authenticated users insert commissions on own orders" ON public.influencer_commissions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
      AND o.user_id = auth.uid()
    )
  );