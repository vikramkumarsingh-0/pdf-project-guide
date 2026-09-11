import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

export const getMyActivityStats = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [subjects, searches, ratings, views] = await Promise.all([
      context.supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('user_id', context.userId),
      context.supabase.from('search_logs').select('*', { count: 'exact', head: true }).eq('user_id', context.userId),
      context.supabase.from('ratings').select('*', { count: 'exact', head: true }).eq('user_id', context.userId),
      context.supabase.from('material_views').select('*', { count: 'exact', head: true }).eq('user_id', context.userId),
    ])
    return { subjects: subjects.count ?? 0, searches: searches.count ?? 0, ratings: ratings.count ?? 0, views: views.count ?? 0 }
  })

export const logSearch = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ query: z.string().trim().min(2).max(200), resultCount: z.number().int().min(0), subjectId: z.string().uuid().nullable() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from('search_logs').insert({ user_id: context.userId, query: data.query, result_count: data.resultCount, subject_id: data.subjectId })
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const saveRecommendations = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ items: z.array(z.object({ materialId: z.string().uuid(), score: z.number().min(0).max(1), reason: z.string().min(2).max(300) })).max(10) }).parse(input))
  .handler(async ({ data, context }) => {
    const { error: clearError } = await context.supabase.from('recommendations').delete().eq('user_id', context.userId)
    if (clearError) throw new Error(clearError.message)
    if (!data.items.length) return { ok: true }
    const { error } = await context.supabase.from('recommendations').insert(data.items.map((item) => ({ user_id: context.userId, material_id: item.materialId, score: item.score, reason: item.reason })))
    if (error) throw new Error(error.message)
    return { ok: true }
  })