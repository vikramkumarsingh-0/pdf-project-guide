import { z } from 'zod'

export const materialTypeSchema = z.enum(['PDF', 'Video', 'Article'])

export const materialSubmissionSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(160),
  description: z.string().trim().min(20, 'Description must be at least 20 characters').max(1200),
  subjectId: z.string().uuid('Choose a valid subject'),
  type: materialTypeSchema,
  url: z.string().trim().max(2000).optional().default(''),
  tags: z.array(z.string().trim().min(1).max(40)).max(10),
  filePath: z.string().trim().max(500).nullable().optional(),
  fileName: z.string().trim().max(255).nullable().optional(),
  fileMimeType: z.enum(['application/pdf', 'video/mp4', 'video/webm']).nullable().optional(),
  fileSizeBytes: z.number().int().positive().max(15 * 1024 * 1024).nullable().optional(),
}).superRefine((value, context) => {
  if (!value.url && !value.filePath) context.addIssue({ code: 'custom', path: ['url'], message: 'Add a resource link or upload a file' })
  if (value.url && !z.string().url().safeParse(value.url).success) context.addIssue({ code: 'custom', path: ['url'], message: 'Enter a valid URL' })
})

export const materialReviewSchema = z.object({
  materialId: z.string().uuid(),
  decision: z.enum(['approved', 'rejected']),
  reason: z.string().trim().max(500).optional().default(''),
}).superRefine((value, context) => {
  if (value.decision === 'rejected' && value.reason.length < 5) context.addIssue({ code: 'custom', path: ['reason'], message: 'Add a clear rejection reason' })
})

export const coldStartSchema = z.object({
  subjectId: z.string().uuid('Choose your first subject'),
  topic: z.string().trim().min(2, 'Add a topic').max(100),
  goal: z.string().trim().min(5, 'Tell us what you want to achieve').max(240),
})

export type MaterialSubmissionInput = z.infer<typeof materialSubmissionSchema>