CREATE OR REPLACE FUNCTION public.primary_admin_email()
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 'shubhamkumari177@gmail.com'::text $$;

GRANT EXECUTE ON FUNCTION public.primary_admin_email() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.claim_primary_admin() TO authenticated;

DO $do$
DECLARE
  _uid uuid;
  _name text;
  _author_id uuid;
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower('shubhamkumari177@gmail.com') LIMIT 1;

  IF _uid IS NOT NULL THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (_uid, 'admin') ON CONFLICT (user_id, role) DO NOTHING;
    INSERT INTO public.user_roles(user_id, role) VALUES (_uid, 'student') ON CONFLICT (user_id, role) DO NOTHING;
    INSERT INTO public.user_roles(user_id, role) VALUES (_uid, 'teacher') ON CONFLICT (user_id, role) DO NOTHING;

    DELETE FROM public.user_roles r
    USING auth.users u
    WHERE r.user_id = u.id
      AND r.role = 'admin'
      AND lower(u.email) IS DISTINCT FROM lower('shubhamkumari177@gmail.com');

    SELECT author_id INTO _author_id FROM public.educator_accounts WHERE user_id = _uid;
    IF _author_id IS NULL THEN
      SELECT coalesce(nullif(trim(name), ''), 'Shubham Kumari') INTO _name FROM public.profiles WHERE id = _uid;

      INSERT INTO public.material_authors(name, affiliation, biography, expertise)
      VALUES (
        coalesce(_name, 'Shubham Kumari'),
        'StudyFlow AI',
        'Platform administrator, student, and educator.',
        ARRAY['Artificial Intelligence', 'Machine Learning']
      )
      RETURNING id INTO _author_id;

      INSERT INTO public.educator_accounts(user_id, author_id, linked_by)
      VALUES (_uid, _author_id, _uid) ON CONFLICT (user_id) DO NOTHING;
    END IF;
  END IF;
END
$do$;