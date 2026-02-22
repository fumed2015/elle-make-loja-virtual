-- Enable realtime for orders and financial_transactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_transactions;

-- Allow admins to delete orders
CREATE POLICY "Admins delete orders"
ON public.orders
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));