CREATE OR REPLACE FUNCTION public.claim_primary_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _name text;
  _author_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT lower(email) INTO _email FROM auth.users WHERE id = _uid;

  IF _email IS DISTINCT FROM lower(public.primary_admin_email()) THEN
    RETURN false;
  END IF;

  INSERT INTO public.user_roles(user_id, role) VALUES (_uid, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.user_roles(user_id, role) VALUES (_uid, 'student')
  ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.user_roles(user_id, role) VALUES (_uid, 'teacher')
  ON CONFLICT (user_id, role) DO NOTHING;

  DELETE FROM public.user_roles r
  USING auth.users u
  WHERE r.user_id = u.id
    AND r.role = 'admin'
    AND lower(u.email) IS DISTINCT FROM lower(public.primary_admin_email());

  SELECT author_id INTO _author_id FROM public.educator_accounts WHERE user_id = _uid;

  IF _author_id IS NULL THEN
    SELECT coalesce(nullif(trim(name), ''), 'StudyFlow Educator') INTO _name
    FROM public.profiles WHERE id = _uid;

    INSERT INTO public.material_authors(name, affiliation, biography, expertise)
    VALUES (
      coalesce(_name, 'StudyFlow Educator'),
      'StudyFlow AI',
      'Platform administrator and demo educator account used to publish and review study materials.',
      ARRAY['Artificial Intelligence', 'Machine Learning']
    )
    RETURNING id INTO _author_id;

    INSERT INTO public.educator_accounts(user_id, author_id, linked_by)
    VALUES (_uid, _author_id, _uid)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN true;
END;
$function$;