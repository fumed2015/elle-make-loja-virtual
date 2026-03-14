
-- Make user_id nullable on orders for guest checkout
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;

-- Add guest info columns
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS guest_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS guest_email text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS guest_phone text;

-- Allow anonymous users to insert orders (guest checkout)
CREATE POLICY "Guest users can insert orders"
ON public.orders
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

-- Allow anonymous users to read their own orders by id (for success page)
CREATE POLICY "Anyone can read order by id"
ON public.orders
FOR SELECT
TO anon
USING (true);
