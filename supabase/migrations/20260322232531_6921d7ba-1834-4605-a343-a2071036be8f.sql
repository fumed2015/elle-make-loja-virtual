
-- Drop and recreate the financial triggers that already exist to ensure clean state
DROP TRIGGER IF EXISTS trg_register_financial_on_confirmation ON public.orders;
DROP TRIGGER IF EXISTS trg_reverse_financial_on_cancellation ON public.orders;

CREATE TRIGGER trg_register_financial_on_confirmation
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.register_financial_on_confirmation();

CREATE TRIGGER trg_reverse_financial_on_cancellation
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.reverse_financial_on_cancellation();
