CREATE TABLE public.material_authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  affiliation text NOT NULL DEFAULT '',
  biography text NOT NULL DEFAULT '',
  expertise text[] NOT NULL DEFAULT '{}',
  website_url text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT material_authors_name_length CHECK (char_length(btrim(name)) BETWEEN 2 AND 160),
  CONSTRAINT material_authors_website_url CHECK (website_url IS NULL OR website_url ~ '^https?://'),
  CONSTRAINT material_authors_image_url CHECK (image_url IS NULL OR image_url ~ '^https?://')
);

GRANT SELECT ON public.material_authors TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.material_authors TO authenticated;
GRANT ALL ON public.material_authors TO service_role;

ALTER TABLE public.material_authors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authors public read"
ON public.material_authors FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "authors admin write"
ON public.material_authors FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.materials ADD COLUMN author_id uuid;
ALTER TABLE public.materials ADD CONSTRAINT materials_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.material_authors(id) ON DELETE SET NULL;
CREATE INDEX materials_author_id_idx ON public.materials(author_id);
CREATE INDEX material_authors_name_idx ON public.material_authors(name);

CREATE OR REPLACE FUNCTION public.touch_material_author_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER material_authors_touch_updated_at
BEFORE UPDATE ON public.material_authors
FOR EACH ROW EXECUTE FUNCTION public.touch_material_author_updated_at();