
-- Loyalty points (fidelidade)
CREATE TABLE public.loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  points INT NOT NULL DEFAULT 0,
  source TEXT NOT NULL, -- 'purchase', 'review', 'referral', 'ugc'
  reference_id UUID, -- order_id, review_id, etc.
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own points" ON public.loyalty_points FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System inserts points" ON public.loyalty_points FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage points" ON public.loyalty_points FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Influencer / affiliates program
CREATE TABLE public.influencers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL,
  instagram TEXT,
  commission_percent NUMERIC(5,2) NOT NULL DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  total_sales NUMERIC(10,2) DEFAULT 0,
  total_commission NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.influencers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Influencers view own data" ON public.influencers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage influencers" ON public.influencers FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Influencer commissions log
CREATE TABLE public.influencer_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID NOT NULL REFERENCES public.influencers(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_total NUMERIC(10,2) NOT NULL,
  commission_percent NUMERIC(5,2) NOT NULL,
  commission_value NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, paid
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.influencer_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Influencers view own commissions" ON public.influencer_commissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.influencers WHERE id = influencer_id AND user_id = auth.uid())
);
CREATE POLICY "Admins manage commissions" ON public.influencer_commissions FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Saved addresses
CREATE TABLE public.saved_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  label TEXT NOT NULL DEFAULT 'Casa',
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  complement TEXT,
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Belém',
  state TEXT NOT NULL DEFAULT 'PA',
  zip TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.saved_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own addresses" ON public.saved_addresses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Add tracking fields to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_url TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMPTZ;

-- Add influencer_coupon_code to orders for tracking
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS influencer_id UUID REFERENCES public.influencers(id);

-- Add loyalty tier to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS loyalty_tier TEXT DEFAULT 'bronze';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_points INT DEFAULT 0;
