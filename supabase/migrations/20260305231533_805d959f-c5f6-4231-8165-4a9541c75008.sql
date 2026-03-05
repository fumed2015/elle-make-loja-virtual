-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read product images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

-- Allow service role and admins to upload
CREATE POLICY "Admins upload product images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'product-images' AND (
      auth.role() = 'service_role' OR
      public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

-- Allow service role and admins to update
CREATE POLICY "Admins update product images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'product-images' AND (
      auth.role() = 'service_role' OR
      public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

-- Allow service role and admins to delete
CREATE POLICY "Admins delete product images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'product-images' AND (
      auth.role() = 'service_role' OR
      public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );