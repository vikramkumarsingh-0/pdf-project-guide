import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { materialReviewSchema, materialSubmissionSchema } from './material-schemas'

async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' })
  if (error || !data) throw new Error('Forbidden')
}

export const submitMaterial = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => materialSubmissionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from('materials').insert({
      title: data.title,
      description: data.description,
      subject_id: data.subjectId,
      type: data.type,
      url: data.url,
      tags: data.tags,
      uploaded_by: context.userId,
      approval_status: 'pending',
      file_path: data.filePath ?? null,
      file_name: data.fileName ?? null,
      file_mime_type: data.fileMimeType ?? null,
      file_size_bytes: data.fileSizeBytes ?? null,
    }).select('id').single()
    if (error) throw new Error(error.message)
    return { id: row.id }
  })

export const reviewMaterial = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => materialReviewSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context)
    const { error } = await context.supabase.from('materials').update({
      approval_status: data.decision,
      reviewed_by: context.userId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: data.decision === 'rejected' ? data.reason : null,
    }).eq('id', data.materialId)
    if (error) throw new Error(error.message)
    return { ok: true }
  })