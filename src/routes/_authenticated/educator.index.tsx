import { createFileRoute,Link } from '@tanstack/react-router'
import { useEffect,useMemo,useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { BookOpenCheck,CheckCircle2,Clock3,Eye,ExternalLink,GraduationCap,PencilLine,Send,Upload,UsersRound,XCircle,type LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { getEducatorPortal,requestMaterialEdit,submitEducatorMaterial,updateEducatorProfile } from '@/lib/educators.functions'
import { materialSubmissionSchema } from '@/lib/material-schemas'
import type { MaterialDoc } from '@/lib/recommendation'
import type { Subject } from '@/lib/catalog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Author={id:string;name:string;affiliation:string;biography:string;expertise:string[];website_url:string|null;image_url:string|null}
type GroupActivity={groupId:string;name:string;subject:string;shares:number;lastShared:string;materials:string[]}
type EditRequest={id:string;material_id:string;material_title:string;message:string;status:'open'|'applied'|'declined';admin_note:string|null;created_at:string}
const blank={title:'',description:'',subjectId:'',type:'Article' as 'PDF'|'Video'|'Article',url:'',tags:''}
const blankEdit={materialId:'',message:'',proposedTitle:'',proposedDescription:'',proposedUrl:''}

export const Route=createFileRoute('/_authenticated/educator/')({head:()=>({meta:[{title:'Teacher dashboard | StudyFlow AI'},{name:'description',content:'Track approved teaching materials, submission history, group activity, and request material edits.'},{property:'og:title',content:'Teacher dashboard | StudyFlow AI'},{property:'og:description',content:'Track verified teaching resources, views and study group activity.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:EducatorPortal})

function EducatorPortal(){
  const{user}=Route.useRouteContext()
  const getPortal=useServerFn(getEducatorPortal)
  const submitMaterial=useServerFn(submitEducatorMaterial)
  const updateProfile=useServerFn(updateEducatorProfile)
  const requestEdit=useServerFn(requestMaterialEdit)
  const[author,setAuthor]=useState<Author|null>(null)
  const[materials,setMaterials]=useState<MaterialDoc[]>([])
  const[approved,setApproved]=useState<MaterialDoc[]>([])
  const[topViewed,setTopViewed]=useState<MaterialDoc[]>([])
  const[groupActivity,setGroupActivity]=useState<GroupActivity[]>([])
  const[editRequests,setEditRequests]=useState<EditRequest[]>([])
  const[subjects,setSubjects]=useState<Subject[]>([])
  const[form,setForm]=useState(blank)
  const[editForm,setEditForm]=useState(blankEdit)
  const[profile,setProfile]=useState({affiliation:'',biography:'',expertise:'',websiteUrl:'',imageUrl:''})
  const[file,setFile]=useState<File|null>(null)
  const[error,setError]=useState('')
  const[busy,setBusy]=useState(false)

  async function load(){
    try{
      const[result,catalog]=await Promise.all([getPortal(),supabase.from('subjects').select('*').order('name')])
      const a=result.author as Author
      setAuthor(a)
      setMaterials(result.materials as MaterialDoc[])
      setApproved(result.approved as MaterialDoc[])
      setTopViewed(result.topViewed as MaterialDoc[])
      setGroupActivity(result.groupActivity as GroupActivity[])
      setEditRequests(result.editRequests as EditRequest[])
      setSubjects((catalog.data??[]) as Subject[])
      setProfile({affiliation:a.affiliation,biography:a.biography,expertise:a.expertise.join(', '),websiteUrl:a.website_url??'',imageUrl:a.image_url??''})
    }catch(caught){setError(caught instanceof Error?caught.message:'Educator access required')}
  }
  useEffect(()=>{void load()},[])

  const stats=useMemo(()=>({pending:materials.filter(x=>x.approval_status==='pending').length,approved:approved.length,rejected:materials.filter(x=>x.approval_status==='rejected').length,views:approved.reduce((total,item)=>total+(item.view_count??0),0)}),[materials,approved])
  const statItems:{Icon:LucideIcon;value:number;label:string}[]=[{Icon:CheckCircle2,value:stats.approved,label:'Approved materials'},{Icon:Clock3,value:stats.pending,label:'Awaiting review'},{Icon:XCircle,value:stats.rejected,label:'Needs changes'},{Icon:Eye,value:stats.views,label:'Total views'}]

  async function saveProfile(e:React.FormEvent){
    e.preventDefault()
    try{await updateProfile({data:{...profile,expertise:profile.expertise.split(',').map(x=>x.trim()).filter(Boolean)}});toast.success('Educator profile updated');await load()}
    catch(caught){toast.error(caught instanceof Error?caught.message:'Could not update profile')}
  }

  async function submit(e:React.FormEvent){
    e.preventDefault()
    setBusy(true)
    let filePath:string|null=null
    try{
      if(file){
        if(!['application/pdf','video/mp4','video/webm'].includes(file.type)||file.size>15*1024*1024)throw new Error('Upload a PDF, MP4, or WebM file up to 15 MB')
        filePath=`${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'-')}`
        const upload=await supabase.storage.from('study-materials').upload(filePath,file,{contentType:file.type})
        if(upload.error)throw upload.error
      }
      const payload=materialSubmissionSchema.parse({...form,tags:form.tags.split(',').map(x=>x.trim()).filter(Boolean),authorId:null,filePath,fileName:file?.name??null,fileMimeType:file?.type??null,fileSizeBytes:file?.size??null})
      await submitMaterial({data:payload})
      toast.success('Teaching resource submitted for review')
      setForm(blank);setFile(null);await load()
    }catch(caught){
      if(filePath)await supabase.storage.from('study-materials').remove([filePath])
      toast.error(caught instanceof Error?caught.message:'Could not submit resource')
    }finally{setBusy(false)}
  }

  async function sendEditRequest(e:React.FormEvent){
    e.preventDefault()
    try{await requestEdit({data:editForm});toast.success('Edit request sent to administrators');setEditForm(blankEdit);await load()}
    catch(caught){toast.error(caught instanceof Error?caught.message:'Could not send edit request')}
  }

  if(error)return <div className="page-wrap narrow"><div className="empty-state"><GraduationCap/><h1>Educator access required</h1><p>Your account is not linked to a verified educator profile.</p><Link to="/educator/apply"><Button>Apply for access</Button></Link></div></div>
  if(!author)return <div className="page-wrap"><div className="skeleton-block"/></div>

  return <div className="page-wrap">
    <div className="educator-hero"><div>{author.image_url?<img src={author.image_url} alt={author.name}/>:<span className="author-avatar"><GraduationCap/></span>}</div><div><p className="eyebrow">Teacher dashboard</p><h1>{author.name}</h1><p>{author.affiliation}</p></div></div>
    <div className="stats-grid">{statItems.map(({Icon,value,label})=><article className="stat" key={label}><span><Icon/></span><div><b>{value}</b><p>{label}</p></div></article>)}</div>

    <section className="section-block"><div className="section-heading"><div><p className="eyebrow"><Eye/> Reach</p><h2>Approved materials and most viewed</h2></div></div>
      <div className="resource-list">{topViewed.map((item,index)=><div className="viewed-row" key={item.id}><span className="rank">#{index+1}</span><div><h3>{item.title}</h3><p>{item.subjects?.name} · {item.type} · rated {Number(item.average_rating).toFixed(1)} ({item.rating_count})</p></div><span className="view-count"><Eye/>{item.view_count} views</span></div>)}
      {!topViewed.length&&<p className="text-sm text-muted-foreground">No approved materials yet — submit one below.</p>}</div>
      {approved.length>topViewed.length&&<p className="mt-3 text-sm text-muted-foreground">{approved.length} approved materials in total.</p>}
    </section>

    <section className="section-block"><div className="section-heading"><div><p className="eyebrow"><UsersRound/> Classroom impact</p><h2>Study group activity</h2></div></div>
      <div className="resource-list">{groupActivity.map(group=><div className="viewed-row" key={group.groupId}><div><h3>{group.name}</h3><p>{group.subject} · {group.materials.join(', ')}</p></div><span className="view-count">{group.shares} shares · {new Date(group.lastShared).toLocaleDateString()}</span></div>)}
      {!groupActivity.length&&<p className="text-sm text-muted-foreground">No study group has shared your materials yet.</p>}</div>
    </section>

    <div className="educator-columns">
      <section><div className="section-heading"><div><p className="eyebrow"><Send/> New contribution</p><h2>Submit teaching material</h2></div></div>
        <form className="submission-form" onSubmit={submit}>
          <div><Label htmlFor="educator-title">Title</Label><Input id="educator-title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required/></div>
          <div><Label htmlFor="educator-description">Description</Label><Textarea id="educator-description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} minLength={20} required/></div>
          <div className="submission-fields">
            <div><Label htmlFor="educator-subject">Subject</Label><select id="educator-subject" value={form.subjectId} onChange={e=>setForm({...form,subjectId:e.target.value})} required><option value="">Select subject</option>{subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div><Label htmlFor="educator-type">Type</Label><select id="educator-type" value={form.type} onChange={e=>setForm({...form,type:e.target.value as typeof form.type})}><option>PDF</option><option>Video</option><option>Article</option></select></div>
          </div>
          <div><Label htmlFor="educator-url">Resource link</Label><Input id="educator-url" type="url" value={form.url} onChange={e=>setForm({...form,url:e.target.value})}/></div>
          <div><Label htmlFor="educator-tags">Tags</Label><Input id="educator-tags" value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})} placeholder="algorithms, lecture, examples"/></div>
          <div className="file-drop"><Upload/><div><Label htmlFor="educator-file">Or upload a file</Label><p>PDF, MP4, or WebM up to 15 MB</p></div><Input id="educator-file" type="file" accept="application/pdf,video/mp4,video/webm" onChange={e=>setFile(e.target.files?.[0]??null)}/></div>
          <Button disabled={busy}><Send/>{busy?'Submitting…':'Submit for review'}</Button>
        </form>
      </section>

      <section><div className="section-heading"><div><p className="eyebrow"><PencilLine/> Corrections</p><h2>Request a material edit</h2></div></div>
        <form className="submission-form" onSubmit={sendEditRequest}>
          <div><Label htmlFor="edit-material">Material</Label><select id="edit-material" value={editForm.materialId} onChange={e=>setEditForm({...editForm,materialId:e.target.value})} required><option value="">Select one of your materials</option>{materials.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></div>
          <div><Label htmlFor="edit-message">What should change?</Label><Textarea id="edit-message" value={editForm.message} onChange={e=>setEditForm({...editForm,message:e.target.value})} minLength={10} required/></div>
          <div><Label htmlFor="edit-title">Proposed title (optional)</Label><Input id="edit-title" value={editForm.proposedTitle} onChange={e=>setEditForm({...editForm,proposedTitle:e.target.value})}/></div>
          <div><Label htmlFor="edit-description">Proposed description (optional)</Label><Textarea id="edit-description" value={editForm.proposedDescription} onChange={e=>setEditForm({...editForm,proposedDescription:e.target.value})}/></div>
          <div><Label htmlFor="edit-url">Proposed link (optional)</Label><Input id="edit-url" type="url" value={editForm.proposedUrl} onChange={e=>setEditForm({...editForm,proposedUrl:e.target.value})}/></div>
          <Button><PencilLine/>Send edit request</Button>
        </form>
        <div className="resource-list mt-4">{editRequests.map(item=><div className="viewed-row" key={item.id}><div><h3>{item.material_title}</h3><p>{item.message}</p>{item.admin_note&&<p className="rejection-note">Administrator: {item.admin_note}</p>}</div><span className={`status-badge status-${item.status==='applied'?'approved':item.status==='declined'?'rejected':'pending'}`}>{item.status}</span></div>)}</div>
      </section>
    </div>

    <section><div className="section-heading"><div><p className="eyebrow"><GraduationCap/> Public identity</p><h2>Edit educator profile</h2></div></div>
      <form className="submission-form" onSubmit={saveProfile}>
        <div><Label htmlFor="educator-affiliation">Affiliation</Label><Input id="educator-affiliation" value={profile.affiliation} onChange={e=>setProfile({...profile,affiliation:e.target.value})}/></div>
        <div><Label htmlFor="educator-bio">Biography</Label><Textarea id="educator-bio" value={profile.biography} onChange={e=>setProfile({...profile,biography:e.target.value})}/></div>
        <div><Label htmlFor="educator-expertise">Expertise</Label><Input id="educator-expertise" value={profile.expertise} onChange={e=>setProfile({...profile,expertise:e.target.value})}/></div>
        <div><Label htmlFor="educator-website">Website</Label><Input id="educator-website" type="url" value={profile.websiteUrl} onChange={e=>setProfile({...profile,websiteUrl:e.target.value})}/></div>
        <div><Label htmlFor="educator-image">Image URL</Label><Input id="educator-image" type="url" value={profile.imageUrl} onChange={e=>setProfile({...profile,imageUrl:e.target.value})}/></div>
        <Button>Save profile</Button>
      </form>
    </section>

    <section className="section-block"><div className="section-heading"><div><p className="eyebrow"><BookOpenCheck/> Submission history</p><h2>Your linked resources</h2></div></div>
      <div className="submission-history full-history">{materials.map(item=><article key={item.id}><div className={`status-icon status-${item.approval_status}`}>{item.approval_status==='approved'?<CheckCircle2/>:item.approval_status==='rejected'?<XCircle/>:<Clock3/>}</div><div><div className="submission-title-row"><h3>{item.title}</h3><span className={`status-badge status-${item.approval_status}`}>{item.approval_status}</span></div><p>{item.subjects?.name} · {item.type} · {item.view_count} views</p>{item.rejection_reason&&<p className="rejection-note">Feedback: {item.rejection_reason}</p>}{item.approval_status==='approved'&&item.url&&<a className="text-link" href={item.url} target="_blank" rel="noreferrer">Open resource <ExternalLink/></a>}</div></article>)}</div>
    </section>
  </div>
}
