import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const feedbackSchema = z.object({ materialId: z.string().uuid(), type: z.enum(['question', 'comment']), message: z.string().trim().min(5).max(1000) })

async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' })
  if (error || !data) throw new Error('Forbidden')
}

export const submitMaterialFeedback = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => feedbackSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from('material_feedback').insert({ material_id: data.materialId, user_id: context.userId, type: data.type, message: data.message, status: 'open' })
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const listAdminFeedback = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context)
    const { data, error } = await context.supabase.from('material_feedback').select('id,type,message,status,created_at,material_id,materials(title,subjects(name))').order('created_at', { ascending: false }).limit(100)
    if (error) throw new Error(error.message)
    return data ?? []
  })

export const resolveMaterialFeedback = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ feedbackId: z.string().uuid(), status: z.enum(['open', 'resolved']) }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context)
    const { error } = await context.supabase.from('material_feedback').update({ status: data.status }).eq('id', data.feedbackId)
    if (error) throw new Error(error.message)
    return { ok: true }
  })