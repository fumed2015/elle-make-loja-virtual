
-- Add user-friendly error details to catalog_import_failures
ALTER TABLE public.catalog_import_failures 
ADD COLUMN IF NOT EXISTS error_category text DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS retry_guidance text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS file_size_bytes bigint DEFAULT NULL;
