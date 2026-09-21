import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { GraduationCap, Loader2, Send, Tags, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { getEducatorPortal, setMaterialTopics, submitEducatorMaterial } from '@/lib/educators.functions'
import { materialSubmissionSchema } from '@/lib/material-schemas'
import type { Subject } from '@/lib/catalog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export const Route = createFileRoute('/_authenticated/educator/materials')({
  head: () => ({ meta: [
    { title: 'Upload course material | StudyFlow AI' },
    { name: 'description', content: 'Teachers upload course material and set the topics students should focus on.' },
    { property: 'og:title', content: 'Upload course material | StudyFlow AI' },
    { property: 'og:description', content: 'Upload teaching resources and set student-facing topics.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: EducatorMaterials,
})

type Material = { id: string; title: string; approval_status: string; type: string; topics: string[] | null; subjects?: { name: string } | null }
const blank = { title: '', description: '', subjectId: '', type: 'Article' as 'PDF' | 'Video' | 'Article', url: '', tags: '', topics: '' }

function EducatorMaterials() {
  const { user } = Route.useRouteContext()
  const getPortal = useServerFn(getEducatorPortal)
  const submit = useServerFn(submitEducatorMaterial)
  const saveTopics = useServerFn(setMaterialTopics)
  const [materials, setMaterials] = useState<Material[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [topicDraft, setTopicDraft] = useState<Record<string, string>>({})
  const [form, setForm] = useState(blank)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    try {
      const [portal, catalog] = await Promise.all([getPortal(), supabase.from('subjects').select('*').order('name')])
      const list = portal.materials as Material[]
      setMaterials(list)
      setSubjects((catalog.data ?? []) as Subject[])
      setTopicDraft(Object.fromEntries(list.map((item) => [item.id, (item.topics ?? []).join(', ')])))
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Educator access required') }
  }
  useEffect(() => { void load() }, [])

  async function upload(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    let filePath: string | null = null
    try {
      if (file) {
        if (!['application/pdf', 'video/mp4', 'video/webm'].includes(file.type) || file.size > 15 * 1024 * 1024) throw new Error('Upload a PDF, MP4 or WebM file up to 15 MB')
        filePath = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`
        const result = await supabase.storage.from('study-materials').upload(filePath, file, { contentType: file.type })
        if (result.error) throw result.error
      }
      const payload = materialSubmissionSchema.parse({
        ...form,
        tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        topics: form.topics.split(',').map((topic) => topic.trim()).filter(Boolean),
        authorId: null,
        filePath,
        fileName: file?.name ?? null,
        fileMimeType: file?.type ?? null,
        fileSizeBytes: file?.size ?? null,
      })
      await submit({ data: payload })
      setForm(blank)
      setFile(null)
      await load()
      toast.success('Course material uploaded and sent for review')
    } catch (caught) {
      if (filePath) await supabase.storage.from('study-materials').remove([filePath])
      toast.error(caught instanceof Error ? caught.message : 'Could not upload the material')
    } finally { setBusy(false) }
  }

  async function updateTopics(materialId: string) {
    try {
      await saveTopics({ data: { materialId, topics: (topicDraft[materialId] ?? '').split(',').map((topic) => topic.trim()).filter(Boolean) } })
      toast.success('Topics updated for students')
      await load()
    } catch (caught) { toast.error(caught instanceof Error ? caught.message : 'Could not save topics') }
  }

  if (error) return <div className="page-wrap narrow"><div className="empty-state"><GraduationCap /><h1>Educator access required</h1><p>{error}</p><Link to="/educator/apply"><Button>Apply for access</Button></Link></div></div>

  return (
    <div className="page-wrap">
      <div className="page-title">
        <p className="eyebrow"><Upload /> Course material</p>
        <h1>Upload material and set student topics</h1>
        <p>Add your own teaching resources and tell students which topics each resource covers.</p>
      </div>

      <div className="educator-columns">
        <section>
          <div className="section-heading"><div><p className="eyebrow"><Send /> New upload</p><h2>Add course material</h2></div></div>
          <form className="submission-form" onSubmit={upload}>
            <div><Label htmlFor="cm-title">Title</Label><Input id="cm-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></div>
            <div><Label htmlFor="cm-description">Description</Label><Textarea id="cm-description" value={form.description} minLength={20} onChange={(event) => setForm({ ...form, description: event.target.value })} required /></div>
            <div className="submission-fields">
              <div><Label htmlFor="cm-subject">Subject</Label>
                <select id="cm-subject" value={form.subjectId} onChange={(event) => setForm({ ...form, subjectId: event.target.value })} required>
                  <option value="">Select subject</option>
                  {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                </select>
              </div>
              <div><Label htmlFor="cm-type">Type</Label>
                <select id="cm-type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as typeof form.type })}><option>PDF</option><option>Video</option><option>Article</option></select>
              </div>
            </div>
            <div><Label htmlFor="cm-url">Resource link</Label><Input id="cm-url" type="url" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} /></div>
            <div><Label htmlFor="cm-topics">Topics for students (comma separated)</Label><Input id="cm-topics" value={form.topics} placeholder="search algorithms, heuristics" onChange={(event) => setForm({ ...form, topics: event.target.value })} /></div>
            <div><Label htmlFor="cm-tags">Tags</Label><Input id="cm-tags" value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} /></div>
            <div className="file-drop"><Upload /><div><Label htmlFor="cm-file">Or upload a file</Label><p>PDF, MP4 or WebM up to 15 MB</p></div><Input id="cm-file" type="file" accept="application/pdf,video/mp4,video/webm" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></div>
            <Button disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Send />}{busy ? 'Uploading…' : 'Upload material'}</Button>
          </form>
        </section>

        <section>
          <div className="section-heading"><div><p className="eyebrow"><Tags /> Topics</p><h2>Your uploaded material</h2></div></div>
          <div className="resource-list">
            {materials.map((item) => (
              <div className="viewed-row" key={item.id}>
                <div className="w-full">
                  <h3>{item.title}</h3>
                  <p>{item.subjects?.name} · {item.type} · {item.approval_status}</p>
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    <Input value={topicDraft[item.id] ?? ''} placeholder="Topics for students" onChange={(event) => setTopicDraft({ ...topicDraft, [item.id]: event.target.value })} />
                    <Button variant="outline" size="sm" onClick={() => void updateTopics(item.id)}>Save topics</Button>
                  </div>
                </div>
              </div>
            ))}
            {materials.length === 0 && <p className="text-sm text-muted-foreground">Nothing uploaded yet.</p>}
          </div>
        </section>
      </div>
    </div>
  )
}
