CREATE TABLE public.ai_tutor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  question text NOT NULL,
  source_excerpt text,
  explanation text NOT NULL,
  key_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  practice jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.ai_tutor_sessions TO authenticated;
GRANT ALL ON public.ai_tutor_sessions TO service_role;

ALTER TABLE public.ai_tutor_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own tutor sessions" ON public.ai_tutor_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own tutor sessions" ON public.ai_tutor_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own tutor sessions" ON public.ai_tutor_sessions
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX ai_tutor_sessions_user_created_idx ON public.ai_tutor_sessions (user_id, created_at DESC);