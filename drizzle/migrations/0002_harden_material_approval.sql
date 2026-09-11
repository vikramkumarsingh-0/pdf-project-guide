CREATE OR REPLACE FUNCTION public.validate_material_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.approval_status := 'pending';
    NEW.submitted_at := now();
    NEW.reviewed_at := NULL;
    NEW.reviewed_by := NULL;
    NEW.rejection_reason := NULL;
    NEW.average_rating := 0;
    NEW.rating_count := 0;
    NEW.view_count := 0;
  END IF;

  IF NEW.approval_status = 'approved' THEN
    NEW.reviewed_at := COALESCE(NEW.reviewed_at, now());
    NEW.rejection_reason := NULL;
  ELSIF NEW.approval_status = 'rejected' THEN
    IF NEW.rejection_reason IS NULL OR char_length(btrim(NEW.rejection_reason)) < 5 THEN
      RAISE EXCEPTION 'A rejection reason of at least 5 characters is required';
    END IF;
    NEW.reviewed_at := COALESCE(NEW.reviewed_at, now());
  ELSE
    NEW.reviewed_at := NULL;
    NEW.reviewed_by := NULL;
    NEW.rejection_reason := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP POLICY "ratings self insert" ON public.ratings;
DROP POLICY "ratings self update" ON public.ratings;

CREATE POLICY "ratings self insert approved materials"
ON public.ratings
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.materials
    WHERE materials.id = ratings.material_id
      AND materials.approval_status = 'approved'
  )
);

CREATE POLICY "ratings self update approved materials"
ON public.ratings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.materials
    WHERE materials.id = ratings.material_id
      AND materials.approval_status = 'approved'
  )
);

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_material_rating() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;