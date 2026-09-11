import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { GraduationCap, Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { AdminGuard } from '@/components/study/admin-guard'
import { saveAuthor } from '@/lib/authors.functions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Author = { id:string; name:string; affiliation:string; biography:string; expertise:string[]; website_url:string|null; image_url:string|null }
const empty = { name:'', affiliation:'', biography:'', expertise:'', websiteUrl:'', imageUrl:'' }
export const Route = createFileRoute('/_authenticated/admin/authors')({
  head: () => ({ meta: [
    { title: 'Educator authors | StudyFlow AI' },
    { name: 'description', content: 'Manage verified educator profiles linked to study materials.' },
    { property: 'og:title', content: 'Educator authors | StudyFlow AI' },
    { property: 'og:description', content: 'Manage StudyFlow educator attribution.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }), component: Authors,
})
function Authors(){
  const { user }=Route.useRouteContext(); const save=useServerFn(saveAuthor); const [authors,setAuthors]=useState<Author[]>([]); const [form,setForm]=useState(empty); const [edit,setEdit]=useState<string|null>(null); const [busy,setBusy]=useState(false)
  async function load(){const {data,error}=await supabase.from('material_authors').select('*').order('name');if(error)toast.error(error.message);else setAuthors((data??[]) as Author[])}
  useEffect(()=>{void load()},[])
  async function submit(event:React.FormEvent){event.preventDefault();setBusy(true);try{await save({data:{id:edit??undefined,name:form.name,affiliation:form.affiliation,biography:form.biography,expertise:form.expertise.split(',').map(x=>x.trim()).filter(Boolean),websiteUrl:form.websiteUrl,imageUrl:form.imageUrl}});toast.success(edit?'Author updated':'Author added');setEdit(null);setForm(empty);void load()}catch(error){toast.error(error instanceof Error?error.message:'Could not save author')}finally{setBusy(false)}}
  return <AdminGuard userId={user.id}><div className="page-wrap"><div className="page-title"><p className="eyebrow"><GraduationCap/> Educator directory</p><h1>Material authors</h1><p>Maintain credible educator details and connect resources to their original authors.</p></div><form className="author-form" onSubmit={submit}><div><Label htmlFor="author-name">Name</Label><Input id="author-name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></div><div><Label htmlFor="author-affiliation">Affiliation</Label><Input id="author-affiliation" value={form.affiliation} onChange={e=>setForm({...form,affiliation:e.target.value})}/></div><div><Label htmlFor="author-expertise">Expertise</Label><Input id="author-expertise" value={form.expertise} onChange={e=>setForm({...form,expertise:e.target.value})} placeholder="Algorithms, machine learning"/></div><div><Label htmlFor="author-website">Website</Label><Input id="author-website" type="url" value={form.websiteUrl} onChange={e=>setForm({...form,websiteUrl:e.target.value})}/></div><div><Label htmlFor="author-image">Image URL</Label><Input id="author-image" type="url" value={form.imageUrl} onChange={e=>setForm({...form,imageUrl:e.target.value})}/></div><div className="author-bio"><Label htmlFor="author-bio">Biography</Label><Textarea id="author-bio" value={form.biography} onChange={e=>setForm({...form,biography:e.target.value})}/></div><Button disabled={busy}><Plus/>{edit?'Save author':'Add author'}</Button></form><div className="author-grid">{authors.map(author=><article key={author.id}>{author.image_url?<img src={author.image_url} alt=""/>:<span className="author-avatar"><GraduationCap/></span>}<div><h2>{author.name}</h2><p>{author.affiliation}</p><p>{author.biography}</p><div className="mt-3 flex flex-wrap gap-2">{author.expertise.map(item=><span className="tag" key={item}>{item}</span>)}</div></div><Button variant="ghost" size="icon" aria-label={`Edit ${author.name}`} onClick={()=>{setEdit(author.id);setForm({name:author.name,affiliation:author.affiliation,biography:author.biography,expertise:author.expertise.join(', '),websiteUrl:author.website_url??'',imageUrl:author.image_url??''})}}><Pencil/></Button></article>)}</div></div></AdminGuard>
}
