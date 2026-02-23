
-- Table to track Drive folder imports
CREATE TABLE public.catalog_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id TEXT NOT NULL,
  folder_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  total_files INTEGER DEFAULT 0,
  processed_files INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.catalog_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage catalog imports"
ON public.catalog_imports FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Table to store extracted catalog items from PDFs
CREATE TABLE public.catalog_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  import_id UUID REFERENCES public.catalog_imports(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  product_name TEXT NOT NULL,
  price NUMERIC,
  compare_at_price NUMERIC,
  description TEXT,
  category TEXT,
  image_urls TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  source_file TEXT,
  raw_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage catalog items"
ON public.catalog_items FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Indexes for search
CREATE INDEX idx_catalog_items_brand ON public.catalog_items(brand);
CREATE INDEX idx_catalog_items_category ON public.catalog_items(category);
CREATE INDEX idx_catalog_items_import ON public.catalog_items(import_id);
CREATE INDEX idx_catalog_items_name_search ON public.catalog_items USING gin(to_tsvector('portuguese', product_name));
