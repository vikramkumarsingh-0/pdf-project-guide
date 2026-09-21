import { createServerFn } from '@tanstack/react-start'
import { createOpenAI } from '@ai-sdk/openai'
import { Output, streamText } from 'ai'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const packSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(3, 'Give the pack a title').max(160),
  description: z.string().trim().max(1200).default(''),
  subjectId: z.string().uuid().nullable().optional(),
  topics: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  notes: z.string().trim().max(40000).default(''),
  kind: z.enum(['personal', 'course']).default('personal'),
  status: z.enum(['draft', 'published']).default('draft'),
})
const packIdSchema = z.object({ packId: z.string().uuid() })
const cardsSchema = z.object({
  packId: z.string().uuid(),
  cards: z.array(z.object({ question: z.string().trim().min(3).max(600), answer: z.string().trim().min(1).max(1200) })).max(60),
})
const progressSchema = z.object({ packId: z.string().uuid(), cardId: z.string().uuid(), known: z.boolean() })
const assignSchema = z.object({ packId: z.string().uuid(), email: z.string().email() })
const unassignSchema = z.object({ packId: z.string().uuid(), studentId: z.string().uuid() })
const generateSchema = z.object({ packId: z.string().uuid(), count: z.number().int().min(3).max(15).default(8) })

export type StudyPackSummary = {
  id: string
  title: string
  description: string
  topics: string[]
  kind: 'personal' | 'course'
  status: 'draft' | 'published'
  subject: string
  owner: boolean
  cards: number
  known: number
  updated_at: string
}

const flashcardSchema = z.object({
  cards: z.array(z.object({ question: z.string(), answer: z.string() })),
})

export const listStudyPacks = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ packs: StudyPackSummary[] }> => {
    const { data, error } = await context.supabase
      .from('study_packs')
      .select('id,title,description,topics,kind,status,owner_id,updated_at,subjects(name),study_pack_cards(id)')
      .order('updated_at', { ascending: false })
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as any[]
    const { data: progress } = await context.supabase
      .from('study_pack_card_progress')
      .select('pack_id,known')
      .eq('user_id', context.userId)
    const knownByPack = new Map<string, number>()
    for (const row of (progress ?? []) as { pack_id: string; known: boolean }[]) {
      if (row.known) knownByPack.set(row.pack_id, (knownByPack.get(row.pack_id) ?? 0) + 1)
    }
    return {
      packs: rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        topics: row.topics ?? [],
        kind: row.kind,
        status: row.status,
        subject: row.subjects?.name ?? '',
        owner: row.owner_id === context.userId,
        cards: (row.study_pack_cards ?? []).length,
        known: knownByPack.get(row.id) ?? 0,
        updated_at: row.updated_at,
      })),
    }
  })

export const getStudyPack = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => packIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: pack, error } = await context.supabase
      .from('study_packs')
      .select('*,subjects(name)')
      .eq('id', data.packId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!pack) throw new Error('This study pack is not available to you')
    const owner = pack.owner_id === context.userId

    const [cardsResult, progressResult] = await Promise.all([
      context.supabase.from('study_pack_cards').select('*').eq('pack_id', data.packId).order('position'),
      context.supabase.from('study_pack_card_progress').select('card_id,known').eq('pack_id', data.packId).eq('user_id', context.userId),
    ])
    if (cardsResult.error) throw new Error(cardsResult.error.message)
    const mine = new Map((progressResult.data ?? []).map((row) => [row.card_id, row.known]))

    let learners: { studentId: string; name: string; known: number; total: number; assignedAt: string }[] = []
    if (owner) {
      const [assignments, allProgress] = await Promise.all([
        context.supabase.from('study_pack_assignments').select('student_id,assigned_at,profiles:student_id(name,email)').eq('pack_id', data.packId),
        context.supabase.from('study_pack_card_progress').select('user_id,known').eq('pack_id', data.packId),
      ])
      const totals = new Map<string, number>()
      for (const row of (allProgress.data ?? []) as { user_id: string; known: boolean }[]) {
        if (row.known) totals.set(row.user_id, (totals.get(row.user_id) ?? 0) + 1)
      }
      learners = ((assignments.data ?? []) as any[]).map((row) => ({
        studentId: row.student_id,
        name: row.profiles?.name || row.profiles?.email || 'Student',
        known: totals.get(row.student_id) ?? 0,
        total: (cardsResult.data ?? []).length,
        assignedAt: row.assigned_at,
      }))
    }

    return {
      pack: { ...pack, subject: (pack as any).subjects?.name ?? '' },
      owner,
      cards: (cardsResult.data ?? []).map((card) => ({ ...card, known: mine.get(card.id) ?? false })),
      learners,
    }
  })

export const saveStudyPack = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => packSchema.parse(input))
  .handler(async ({ data, context }) => {
    const payload = {
      title: data.title,
      description: data.description,
      subject_id: data.subjectId || null,
      topics: data.topics,
      notes: data.notes,
      kind: data.kind,
      status: data.status,
      updated_at: new Date().toISOString(),
    }
    if (data.id) {
      const { error } = await context.supabase.from('study_packs').update(payload).eq('id', data.id)
      if (error) throw new Error(error.message)
      return { id: data.id }
    }
    const { data: row, error } = await context.supabase
      .from('study_packs')
      .insert({ ...payload, owner_id: context.userId })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    return { id: row.id }
  })

export const deleteStudyPack = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => packIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from('study_packs').delete().eq('id', data.packId)
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const saveStudyPackCards = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => cardsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error: clearError } = await context.supabase.from('study_pack_cards').delete().eq('pack_id', data.packId)
    if (clearError) throw new Error(clearError.message)
    if (data.cards.length) {
      const { error } = await context.supabase
        .from('study_pack_cards')
        .insert(data.cards.map((card, index) => ({ pack_id: data.packId, question: card.question, answer: card.answer, position: index })))
      if (error) throw new Error(error.message)
    }
    return { ok: true }
  })

export const setCardProgress = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => progressSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from('study_pack_card_progress')
      .upsert(
        { pack_id: data.packId, card_id: data.cardId, user_id: context.userId, known: data.known, updated_at: new Date().toISOString() },
        { onConflict: 'card_id,user_id' },
      )
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const assignStudyPack = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => assignSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data: profile } = await supabaseAdmin.from('profiles').select('id').eq('email', data.email.toLowerCase()).maybeSingle()
    if (!profile) throw new Error('No student account matches that email')
    const { error } = await context.supabase
      .from('study_pack_assignments')
      .insert({ pack_id: data.packId, student_id: profile.id, assigned_by: context.userId })
    if (error && error.code !== '23505') throw new Error(error.message)
    return { ok: true }
  })

export const unassignStudyPack = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => unassignSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from('study_pack_assignments')
      .delete()
      .eq('pack_id', data.packId)
      .eq('student_id', data.studentId)
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const generateStudyPackCards = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => generateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env['LOVABLE_API_KEY']
    if (!apiKey) throw new Error('AI is not configured for this app yet.')
    const { data: pack, error } = await context.supabase
      .from('study_packs')
      .select('id,title,topics,notes,owner_id')
      .eq('id', data.packId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!pack || pack.owner_id !== context.userId) throw new Error('You can only generate cards for your own pack')
    if (!pack.notes && !(pack.topics ?? []).length) throw new Error('Add notes or topics before generating flashcards')

    const lovable = createOpenAI({
      baseURL: 'https://ai.gateway.lovable.dev/v1',
      apiKey,
      headers: { 'Lovable-API-Key': apiKey, 'X-Lovable-AIG-SDK': 'vercel-ai-sdk' },
    })
    const result = streamText({
      model: lovable.responses('openai/gpt-6-astra'),
      output: Output.object({ schema: flashcardSchema }),
      system: `You create study flashcards. Produce exactly ${data.count} cards. Each question is short and specific; each answer is one to three sentences. Ground every card in the provided notes and topics.`,
      prompt: `Pack title: ${pack.title}\nTopics: ${(pack.topics ?? []).join(', ') || 'not specified'}\n\nNotes:\n"""\n${(pack.notes ?? '').slice(0, 20000)}\n"""`,
      providerOptions: {
        openai: { forceReasoning: true, reasoningEffort: 'low', reasoningSummary: 'auto', store: false, include: ['reasoning.encrypted_content'] },
      },
    })

    let output: z.infer<typeof flashcardSchema>
    try {
      output = await result.output
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'AI request failed'
      if (message.includes('402')) throw new Error('The workspace is out of AI credits. Add credits and try again.')
      if (message.includes('429')) throw new Error('The AI service is busy right now. Please try again in a moment.')
      throw new Error(message)
    }

    const { data: existing } = await context.supabase.from('study_pack_cards').select('id').eq('pack_id', data.packId)
    const offset = (existing ?? []).length
    const cards = output.cards.slice(0, data.count)
    if (cards.length) {
      const { error: insertError } = await context.supabase
        .from('study_pack_cards')
        .insert(cards.map((card, index) => ({ pack_id: data.packId, question: card.question, answer: card.answer, position: offset + index })))
      if (insertError) throw new Error(insertError.message)
    }
    return { added: cards.length }
  })
