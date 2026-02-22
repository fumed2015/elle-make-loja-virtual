
-- Product costs table: stores cost_base and freight_per_unit for each product
CREATE TABLE public.product_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  cost_base NUMERIC NOT NULL DEFAULT 0,
  freight_per_unit NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id)
);

-- Financial premises: single-row config for monthly cost allocation
CREATE TABLE public.financial_premises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Fixed costs
  fixed_cost_platform NUMERIC NOT NULL DEFAULT 69,
  fixed_cost_whatsgw NUMERIC NOT NULL DEFAULT 99,
  fixed_cost_other NUMERIC NOT NULL DEFAULT 0,
  fixed_cost_other_label TEXT DEFAULT '',
  -- Marketing
  marketing_budget NUMERIC NOT NULL DEFAULT 0,
  -- Order target
  order_target INTEGER NOT NULL DEFAULT 100,
  -- Variable costs
  packaging_cost NUMERIC NOT NULL DEFAULT 2.50,
  gateway_rate_credit NUMERIC NOT NULL DEFAULT 4.19,
  gateway_rate_credit_fixed NUMERIC NOT NULL DEFAULT 0.35,
  gateway_rate_pix NUMERIC NOT NULL DEFAULT 0.99,
  gateway_rate_debit NUMERIC NOT NULL DEFAULT 0.74,
  gateway_rate_physical NUMERIC NOT NULL DEFAULT 0.74,
  influencer_commission_rate NUMERIC NOT NULL DEFAULT 10,
  -- Desired margin for markup calculator
  desired_margin NUMERIC NOT NULL DEFAULT 30,
  -- Freight batch config
  freight_batch_total NUMERIC NOT NULL DEFAULT 0,
  freight_batch_items INTEGER NOT NULL DEFAULT 1,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_premises ENABLE ROW LEVEL SECURITY;

-- Only admins can manage these
CREATE POLICY "Admins manage product costs"
  ON public.product_costs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage financial premises"
  ON public.financial_premises FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_product_costs_updated_at
  BEFORE UPDATE ON public.product_costs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_premises_updated_at
  BEFORE UPDATE ON public.financial_premises
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default premises row
INSERT INTO public.financial_premises (
  fixed_cost_platform, fixed_cost_whatsgw, marketing_budget, order_target,
  packaging_cost, gateway_rate_credit, gateway_rate_credit_fixed,
  gateway_rate_pix, gateway_rate_debit, gateway_rate_physical,
  influencer_commission_rate, desired_margin, freight_batch_total, freight_batch_items
) VALUES (
  69, 99, 0, 100, 2.50, 4.19, 0.35, 0.99, 0.74, 0.74, 10, 30, 0, 1
);
