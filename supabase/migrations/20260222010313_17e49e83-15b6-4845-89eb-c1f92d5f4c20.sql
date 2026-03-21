
-- Allow authenticated users to insert commissions when placing an order
-- This is needed because the checkout flow creates commission records
CREATE POLICY "Users can insert commissions on order placement"
ON public.influencer_commissions
FOR INSERT
WITH CHECK (
  -- Only allow if the order belongs to the current user
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = influencer_commissions.order_id
    AND orders.user_id = auth.uid()
  )
);
