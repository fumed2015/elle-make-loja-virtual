
-- Add editable labels for platform and whatsgw costs
ALTER TABLE public.financial_premises
  ADD COLUMN IF NOT EXISTS fixed_cost_platform_label text NOT NULL DEFAULT 'Nuvemshop',
  ADD COLUMN IF NOT EXISTS fixed_cost_whatsgw_label text NOT NULL DEFAULT 'WhatsGW',
  ADD COLUMN IF NOT EXISTS fixed_cost_extra1 numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fixed_cost_extra1_label text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fixed_cost_extra2 numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fixed_cost_extra2_label text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fixed_cost_extra3 numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fixed_cost_extra3_label text NOT NULL DEFAULT '';
