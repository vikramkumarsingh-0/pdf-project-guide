import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { Check, Clock3, ExternalLink, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { AdminGuard } from '@/components/study/admin-guard'
import type { Subject } from '@/lib/catalog'
import type { MaterialDoc } from '@/lib/recommendation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useServerFn } from '@tanstack/react-start'
import { materialSubmissionSchema } from '@/lib/material-schemas'
import { publishMaterial, reviewMaterial } from '@/lib/materials.functions'

export const Route = createFileRoute('/_authenticated/admin/materials')({
  head: () => ({ meta: [
    { title: 'Material approval queue | StudyFlow AI' },
    { name: 'description', content: 'Review submissions and manage StudyFlow learning materials.' },
    { property: 'og:title', content: 'Material approval queue | StudyFlow AI' },
    { property: 'og:description', content: 'Validate and manage learning resources.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Materials,
})

type Status = MaterialDoc['approval_status'] | 'all'
type MaterialForm = { title:string; description:string; subject_id:string; type:'PDF'|'Video'|'Article'; url:string; tags:string }
const blank: MaterialForm = { title:'', description:'', subject_id:'', type:'PDF', url:'https://', tags:'' }

function Materials() {
  const { user } = Route.useRouteContext()
  const [items, setItems] = useState<MaterialDoc[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [form, setForm] = useState<MaterialForm>(blank)
  const [edit, setEdit] = useState<string | null>(null)
  const [filter, setFilter] = useState<Status>('pending')
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const reviewFn = useServerFn(reviewMaterial)
  const publishFn = useServerFn(publishMaterial)

  async function load() {
    const [materials, subjectResult] = await Promise.all([
      supabase.from('materials').select('*,subjects(name)').order('submitted_at', { ascending: false }),
      supabase.from('subjects').select('*').order('name'),
    ])
    if (materials.error) { toast.error(materials.error.message); return }
    setItems((materials.data ?? []) as MaterialDoc[])
    setSubjects((subjectResult.data ?? []) as Subject[])
  }
  useEffect(() => { void load() }, [])

  const counts = useMemo(() => ({
    pending: items.filter(item => item.approval_status === 'pending').length,
    approved: items.filter(item => item.approval_status === 'approved').length,
    rejected: items.filter(item => item.approval_status === 'rejected').length,
  }), [items])
  const visible = filter === 'all' ? items : items.filter(item => item.approval_status === filter)

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setBusy(edit ?? 'publish')
    let filePath: string | null = null
    try {
      if (file) {
        if (!['application/pdf', 'video/mp4', 'video/webm'].includes(file.type) || file.size > 15 * 1024 * 1024) throw new Error('Upload a PDF, MP4, or WebM file up to 15 MB')
        filePath = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`
        const upload = await supabase.storage.from('study-materials').upload(filePath, file, { contentType: file.type })
        if (upload.error) throw upload.error
      }
      if (edit) {
        const payload = { title:form.title.trim(), description:form.description.trim(), subject_id:form.subject_id, type:form.type, url:form.url.trim(), tags:form.tags.split(',').map(tag => tag.trim()).filter(Boolean), ...(file ? { file_path:filePath, file_name:file.name, file_mime_type:file.type, file_size_bytes:file.size } : {}) }
        const result = await supabase.from('materials').update(payload).eq('id', edit)
        if (result.error) throw result.error
      } else {
        const payload = materialSubmissionSchema.parse({ title:form.title, description:form.description, subjectId:form.subject_id, type:form.type, url:form.url === 'https://' ? '' : form.url, tags:form.tags.split(',').map(tag => tag.trim()).filter(Boolean), filePath, fileName:file?.name ?? null, fileMimeType:file?.type ?? null, fileSizeBytes:file?.size ?? null })
        await publishFn({ data: payload })
      }
      toast.success(edit ? 'Material updated' : 'Material published')
      setForm(blank); setEdit(null); setFile(null); void load()
    } catch (error) {
      if (filePath) await supabase.storage.from('study-materials').remove([filePath])
      toast.error(error instanceof Error ? error.message : 'Could not save material')
    } finally { setBusy(null) }
  }

  async function approve(id: string) {
    setBusy(id)
    let error: Error | null = null
    try { await reviewFn({ data: { materialId:id, decision:'approved', reason:'' } }) } catch (caught) { error = caught instanceof Error ? caught : new Error('Approval failed') }
    setBusy(null)
    if (error) { toast.error(error.message); return }
    toast.success('Material approved and published'); void load()
  }

  async function reject(id: string) {
    if (reason.trim().length < 5) { toast.error('Add a clear rejection reason'); return }
    setBusy(id)
    let error: Error | null = null
    try { await reviewFn({ data: { materialId:id, decision:'rejected', reason:reason.trim() } }) } catch (caught) { error = caught instanceof Error ? caught : new Error('Rejection failed') }
    setBusy(null)
    if (error) { toast.error(error.message); return }
    toast.success('Submission rejected'); setRejecting(null); setReason(''); void load()
  }

  async function remove(id:string) {
    const { error } = await supabase.from('materials').delete().eq('id', id)
    if (error) toast.error(error.message); else { toast.success('Material removed'); void load() }
  }

  return <AdminGuard userId={user.id}><div className="page-wrap">
    <div className="page-title flex-row"><div><p className="eyebrow"><Clock3 /> Catalog validation</p><h1>Material approval queue</h1><p>Review submitted resources before they become visible to students.</p></div><span className="queue-count">{counts.pending} awaiting review</span></div>
    <div className="approval-tabs" aria-label="Material status filter">
      {(['pending','approved','rejected','all'] as const).map(status => <Button key={status} variant={filter === status ? 'default' : 'outline'} size="sm" onClick={() => setFilter(status)}>{status === 'all' ? items.length : counts[status]} {status}</Button>)}
    </div>
    <div className="data-list approval-list">
      {visible.map(material => <article key={material.id}>
        <div className="approval-copy"><div className="approval-meta"><span className={`status-badge status-${material.approval_status}`}>{material.approval_status}</span><span>{material.subjects?.name} · {material.type}</span><time>{new Date(material.submitted_at).toLocaleDateString()}</time></div><h2>{material.title}</h2><p>{material.description}</p><a href={material.url} target="_blank" rel="noreferrer" className="text-link">Inspect resource <ExternalLink /></a>{material.rejection_reason && <p className="rejection-note">Reason: {material.rejection_reason}</p>}</div>
        <div className="approval-actions">
          {material.approval_status === 'pending' && <><Button onClick={() => void approve(material.id)} disabled={busy === material.id}><Check />Approve</Button><Button variant="outline" onClick={() => { setRejecting(material.id); setReason('') }}><X />Reject</Button></>}
          <Button variant="ghost" size="icon" aria-label={`Edit ${material.title}`} onClick={() => { setEdit(material.id); setForm({title:material.title,description:material.description,subject_id:material.subject_id,type:material.type,url:material.url,tags:material.tags.join(', ')}) }}><Pencil /></Button>
          <Button variant="ghost" size="icon" aria-label={`Delete ${material.title}`} onClick={() => void remove(material.id)}><Trash2 /></Button>
        </div>
        {rejecting === material.id && <div className="reject-panel"><Textarea aria-label="Rejection reason" placeholder="Explain what needs to be corrected" value={reason} onChange={event => setReason(event.target.value)} minLength={5} /><div><Button variant="ghost" onClick={() => setRejecting(null)}>Cancel</Button><Button variant="destructive" disabled={busy === material.id} onClick={() => void reject(material.id)}>Confirm rejection</Button></div></div>}
      </article>)}
      {!visible.length && <div className="empty-state compact"><Check /><h2>Queue clear</h2><p>No {filter === 'all' ? '' : filter} materials to show.</p></div>}
    </div>
    <section className="admin-publisher"><div className="section-heading"><div><p className="eyebrow">Administrator publishing</p><h2>{edit ? 'Edit material' : 'Add a verified material'}</h2></div>{edit && <Button variant="ghost" onClick={() => { setEdit(null); setForm(blank) }}>Cancel edit</Button>}</div>
      <form onSubmit={save} className="admin-form"><Input aria-label="Material title" placeholder="Material title" value={form.title} onChange={event => setForm({...form,title:event.target.value})} required minLength={3}/><Input aria-label="Material description" placeholder="Description" value={form.description} onChange={event => setForm({...form,description:event.target.value})} required minLength={20}/><select aria-label="Subject" required value={form.subject_id} onChange={event => setForm({...form,subject_id:event.target.value})}><option value="">Select subject</option>{subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select><select aria-label="Material type" value={form.type} onChange={event => setForm({...form,type:event.target.value as MaterialForm['type']})}><option>PDF</option><option>Video</option><option>Article</option></select><Input aria-label="Resource URL" type="url" placeholder="Resource URL (optional with file)" value={form.url} onChange={event => setForm({...form,url:event.target.value})}/><Input aria-label="Tags" placeholder="Tags, comma separated" value={form.tags} onChange={event => setForm({...form,tags:event.target.value})}/><Input aria-label="Upload file" type="file" accept="application/pdf,video/mp4,video/webm" onChange={event => setFile(event.target.files?.[0] ?? null)}/><Button disabled={busy === 'publish' || busy === edit}><Plus />{edit ? 'Update' : 'Publish'}</Button></form>
    </section><Outlet />
  </div></AdminGuard>
}