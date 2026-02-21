-- Add influencer_id to coupons to link coupons to influencers
ALTER TABLE public.coupons ADD COLUMN influencer_id uuid REFERENCES public.influencers(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_coupons_influencer_id ON public.coupons(influencer_id);

-- Allow admins to query orders by coupon_code for commission tracking
-- (orders table already has coupon_code column)
