-- Fix 1: Restrict profile UPDATE to safe columns only
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND loyalty_tier IS NOT DISTINCT FROM (SELECT p.loyalty_tier FROM profiles p WHERE p.user_id = auth.uid()) AND total_points IS NOT DISTINCT FROM (SELECT p.total_points FROM profiles p WHERE p.user_id = auth.uid()) AND admin_notes IS NOT DISTINCT FROM (SELECT p.admin_notes FROM profiles p WHERE p.user_id = auth.uid()));

-- Fix 2: Prevent users from self-approving reviews
DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
CREATE POLICY "Users can update own reviews" ON public.reviews
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND is_approved = false);