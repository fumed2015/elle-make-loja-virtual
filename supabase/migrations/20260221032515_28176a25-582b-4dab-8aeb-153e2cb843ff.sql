
-- Reviews / Avaliações
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  images TEXT[] DEFAULT '{}',
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews are public when approved" ON public.reviews FOR SELECT USING (is_approved = true);
CREATE POLICY "Users can create own reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins manage reviews" ON public.reviews FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Cupons de desconto
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10,2) NOT NULL,
  min_order_value NUMERIC(10,2) DEFAULT 0,
  max_uses INT,
  current_uses INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active coupons are public" ON public.coupons FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage coupons" ON public.coupons FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- UGC posts
CREATE TABLE public.ugc_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ugc_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved UGC is public" ON public.ugc_posts FOR SELECT USING (is_approved = true OR auth.uid() = user_id);
CREATE POLICY "Users create own UGC" ON public.ugc_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own UGC" ON public.ugc_posts FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins manage UGC" ON public.ugc_posts FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for UGC images
INSERT INTO storage.buckets (id, name, public) VALUES ('ugc-images', 'ugc-images', true);
CREATE POLICY "Anyone can view UGC images" ON storage.objects FOR SELECT USING (bucket_id = 'ugc-images');
CREATE POLICY "Users can upload UGC images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ugc-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete own UGC images" ON storage.objects FOR DELETE USING (bucket_id = 'ugc-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add coupon_code to orders
ALTER TABLE public.orders ADD COLUMN coupon_code TEXT;
ALTER TABLE public.orders ADD COLUMN discount NUMERIC(10,2) DEFAULT 0;

-- Insert sample coupons
INSERT INTO public.coupons (code, description, discount_type, discount_value, min_order_value, max_uses) VALUES
('BELEM10', 'Desconto de 10% na primeira compra', 'percentage', 10, 50, 100),
('GLOW20', 'R$20 off em compras acima de R$100', 'fixed', 20, 100, 50),
('FRETE0', 'Frete grátis em qualquer compra', 'fixed', 15, 0, NULL);
