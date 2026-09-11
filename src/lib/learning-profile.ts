import { supabase } from '@/integrations/supabase/client'

export type LearningPreferences = { firstSubjectId?: string; topic?: string; goal?: string }

export async function getLearningSignals(userId: string) {
  const [profile, enrollments, searches] = await Promise.all([
    supabase.from('profiles').select('preferences').eq('id', userId).single(),
    supabase.from('enrollments').select('subject_id').eq('user_id', userId),
    supabase.from('search_logs').select('query').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
  ])
  const preferences = (profile.data?.preferences ?? {}) as LearningPreferences
  return {
    preferences,
    enrolled: (enrollments.data ?? []).map((row) => row.subject_id),
    profileText: [preferences.topic, preferences.goal, ...(searches.data ?? []).map((row) => row.query)].filter(Boolean).join(' '),
  }
}