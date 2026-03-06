
-- Create audit log table for financial premises changes
CREATE TABLE public.premises_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text,
  changed_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  old_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  new_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.premises_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage audit logs
CREATE POLICY "Admins manage premises audit log"
  ON public.premises_audit_log FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
