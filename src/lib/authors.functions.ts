import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

export const authorSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(160),
  affiliation: z.string().trim().max(200).default(''),
  biography: z.string().trim().max(1200).default(''),
  expertise: z.array(z.string().trim().min(1).max(60)).max(12).default([]),
  websiteUrl: z.string().url().or(z.literal('')).default(''),
  imageUrl: z.string().url().or(z.literal('')).default(''),
})

async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' })
  if (error || !data) throw new Error('Forbidden')
}

export const saveAuthor = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => authorSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context)
    const payload = { name: data.name, affiliation: data.affiliation, biography: data.biography, expertise: data.expertise, website_url: data.websiteUrl || null, image_url: data.imageUrl || null }
    const query = data.id
      ? context.supabase.from('material_authors').update(payload).eq('id', data.id)
      : context.supabase.from('material_authors').insert(payload)
    const { error } = await query
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const getAdminMaterialPreview = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ materialId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context)
    const { data: material, error } = await context.supabase.from('materials').select('file_path').eq('id', data.materialId).single()
    if (error) throw new Error(error.message)
    if (!material.file_path) return { signedUrl: null }
    const { data: signed, error: signedError } = await context.supabase.storage.from('study-materials').createSignedUrl(material.file_path, 300)
    if (signedError) throw new Error(signedError.message)
    return { signedUrl: signed.signedUrl }
  })
