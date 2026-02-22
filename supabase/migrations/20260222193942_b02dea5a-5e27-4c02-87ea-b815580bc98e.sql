-- Trigger: when an order is cancelled/refunded, reverse its financial transactions
CREATE OR REPLACE FUNCTION public.reverse_financial_on_cancellation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  -- Only fire when status changes TO cancelled or refunded
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('cancelled', 'refunded') THEN
    RETURN NEW;
  END IF;

  -- Only reverse if coming from a confirmed state (has financial records)
  IF NOT EXISTS (SELECT 1 FROM financial_transactions WHERE order_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Check if already reversed
  IF EXISTS (SELECT 1 FROM financial_transactions WHERE order_id = NEW.id AND category = 'estorno') THEN
    RETURN NEW;
  END IF;

  -- Reverse revenue: insert negative revenue entry
  INSERT INTO financial_transactions (order_id, type, category, description, amount)
  SELECT order_id, 'expense', 'estorno', 
    'Estorno ' || description || ' (cancelado)', 
    amount
  FROM financial_transactions 
  WHERE order_id = NEW.id AND type = 'revenue';

  -- Reverse expenses: insert negative expense entries (credit back)
  INSERT INTO financial_transactions (order_id, type, category, description, amount)
  SELECT order_id, 'revenue', 'estorno_despesa',
    'Estorno ' || description || ' (cancelado)',
    amount
  FROM financial_transactions
  WHERE order_id = NEW.id AND type = 'expense';

  -- Restore stock
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

-- Create trigger
CREATE TRIGGER reverse_financial_on_cancel
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.reverse_financial_on_cancellation();