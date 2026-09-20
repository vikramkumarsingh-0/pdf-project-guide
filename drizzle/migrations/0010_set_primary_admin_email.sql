-- Designated primary administrator email for StudyFlow AI
CREATE OR REPLACE FUNCTION public.primary_admin_email()
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 'kumarishubham177@gmail.com'::text $$;

-- Grants admin to the calling user when their email matches the designated
-- administrator address, and retires any previously designated administrator.
CREATE OR REPLACE FUNCTION public.claim_primary_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text;
BEGIN
  IF _uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT lower(email) INTO _email FROM auth.users WHERE id = _uid;

  IF _email IS DISTINCT FROM lower(public.primary_admin_email()) THEN
    RETURN false;
  END IF;

  INSERT INTO public.user_roles(user_id, role)
  VALUES (_uid, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- retire administrators that are no longer the designated address
  DELETE FROM public.user_roles r
  USING auth.users u
  WHERE r.user_id = u.id
    AND r.role = 'admin'
    AND lower(u.email) IS DISTINCT FROM lower(public.primary_admin_email());

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_primary_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.primary_admin_email() TO authenticated, anon;

-- If the designated administrator already has an account, grant it now.
INSERT INTO public.user_roles(user_id, role)
SELECT u.id, 'admin'
FROM auth.users u
WHERE lower(u.email) = lower(public.primary_admin_email())
ON CONFLICT (user_id, role) DO NOTHING;
