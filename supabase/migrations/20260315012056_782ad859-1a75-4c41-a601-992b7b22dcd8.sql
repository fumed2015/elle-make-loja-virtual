
CREATE OR REPLACE FUNCTION public.claim_guest_order(p_order_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only claim orders that have no user_id (guest orders)
  UPDATE orders
  SET user_id = p_user_id, updated_at = now()
  WHERE id = p_order_id
    AND user_id IS NULL;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;
