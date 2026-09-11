import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { CheckCircle2, Clock3, FileText, Plus, XCircle } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import type { MaterialDoc } from '@/lib/recommendation'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/_authenticated/submissions')({
  head: () => ({ meta: [
    { title: 'Submission history | StudyFlow AI' },
    { name: 'description', content: 'Track your submitted learning resources and approval decisions.' },
    { property: 'og:title', content: 'Submission history | StudyFlow AI' },
    { property: 'og:description', content: 'See pending, approved, and rejected study resource submissions.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: SubmissionHistory,
})

function SubmissionHistory() {
  const { user } = Route.useRouteContext()
  const [items, setItems] = useState<MaterialDoc[]>([])
  useEffect(() => { void supabase.from('materials').select('*,subjects(name)').eq('uploaded_by', user.id).order('submitted_at', { ascending: false }).then(({ data }) => setItems((data ?? []) as MaterialDoc[])) }, [user.id])
  return <div className="page-wrap">
    <div className="page-title flex-row"><div><p className="eyebrow"><FileText /> Contributions</p><h1>Submission history</h1><p>Track every resource you have shared with the learning community.</p></div><Link to="/submit"><Button><Plus />New submission</Button></Link></div>
    <div className="submission-history full-history">
      {items.map((item) => <article key={item.id}>
        <div className={`status-icon status-${item.approval_status}`}>{item.approval_status === 'approved' ? <CheckCircle2 /> : item.approval_status === 'rejected' ? <XCircle /> : <Clock3 />}</div>
        <div><div className="submission-title-row"><h2>{item.title}</h2><span className={`status-badge status-${item.approval_status}`}>{item.approval_status}</span></div><p>{item.subjects?.name} · {item.type} · Submitted {new Date(item.submitted_at).toLocaleDateString()}</p>{item.reviewed_at && <p>Reviewed {new Date(item.reviewed_at).toLocaleDateString()}</p>}{item.rejection_reason && <p className="rejection-note">Feedback: {item.rejection_reason}</p>}</div>
      </article>)}
      {!items.length && <div className="empty-state"><FileText /><h2>No submissions yet</h2><p>Your pending and reviewed resources will appear here.</p><Link to="/submit"><Button><Plus />Submit your first resource</Button></Link></div>}
    </div>
  </div>
}