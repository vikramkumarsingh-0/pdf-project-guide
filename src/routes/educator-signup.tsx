import { createFileRoute,Link,useNavigate } from '@tanstack/react-router'
import { useEffect,useState } from 'react'
import { toast } from 'sonner'
import { ArrowRight,Check,GraduationCap } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { Brand } from '@/components/study/brand'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Subject } from '@/lib/catalog'

export const Route=createFileRoute('/educator-signup')({head:()=>({meta:[{title:'Teach on StudyFlow AI | Educator sign up'},{name:'description',content:'Create an educator account, choose your subject expertise, and publish verified teaching materials.'},{property:'og:title',content:'Educator sign up | StudyFlow AI'},{property:'og:description',content:'Join StudyFlow AI as a verified teacher and share study materials.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:EducatorSignup})

function EducatorSignup(){
  const nav=useNavigate()
  const[name,setName]=useState('')
  const[email,setEmail]=useState('')
  const[password,setPassword]=useState('')
  const[subjects,setSubjects]=useState<Subject[]>([])
  const[selected,setSelected]=useState<string[]>([])
  const[busy,setBusy]=useState(false)
  useEffect(()=>{supabase.from('subjects').select('*').order('name').then(({data})=>setSubjects((data??[]) as Subject[]))},[])
  async function submit(e:React.FormEvent){
    e.preventDefault()
    if(password.length<8){toast.error('Use at least 8 characters');return}
    if(!selected.length){toast.error('Choose at least one subject you teach');return}
    setBusy(true)
    const{data,error}=await supabase.auth.signUp({email,password,options:{data:{name}}})
    setBusy(false)
    if(error){toast.error(error.message);return}
    const names=subjects.filter(s=>selected.includes(s.id)).map(s=>s.name)
    sessionStorage.setItem('educator-expertise',JSON.stringify({name,expertise:names}))
    if(data.session){toast.success('Account created — finish your educator application');nav({to:'/educator/apply'})}
    else{toast.success('Check your email to confirm, then sign in to finish your application');nav({to:'/login'})}
  }
  return <main className="auth-page py-24"><Link to="/" className="absolute left-6 top-6"><Brand/></Link><section className="auth-panel max-w-2xl"><p className="eyebrow"><GraduationCap/> Teach on StudyFlow</p><h1>Create your educator account</h1><p className="mt-2 text-sm text-muted-foreground">Step 1 of 2 — after signing up you confirm your teaching background, then submit materials from the educator portal.</p><form onSubmit={submit} className="mt-7 space-y-5"><div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="edu-name">Full name</Label><Input id="edu-name" value={name} onChange={e=>setName(e.target.value)} required minLength={2} className="mt-2 h-11"/></div><div><Label htmlFor="edu-email">Email</Label><Input id="edu-email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required className="mt-2 h-11"/></div></div><div><Label htmlFor="edu-password">Password</Label><Input id="edu-password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} className="mt-2 h-11"/></div><fieldset><legend className="text-sm font-medium">Select your subject expertise</legend><div className="mt-3 grid gap-2 sm:grid-cols-2">{subjects.map(s=><button type="button" key={s.id} onClick={()=>setSelected(x=>x.includes(s.id)?x.filter(i=>i!==s.id):[...x,s.id])} className={`subject-choice ${selected.includes(s.id)?'selected':''}`}><span>{s.name}</span>{selected.includes(s.id)&&<Check/>}</button>)}</div></fieldset><Button className="h-11 w-full" disabled={busy}>{busy?'Creating account…':'Continue to verification'} <ArrowRight/></Button></form><p className="mt-6 text-center text-sm text-muted-foreground">Already teaching here? <Link to="/login" className="font-semibold text-primary">Sign in</Link></p></section></main>
}
