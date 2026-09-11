import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { coldStartSchema } from './material-schemas'

export const completeOnboarding = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => coldStartSchema.parse(input))
  .handler(async ({ data, context }) => {
    const preferences = { firstSubjectId: data.subjectId, topic: data.topic, goal: data.goal }
    const { error: profileError } = await context.supabase.from('profiles').update({ preferences, updated_at: new Date().toISOString() }).eq('id', context.userId)
    if (profileError) throw new Error(profileError.message)
    const { error: enrollmentError } = await context.supabase.from('enrollments').upsert({ user_id: context.userId, subject_id: data.subjectId }, { onConflict: 'user_id,subject_id' })
    if (enrollmentError) throw new Error(enrollmentError.message)
    return { ok: true }
  })
