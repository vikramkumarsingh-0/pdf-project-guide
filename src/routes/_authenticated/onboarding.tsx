import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { BookOpenCheck, Sparkles, Target } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { completeOnboarding } from '@/lib/onboarding.functions'
import { coldStartSchema } from '@/lib/material-schemas'
import type { Subject } from '@/lib/catalog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const Route = createFileRoute('/_authenticated/onboarding')({
  head: () => ({ meta: [
    { title: 'Set your study focus | StudyFlow AI' },
    { name: 'description', content: 'Choose your first subject, topic, and goal for personalized study recommendations.' },
    { property: 'og:title', content: 'Set your study focus | StudyFlow AI' },
    { property: 'og:description', content: 'Build your personalized StudyFlow learning plan.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Onboarding,
})

function Onboarding() {
  const navigate = useNavigate()
  const save = useServerFn(completeOnboarding)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [form, setForm] = useState({ subjectId: '', topic: '', goal: '' })
  const [busy, setBusy] = useState(false)
  useEffect(() => { void supabase.from('subjects').select('*').order('name').then(({ data }) => setSubjects((data ?? []) as Subject[])) }, [])
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true)
    try { const values = coldStartSchema.parse(form); await save({ data: values }); toast.success('Your study plan is ready'); await navigate({ to: '/recommendations' }) }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save your study focus') }
    finally { setBusy(false) }
  }
  return <div className="page-wrap narrow onboarding-page"><div className="onboarding-progress"><span className="active">1</span><i/><span>2</span></div><div className="page-title"><p className="eyebrow"><BookOpenCheck/> First-time setup</p><h1>Start with what matters now</h1><p>Three choices shape your first set of real study recommendations.</p></div><form className="onboarding-form" onSubmit={submit}><div><Label htmlFor="onboarding-subject">Subject</Label><select id="onboarding-subject" required value={form.subjectId} onChange={event => setForm({...form,subjectId:event.target.value})}><option value="">Choose your first subject</option>{subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></div><div><Label htmlFor="onboarding-topic">Topic</Label><Input id="onboarding-topic" required minLength={2} maxLength={100} placeholder="Neural networks, indexing, process scheduling…" value={form.topic} onChange={event => setForm({...form,topic:event.target.value})}/></div><div><Label htmlFor="onboarding-goal">Goal</Label><Input id="onboarding-goal" required minLength={5} maxLength={240} placeholder="Prepare for my semester exam" value={form.goal} onChange={event => setForm({...form,goal:event.target.value})}/></div><Button size="lg" disabled={busy}><Target/>{busy ? 'Building your plan…' : <>Build my recommendations <Sparkles/></>}</Button></form></div>
}
