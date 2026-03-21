
-- Table to persist per-file import failures for audit
CREATE TABLE public.catalog_import_failures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  import_id UUID NOT NULL REFERENCES public.catalog_imports(id) ON DELETE CASCADE,
  file_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.catalog_import_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage import failures"
  ON public.catalog_import_failures
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages import failures"
  ON public.catalog_import_failures
  FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

CREATE INDEX idx_catalog_import_failures_import_id ON public.catalog_import_failures(import_id);
