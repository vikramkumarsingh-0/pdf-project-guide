CREATE TABLE public.study_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 3 AND 120),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 600),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(subject_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_groups TO authenticated;
GRANT ALL ON public.study_groups TO service_role;
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "groups authenticated read" ON public.study_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "groups enrolled create" ON public.study_groups FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.enrollments e WHERE e.user_id = auth.uid() AND e.subject_id = study_groups.subject_id));
CREATE POLICY "groups owner update" ON public.study_groups FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin')) WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "groups owner delete" ON public.study_groups FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX study_groups_subject_idx ON public.study_groups(subject_id);

CREATE TABLE public.study_group_members (
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(group_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.study_group_members TO authenticated;
GRANT ALL ON public.study_group_members TO service_role;
ALTER TABLE public.study_group_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_study_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.study_group_members WHERE group_id = _group_id AND user_id = _user_id)
$$;
REVOKE ALL ON FUNCTION public.is_study_group_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_study_group_member(uuid, uuid) TO authenticated, service_role;

CREATE POLICY "members self or group peers read" ON public.study_group_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_study_group_member(group_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "members enrolled self join" ON public.study_group_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.study_groups g JOIN public.enrollments e ON e.subject_id = g.subject_id AND e.user_id = auth.uid() WHERE g.id = study_group_members.group_id));
CREATE POLICY "members self leave" ON public.study_group_members FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX study_group_members_user_idx ON public.study_group_members(user_id);

CREATE TABLE public.study_group_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  content text NOT NULL CHECK (char_length(btrim(content)) BETWEEN 2 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_group_notes TO authenticated;
GRANT ALL ON public.study_group_notes TO service_role;
ALTER TABLE public.study_group_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "group members read notes" ON public.study_group_notes FOR SELECT TO authenticated USING (public.is_study_group_member(group_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "group members add notes" ON public.study_group_notes FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid() AND public.is_study_group_member(group_id, auth.uid()));
CREATE POLICY "note authors update" ON public.study_group_notes FOR UPDATE TO authenticated USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) WITH CHECK (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "note authors delete" ON public.study_group_notes FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX study_group_notes_group_time_idx ON public.study_group_notes(group_id, created_at DESC);

CREATE TYPE public.feedback_type AS ENUM ('question', 'comment');
CREATE TYPE public.feedback_status AS ENUM ('open', 'resolved');
CREATE TABLE public.material_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  type public.feedback_type NOT NULL,
  message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 5 AND 1000),
  status public.feedback_status NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.material_feedback TO authenticated;
GRANT ALL ON public.material_feedback TO service_role;
ALTER TABLE public.material_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feedback self or admin read" ON public.material_feedback FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "feedback approved material insert" ON public.material_feedback FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'open' AND EXISTS (SELECT 1 FROM public.materials m WHERE m.id = material_feedback.material_id AND m.approval_status = 'approved'));
CREATE POLICY "feedback admin update" ON public.material_feedback FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX material_feedback_material_time_idx ON public.material_feedback(material_id, created_at DESC);
CREATE INDEX material_feedback_status_time_idx ON public.material_feedback(status, created_at DESC);

CREATE OR REPLACE FUNCTION public.get_study_group_progress(_group_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_study_group_member(_group_id, auth.uid()) AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT jsonb_build_object(
    'memberCount', (SELECT count(*) FROM public.study_group_members gm WHERE gm.group_id = _group_id),
    'noteCount', (SELECT count(*) FROM public.study_group_notes gn WHERE gn.group_id = _group_id),
    'viewCount', (SELECT count(*) FROM public.material_views mv JOIN public.study_group_members gm ON gm.user_id = mv.user_id JOIN public.study_groups g ON g.id = gm.group_id JOIN public.materials m ON m.id = mv.material_id WHERE gm.group_id = _group_id AND m.subject_id = g.subject_id),
    'ratingCount', (SELECT count(*) FROM public.ratings r JOIN public.study_group_members gm ON gm.user_id = r.user_id JOIN public.study_groups g ON g.id = gm.group_id JOIN public.materials m ON m.id = r.material_id WHERE gm.group_id = _group_id AND m.subject_id = g.subject_id)
  ) INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_study_group_progress(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_study_group_progress(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.touch_collaboration_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER study_groups_touch_updated_at BEFORE UPDATE ON public.study_groups FOR EACH ROW EXECUTE FUNCTION public.touch_collaboration_updated_at();
CREATE TRIGGER study_group_notes_touch_updated_at BEFORE UPDATE ON public.study_group_notes FOR EACH ROW EXECUTE FUNCTION public.touch_collaboration_updated_at();
CREATE TRIGGER material_feedback_touch_updated_at BEFORE UPDATE ON public.material_feedback FOR EACH ROW EXECUTE FUNCTION public.touch_collaboration_updated_at();