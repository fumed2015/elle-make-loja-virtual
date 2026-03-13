-- Table for curated product collections (lancamentos, mais-vendidos, tendencias)
CREATE TABLE public.product_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_slug text NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(collection_slug, product_id)
);

ALTER TABLE public.product_collections ENABLE ROW LEVEL SECURITY;

-- Public can read collections
CREATE POLICY "Collections are public" ON public.product_collections
  FOR SELECT TO public USING (true);

-- Admins manage collections
CREATE POLICY "Admins manage collections" ON public.product_collections
  FOR ALL TO public
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));