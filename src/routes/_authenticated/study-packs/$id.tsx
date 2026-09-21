import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { Check, Loader2, Plus, Sparkles, Trash2, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'
import {
  assignStudyPack,
  deleteStudyPack,
  generateStudyPackCards,
  getStudyPack,
  saveStudyPack,
  saveStudyPackCards,
  setCardProgress,
  unassignStudyPack,
} from '@/lib/study-packs.functions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export const Route = createFileRoute('/_authenticated/study-packs/$id')({
  head: () => ({ meta: [
    { title: 'Study pack | StudyFlow AI' },
    { name: 'description', content: 'Review notes, work through flashcards, track what you know and ask the AI tutor about this pack.' },
    { property: 'og:title', content: 'Study pack | StudyFlow AI' },
    { property: 'og:description', content: 'Notes, topics, flashcards and progress for a single study pack.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: StudyPackDetail,
})

type Card = { id: string; question: string; answer: string; known: boolean }
type Learner = { studentId: string; name: string; known: number; total: number; assignedAt: string }

function StudyPackDetail() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const fetchPack = useServerFn(getStudyPack)
  const save = useServerFn(saveStudyPack)
  const saveCards = useServerFn(saveStudyPackCards)
  const generate = useServerFn(generateStudyPackCards)
  const mark = useServerFn(setCardProgress)
  const assign = useServerFn(assignStudyPack)
  const unassign = useServerFn(unassignStudyPack)
  const remove = useServerFn(deleteStudyPack)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [owner, setOwner] = useState(false)
  const [pack, setPack] = useState<any>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [learners, setLearners] = useState<Learner[]>([])
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const [draft, setDraft] = useState({ title: '', description: '', topics: '', notes: '' })
  const [newCard, setNewCard] = useState({ question: '', answer: '' })
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      const result = await fetchPack({ data: { packId: id } })
      setPack(result.pack)
      setOwner(result.owner)
      setCards(result.cards as Card[])
      setLearners(result.learners)
      setDraft({
        title: result.pack.title,
        description: result.pack.description ?? '',
        topics: (result.pack.topics ?? []).join(', '),
        notes: result.pack.notes ?? '',
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Study pack not available')
    } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [id])

  async function saveDetails(event: React.FormEvent) {
    event.preventDefault()
    try {
      await save({ data: {
        id,
        title: draft.title,
        description: draft.description,
        subjectId: pack.subject_id,
        topics: draft.topics.split(',').map((topic) => topic.trim()).filter(Boolean),
        notes: draft.notes,
        kind: pack.kind,
        status: pack.status,
      } })
      toast.success('Study pack saved')
      await load()
    } catch (caught) { toast.error(caught instanceof Error ? caught.message : 'Could not save') }
  }

  async function toggleKnown(card: Card) {
    const known = !card.known
    setCards((current) => current.map((item) => (item.id === card.id ? { ...item, known } : item)))
    try { await mark({ data: { packId: id, cardId: card.id, known } }) }
    catch { toast.error('Could not save your progress') }
  }

  async function addCard(event: React.FormEvent) {
    event.preventDefault()
    try {
      await saveCards({ data: { packId: id, cards: [...cards.map(({ question, answer }) => ({ question, answer })), newCard] } })
      setNewCard({ question: '', answer: '' })
      await load()
    } catch (caught) { toast.error(caught instanceof Error ? caught.message : 'Could not add the flashcard') }
  }

  async function deleteCard(cardId: string) {
    try {
      await saveCards({ data: { packId: id, cards: cards.filter((card) => card.id !== cardId).map(({ question, answer }) => ({ question, answer })) } })
      await load()
    } catch (caught) { toast.error(caught instanceof Error ? caught.message : 'Could not remove the flashcard') }
  }

  async function generateCards() {
    setBusy(true)
    try {
      const result = await generate({ data: { packId: id, count: 8 } })
      toast.success(`Added ${result.added} AI flashcards`)
      await load()
    } catch (caught) { toast.error(caught instanceof Error ? caught.message : 'Could not generate flashcards') }
    finally { setBusy(false) }
  }

  async function togglePublish() {
    try {
      await save({ data: {
        id,
        title: pack.title,
        description: pack.description ?? '',
        subjectId: pack.subject_id,
        topics: pack.topics ?? [],
        notes: pack.notes ?? '',
        kind: pack.kind,
        status: pack.status === 'published' ? 'draft' : 'published',
      } })
      await load()
    } catch (caught) { toast.error(caught instanceof Error ? caught.message : 'Could not update the pack') }
  }

  if (loading) return <div className="page-wrap"><div className="skeleton-block" /></div>
  if (error) return <div className="page-wrap narrow"><div className="empty-state"><h1>Not available</h1><p>{error}</p><Link to="/study-packs"><Button>Back to study packs</Button></Link></div></div>

  const known = cards.filter((card) => card.known).length
  const percent = cards.length ? Math.round((known / cards.length) * 100) : 0

  return (
    <div className="page-wrap">
      <div className="page-title">
        <p className="eyebrow">{pack.kind === 'course' ? 'Course pack' : 'Personal pack'}{pack.subject ? ` · ${pack.subject}` : ''}</p>
        <h1>{pack.title}</h1>
        {pack.description && <p>{pack.description}</p>}
        {(pack.topics ?? []).length > 0 && <div className="expertise-chips">{(pack.topics as string[]).map((topic) => <span key={topic}>{topic}</span>)}</div>}
      </div>

      <div className="rounded-xl border border-border/80 p-4">
        <div className="flex items-center justify-between text-sm"><b>Progress</b><span>{known} of {cards.length} flashcards known · {percent}%</span></div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} /></div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/ai-tutor" search={{ title: pack.title, topic: (pack.topics ?? []).join(', '), material: (pack.notes ?? '').slice(0, 20000) }}>
            <Button variant="outline" size="sm"><Sparkles />Ask the AI tutor about this pack</Button>
          </Link>
          {owner && <Button variant="outline" size="sm" disabled={busy} onClick={() => void generateCards()}>{busy ? <Loader2 className="animate-spin" /> : <Sparkles />}Generate flashcards with AI</Button>}
          {owner && pack.kind === 'course' && <Button variant="outline" size="sm" onClick={() => void togglePublish()}>{pack.status === 'published' ? 'Unpublish' : 'Publish to students'}</Button>}
          {owner && <Button variant="ghost" size="sm" onClick={async () => { await remove({ data: { packId: id } }); void navigate({ to: '/study-packs' }) }}><Trash2 />Delete pack</Button>}
        </div>
      </div>

      <section className="section-block">
        <div className="section-heading"><div><h2>Flashcards</h2></div></div>
        {cards.length === 0 && <p className="text-sm text-muted-foreground">No flashcards yet{owner ? ' — add one below or let the AI build them from your notes.' : '.'}</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {cards.map((card) => (
            <div key={card.id} className="rounded-xl border border-border/80 p-4">
              <p className="font-medium">{card.question}</p>
              {revealed[card.id] && <p className="mt-2 text-sm text-muted-foreground">{card.answer}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setRevealed((current) => ({ ...current, [card.id]: !current[card.id] }))}>{revealed[card.id] ? 'Hide answer' : 'Show answer'}</Button>
                <Button variant={card.known ? 'default' : 'ghost'} size="sm" onClick={() => void toggleKnown(card)}><Check />{card.known ? 'Known' : 'Mark as known'}</Button>
                {owner && <Button variant="ghost" size="sm" onClick={() => void deleteCard(card.id)}><Trash2 /></Button>}
              </div>
            </div>
          ))}
        </div>

        {owner && (
          <form className="submission-form mt-5" onSubmit={addCard}>
            <div><Label htmlFor="card-question">Question</Label><Input id="card-question" value={newCard.question} onChange={(event) => setNewCard({ ...newCard, question: event.target.value })} required /></div>
            <div><Label htmlFor="card-answer">Answer</Label><Textarea id="card-answer" rows={2} value={newCard.answer} onChange={(event) => setNewCard({ ...newCard, answer: event.target.value })} required /></div>
            <Button><Plus />Add flashcard</Button>
          </form>
        )}
      </section>

      {owner && (
        <section className="section-block">
          <div className="section-heading"><div><h2>Notes and topics</h2></div></div>
          <form className="submission-form" onSubmit={saveDetails}>
            <div><Label htmlFor="pack-edit-title">Title</Label><Input id="pack-edit-title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required /></div>
            <div><Label htmlFor="pack-edit-topics">Topics (comma separated)</Label><Input id="pack-edit-topics" value={draft.topics} onChange={(event) => setDraft({ ...draft, topics: event.target.value })} /></div>
            <div><Label htmlFor="pack-edit-description">Description</Label><Textarea id="pack-edit-description" rows={2} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></div>
            <div><Label htmlFor="pack-edit-notes">Notes</Label><Textarea id="pack-edit-notes" rows={8} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></div>
            <Button>Save changes</Button>
          </form>
        </section>
      )}

      {!owner && pack.notes && (
        <section className="section-block">
          <div className="section-heading"><div><h2>Notes</h2></div></div>
          <p className="whitespace-pre-wrap leading-relaxed">{pack.notes}</p>
        </section>
      )}

      {owner && pack.kind === 'course' && (
        <section className="section-block">
          <div className="section-heading"><div><p className="eyebrow"><Users /> Students</p><h2>Who has this pack</h2></div></div>
          <form className="flex flex-wrap items-end gap-2" onSubmit={async (event) => { event.preventDefault(); try { await assign({ data: { packId: id, email } }); setEmail(''); await load(); toast.success('Student added') } catch (caught) { toast.error(caught instanceof Error ? caught.message : 'Could not add that student') } }}>
            <div className="min-w-64 flex-1"><Label htmlFor="assign-email">Student email</Label><Input id="assign-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
            <Button><UserPlus />Give access</Button>
          </form>
          <div className="resource-list mt-4">
            {learners.map((learner) => (
              <div className="viewed-row" key={learner.studentId}>
                <div><h3>{learner.name}</h3><p>{learner.known} of {learner.total} flashcards known · added {new Date(learner.assignedAt).toLocaleDateString()}</p></div>
                <Button variant="ghost" size="sm" onClick={async () => { await unassign({ data: { packId: id, studentId: learner.studentId } }); await load() }}>Remove</Button>
              </div>
            ))}
            {learners.length === 0 && <p className="text-sm text-muted-foreground">No students added yet.</p>}
          </div>
        </section>
      )}
    </div>
  )
}
