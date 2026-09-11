ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS file_path text,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS file_mime_type text,
  ADD COLUMN IF NOT EXISTS file_size_bytes bigint;

ALTER TABLE public.materials
  ADD CONSTRAINT materials_source_required CHECK (char_length(btrim(url)) > 0 OR file_path IS NOT NULL),
  ADD CONSTRAINT materials_file_size_valid CHECK (file_size_bytes IS NULL OR (file_size_bytes > 0 AND file_size_bytes <= 15728640));

CREATE INDEX IF NOT EXISTS materials_file_path_idx ON public.materials(file_path) WHERE file_path IS NOT NULL;

CREATE POLICY "material files upload own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'study-materials'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "material files read permitted"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'study-materials'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.materials m
      WHERE m.file_path = name AND m.approval_status = 'approved'
    )
  )
);

CREATE POLICY "material files delete own pending or admin"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'study-materials'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR (
      (storage.foldername(name))[1] = auth.uid()::text
      AND NOT EXISTS (
        SELECT 1 FROM public.materials m
        WHERE m.file_path = name AND m.approval_status = 'approved'
      )
    )
  )
);