import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Sparkles, Target } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { getCatalog, openMaterial, type Subject } from '@/lib/catalog'
import { getLearningSignals, type LearningPreferences } from '@/lib/learning-profile'
import { coldStartSchema } from '@/lib/material-schemas'
import { rankMaterials, type MaterialDoc } from '@/lib/recommendation'
import { MaterialCard } from '@/components/study/material-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const Route = createFileRoute('/_authenticated/recommendations')({
  head: () => ({ meta: [
    { title: 'Recommendations | StudyFlow AI' },
    { name: 'description', content: 'Explainable study recommendations personalized for you.' },
    { property: 'og:title', content: 'Recommendations | StudyFlow AI' },
    { property: 'og:description', content: 'See why each study resource was selected for you.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Recommendations,
})

function Recommendations() {
  const { user } = Route.useRouteContext()
  const [items, setItems] = useState<MaterialDoc[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [preferences, setPreferences] = useState<LearningPreferences>({})
  const [enrolled, setEnrolled] = useState<string[]>([])
  const [form, setForm] = useState({ subjectId: '', topic: '', goal: '' })
  const [saving, setSaving] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => { void Promise.all([getCatalog(), getLearningSignals(user.id)]).then(([catalog, signals]) => { setItems(catalog.materials); setSubjects(catalog.subjects); setPreferences(signals.preferences); setEnrolled(signals.enrolled); setForm({ subjectId: signals.preferences.firstSubjectId ?? '', topic: signals.preferences.topic ?? '', goal: signals.preferences.goal ?? '' }) }) }, [tick, user.id])
  const ready = Boolean(preferences.firstSubjectId && preferences.topic && preferences.goal)
  const ranked = useMemo(() => rankMaterials(items, `${preferences.topic ?? ''} ${preferences.goal ?? ''}`, enrolled), [items, preferences, enrolled])

  async function savePreferences(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const values = coldStartSchema.parse(form)
      const next = { firstSubjectId: values.subjectId, topic: values.topic, goal: values.goal }
      const profile = await supabase.from('profiles').update({ preferences: next, updated_at: new Date().toISOString() }).eq('id', user.id)
      if (profile.error) throw profile.error
      if (!enrolled.includes(values.subjectId)) {
        const enrollment = await supabase.from('enrollments').insert({ user_id: user.id, subject_id: values.subjectId })
        if (enrollment.error) throw enrollment.error
      }
      setPreferences(next); setEnrolled((current) => current.includes(values.subjectId) ? current : [...current, values.subjectId]); toast.success('Your recommendations are ready')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save your interests') } finally { setSaving(false) }
  }

  if (!ready) return <div className="page-wrap narrow"><div className="page-title"><p className="eyebrow"><Target /> First recommendations</p><h1>Tell us where you’re headed</h1><p>Choose one subject, a topic, and your goal so your first recommendations are useful.</p></div><form className="onboarding-form" onSubmit={savePreferences}><div><Label htmlFor="first-subject">First subject</Label><select id="first-subject" value={form.subjectId} onChange={(event) => setForm({ ...form, subjectId: event.target.value })} required><option value="">Choose a subject</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></div><div><Label htmlFor="first-topic">Topic</Label><Input id="first-topic" placeholder="e.g. neural networks" value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })} required /></div><div><Label htmlFor="first-goal">Study goal</Label><Input id="first-goal" placeholder="e.g. prepare for my semester exam" value={form.goal} onChange={(event) => setForm({ ...form, goal: event.target.value })} required /></div><Button size="lg" disabled={saving}><Sparkles />{saving ? 'Personalizing…' : 'Show my recommendations'}</Button></form></div>

  return <div className="page-wrap"><div className="page-title flex-row"><div><p className="eyebrow"><Sparkles />Explainable AI</p><h1>Made for your momentum</h1><p>Focused on {preferences.topic} to help you {preferences.goal}.</p></div><Button variant="outline" onClick={() => setTick((value) => value + 1)}><RefreshCw />Refresh</Button></div><div className="score-note"><b>How ranking works</b><span>Content match 50%</span><span>Peer signals 25%</span><span>Subject fit 15%</span><span>Quality 10%</span></div><div className="card-grid">{ranked.map((material) => <div key={material.id} className="relative"><span className="score-pill">{Math.round(material.score * 100)} match</span><MaterialCard material={material} reason={material.reason} onOpen={(selected) => openMaterial(selected, user.id)} /></div>)}</div></div>
}