
-- Financial transactions table
CREATE TABLE public.financial_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id),
  type TEXT NOT NULL CHECK (type IN ('revenue', 'expense')),
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage financial transactions"
  ON public.financial_transactions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Index for fast lookups
CREATE INDEX idx_financial_transactions_order ON public.financial_transactions(order_id);
CREATE INDEX idx_financial_transactions_type ON public.financial_transactions(type);

-- Function to register revenue/expenses when order is confirmed
CREATE OR REPLACE FUNCTION public.register_financial_on_confirmation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  item jsonb;
  product_cost RECORD;
  total_cogs NUMERIC := 0;
  packaging NUMERIC := 0;
  gateway_fee NUMERIC := 0;
BEGIN
  -- Only fire when status changes TO confirmed
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('confirmed', 'approved') THEN
    RETURN NEW;
  END IF;

  -- Avoid double registration
  IF TG_OP = 'UPDATE' AND OLD.status IN ('confirmed', 'approved') THEN
    RETURN NEW;
  END IF;

  -- Check if already registered
  IF EXISTS (SELECT 1 FROM financial_transactions WHERE order_id = NEW.id AND type = 'revenue') THEN
    RETURN NEW;
  END IF;

  -- 1. Register REVENUE (order total)
  INSERT INTO financial_transactions (order_id, type, category, description, amount)
  VALUES (NEW.id, 'revenue', 'venda', 'Pedido #' || LEFT(NEW.id::text, 8), NEW.total);

  -- 2. Calculate and register COGS (cost of goods sold)
  FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    SELECT pc.cost_base, pc.freight_per_unit INTO product_cost
    FROM product_costs pc
    WHERE pc.product_id = (item->>'product_id')::uuid;

    IF FOUND THEN
      total_cogs := total_cogs + (product_cost.cost_base + product_cost.freight_per_unit) * COALESCE((item->>'quantity')::int, 1);
    END IF;
  END LOOP;

  IF total_cogs > 0 THEN
    INSERT INTO financial_transactions (order_id, type, category, description, amount)
    VALUES (NEW.id, 'expense', 'custo_produto', 'CMV Pedido #' || LEFT(NEW.id::text, 8), total_cogs);
  END IF;

  -- 3. Register packaging expense from financial_premises
  SELECT fp.packaging_cost INTO packaging FROM financial_premises fp LIMIT 1;
  IF packaging IS NOT NULL AND packaging > 0 THEN
    INSERT INTO financial_transactions (order_id, type, category, description, amount)
    VALUES (NEW.id, 'expense', 'embalagem', 'Embalagem Pedido #' || LEFT(NEW.id::text, 8), packaging);
  END IF;

  -- 4. Register gateway fee
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

  -- 5. Register discount as expense if any
  IF COALESCE(NEW.discount, 0) > 0 THEN
    INSERT INTO financial_transactions (order_id, type, category, description, amount)
    VALUES (NEW.id, 'expense', 'desconto', 'Desconto Pedido #' || LEFT(NEW.id::text, 8), NEW.discount);
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on order status change
CREATE TRIGGER trg_register_financial_on_confirmation
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.register_financial_on_confirmation();
