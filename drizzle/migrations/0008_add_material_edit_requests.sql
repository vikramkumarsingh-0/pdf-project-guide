CREATE TYPE public.material_edit_status AS ENUM ('open','applied','declined');

CREATE TABLE public.material_edit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  message text NOT NULL,
  proposed_title text,
  proposed_description text,
  proposed_url text,
  status public.material_edit_status NOT NULL DEFAULT 'open',
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.material_edit_requests TO authenticated;
GRANT ALL ON public.material_edit_requests TO service_role;

ALTER TABLE public.material_edit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Requesters read own edit requests" ON public.material_edit_requests
  FOR SELECT TO authenticated USING (auth.uid() = requested_by OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Educators request edits on their materials" ON public.material_edit_requests
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = requested_by
    AND EXISTS (
      SELECT 1 FROM public.materials m
      WHERE m.id = material_id
        AND (m.uploaded_by = auth.uid() OR public.has_educator_author(auth.uid(), m.author_id))
    )
  );

CREATE POLICY "Admins resolve edit requests" ON public.material_edit_requests
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX material_edit_requests_material_idx ON public.material_edit_requests(material_id);
CREATE INDEX material_edit_requests_status_idx ON public.material_edit_requests(status);

CREATE TRIGGER material_edit_requests_touch_updated_at BEFORE UPDATE ON public.material_edit_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_collaboration_updated_at();