-- Add recovery tracking columns to cart_abandonment_events
ALTER TABLE public.cart_abandonment_events
  ADD COLUMN IF NOT EXISTS recovery_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS recovered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notification_count INTEGER NOT NULL DEFAULT 0;

-- Add index for recovery token lookups
CREATE INDEX IF NOT EXISTS idx_cart_abandonment_recovery_token 
  ON public.cart_abandonment_events(recovery_token) WHERE recovery_token IS NOT NULL;

-- Add index for finding unrecovered carts to notify
CREATE INDEX IF NOT EXISTS idx_cart_abandonment_pending
  ON public.cart_abandonment_events(created_at) 
  WHERE recovered_at IS NULL AND notification_count < 3;

-- Allow service role to update (for marking notified/recovered)
CREATE POLICY "Service role manages abandonment events"
  ON public.cart_abandonment_events
  FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);