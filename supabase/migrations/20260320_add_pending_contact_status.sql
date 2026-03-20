-- Add pending_contact status to orders table
ALTER TABLE public.orders DROP CONSTRAINT orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending', 'pending_contact', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'));

-- Update comment for clarity
COMMENT ON COLUMN public.orders.status IS 'Order status: pending (initial), pending_contact (waiting for customer contact via WhatsApp), confirmed (payment confirmed), preparing (preparing for shipment), shipped (shipped), delivered (delivered), cancelled (cancelled)';
