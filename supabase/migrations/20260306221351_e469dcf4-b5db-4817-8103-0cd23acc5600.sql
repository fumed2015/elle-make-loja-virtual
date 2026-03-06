
CREATE TABLE public.marketplace_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_id text NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  seller_id text DEFAULT '',
  api_key text DEFAULT '',
  auto_sync boolean NOT NULL DEFAULT false,
  sync_frequency text NOT NULL DEFAULT 'daily',
  price_rule text NOT NULL DEFAULT 'same',
  markup_percent numeric NOT NULL DEFAULT 0,
  shipping_mode text NOT NULL DEFAULT 'marketplace',
  status text NOT NULL DEFAULT 'disconnected',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage marketplace configs"
  ON public.marketplace_configs FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
