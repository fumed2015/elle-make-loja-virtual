
-- Table to capture "ghost leads" from checkout
CREATE TABLE public.checkout_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phone text NOT NULL,
  first_name text,
  step text NOT NULL DEFAULT 'address',
  cart_total numeric NOT NULL DEFAULT 0,
  items_count integer NOT NULL DEFAULT 0,
  notified_at timestamp with time zone,
  converted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Unique constraint: one active lead per user
CREATE UNIQUE INDEX checkout_leads_user_active_idx ON public.checkout_leads (user_id) WHERE converted_at IS NULL;

-- RLS
ALTER TABLE public.checkout_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own leads"
  ON public.checkout_leads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own leads"
  ON public.checkout_leads FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages leads"
  ON public.checkout_leads FOR ALL
  TO public
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

CREATE POLICY "Admins view leads"
  ON public.checkout_leads FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
