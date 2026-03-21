
-- Function to deduct stock when an order is confirmed
CREATE OR REPLACE FUNCTION public.deduct_stock_on_order_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  item jsonb;
  product_id uuid;
  qty int;
  current_stock int;
BEGIN
  -- Only fire when status changes TO a confirmed state
  IF (TG_OP = 'UPDATE' AND OLD.status = NEW.status) THEN
    RETURN NEW;
  END IF;

  -- Confirmed statuses: when payment is approved or order is being processed
  IF NEW.status NOT IN ('confirmed', 'approved', 'processing', 'shipped') THEN
    RETURN NEW;
  END IF;

  -- For UPDATE, skip if old status was already a confirmed state (avoid double deduction)
  IF TG_OP = 'UPDATE' AND OLD.status IN ('confirmed', 'approved', 'processing', 'shipped', 'delivered') THEN
    RETURN NEW;
  END IF;

  -- Iterate through order items and deduct stock
  FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    product_id := (item->>'product_id')::uuid;
    qty := COALESCE((item->>'quantity')::int, 1);

    IF product_id IS NOT NULL THEN
      -- Deduct stock, never go below 0
      UPDATE products
      SET stock = GREATEST(0, stock - qty),
          updated_at = now()
      WHERE id = product_id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Create trigger on orders table
CREATE TRIGGER trigger_deduct_stock_on_order
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_stock_on_order_confirmed();
