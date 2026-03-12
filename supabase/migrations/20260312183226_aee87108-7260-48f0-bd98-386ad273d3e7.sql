
-- Fix 1: loyalty_points - restrict INSERT to service_role only
DROP POLICY IF EXISTS "System inserts points" ON public.loyalty_points;
CREATE POLICY "Service role inserts points" ON public.loyalty_points
  FOR INSERT TO public
  WITH CHECK (auth.role() = 'service_role');

-- Fix 2: influencer_commissions - restrict INSERT to service_role only
DROP POLICY IF EXISTS "Users can insert commissions on order placement" ON public.influencer_commissions;
CREATE POLICY "Service role inserts commissions" ON public.influencer_commissions
  FOR INSERT TO public
  WITH CHECK (auth.role() = 'service_role');

-- Fix 3: push_subscriptions - remove anonymous access, require auth
DROP POLICY IF EXISTS "Users manage own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Authenticated users manage own subscriptions" ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role manages push subscriptions" ON public.push_subscriptions
  FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Fix 4: newsletter_subscribers - restrict anon INSERT with check
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe" ON public.newsletter_subscribers
  FOR INSERT TO anon, authenticated
  WITH CHECK (is_active = true);
