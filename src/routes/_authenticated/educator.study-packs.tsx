import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { CheckCircle2, Layers, Plus, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { listStudyPacks, saveStudyPack, type StudyPackSummary } from '@/lib/study-packs.functions'
import type { Subject } from '@/lib/catalog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export const Route = createFileRoute('/_authenticated/educator/study-packs')({
  head: () => ({ meta: [
    { title: 'Course study packs | StudyFlow AI' },
    { name: 'description', content: 'Teachers create, publish and track course study packs and see which students have them.' },
    { property: 'og:title', content: 'Course study packs | StudyFlow AI' },
    { property: 'og:description', content: 'Create, publish and track study packs for your students.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: EducatorStudyPacks,
})

const blank = { title: '', description: '', subjectId: '', topics: '', notes: '' }

function EducatorStudyPacks() {
  const list = useServerFn(listStudyPacks)
  const save = useServerFn(saveStudyPack)
  const [packs, setPacks] = useState<StudyPackSummary[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [form, setForm] = useState(blank)
  const [busy, setBusy] = useState(false)

  async function load() {
    const [result, catalog] = await Promise.all([list(), supabase.from('subjects').select('*').order('name')])
    setPacks(result.packs.filter((pack) => pack.owner && pack.kind === 'course'))
    setSubjects((catalog.data ?? []) as Subject[])
  }
  useEffect(() => { void load() }, [])

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 400_000) { toast.error('Please upload a text file under 400 KB'); return }
    const text = await file.text()
    setForm((current) => ({ ...current, notes: text.slice(0, 40000), title: current.title || file.name.replace(/\.[^.]+$/, '') }))
  }

  async function create(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      await save({ data: {
        title: form.title,
        description: form.description,
        subjectId: form.subjectId || null,
        topics: form.topics.split(',').map((topic) => topic.trim()).filter(Boolean),
        notes: form.notes,
        kind: 'course',
        status: 'draft',
      } })
      setForm(blank)
      await load()
      toast.success('Course study pack created as a draft')
    } catch (caught) { toast.error(caught instanceof Error ? caught.message : 'Could not create the pack') }
    finally { setBusy(false) }
  }

  return (
    <div className="page-wrap">
      <div className="page-title">
        <p className="eyebrow"><Layers /> Course study packs</p>
        <h1>Create, publish and track study packs</h1>
        <p>Build a pack from your notes, review it as a draft, publish it to students, then track who has it and how far they have got.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section>
          <div className="resource-list">
            {packs.map((pack) => (
              <div className="viewed-row" key={pack.id}>
                <div>
                  <h3>{pack.title}</h3>
                  <p>{[pack.subject, `${pack.cards} flashcards`].filter(Boolean).join(' · ')}</p>
                  {pack.topics.length > 0 && <div className="expertise-chips">{pack.topics.slice(0, 6).map((topic) => <span key={topic}>{topic}</span>)}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`status-badge status-${pack.status === 'published' ? 'approved' : 'pending'}`}>{pack.status === 'published' ? 'published' : 'draft'}</span>
                  <Link to="/study-packs/$id" params={{ id: pack.id }}><Button variant="outline" size="sm">Review &amp; publish</Button></Link>
                </div>
              </div>
            ))}
            {packs.length === 0 && <div className="empty-state"><CheckCircle2 /><h2>No course packs yet</h2><p>Create your first one on the right.</p></div>}
          </div>
        </section>

        <form className="submission-form" onSubmit={create}>
          <h2 className="text-lg font-semibold">New course pack</h2>
          <div><Label htmlFor="cp-title">Title</Label><Input id="cp-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></div>
          <div><Label htmlFor="cp-subject">Subject</Label>
            <select id="cp-subject" value={form.subjectId} onChange={(event) => setForm({ ...form, subjectId: event.target.value })}>
              <option value="">No subject</option>
              {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
          </div>
          <div><Label htmlFor="cp-topics">Topics (comma separated)</Label><Input id="cp-topics" value={form.topics} onChange={(event) => setForm({ ...form, topics: event.target.value })} /></div>
          <div><Label htmlFor="cp-description">Description</Label><Textarea id="cp-description" rows={2} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div>
          <div><Label htmlFor="cp-notes">Course notes</Label>
            <Textarea id="cp-notes" rows={6} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <Upload className="size-4" /> Upload a .txt or .md file
              <input type="file" accept=".txt,.md,.csv,text/plain,text/markdown" className="sr-only" onChange={onFile} />
            </label>
          </div>
          <Button disabled={busy}><Plus />Create draft pack</Button>
        </form>
      </div>
    </div>
  )
}
