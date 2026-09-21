import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { BookOpen, Layers, Loader2, Plus, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { listStudyPacks, saveStudyPack, type StudyPackSummary } from '@/lib/study-packs.functions'
import type { Subject } from '@/lib/catalog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export const Route = createFileRoute('/_authenticated/study-packs/')({
  head: () => ({ meta: [
    { title: 'Study packs | StudyFlow AI' },
    { name: 'description', content: 'Upload your notes, set topics, build flashcards and track how much of each study pack you know.' },
    { property: 'og:title', content: 'Study packs | StudyFlow AI' },
    { property: 'og:description', content: 'Your notes, topics, flashcards and progress in one place.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: StudyPacks,
})

const blank = { title: '', description: '', subjectId: '', topics: '', notes: '' }

function StudyPacks() {
  const list = useServerFn(listStudyPacks)
  const save = useServerFn(saveStudyPack)
  const [packs, setPacks] = useState<StudyPackSummary[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [form, setForm] = useState(blank)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  async function load() {
    const [result, catalog] = await Promise.all([list(), supabase.from('subjects').select('*').order('name')])
    setPacks(result.packs)
    setSubjects((catalog.data ?? []) as Subject[])
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 400_000) { toast.error('Please upload a text file under 400 KB'); return }
    const text = await file.text()
    setForm((current) => ({ ...current, notes: text.slice(0, 40000), title: current.title || file.name.replace(/\.[^.]+$/, '') }))
    toast.success('Notes loaded')
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
        kind: 'personal',
        status: 'draft',
      } })
      setForm(blank)
      await load()
      toast.success('Study pack created')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create the study pack')
    } finally { setBusy(false) }
  }

  return (
    <div className="page-wrap">
      <div className="page-title">
        <p className="eyebrow"><Layers /> Study packs</p>
        <h1>Your notes, topics and flashcards in one place</h1>
        <p>Upload notes, set the topics you need to master, build flashcards, and watch your progress grow. The AI tutor is built into every pack.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section>
          {loading ? <div className="skeleton-block" /> : packs.length === 0 ? (
            <div className="empty-state"><BookOpen /><h2>No study packs yet</h2><p>Create your first pack with the form beside this.</p></div>
          ) : (
            <div className="resource-list">
              {packs.map((pack) => {
                const percent = pack.cards ? Math.round((pack.known / pack.cards) * 100) : 0
                return (
                  <Link key={pack.id} to="/study-packs/$id" params={{ id: pack.id }} className="viewed-row">
                    <div>
                      <h3>{pack.title}</h3>
                      <p>{[pack.subject, pack.kind === 'course' ? 'Course pack' : 'Personal pack', `${pack.cards} flashcards`].filter(Boolean).join(' · ')}</p>
                      {pack.topics.length > 0 && <div className="expertise-chips">{pack.topics.slice(0, 6).map((topic) => <span key={topic}>{topic}</span>)}</div>}
                      <div className="mt-2 h-2 w-full max-w-64 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                    <span className="view-count">{percent}% known</span>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        <form className="submission-form" onSubmit={create}>
          <h2 className="text-lg font-semibold">New study pack</h2>
          <div><Label htmlFor="pack-title">Title</Label><Input id="pack-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></div>
          <div><Label htmlFor="pack-subject">Subject</Label>
            <select id="pack-subject" value={form.subjectId} onChange={(event) => setForm({ ...form, subjectId: event.target.value })}>
              <option value="">No subject</option>
              {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
          </div>
          <div><Label htmlFor="pack-topics">Topics (comma separated)</Label><Input id="pack-topics" value={form.topics} placeholder="gradient descent, overfitting" onChange={(event) => setForm({ ...form, topics: event.target.value })} /></div>
          <div><Label htmlFor="pack-description">What is this pack for?</Label><Textarea id="pack-description" rows={2} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div>
          <div><Label htmlFor="pack-notes">Notes</Label>
            <Textarea id="pack-notes" rows={6} value={form.notes} placeholder="Paste your lecture notes or chapter text here." onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <Upload className="size-4" /> Upload a .txt or .md file
              <input type="file" accept=".txt,.md,.csv,text/plain,text/markdown" className="sr-only" onChange={onFile} />
            </label>
          </div>
          <Button disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Plus />}Create pack</Button>
        </form>
      </div>
    </div>
  )
}
