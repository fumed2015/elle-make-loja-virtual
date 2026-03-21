-- Add supplier_name column to catalog_imports for tracking supplier ownership
ALTER TABLE public.catalog_imports ADD COLUMN IF NOT EXISTS supplier_name text;

-- Update existing import
UPDATE public.catalog_imports SET supplier_name = 'Bem Mulher' WHERE folder_id = '1MX0Yokicu7eySv8dSP7whn-RZRaqy28-';