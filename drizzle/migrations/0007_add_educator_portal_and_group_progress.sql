CREATE TYPE public.educator_access_status AS ENUM ('pending','approved','rejected','invited');

CREATE TABLE public.educator_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  author_id uuid REFERENCES public.material_authors(id) ON DELETE SET NULL,
  requested_name text NOT NULL CHECK (char_length(btrim(requested_name)) BETWEEN 2 AND 160),
  affiliation text NOT NULL DEFAULT '' CHECK (char_length(affiliation) <= 200),
  expertise text[] NOT NULL DEFAULT '{}',
  website_url text,
  statement text NOT NULL DEFAULT '' CHECK (char_length(statement) <= 1200),
  status public.educator_access_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT educator_access_website_url CHECK (website_url IS NULL OR website_url ~ '^https?://')
);
GRANT SELECT, INSERT, UPDATE ON public.educator_access_requests TO authenticated;
GRANT ALL ON public.educator_access_requests TO service_role;
ALTER TABLE public.educator_access_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "educator requests self or admin read" ON public.educator_access_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "educator requests self apply" ON public.educator_access_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL AND author_id IS NULL);
CREATE POLICY "educator requests admin update" ON public.educator_access_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX educator_access_status_time_idx ON public.educator_access_requests(status, created_at DESC);

CREATE TABLE public.educator_accounts (
  user_id uuid PRIMARY KEY,
  author_id uuid NOT NULL UNIQUE REFERENCES public.material_authors(id) ON DELETE RESTRICT,
  linked_by uuid NOT NULL,
  linked_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.educator_accounts TO authenticated;
GRANT ALL ON public.educator_accounts TO service_role;
ALTER TABLE public.educator_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "educator accounts self or admin read" ON public.educator_accounts FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "educator accounts admin write" ON public.educator_accounts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX educator_accounts_author_idx ON public.educator_accounts(author_id);

CREATE OR REPLACE FUNCTION public.has_educator_author(_user_id uuid, _author_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.educator_accounts WHERE user_id = _user_id AND author_id = _author_id)
$$;
REVOKE ALL ON FUNCTION public.has_educator_author(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_educator_author(uuid, uuid) TO authenticated, service_role;

CREATE POLICY "educators update own author" ON public.material_authors FOR UPDATE TO authenticated USING (public.has_educator_author(auth.uid(), id)) WITH CHECK (public.has_educator_author(auth.uid(), id));

CREATE TABLE public.study_group_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  shared_by uuid NOT NULL,
  shared_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, material_id)
);
GRANT SELECT, INSERT, DELETE ON public.study_group_resources TO authenticated;
GRANT ALL ON public.study_group_resources TO service_role;
ALTER TABLE public.study_group_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "group members read resources" ON public.study_group_resources FOR SELECT TO authenticated USING (public.is_study_group_member(group_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "group members share approved resources" ON public.study_group_resources FOR INSERT TO authenticated WITH CHECK (shared_by = auth.uid() AND public.is_study_group_member(group_id, auth.uid()) AND EXISTS (SELECT 1 FROM public.materials m WHERE m.id = study_group_resources.material_id AND m.approval_status = 'approved'));
CREATE POLICY "resource sharer owner admin delete" ON public.study_group_resources FOR DELETE TO authenticated USING (shared_by = auth.uid() OR EXISTS (SELECT 1 FROM public.study_groups g WHERE g.id = study_group_resources.group_id AND g.created_by = auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX study_group_resources_group_time_idx ON public.study_group_resources(group_id, shared_at DESC);

CREATE TABLE public.study_group_note_completions (
  note_id uuid NOT NULL REFERENCES public.study_group_notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(note_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.study_group_note_completions TO authenticated;
GRANT ALL ON public.study_group_note_completions TO service_role;
ALTER TABLE public.study_group_note_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "completion self owner admin read" ON public.study_group_note_completions FOR SELECT TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.study_group_notes n JOIN public.study_groups g ON g.id = n.group_id WHERE n.id = study_group_note_completions.note_id AND g.created_by = auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "members complete notes" ON public.study_group_note_completions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.study_group_notes n WHERE n.id = study_group_note_completions.note_id AND public.is_study_group_member(n.group_id, auth.uid())));
CREATE POLICY "members undo own completion" ON public.study_group_note_completions FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX study_group_note_completions_user_idx ON public.study_group_note_completions(user_id, completed_at DESC);

CREATE OR REPLACE FUNCTION public.get_study_group_progress(_group_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.is_study_group_member(_group_id, auth.uid()) AND NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT jsonb_build_object(
    'memberCount', (SELECT count(*) FROM public.study_group_members gm WHERE gm.group_id = _group_id),
    'noteCount', (SELECT count(*) FROM public.study_group_notes gn WHERE gn.group_id = _group_id),
    'completedNoteCount', (SELECT count(*) FROM public.study_group_note_completions c JOIN public.study_group_notes n ON n.id = c.note_id WHERE n.group_id = _group_id),
    'resourceCount', (SELECT count(*) FROM public.study_group_resources gr WHERE gr.group_id = _group_id),
    'viewCount', (SELECT count(*) FROM public.material_views mv JOIN public.study_group_members gm ON gm.user_id = mv.user_id JOIN public.study_groups g ON g.id = gm.group_id JOIN public.materials m ON m.id = mv.material_id WHERE gm.group_id = _group_id AND m.subject_id = g.subject_id),
    'ratingCount', (SELECT count(*) FROM public.ratings r JOIN public.study_group_members gm ON gm.user_id = r.user_id JOIN public.study_groups g ON g.id = gm.group_id JOIN public.materials m ON m.id = r.material_id WHERE gm.group_id = _group_id AND m.subject_id = g.subject_id)
  ) INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_study_group_progress(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_study_group_progress(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_study_group_member_activity(_group_id uuid)
RETURNS TABLE(user_id uuid, member_name text, notes_shared bigint, notes_completed bigint, resources_shared bigint, subject_views bigint, subject_ratings bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.study_groups g WHERE g.id = _group_id AND g.created_by = auth.uid()) AND NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY SELECT gm.user_id, p.name,
    (SELECT count(*) FROM public.study_group_notes n WHERE n.group_id = _group_id AND n.author_id = gm.user_id),
    (SELECT count(*) FROM public.study_group_note_completions c JOIN public.study_group_notes n ON n.id = c.note_id WHERE n.group_id = _group_id AND c.user_id = gm.user_id),
    (SELECT count(*) FROM public.study_group_resources r WHERE r.group_id = _group_id AND r.shared_by = gm.user_id),
    (SELECT count(*) FROM public.material_views v JOIN public.materials m ON m.id = v.material_id JOIN public.study_groups g ON g.id = _group_id WHERE v.user_id = gm.user_id AND m.subject_id = g.subject_id),
    (SELECT count(*) FROM public.ratings r JOIN public.materials m ON m.id = r.material_id JOIN public.study_groups g ON g.id = _group_id WHERE r.user_id = gm.user_id AND m.subject_id = g.subject_id)
  FROM public.study_group_members gm JOIN public.profiles p ON p.id = gm.user_id WHERE gm.group_id = _group_id ORDER BY p.name;
END;
$$;
REVOKE ALL ON FUNCTION public.get_study_group_member_activity(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_study_group_member_activity(uuid) TO authenticated, service_role;

CREATE TRIGGER educator_access_requests_touch_updated_at BEFORE UPDATE ON public.educator_access_requests FOR EACH ROW EXECUTE FUNCTION public.touch_collaboration_updated_at();