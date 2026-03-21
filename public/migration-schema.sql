-- =====================================================
-- ELLE MAKE - COMPLETE SCHEMA MIGRATION SCRIPT
-- Execute this in the destination Supabase SQL Editor
-- Project: osgkokctbwkcadrgteva
-- =====================================================

-- 1. ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'customer', 'staff');

-- 2. TABLES (in dependency order)

-- categories
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  image_url text,
  parent_id uuid REFERENCES public.categories(id),
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  sensorial_description text,
  how_to_use text,
  ingredients text,
  price numeric NOT NULL,
  compare_at_price numeric,
  stock integer NOT NULL DEFAULT 0,
  images text[] DEFAULT '{}'::text[],
  swatches jsonb DEFAULT '[]'::jsonb,
  tags text[] DEFAULT '{}'::text[],
  brand text,
  category_id uuid REFERENCES public.categories(id),
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- product_costs
CREATE TABLE public.product_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) UNIQUE,
  cost_base numeric NOT NULL DEFAULT 0,
  freight_per_unit numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- coupons
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL,
  discount_value numeric NOT NULL,
  min_order_value numeric DEFAULT 0,
  max_uses integer,
  current_uses integer DEFAULT 0,
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  influencer_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- influencers
CREATE TABLE public.influencers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  instagram text,
  commission_percent numeric NOT NULL DEFAULT 10,
  is_active boolean DEFAULT true,
  total_sales numeric DEFAULT 0,
  total_commission numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add FK from coupons to influencers
ALTER TABLE public.coupons ADD CONSTRAINT coupons_influencer_id_fkey FOREIGN KEY (influencer_id) REFERENCES public.influencers(id);

-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text,
  phone text,
  cpf text,
  birthday date,
  instagram text,
  avatar_url text,
  address jsonb,
  admin_notes text,
  loyalty_tier text DEFAULT 'bronze'::text,
  total_points integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- user_roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL DEFAULT 'customer',
  UNIQUE (user_id, role)
);

-- orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric NOT NULL,
  discount numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'::text,
  payment_method text,
  shipping_address jsonb,
  coupon_code text,
  influencer_id uuid REFERENCES public.influencers(id),
  notes text,
  tracking_code text,
  tracking_url text,
  estimated_delivery timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- financial_transactions
CREATE TABLE public.financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id),
  type text NOT NULL,
  category text NOT NULL,
  description text,
  amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- financial_premises
CREATE TABLE public.financial_premises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_revenue_goal numeric NOT NULL DEFAULT 10000,
  order_target integer NOT NULL DEFAULT 100,
  desired_margin numeric NOT NULL DEFAULT 30,
  packaging_cost numeric NOT NULL DEFAULT 1.92,
  marketing_budget numeric NOT NULL DEFAULT 0,
  gateway_rate_credit numeric NOT NULL DEFAULT 4.19,
  gateway_rate_credit_fixed numeric NOT NULL DEFAULT 0.35,
  gateway_rate_pix numeric NOT NULL DEFAULT 0.99,
  gateway_rate_debit numeric NOT NULL DEFAULT 0.74,
  gateway_rate_physical numeric NOT NULL DEFAULT 0.74,
  influencer_commission_rate numeric NOT NULL DEFAULT 10,
  freight_batch_total numeric NOT NULL DEFAULT 0,
  freight_batch_items integer NOT NULL DEFAULT 1,
  local_shipping_fee numeric NOT NULL DEFAULT 15,
  fixed_cost_platform numeric NOT NULL DEFAULT 69,
  fixed_cost_platform_label text NOT NULL DEFAULT 'Nuvemshop'::text,
  fixed_cost_whatsgw numeric NOT NULL DEFAULT 99,
  fixed_cost_whatsgw_label text NOT NULL DEFAULT 'WhatsGW'::text,
  fixed_cost_other numeric NOT NULL DEFAULT 0,
  fixed_cost_other_label text DEFAULT ''::text,
  fixed_cost_extra1 numeric NOT NULL DEFAULT 0,
  fixed_cost_extra1_label text NOT NULL DEFAULT ''::text,
  fixed_cost_extra2 numeric NOT NULL DEFAULT 0,
  fixed_cost_extra2_label text NOT NULL DEFAULT ''::text,
  fixed_cost_extra3 numeric NOT NULL DEFAULT 0,
  fixed_cost_extra3_label text NOT NULL DEFAULT ''::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- premises_audit_log
CREATE TABLE public.premises_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text,
  changed_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  old_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  new_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- influencer_commissions
CREATE TABLE public.influencer_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id uuid NOT NULL REFERENCES public.influencers(id),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  order_total numeric NOT NULL,
  commission_percent numeric NOT NULL,
  commission_value numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- favorites
CREATE TABLE public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- cart_items
CREATE TABLE public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL DEFAULT 1,
  selected_swatch jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- cart_abandonment_events
CREATE TABLE public.cart_abandonment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  step text NOT NULL DEFAULT 'cart'::text,
  items_count integer NOT NULL DEFAULT 0,
  cart_total numeric NOT NULL DEFAULT 0,
  notification_count integer NOT NULL DEFAULT 0,
  notified_at timestamptz,
  recovered_at timestamptz,
  recovery_token text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- reviews
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id),
  user_id uuid NOT NULL,
  rating integer NOT NULL,
  comment text,
  images text[] DEFAULT '{}'::text[],
  is_approved boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- returns
CREATE TABLE public.returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  user_id uuid NOT NULL,
  reason text NOT NULL,
  type text NOT NULL DEFAULT 'return'::text,
  status text NOT NULL DEFAULT 'requested'::text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  admin_notes text,
  tracking_code text,
  refund_amount numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- loyalty_points
CREATE TABLE public.loyalty_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source text NOT NULL,
  points integer NOT NULL DEFAULT 0,
  description text,
  reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- saved_addresses
CREATE TABLE public.saved_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text NOT NULL DEFAULT 'Casa'::text,
  street text NOT NULL,
  number text NOT NULL,
  complement text,
  neighborhood text NOT NULL,
  city text NOT NULL DEFAULT 'Belém'::text,
  state text NOT NULL DEFAULT 'PA'::text,
  zip text NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  order_id uuid REFERENCES public.orders(id),
  event_type text NOT NULL,
  phone text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  zapi_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- message_templates
CREATE TABLE public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  template text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- newsletter_subscribers
CREATE TABLE public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  source text DEFAULT 'popup'::text,
  is_active boolean NOT NULL DEFAULT true,
  subscribed_at timestamptz NOT NULL DEFAULT now()
);

-- promotions
CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'banner'::text,
  discount_type text,
  discount_value numeric DEFAULT 0,
  image_url text,
  link_url text,
  position text DEFAULT 'hero'::text,
  sort_order integer DEFAULT 0,
  is_active boolean NOT NULL DEFAULT false,
  starts_at timestamptz,
  ends_at timestamptz,
  product_ids uuid[] DEFAULT '{}'::uuid[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- tracking_pixels
CREATE TABLE public.tracking_pixels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  platform text NOT NULL,
  pixel_code text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- site_settings
CREATE TABLE public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT 'true'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- blog_posts
CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  content text,
  excerpt text,
  cover_image text,
  author_name text DEFAULT 'Elle Make'::text,
  seo_title text,
  seo_description text,
  tags text[] DEFAULT '{}'::text[],
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  views integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ugc_posts
CREATE TABLE public.ugc_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid REFERENCES public.products(id),
  image_url text NOT NULL,
  caption text,
  is_approved boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- push_subscriptions
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  endpoint text NOT NULL,
  keys jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- catalog_imports
CREATE TABLE public.catalog_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id text NOT NULL,
  folder_name text,
  supplier_name text,
  status text NOT NULL DEFAULT 'pending'::text,
  total_files integer DEFAULT 0,
  processed_files integer DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- catalog_items
CREATE TABLE public.catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid REFERENCES public.catalog_imports(id),
  product_name text NOT NULL,
  brand text NOT NULL,
  category text,
  description text,
  price numeric,
  compare_at_price numeric,
  image_urls text[] DEFAULT '{}'::text[],
  tags text[] DEFAULT '{}'::text[],
  source_file text,
  raw_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- catalog_import_failures
CREATE TABLE public.catalog_import_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES public.catalog_imports(id),
  file_id text NOT NULL,
  file_name text NOT NULL,
  brand_name text NOT NULL,
  error_message text,
  error_category text DEFAULT 'unknown'::text,
  retry_guidance text,
  file_size_bytes bigint,
  attempts integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- marketplace_configs
CREATE TABLE public.marketplace_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_id text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  auto_sync boolean NOT NULL DEFAULT false,
  sync_frequency text NOT NULL DEFAULT 'daily'::text,
  price_rule text NOT NULL DEFAULT 'same'::text,
  markup_percent numeric NOT NULL DEFAULT 0,
  shipping_mode text NOT NULL DEFAULT 'marketplace'::text,
  status text NOT NULL DEFAULT 'disconnected'::text,
  api_key text DEFAULT ''::text,
  seller_id text DEFAULT ''::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- marketplace_listings
CREATE TABLE public.marketplace_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id),
  marketplace text NOT NULL,
  external_id text,
  external_url text,
  status text NOT NULL DEFAULT 'pending'::text,
  sync_error text,
  metadata jsonb DEFAULT '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- marketplace_orders
CREATE TABLE public.marketplace_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace text NOT NULL,
  external_order_id text NOT NULL,
  internal_order_id uuid REFERENCES public.orders(id),
  status text NOT NULL DEFAULT 'pending'::text,
  total numeric NOT NULL DEFAULT 0,
  marketplace_fee numeric DEFAULT 0,
  shipping_cost numeric DEFAULT 0,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  buyer_name text,
  buyer_email text,
  buyer_phone text,
  shipping_address jsonb,
  shipping_status text DEFAULT 'pending'::text,
  tracking_code text,
  raw_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- marketplace_sync_logs
CREATE TABLE public.marketplace_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace text NOT NULL,
  operation text NOT NULL,
  status text NOT NULL DEFAULT 'started'::text,
  items_processed integer DEFAULT 0,
  items_failed integer DEFAULT 0,
  error_message text,
  details jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- marketplace_tokens
CREATE TABLE public.marketplace_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace text NOT NULL,
  access_token text,
  refresh_token text,
  token_type text DEFAULT 'Bearer'::text,
  expires_at timestamptz,
  seller_id text,
  extra jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- seo_reports
CREATE TABLE public.seo_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report jsonb NOT NULL DEFAULT '{}'::jsonb,
  score integer DEFAULT 0,
  total_products integer DEFAULT 0,
  products_without_description integer DEFAULT 0,
  products_without_images integer DEFAULT 0,
  total_categories integer DEFAULT 0,
  sitemap_urls integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- marketing_campaigns
CREATE TABLE public.marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  date date,
  coupon_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- revenue_reports
CREATE TABLE public.revenue_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  month integer NOT NULL,
  item_i numeric NOT NULL DEFAULT 0,
  item_ii numeric NOT NULL DEFAULT 0,
  item_iv numeric NOT NULL DEFAULT 0,
  item_v numeric NOT NULL DEFAULT 0,
  item_vii numeric NOT NULL DEFAULT 0,
  item_viii numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  entrepreneur text,
  cnpj text,
  local_date text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. FUNCTIONS

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone, birthday)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    CASE 
      WHEN NEW.raw_user_meta_data->>'birthday' IS NOT NULL 
           AND NEW.raw_user_meta_data->>'birthday' != ''
      THEN (NEW.raw_user_meta_data->>'birthday')::date
      ELSE NULL
    END
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.deduct_stock_on_order_confirmed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  item jsonb;
  product_id uuid;
  qty int;
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status = NEW.status) THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('confirmed', 'approved', 'processing', 'shipped') THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status IN ('confirmed', 'approved', 'processing', 'shipped', 'delivered') THEN RETURN NEW; END IF;
  FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    product_id := (item->>'product_id')::uuid;
    qty := COALESCE((item->>'quantity')::int, 1);
    IF product_id IS NOT NULL THEN
      UPDATE products SET stock = GREATEST(0, stock - qty), updated_at = now() WHERE id = product_id;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_financial_on_confirmation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  item jsonb;
  product_cost RECORD;
  total_cogs NUMERIC := 0;
  packaging NUMERIC := 0;
  gateway_fee NUMERIC := 0;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('confirmed', 'approved') THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status IN ('confirmed', 'approved') THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM financial_transactions WHERE order_id = NEW.id AND type = 'revenue') THEN RETURN NEW; END IF;

  INSERT INTO financial_transactions (order_id, type, category, description, amount)
  VALUES (NEW.id, 'revenue', 'venda', 'Pedido #' || LEFT(NEW.id::text, 8), NEW.total);

  FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    SELECT pc.cost_base, pc.freight_per_unit INTO product_cost
    FROM product_costs pc WHERE pc.product_id = (item->>'product_id')::uuid;
    IF FOUND THEN
      total_cogs := total_cogs + (product_cost.cost_base + product_cost.freight_per_unit) * COALESCE((item->>'quantity')::int, 1);
    END IF;
  END LOOP;

  IF total_cogs > 0 THEN
    INSERT INTO financial_transactions (order_id, type, category, description, amount)
    VALUES (NEW.id, 'expense', 'custo_produto', 'CMV Pedido #' || LEFT(NEW.id::text, 8), total_cogs);
  END IF;

  SELECT fp.packaging_cost INTO packaging FROM financial_premises fp LIMIT 1;
  IF packaging IS NOT NULL AND packaging > 0 THEN
    INSERT INTO financial_transactions (order_id, type, category, description, amount)
    VALUES (NEW.id, 'expense', 'embalagem', 'Embalagem Pedido #' || LEFT(NEW.id::text, 8), packaging);
  END IF;

  DECLARE
    rate NUMERIC := 0;
    fixed NUMERIC := 0;
  BEGIN
    IF NEW.payment_method = 'pix' THEN
      SELECT fp.gateway_rate_pix / 100 INTO rate FROM financial_premises fp LIMIT 1;
    ELSIF NEW.payment_method = 'card' THEN
      SELECT fp.gateway_rate_credit / 100, fp.gateway_rate_credit_fixed INTO rate, fixed FROM financial_premises fp LIMIT 1;
    ELSIF NEW.payment_method = 'boleto' THEN
      SELECT fp.gateway_rate_debit / 100 INTO rate FROM financial_premises fp LIMIT 1;
    END IF;
    gateway_fee := (NEW.total * COALESCE(rate, 0)) + COALESCE(fixed, 0);
    IF gateway_fee > 0 THEN
      INSERT INTO financial_transactions (order_id, type, category, description, amount)
      VALUES (NEW.id, 'expense', 'taxa_gateway', 'Taxa ' || COALESCE(NEW.payment_method, 'gateway') || ' Pedido #' || LEFT(NEW.id::text, 8), ROUND(gateway_fee, 2));
    END IF;
  END;

  IF COALESCE(NEW.discount, 0) > 0 THEN
    INSERT INTO financial_transactions (order_id, type, category, description, amount)
    VALUES (NEW.id, 'expense', 'desconto', 'Desconto Pedido #' || LEFT(NEW.id::text, 8), NEW.discount);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_financial_on_cancellation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('cancelled', 'refunded') THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM financial_transactions WHERE order_id = NEW.id) THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM financial_transactions WHERE order_id = NEW.id AND category = 'estorno') THEN RETURN NEW; END IF;

  INSERT INTO financial_transactions (order_id, type, category, description, amount)
  SELECT order_id, 'expense', 'estorno', 'Estorno ' || description || ' (cancelado)', amount
  FROM financial_transactions WHERE order_id = NEW.id AND type = 'revenue';

  INSERT INTO financial_transactions (order_id, type, category, description, amount)
  SELECT order_id, 'revenue', 'estorno_despesa', 'Estorno ' || description || ' (cancelado)', amount
  FROM financial_transactions WHERE order_id = NEW.id AND type = 'expense';

  DECLARE
    item jsonb;
    p_id uuid;
    qty int;
  BEGIN
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      p_id := (item->>'product_id')::uuid;
      qty := COALESCE((item->>'quantity')::int, 1);
      IF p_id IS NOT NULL THEN
        UPDATE products SET stock = stock + qty, updated_at = now() WHERE id = p_id;
      END IF;
    END LOOP;
  END;

  RETURN NEW;
END;
$$;

-- 4. TRIGGERS

-- Auto-create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at triggers
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_financial_premises_updated_at BEFORE UPDATE ON public.financial_premises FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_returns_updated_at BEFORE UPDATE ON public.returns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_message_templates_updated_at BEFORE UPDATE ON public.message_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_catalog_imports_updated_at BEFORE UPDATE ON public.catalog_imports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_marketplace_configs_updated_at BEFORE UPDATE ON public.marketplace_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_marketplace_listings_updated_at BEFORE UPDATE ON public.marketplace_listings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_marketplace_orders_updated_at BEFORE UPDATE ON public.marketplace_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_marketplace_tokens_updated_at BEFORE UPDATE ON public.marketplace_tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_marketing_campaigns_updated_at BEFORE UPDATE ON public.marketing_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_revenue_reports_updated_at BEFORE UPDATE ON public.revenue_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_product_costs_updated_at BEFORE UPDATE ON public.product_costs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Business logic triggers on orders
CREATE TRIGGER trigger_deduct_stock AFTER INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.deduct_stock_on_order_confirmed();
CREATE TRIGGER trigger_register_financial AFTER INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.register_financial_on_confirmation();
CREATE TRIGGER trigger_reverse_financial AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.reverse_financial_on_cancellation();

-- 5. ENABLE RLS ON ALL TABLES

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_premises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premises_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_abandonment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_pixels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_import_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_reports ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES

-- categories
CREATE POLICY "Categories are public" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- products
CREATE POLICY "Products are public" ON public.products FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage products" ON public.products FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- product_costs
CREATE POLICY "Admins manage product costs" ON public.product_costs FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- coupons
CREATE POLICY "Active coupons are public" ON public.coupons FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage coupons" ON public.coupons FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- influencers
CREATE POLICY "Admins manage influencers" ON public.influencers FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Influencers view own data" ON public.influencers FOR SELECT USING (auth.uid() = user_id);

-- profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update all profiles" ON public.profiles FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- user_roles (no user-facing policies needed, managed by has_role function)

-- orders
CREATE POLICY "Users view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all orders" ON public.orders FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update orders" ON public.orders FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete orders" ON public.orders FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- financial_transactions
CREATE POLICY "Admins manage financial transactions" ON public.financial_transactions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- financial_premises
CREATE POLICY "Admins manage financial premises" ON public.financial_premises FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- premises_audit_log
CREATE POLICY "Admins manage premises audit log" ON public.premises_audit_log FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- influencer_commissions
CREATE POLICY "Admins manage commissions" ON public.influencer_commissions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Influencers view own commissions" ON public.influencer_commissions FOR SELECT USING (EXISTS (SELECT 1 FROM influencers WHERE influencers.id = influencer_commissions.influencer_id AND influencers.user_id = auth.uid()));
CREATE POLICY "Users can insert commissions on order placement" ON public.influencer_commissions FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM orders WHERE orders.id = influencer_commissions.order_id AND orders.user_id = auth.uid()));

-- favorites
CREATE POLICY "Users manage own favorites" ON public.favorites FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- cart_items
CREATE POLICY "Users manage own cart" ON public.cart_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- cart_abandonment_events
CREATE POLICY "Users can insert own events" ON public.cart_abandonment_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own events" ON public.cart_abandonment_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all events" ON public.cart_abandonment_events FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages abandonment events" ON public.cart_abandonment_events FOR ALL USING (auth.role() = 'service_role'::text) WITH CHECK (auth.role() = 'service_role'::text);

-- reviews
CREATE POLICY "Reviews are public when approved" ON public.reviews FOR SELECT USING (is_approved = true);
CREATE POLICY "Users can create own reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins manage reviews" ON public.reviews FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- returns
CREATE POLICY "Users view own returns" ON public.returns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own returns" ON public.returns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage returns" ON public.returns FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- loyalty_points
CREATE POLICY "Users view own points" ON public.loyalty_points FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System inserts points" ON public.loyalty_points FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage points" ON public.loyalty_points FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- saved_addresses
CREATE POLICY "Users manage own addresses" ON public.saved_addresses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- notifications
CREATE POLICY "Admins manage notifications" ON public.notifications FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role inserts notifications" ON public.notifications FOR INSERT WITH CHECK (auth.role() = 'service_role'::text);

-- message_templates
CREATE POLICY "Admins manage templates" ON public.message_templates FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role reads templates" ON public.message_templates FOR SELECT USING (auth.role() = 'service_role'::text);

-- newsletter_subscribers
CREATE POLICY "Anyone can subscribe" ON public.newsletter_subscribers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins manage subscribers" ON public.newsletter_subscribers FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- promotions
CREATE POLICY "Active promotions are public" ON public.promotions FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage promotions" ON public.promotions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- tracking_pixels
CREATE POLICY "Active pixels are public" ON public.tracking_pixels FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage pixels" ON public.tracking_pixels FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- site_settings
CREATE POLICY "Public can read site settings" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage site settings" ON public.site_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- blog_posts
CREATE POLICY "Published posts are public" ON public.blog_posts FOR SELECT USING (is_published = true);
CREATE POLICY "Admins manage posts" ON public.blog_posts FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ugc_posts
CREATE POLICY "Admins manage ugc" ON public.ugc_posts FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- push_subscriptions
CREATE POLICY "Users manage own subscriptions" ON public.push_subscriptions FOR ALL USING ((auth.uid() = user_id) OR (user_id IS NULL)) WITH CHECK ((auth.uid() = user_id) OR (user_id IS NULL));

-- catalog_imports
CREATE POLICY "Admins manage catalog imports" ON public.catalog_imports FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- catalog_items
CREATE POLICY "Admins manage catalog items" ON public.catalog_items FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- catalog_import_failures
CREATE POLICY "Admins manage import failures" ON public.catalog_import_failures FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages import failures" ON public.catalog_import_failures FOR ALL USING (auth.role() = 'service_role'::text) WITH CHECK (auth.role() = 'service_role'::text);

-- marketplace_configs
CREATE POLICY "Admins manage marketplace configs" ON public.marketplace_configs FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- marketplace_listings
CREATE POLICY "Admins manage marketplace listings" ON public.marketplace_listings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages listings" ON public.marketplace_listings FOR ALL USING (auth.role() = 'service_role'::text) WITH CHECK (auth.role() = 'service_role'::text);

-- marketplace_orders
CREATE POLICY "Admins manage marketplace orders" ON public.marketplace_orders FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages mp orders" ON public.marketplace_orders FOR ALL USING (auth.role() = 'service_role'::text) WITH CHECK (auth.role() = 'service_role'::text);

-- marketplace_sync_logs
CREATE POLICY "Admins view sync logs" ON public.marketplace_sync_logs FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages sync logs" ON public.marketplace_sync_logs FOR INSERT WITH CHECK (auth.role() = 'service_role'::text);

-- marketplace_tokens
CREATE POLICY "Admins manage marketplace tokens" ON public.marketplace_tokens FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages tokens" ON public.marketplace_tokens FOR ALL USING (auth.role() = 'service_role'::text) WITH CHECK (auth.role() = 'service_role'::text);

-- seo_reports
CREATE POLICY "Admins view SEO reports" ON public.seo_reports FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role inserts SEO reports" ON public.seo_reports FOR INSERT WITH CHECK (auth.role() = 'service_role'::text);

-- marketing_campaigns
CREATE POLICY "Admins manage campaigns" ON public.marketing_campaigns FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- revenue_reports
CREATE POLICY "Admins manage revenue reports" ON public.revenue_reports FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 7. STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('ugc-images', 'ugc-images', true) ON CONFLICT DO NOTHING;

-- Storage policies
CREATE POLICY "Public read product images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Admin upload product images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');
CREATE POLICY "Public read ugc images" ON storage.objects FOR SELECT USING (bucket_id = 'ugc-images');
CREATE POLICY "Auth upload ugc images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ugc-images' AND auth.role() = 'authenticated');

-- =====================================================
-- DONE! After running this script, execute the 
-- migrate-data edge function to transfer all data.
-- =====================================================
