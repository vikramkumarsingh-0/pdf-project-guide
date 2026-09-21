import { createServerFn } from '@tanstack/react-start'
import { createOpenAI } from '@ai-sdk/openai'
import { Output, streamText } from 'ai'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const tutorInputSchema = z.object({
  title: z.string().trim().min(3, 'Give this study session a short title').max(120),
  question: z.string().trim().min(5, 'Describe what you want explained').max(2000),
  material: z.string().trim().max(20000).optional().default(''),
  level: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
})

const tutorOutputSchema = z.object({
  explanation: z.string(),
  keyPoints: z.array(z.string()),
  practice: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()),
      answer: z.string(),
      why: z.string(),
    }),
  ),
})

export type TutorResult = z.infer<typeof tutorOutputSchema> & { id: string; title: string }

export const generateTutorSession = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => tutorInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<TutorResult> => {
    const apiKey = process.env['LOVABLE_API_KEY']
    if (!apiKey) throw new Error('AI is not configured for this app yet.')

    const lovable = createOpenAI({
      baseURL: 'https://ai.gateway.lovable.dev/v1',
      apiKey,
      headers: { 'Lovable-API-Key': apiKey, 'X-Lovable-AIG-SDK': 'vercel-ai-sdk' },
    })

    const source = data.material
      ? `Course material provided by the student:\n"""\n${data.material.slice(0, 20000)}\n"""`
      : 'The student did not upload course material; rely on well-established knowledge.'

    const result = streamText({
      model: lovable.responses('openai/gpt-6-astra'),
      output: Output.object({ schema: tutorOutputSchema }),
      system:
        'You are StudyFlow AI, a patient study tutor. Write a clear, personalized explanation at the requested level, ' +
        'then 4 multiple-choice practice questions with exactly 4 options each, the correct option repeated verbatim in "answer", ' +
        'and a one-sentence "why". Ground everything in the provided material when it exists. Keep the explanation under 400 words.',
      prompt: `Student level: ${data.level}\nStudy request: ${data.question}\n\n${source}`,
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: 'low',
          reasoningSummary: 'auto',
          store: false,
          include: ['reasoning.encrypted_content'],
        },
      },
    })

    let output: z.infer<typeof tutorOutputSchema>
    try {
      output = await result.output
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI request failed'
      if (message.includes('402')) throw new Error('The workspace is out of AI credits. Add credits and try again.')
      if (message.includes('429')) throw new Error('The AI service is busy right now. Please try again in a moment.')
      throw new Error(message)
    }

    const { data: row, error } = await context.supabase
      .from('ai_tutor_sessions')
      .insert({
        user_id: context.userId,
        title: data.title,
        question: data.question,
        source_excerpt: data.material ? data.material.slice(0, 4000) : null,
        explanation: output.explanation,
        key_points: output.keyPoints,
        practice: output.practice,
      })
      .select('id')
      .single()
    if (error) throw new Error(error.message)

    return { id: row.id, title: data.title, ...output }
  })
