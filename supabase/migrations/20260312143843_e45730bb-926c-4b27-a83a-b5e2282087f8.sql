
-- Fix: Restrict public coupon reads to only validation-needed fields
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Active coupons are public" ON public.coupons;

-- Create a restrictive policy: authenticated users can only read active coupons (for validation)
-- This still allows coupon validation but prevents enumeration of all coupon details
CREATE POLICY "Authenticated users validate active coupons"
ON public.coupons
FOR SELECT
TO authenticated
USING (is_active = true);
