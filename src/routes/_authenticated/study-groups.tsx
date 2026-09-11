import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { BookOpenCheck, MessageSquareText, Plus, UsersRound } from 'lucide-react'
import { toast } from 'sonner'
import { createStudyGroup, joinStudyGroup, leaveStudyGroup, listStudyGroups, postStudyGroupNote } from '@/lib/study-groups.functions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export const Route = createFileRoute('/_authenticated/study-groups')({
  head: () => ({ meta: [
    { title: 'Study groups | StudyFlow AI' },
    { name: 'description', content: 'Join subject study groups, share notes, and follow group learning progress.' },
    { property: 'og:title', content: 'Study groups | StudyFlow AI' },
    { property: 'og:description', content: 'Learn with peers in subject-focused StudyFlow groups.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: StudyGroups,
})

type Group = {
  id: string
  name: string
  description: string
  subject_id: string
  subjects: { name: string } | null
  joined: boolean
  progress: { memberCount?: number; noteCount?: number; viewCount?: number; ratingCount?: number } | null
  notes: Array<{ id: string; content: string; created_at: string }>
}

function StudyGroups() {
  const list = useServerFn(listStudyGroups)
  const create = useServerFn(createStudyGroup)
  const join = useServerFn(joinStudyGroup)
  const leave = useServerFn(leaveStudyGroup)
  const postNote = useServerFn(postStudyGroupNote)
  const [groups, setGroups] = useState<Group[]>([])
  const [enrolled, setEnrolled] = useState<string[]>([])
  const [form, setForm] = useState({ name: '', description: '', subjectId: '' })
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      const result = await list()
      setGroups(result.groups as Group[])
      setEnrolled(result.enrolledSubjectIds)
      setForm((current) => ({ ...current, subjectId: current.subjectId || result.enrolledSubjectIds[0] || '' }))
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not load study groups') }
  }
  useEffect(() => { void load() }, [])

  async function createGroup(event: React.FormEvent) {
    event.preventDefault(); setBusy(true)
    try { await create({ data: form }); setForm({ name: '', description: '', subjectId: enrolled[0] || '' }); toast.success('Study group created'); await load() }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not create group') }
    finally { setBusy(false) }
  }

  async function toggle(group: Group) {
    try { if (group.joined) await leave({ data: { groupId: group.id } }); else await join({ data: { groupId: group.id } }); toast.success(group.joined ? 'Left study group' : 'Joined study group'); await load() }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not update membership') }
  }

  async function share(groupId: string) {
    const content = notes[groupId]?.trim() || ''
    if (content.length < 2) { toast.error('Add a note before sharing'); return }
    try { await postNote({ data: { groupId, content } }); setNotes((current) => ({ ...current, [groupId]: '' })); toast.success('Note shared'); await load() }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not share note') }
  }

  return <div className="page-wrap">
    <div className="page-title flex-row"><div><p className="eyebrow"><UsersRound /> Collaborative learning</p><h1>Study groups</h1><p>Join classmates by subject, exchange notes, and build momentum together.</p></div></div>
    <div className="groups-layout">
      <section className="groups-list" aria-label="Available study groups">
        {groups.map((group) => <article className="group-panel" key={group.id}>
          <div className="group-heading"><div><p className="eyebrow">{group.subjects?.name}</p><h2>{group.name}</h2><p>{group.description}</p></div><Button variant={group.joined ? 'outline' : 'default'} onClick={() => void toggle(group)}>{group.joined ? 'Leave group' : 'Join group'}</Button></div>
          {group.joined && <><div className="group-progress">{[
            ['Members', group.progress?.memberCount ?? 0], ['Shared notes', group.progress?.noteCount ?? 0], ['Subject views', group.progress?.viewCount ?? 0], ['Subject ratings', group.progress?.ratingCount ?? 0],
          ].map(([label, value]) => <div key={label}><b>{value}</b><span>{label}</span></div>)}</div>
          <div className="group-notes"><div className="group-note-compose"><Textarea aria-label={`Share a note in ${group.name}`} placeholder="Share a useful summary, question, or study tip…" value={notes[group.id] ?? ''} onChange={(event) => setNotes((current) => ({ ...current, [group.id]: event.target.value }))} maxLength={2000}/><Button onClick={() => void share(group.id)}><MessageSquareText />Share note</Button></div>{group.notes.map((note) => <div className="shared-note" key={note.id}><p>{note.content}</p><time>{new Date(note.created_at).toLocaleString()}</time></div>)}{!group.notes.length && <p className="muted-copy">No shared notes yet.</p>}</div></>}
        </article>)}
        {!groups.length && <div className="empty-state compact"><UsersRound /><h2>No groups yet</h2><p>Create the first group for one of your subjects.</p></div>}
      </section>
      <aside className="create-group"><BookOpenCheck /><h2>Start a group</h2><p>Create a focused space for one of your enrolled subjects.</p><form onSubmit={createGroup}><div><Label htmlFor="group-name">Group name</Label><Input id="group-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required minLength={3}/></div><div><Label htmlFor="group-subject">Subject</Label><select id="group-subject" value={form.subjectId} onChange={(event) => setForm({ ...form, subjectId: event.target.value })} required>{groups.filter((group, index, all) => enrolled.includes(group.subject_id) && all.findIndex((item) => item.subject_id === group.subject_id) === index).map((group) => <option key={group.subject_id} value={group.subject_id}>{group.subjects?.name}</option>)}</select></div><div><Label htmlFor="group-description">Purpose</Label><Textarea id="group-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={600}/></div><Button disabled={busy || !enrolled.length}><Plus />Create group</Button></form></aside>
    </div>
  </div>
}