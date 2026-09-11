CREATE POLICY "Educators view shares of their materials"
ON public.study_group_resources
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.materials m
    WHERE m.id = study_group_resources.material_id
      AND (
        m.uploaded_by = auth.uid()
        OR (m.author_id IS NOT NULL AND public.has_educator_author(auth.uid(), m.author_id))
      )
  )
);