-- Switch site_settings to whitelist approach
DROP POLICY IF EXISTS "Public can read non-sensitive settings" ON public.site_settings;
CREATE POLICY "Public can read safe settings" ON public.site_settings
  FOR SELECT TO anon, authenticated
  USING (key = ANY(ARRAY[
    'newsletter_popup_enabled',
    'newsletter_popup_headline',
    'newsletter_popup_subtitle',
    'newsletter_popup_cta',
    'newsletter_popup_image',
    'newsletter_popup_delay_seconds',
    'newsletter_popup_bg_color',
    'newsletter_popup_text_color'
  ]));