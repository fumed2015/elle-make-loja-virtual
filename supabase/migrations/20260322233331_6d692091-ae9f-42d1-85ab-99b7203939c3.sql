
-- Drop the constraint (not index) first
ALTER TABLE public.checkout_leads DROP CONSTRAINT IF EXISTS checkout_leads_user_id_unique;

-- Now drop the partial index
DROP INDEX IF EXISTS checkout_leads_user_active_idx;

-- Allow checkout_leads.user_id to be nullable (for guest leads identified by phone)
ALTER TABLE public.checkout_leads ALTER COLUMN user_id DROP NOT NULL;

-- Create new unique index: deduplicate by phone for unconverted leads
CREATE UNIQUE INDEX checkout_leads_phone_active_idx ON public.checkout_leads (phone) WHERE (converted_at IS NULL);

-- Add RLS policy for anon inserts (guest ghost leads)
CREATE POLICY "Anon can insert ghost leads" ON public.checkout_leads
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

-- Add RLS policy for anon to update own leads by phone
CREATE POLICY "Anon can update own ghost leads" ON public.checkout_leads
  FOR UPDATE TO anon
  USING (user_id IS NULL)
  WITH CHECK (user_id IS NULL);
