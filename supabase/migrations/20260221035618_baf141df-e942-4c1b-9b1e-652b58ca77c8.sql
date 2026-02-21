
CREATE TABLE public.seo_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  report jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_products integer DEFAULT 0,
  products_without_description integer DEFAULT 0,
  products_without_images integer DEFAULT 0,
  total_categories integer DEFAULT 0,
  sitemap_urls integer DEFAULT 0,
  score integer DEFAULT 0
);

ALTER TABLE public.seo_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view SEO reports"
ON public.seo_reports FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System inserts SEO reports"
ON public.seo_reports FOR INSERT
WITH CHECK (true);
