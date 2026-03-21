
-- Fix: Profiles INSERT policy must enforce safe defaults for sensitive fields
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO public
  WITH CHECK (
    auth.uid() = user_id
    AND loyalty_tier = 'bronze'
    AND total_points = 0
    AND admin_notes IS NULL
  );
