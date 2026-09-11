CREATE TYPE public.material_approval_status AS ENUM ('pending', 'approved', 'rejected');

ALTER TABLE public.materials
  ADD COLUMN approval_status public.material_approval_status NOT NULL DEFAULT 'pending',
  ADD COLUMN submitted_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN reviewed_at timestamptz,
  ADD COLUMN reviewed_by uuid,
  ADD COLUMN rejection_reason text;

UPDATE public.materials
SET approval_status = 'approved',
    reviewed_at = COALESCE(updated_at, created_at)
WHERE approval_status = 'pending';

CREATE INDEX materials_approval_status_idx ON public.materials(approval_status, submitted_at DESC);
CREATE INDEX materials_uploaded_by_idx ON public.materials(uploaded_by, submitted_at DESC);

DROP POLICY "materials public read" ON public.materials;
DROP POLICY "materials admin write" ON public.materials;

CREATE POLICY "materials approved public read"
ON public.materials
FOR SELECT
TO anon, authenticated
USING (approval_status = 'approved');

CREATE POLICY "materials submitter read own"
ON public.materials
FOR SELECT
TO authenticated
USING (uploaded_by = auth.uid());

CREATE POLICY "materials admin read all"
ON public.materials
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "materials students submit pending"
ON public.materials
FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND approval_status = 'pending'
  AND reviewed_at IS NULL
  AND reviewed_by IS NULL
  AND rejection_reason IS NULL
);

CREATE POLICY "materials admin insert"
ON public.materials
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "materials admin update"
ON public.materials
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "materials admin delete"
ON public.materials
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.validate_material_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
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

CREATE TRIGGER materials_validate_approval
BEFORE INSERT OR UPDATE OF approval_status, rejection_reason
ON public.materials
FOR EACH ROW
EXECUTE FUNCTION public.validate_material_approval();