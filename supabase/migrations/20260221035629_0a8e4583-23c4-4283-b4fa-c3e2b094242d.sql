
DROP POLICY "System inserts SEO reports" ON public.seo_reports;
CREATE POLICY "Service role inserts SEO reports"
ON public.seo_reports FOR INSERT
WITH CHECK (auth.role() = 'service_role');
