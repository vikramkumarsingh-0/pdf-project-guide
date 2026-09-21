ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS topics text[] NOT NULL DEFAULT '{}'::text[];

CREATE TABLE public.study_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.material_authors(id) ON DELETE SET NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  topics text[] NOT NULL DEFAULT '{}'::text[],
  notes text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'personal' CHECK (kind IN ('personal','course')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  file_path text,
  file_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.study_pack_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id uuid NOT NULL REFERENCES public.study_packs(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.study_pack_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id uuid NOT NULL REFERENCES public.study_packs(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pack_id, student_id)
);

CREATE TABLE public.study_pack_card_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id uuid NOT NULL REFERENCES public.study_packs(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES public.study_pack_cards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  known boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (card_id, user_id)
);

CREATE INDEX study_packs_owner_idx ON public.study_packs (owner_id, created_at DESC);
CREATE INDEX study_pack_cards_pack_idx ON public.study_pack_cards (pack_id, position);
CREATE INDEX study_pack_assignments_student_idx ON public.study_pack_assignments (student_id);
CREATE INDEX study_pack_card_progress_user_idx ON public.study_pack_card_progress (user_id, pack_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_packs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_pack_cards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_pack_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_pack_card_progress TO authenticated;
GRANT ALL ON public.study_packs TO service_role;
GRANT ALL ON public.study_pack_cards TO service_role;
GRANT ALL ON public.study_pack_assignments TO service_role;
GRANT ALL ON public.study_pack_card_progress TO service_role;

CREATE OR REPLACE FUNCTION public.can_access_study_pack(_pack_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.study_packs p
    WHERE p.id = _pack_id
      AND (p.owner_id = _user_id
        OR (p.status = 'published' AND p.kind = 'course')
        OR EXISTS (SELECT 1 FROM public.study_pack_assignments a WHERE a.pack_id = p.id AND a.student_id = _user_id))
  )
$$;

CREATE OR REPLACE FUNCTION public.owns_study_pack(_pack_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.study_packs p WHERE p.id = _pack_id AND p.owner_id = _user_id)
$$;

ALTER TABLE public.study_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_pack_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_pack_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_pack_card_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read accessible study packs" ON public.study_packs
  FOR SELECT TO authenticated USING (public.can_access_study_pack(id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Create own study packs" ON public.study_packs
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Update own study packs" ON public.study_packs
  FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Delete own study packs" ON public.study_packs
  FOR DELETE TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Read accessible pack cards" ON public.study_pack_cards
  FOR SELECT TO authenticated USING (public.can_access_study_pack(pack_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner writes pack cards" ON public.study_pack_cards
  FOR INSERT TO authenticated WITH CHECK (public.owns_study_pack(pack_id, auth.uid()));
CREATE POLICY "Owner updates pack cards" ON public.study_pack_cards
  FOR UPDATE TO authenticated USING (public.owns_study_pack(pack_id, auth.uid())) WITH CHECK (public.owns_study_pack(pack_id, auth.uid()));
CREATE POLICY "Owner deletes pack cards" ON public.study_pack_cards
  FOR DELETE TO authenticated USING (public.owns_study_pack(pack_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Read pack assignments" ON public.study_pack_assignments
  FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.owns_study_pack(pack_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner assigns students" ON public.study_pack_assignments
  FOR INSERT TO authenticated WITH CHECK (public.owns_study_pack(pack_id, auth.uid()) AND assigned_by = auth.uid());
CREATE POLICY "Owner or student removes assignment" ON public.study_pack_assignments
  FOR DELETE TO authenticated USING (public.owns_study_pack(pack_id, auth.uid()) OR student_id = auth.uid());

CREATE POLICY "Read own or owned progress" ON public.study_pack_card_progress
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.owns_study_pack(pack_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Write own progress" ON public.study_pack_card_progress
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.can_access_study_pack(pack_id, auth.uid()));
CREATE POLICY "Update own progress" ON public.study_pack_card_progress
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Delete own progress" ON public.study_pack_card_progress
  FOR DELETE TO authenticated USING (user_id = auth.uid());