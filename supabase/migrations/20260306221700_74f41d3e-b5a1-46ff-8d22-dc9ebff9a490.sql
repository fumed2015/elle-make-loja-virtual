
-- Marketplace listings: tracks which products are published where
CREATE TABLE public.marketplace_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  marketplace text NOT NULL, -- 'mercadolivre', 'amazon', 'shopee'
  external_id text, -- listing ID on the marketplace
  external_url text,
  status text NOT NULL DEFAULT 'pending', -- pending, active, paused, error, deleted
  last_synced_at timestamp with time zone,
  sync_error text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(product_id, marketplace)
);

ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage marketplace listings"
  ON public.marketplace_listings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Marketplace orders: tracks orders received from marketplaces
CREATE TABLE public.marketplace_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace text NOT NULL,
  external_order_id text NOT NULL,
  internal_order_id uuid REFERENCES public.orders(id),
  buyer_name text,
  buyer_email text,
  buyer_phone text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric NOT NULL DEFAULT 0,
  shipping_cost numeric DEFAULT 0,
  marketplace_fee numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  shipping_status text DEFAULT 'pending',
  tracking_code text,
  shipping_address jsonb,
  raw_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(marketplace, external_order_id)
);

ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage marketplace orders"
  ON public.marketplace_orders FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Sync logs: audit trail for all sync operations
CREATE TABLE public.marketplace_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace text NOT NULL,
  operation text NOT NULL, -- 'product_sync', 'order_import', 'stock_update', 'price_update', 'webhook'
  status text NOT NULL DEFAULT 'started', -- started, success, error
  items_processed integer DEFAULT 0,
  items_failed integer DEFAULT 0,
  error_message text,
  details jsonb DEFAULT '{}'::jsonb,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone
);

ALTER TABLE public.marketplace_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view sync logs"
  ON public.marketplace_sync_logs FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- OAuth tokens table for marketplace auth
CREATE TABLE public.marketplace_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace text NOT NULL UNIQUE,
  access_token text,
  refresh_token text,
  token_type text DEFAULT 'Bearer',
  expires_at timestamp with time zone,
  seller_id text,
  extra jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage marketplace tokens"
  ON public.marketplace_tokens FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages tokens"
  ON public.marketplace_tokens FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

CREATE POLICY "Service role manages sync logs"
  ON public.marketplace_sync_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role'::text);

CREATE POLICY "Service role manages listings"
  ON public.marketplace_listings FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

CREATE POLICY "Service role manages mp orders"
  ON public.marketplace_orders FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);
