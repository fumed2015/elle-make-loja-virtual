
CREATE TABLE public.revenue_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month integer NOT NULL,
  year integer NOT NULL,
  cnpj text,
  entrepreneur text,
  local_date text,
  item_i numeric NOT NULL DEFAULT 0,
  item_ii numeric NOT NULL DEFAULT 0,
  item_iv numeric NOT NULL DEFAULT 0,
  item_v numeric NOT NULL DEFAULT 0,
  item_vii numeric NOT NULL DEFAULT 0,
  item_viii numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (month, year)
);

ALTER TABLE public.revenue_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage revenue reports"
  ON public.revenue_reports FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
