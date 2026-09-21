import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { BookOpenCheck, Loader2, Sparkles, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { generateTutorSession, type TutorResult } from '@/lib/ai-tutor.functions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export const Route = createFileRoute('/_authenticated/ai-tutor')({
  validateSearch: (search: Record<string, unknown>) => ({
    title: typeof search['title'] === 'string' ? (search['title'] as string) : undefined,
    topic: typeof search['topic'] === 'string' ? (search['topic'] as string) : undefined,
    material: typeof search['material'] === 'string' ? (search['material'] as string) : undefined,
  }),
  head: () => ({ meta: [
    { title: 'AI study tutor | StudyFlow AI' },
    { name: 'description', content: 'Ask a study question or paste course material and get a personalized explanation plus practice questions.' },
    { property: 'og:title', content: 'AI study tutor | StudyFlow AI' },
    { property: 'og:description', content: 'Personalized explanations and practice questions generated from your own course material.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: AiTutor,
})

type PastSession = { id: string; title: string; created_at: string }

function AiTutor() {
  const { user } = Route.useRouteContext()
  const search = Route.useSearch()
  const generate = useServerFn(generateTutorSession)
  const [form, setForm] = useState({
    title: search.title ?? '',
    question: search.topic ? `Explain these topics with worked examples: ${search.topic}` : '',
    material: search.material ?? '',
    level: 'intermediate',
  })
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<TutorResult | null>(null)
  const [revealed, setRevealed] = useState<Record<number, boolean>>({})
  const [past, setPast] = useState<PastSession[]>([])

  async function loadPast() {
    const { data } = await supabase
      .from('ai_tutor_sessions')
      .select('id,title,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
    setPast(data ?? [])
  }
  useEffect(() => { void loadPast() }, [user.id])

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 400_000) { toast.error('Please upload a text file under 400 KB'); return }
    const text = await file.text()
    setForm((current) => ({ ...current, material: text.slice(0, 20000), title: current.title || file.name.replace(/\.[^.]+$/, '') }))
    toast.success('Course material loaded')
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setResult(null)
    setRevealed({})
    try {
      const response = await generate({ data: form })
      setResult(response)
      void loadPast()
      toast.success('Your personalized study pack is ready')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not generate your study pack')
    } finally {
      setBusy(false)
    }
  }

  async function openPast(id: string) {
    const { data, error } = await supabase.from('ai_tutor_sessions').select('*').eq('id', id).single()
    if (error || !data) { toast.error('Could not open that session'); return }
    setRevealed({})
    setResult({
      id: data.id,
      title: data.title,
      explanation: data.explanation,
      keyPoints: (data.key_points as string[]) ?? [],
      practice: (data.practice as TutorResult['practice']) ?? [],
    })
  }

  return (
    <div className="page-wrap">
      <div className="page-title">
        <p className="eyebrow"><Sparkles /> AI study tutor</p>
        <h1>Turn your material into an explanation you get</h1>
        <p>Ask a question or upload your course notes. You receive a tailored explanation, the key takeaways, and practice questions.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form className="onboarding-form" onSubmit={submit}>
          <div>
            <Label htmlFor="tutor-title">Session title</Label>
            <Input id="tutor-title" value={form.title} placeholder="e.g. Gradient descent basics" onChange={(event) => setForm({ ...form, title: event.target.value })} required />
          </div>
          <div>
            <Label htmlFor="tutor-question">What should be explained?</Label>
            <Textarea id="tutor-question" rows={4} value={form.question} placeholder="e.g. Explain how backpropagation updates weights, with a worked example." onChange={(event) => setForm({ ...form, question: event.target.value })} required />
          </div>
          <div>
            <Label htmlFor="tutor-level">Explain it for</Label>
            <select id="tutor-level" value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })}>
              <option value="beginner">A beginner</option>
              <option value="intermediate">An intermediate learner</option>
              <option value="advanced">An advanced learner</option>
            </select>
          </div>
          <div>
            <Label htmlFor="tutor-material">Course material (optional)</Label>
            <Textarea id="tutor-material" rows={6} value={form.material} placeholder="Paste your notes, lecture transcript or chapter text here." onChange={(event) => setForm({ ...form, material: event.target.value })} />
            <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <Upload className="size-4" /> Upload a .txt or .md file
              <input type="file" accept=".txt,.md,.csv,text/plain,text/markdown" className="sr-only" onChange={onFile} />
            </label>
          </div>
          <Button size="lg" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Sparkles />}{busy ? 'Thinking through your material…' : 'Generate my study pack'}</Button>
        </form>

        <aside className="rounded-xl border border-border/80 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><BookOpenCheck className="size-4" /> Recent sessions</h2>
          {past.length === 0 ? <p className="text-sm text-muted-foreground">Your generated study packs appear here.</p> : (
            <ul className="space-y-2">
              {past.map((session) => (
                <li key={session.id}>
                  <button type="button" className="w-full rounded-lg border border-border/60 p-2 text-left text-sm hover:bg-muted" onClick={() => void openPast(session.id)}>
                    <span className="block font-medium">{session.title}</span>
                    <span className="text-xs text-muted-foreground">{new Date(session.created_at).toLocaleString()}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      {result && (
        <section className="mt-8 space-y-6">
          <div className="rounded-xl border border-border/80 p-5">
            <h2 className="text-xl font-semibold">{result.title}</h2>
            <p className="mt-3 whitespace-pre-wrap leading-relaxed">{result.explanation}</p>
            {result.keyPoints.length > 0 && (
              <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">
                {result.keyPoints.map((point, index) => <li key={index}>{point}</li>)}
              </ul>
            )}
          </div>
          {result.practice.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Practice questions</h2>
              {result.practice.map((item, index) => (
                <div key={index} className="rounded-xl border border-border/80 p-4">
                  <p className="font-medium">{index + 1}. {item.question}</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {item.options.map((option, optionIndex) => <li key={optionIndex}>• {option}</li>)}
                  </ul>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setRevealed((current) => ({ ...current, [index]: !current[index] }))}>
                    {revealed[index] ? 'Hide answer' : 'Show answer'}
                  </Button>
                  {revealed[index] && <p className="mt-2 text-sm"><b>Answer:</b> {item.answer}<br /><span className="text-muted-foreground">{item.why}</span></p>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
