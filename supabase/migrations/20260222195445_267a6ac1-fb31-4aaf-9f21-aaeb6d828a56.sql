-- Create marketing_campaigns table
CREATE TABLE public.marketing_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  date DATE,
  coupon_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

-- Policies for marketing_campaigns
CREATE POLICY "Admins manage campaigns" 
ON public.marketing_campaigns 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Add monthly_revenue_goal to financial_premises
ALTER TABLE public.financial_premises 
ADD COLUMN IF NOT EXISTS monthly_revenue_goal NUMERIC NOT NULL DEFAULT 10000;
