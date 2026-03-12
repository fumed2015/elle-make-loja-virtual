
-- Fix: Reviews INSERT policy must enforce is_approved = false
DROP POLICY IF EXISTS "Users can create own reviews" ON public.reviews;
CREATE POLICY "Users can create own reviews"
  ON public.reviews
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id AND is_approved = false);
