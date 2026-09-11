import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const groupSchema = z.object({
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().max(600),
  subjectId: z.string().uuid(),
})
const groupIdSchema = z.object({ groupId: z.string().uuid() })
const noteSchema = z.object({ groupId: z.string().uuid(), content: z.string().trim().min(2).max(2000) })

export const listStudyGroups = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [groupsResult, membershipsResult, enrollmentsResult] = await Promise.all([
      context.supabase.from('study_groups').select('id,name,description,subject_id,created_by,created_at,subjects(name)').order('created_at', { ascending: false }),
      context.supabase.from('study_group_members').select('group_id,user_id,joined_at').eq('user_id', context.userId),
      context.supabase.from('enrollments').select('subject_id,subjects(name)').eq('user_id', context.userId),
    ])
    if (groupsResult.error) throw new Error(groupsResult.error.message)
    if (membershipsResult.error) throw new Error(membershipsResult.error.message)
    const joinedIds = new Set((membershipsResult.data ?? []).map((row) => row.group_id))
    const groups = await Promise.all((groupsResult.data ?? []).map(async (group) => {
      if (!joinedIds.has(group.id)) return { ...group, joined: false, progress: null, notes: [] }
      const [progressResult, notesResult] = await Promise.all([
        context.supabase.rpc('get_study_group_progress', { _group_id: group.id }),
        context.supabase.from('study_group_notes').select('id,group_id,author_id,content,created_at,updated_at').eq('group_id', group.id).order('created_at', { ascending: false }).limit(20),
      ])
      return { ...group, joined: true, progress: progressResult.data, notes: notesResult.data ?? [] }
    }))
    return { groups, enrolledSubjects: enrollmentsResult.data ?? [] }
  })

export const createStudyGroup = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => groupSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: group, error } = await context.supabase.from('study_groups').insert({ name: data.name, description: data.description, subject_id: data.subjectId, created_by: context.userId }).select('id').single()
    if (error) throw new Error(error.message)
    const { error: membershipError } = await context.supabase.from('study_group_members').insert({ group_id: group.id, user_id: context.userId })
    if (membershipError) throw new Error(membershipError.message)
    return { id: group.id }
  })

export const joinStudyGroup = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => groupIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from('study_group_members').upsert({ group_id: data.groupId, user_id: context.userId }, { onConflict: 'group_id,user_id' })
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const leaveStudyGroup = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => groupIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from('study_group_members').delete().eq('group_id', data.groupId).eq('user_id', context.userId)
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const postStudyGroupNote = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => noteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from('study_group_notes').insert({ group_id: data.groupId, author_id: context.userId, content: data.content })
    if (error) throw new Error(error.message)
    return { ok: true }
  })