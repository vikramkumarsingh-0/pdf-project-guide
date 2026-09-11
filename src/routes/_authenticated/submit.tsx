import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { FileClock, Send, Upload } from 'lucide-react'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { useEffect } from 'react'
import type { Subject } from '@/lib/catalog'
import { materialSubmissionSchema } from '@/lib/material-schemas'
import { submitMaterial } from '@/lib/materials.functions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export const Route = createFileRoute('/_authenticated/submit')({
  head: () => ({ meta: [
    { title: 'Submit a resource | StudyFlow AI' },
    { name: 'description', content: 'Submit a learning resource for administrator review.' },
    { property: 'og:title', content: 'Submit a resource | StudyFlow AI' },
    { property: 'og:description', content: 'Share a trusted learning resource with the StudyFlow community.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: SubmitMaterial,
})

type MaterialType = 'PDF' | 'Video' | 'Article'
const initialForm = { title: '', description: '', subjectId: '', type: 'Article' as MaterialType, url: '', tags: '' }

function SubmitMaterial() {
  const { user } = Route.useRouteContext()
  const submitFn = useServerFn(submitMaterial)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [form, setForm] = useState(initialForm)
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  useEffect(() => { void supabase.from('subjects').select('*').order('name').then(({ data }) => setSubjects((data ?? []) as Subject[])) }, [])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    let filePath: string | null = null
    try {
      if (file) {
        if (!['application/pdf', 'video/mp4', 'video/webm'].includes(file.type) || file.size > 15 * 1024 * 1024) throw new Error('Upload a PDF, MP4, or WebM file up to 15 MB')
        filePath = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`
        const upload = await supabase.storage.from('study-materials').upload(filePath, file, { contentType: file.type })
        if (upload.error) throw upload.error
      }
      const payload = materialSubmissionSchema.parse({
        title: form.title,
        description: form.description,
        subjectId: form.subjectId,
        type: form.type,
        url: form.url,
        tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        filePath,
        fileName: file?.name ?? null,
        fileMimeType: file?.type ?? null,
        fileSizeBytes: file?.size ?? null,
      })
      await submitFn({ data: payload })
      toast.success('Resource submitted for review')
      setForm(initialForm)
      setFile(null)
    } catch (error) {
      if (filePath) await supabase.storage.from('study-materials').remove([filePath])
      toast.error(error instanceof Error ? error.message : 'Could not submit this resource')
    } finally { setSaving(false) }
  }

  return <div className="page-wrap narrow">
    <div className="page-title flex-row"><div><p className="eyebrow"><Send /> Community contribution</p><h1>Submit a study resource</h1><p>An administrator validates every resource before it appears in the catalog.</p></div><Link to="/submissions"><Button variant="outline"><FileClock />View history</Button></Link></div>
    <form className="submission-form submission-form-wide" onSubmit={submit}>
      <div><Label htmlFor="resource-title">Title</Label><Input id="resource-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required minLength={3} maxLength={160} /></div>
      <div><Label htmlFor="resource-description">Description</Label><Textarea id="resource-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required minLength={20} maxLength={1200} /></div>
      <div className="submission-fields"><div><Label htmlFor="resource-subject">Subject</Label><select id="resource-subject" required value={form.subjectId} onChange={(event) => setForm({ ...form, subjectId: event.target.value })}><option value="">Select subject</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></div><div><Label htmlFor="resource-type">Type</Label><select id="resource-type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as MaterialType })}><option>PDF</option><option>Video</option><option>Article</option></select></div></div>
      <div><Label htmlFor="resource-tags">Tags</Label><Input id="resource-tags" placeholder="algorithms, recursion, exam prep" value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} /></div>
      <div><Label htmlFor="resource-url">Resource link</Label><Input id="resource-url" type="url" placeholder="https://example.edu/resource" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} /></div>
      <div className="file-drop"><Upload /><div><Label htmlFor="resource-file">Or upload a file</Label><p>PDF, MP4, or WebM up to 15 MB</p></div><Input id="resource-file" type="file" accept="application/pdf,video/mp4,video/webm" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></div>
      <Button size="lg" disabled={saving}><Send />{saving ? 'Submitting…' : 'Submit for review'}</Button>
    </form>
  </div>
}