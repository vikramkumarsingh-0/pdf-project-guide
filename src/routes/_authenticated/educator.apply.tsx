import { createFileRoute,Link } from '@tanstack/react-router'
import { useEffect,useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { Check,GraduationCap,Send } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { applyForEducatorAccess } from '@/lib/educators.functions'
import type { Subject } from '@/lib/catalog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export const Route=createFileRoute('/_authenticated/educator/apply')({head:()=>({meta:[{title:'Apply as an educator | StudyFlow AI'},{name:'description',content:'Request a verified StudyFlow educator profile.'},{property:'og:title',content:'Educator application | StudyFlow AI'},{property:'og:description',content:'Apply to contribute verified teaching resources.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Apply})

function Apply(){
  const apply=useServerFn(applyForEducatorAccess)
  const[done,setDone]=useState(false)
  const[busy,setBusy]=useState(false)
  const[subjects,setSubjects]=useState<Subject[]>([])
  const[expertise,setExpertise]=useState<string[]>([])
  const[form,setForm]=useState({name:'',affiliation:'',websiteUrl:'',statement:''})
  useEffect(()=>{
    supabase.from('subjects').select('*').order('name').then(({data})=>setSubjects((data??[]) as Subject[]))
    const saved=typeof window!=='undefined'?sessionStorage.getItem('educator-expertise'):null
    if(saved){try{const parsed=JSON.parse(saved) as {name?:string;expertise?:string[]};if(parsed.expertise?.length)setExpertise(parsed.expertise);if(parsed.name)setForm(f=>({...f,name:parsed.name as string}))}catch{/* ignore malformed draft */}}
  },[])
  function toggle(name:string){setExpertise(x=>x.includes(name)?x.filter(i=>i!==name):[...x,name])}
  async function submit(e:React.FormEvent){
    e.preventDefault()
    if(!expertise.length){toast.error('Select at least one subject you teach');return}
    setBusy(true)
    try{
      await apply({data:{...form,expertise}})
      sessionStorage.removeItem('educator-expertise')
      setDone(true)
      toast.success('Application sent for administrator review')
    }catch(error){toast.error(error instanceof Error?error.message:'Could not submit application')}
    finally{setBusy(false)}
  }
  if(done)return <div className="page-wrap narrow"><div className="empty-state"><GraduationCap/><h1>Application received</h1><p>An administrator will verify your educator details before granting portal access.</p><Link to="/dashboard"><Button>Return to dashboard</Button></Link></div></div>
  return <div className="page-wrap narrow"><div className="page-title"><p className="eyebrow"><GraduationCap/> Educator verification — step 2 of 2</p><h1>Apply for educator access</h1><p>Tell administrators about your teaching background and the subjects you cover.</p></div><form className="onboarding-form" onSubmit={submit}><div><Label htmlFor="teacher-name">Professional name</Label><Input id="teacher-name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></div><div><Label htmlFor="teacher-affiliation">Institution or affiliation</Label><Input id="teacher-affiliation" value={form.affiliation} onChange={e=>setForm({...form,affiliation:e.target.value})}/></div><fieldset><legend className="text-sm font-medium">Subject expertise</legend><div className="mt-3 grid gap-2 sm:grid-cols-2">{subjects.map(s=><button type="button" key={s.id} onClick={()=>toggle(s.name)} className={`subject-choice ${expertise.includes(s.name)?'selected':''}`}><span>{s.name}</span>{expertise.includes(s.name)&&<Check/>}</button>)}</div></fieldset><div><Label htmlFor="teacher-website">Professional website</Label><Input id="teacher-website" type="url" value={form.websiteUrl} onChange={e=>setForm({...form,websiteUrl:e.target.value})}/></div><div><Label htmlFor="teacher-statement">Teaching background</Label><Textarea id="teacher-statement" value={form.statement} onChange={e=>setForm({...form,statement:e.target.value})} minLength={20} required/></div><Button disabled={busy}><Send/>{busy?'Sending…':'Submit application'}</Button></form></div>
}
