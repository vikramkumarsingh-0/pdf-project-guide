import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { CheckCircle2, Clock3, Send, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import type { MaterialDoc } from '@/lib/recommendation'
import type { Subject } from '@/lib/catalog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
const initialForm = { title: '', description: '', subject_id: '', type: 'Article' as MaterialType, url: '', tags: '' }

function SubmitMaterial() {
  const { user } = Route.useRouteContext()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [submissions, setSubmissions] = useState<MaterialDoc[]>([])
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)

  async function load() {
    const [subjectResult, submissionResult] = await Promise.all([
      supabase.from('subjects').select('*').order('name'),
      supabase.from('materials').select('*,subjects(name)').eq('uploaded_by', user.id).order('submitted_at', { ascending: false }),
    ])
    setSubjects((subjectResult.data ?? []) as Subject[])
    setSubmissions((submissionResult.data ?? []) as MaterialDoc[])
  }

  useEffect(() => { void load() }, [user.id])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('materials').insert({
      title: form.title.trim(), description: form.description.trim(), subject_id: form.subject_id,
      type: form.type, url: form.url.trim(), tags: form.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      uploaded_by: user.id, approval_status: 'pending',
    })
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Resource submitted for review')
    setForm(initialForm)
    void load()
  }

  return <div className="page-wrap">
    <div className="page-title"><p className="eyebrow"><Send /> Community contribution</p><h1>Submit a study resource</h1><p>An administrator will validate the link and details before it appears in the catalog.</p></div>
    <div className="submission-layout">
      <form className="submission-form" onSubmit={submit}>
        <Input aria-label="Resource title" placeholder="Resource title" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} required minLength={3} maxLength={160} />
        <Textarea aria-label="Description" placeholder="Describe what this resource teaches and who it helps" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} required minLength={20} maxLength={1200} />
        <div className="submission-fields">
          <select aria-label="Subject" required value={form.subject_id} onChange={event => setForm({ ...form, subject_id: event.target.value })}><option value="">Select subject</option>{subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select>
          <select aria-label="Resource type" value={form.type} onChange={event => setForm({ ...form, type: event.target.value as MaterialType })}><option>PDF</option><option>Video</option><option>Article</option></select>
        </div>
        <Input aria-label="Resource URL" type="url" placeholder="https://example.com/resource" value={form.url} onChange={event => setForm({ ...form, url: event.target.value })} required />
        <Input aria-label="Tags" placeholder="Tags, comma separated" value={form.tags} onChange={event => setForm({ ...form, tags: event.target.value })} />
        <Button disabled={saving}><Send />{saving ? 'Submitting…' : 'Submit for review'}</Button>
      </form>
      <section className="submission-history" aria-labelledby="submission-history-title">
        <div className="section-heading"><div><p className="eyebrow">Review status</p><h2 id="submission-history-title">Your submissions</h2></div></div>
        {submissions.length ? submissions.map(item => <article key={item.id}>
          <div className={`status-icon status-${item.approval_status}`} aria-hidden="true">{item.approval_status === 'approved' ? <CheckCircle2 /> : item.approval_status === 'rejected' ? <XCircle /> : <Clock3 />}</div>
          <div><div className="submission-title-row"><h3>{item.title}</h3><span className={`status-badge status-${item.approval_status}`}>{item.approval_status}</span></div><p>{item.subjects?.name} · {item.type}</p>{item.rejection_reason && <p className="rejection-note">Reason: {item.rejection_reason}</p>}</div>
        </article>) : <div className="empty-state compact"><Send /><h2>No submissions yet</h2><p>Your submitted resources will appear here.</p></div>}
      </section>
    </div>
  </div>
}