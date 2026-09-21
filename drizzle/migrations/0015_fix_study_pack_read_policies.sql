DELETE FROM public.study_packs WHERE title = 'probe2';

DROP POLICY IF EXISTS "Read accessible study packs" ON public.study_packs;
CREATE POLICY "Read accessible study packs" ON public.study_packs
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR (status = 'published' AND kind = 'course')
    OR EXISTS (SELECT 1 FROM public.study_pack_assignments a WHERE a.pack_id = study_packs.id AND a.student_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Read cards of accessible packs" ON public.study_pack_cards;
CREATE POLICY "Read cards of accessible packs" ON public.study_pack_cards
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.study_packs p
      WHERE p.id = study_pack_cards.pack_id
        AND (
          p.owner_id = auth.uid()
          OR (p.status = 'published' AND p.kind = 'course')
          OR EXISTS (SELECT 1 FROM public.study_pack_assignments a WHERE a.pack_id = p.id AND a.student_id = auth.uid())
        )
    )
    OR public.has_role(auth.uid(), 'admin')
  );