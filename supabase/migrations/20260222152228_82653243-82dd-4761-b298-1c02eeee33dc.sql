-- Cart abandonment tracking table
CREATE TABLE public.cart_abandonment_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  step text NOT NULL DEFAULT 'cart',
  cart_total numeric NOT NULL DEFAULT 0,
  items_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cart_abandonment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own events"
  ON public.cart_abandonment_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all events"
  ON public.cart_abandonment_events
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own events"
  ON public.cart_abandonment_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Index for analytics queries
CREATE INDEX idx_cart_abandonment_created ON public.cart_abandonment_events (created_at DESC);
CREATE INDEX idx_cart_abandonment_step ON public.cart_abandonment_events (step);
