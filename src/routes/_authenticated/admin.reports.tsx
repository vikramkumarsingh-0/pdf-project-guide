import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Check, Download, MessageCircleQuestion } from 'lucide-react'
import { toast } from 'sonner'
import { AdminGuard } from '@/components/study/admin-guard'
import { getCatalog } from '@/lib/catalog'
import { listAdminFeedback, resolveMaterialFeedback } from '@/lib/feedback.functions'
import { Button } from '@/components/ui/button'

type ReportRow = { name: string; materials: number; rating: number }
type Feedback = { id:string; type:'question'|'comment'; message:string; status:'open'|'resolved'; created_at:string; materials:{title:string;subjects:{name:string}|null}|null }
export const Route = createFileRoute('/_authenticated/admin/reports')({
  head: () => ({ meta: [{title:'Reports and feedback | StudyFlow AI'},{name:'description',content:'Real system activity, material, rating, and learner feedback analytics.'},{property:'og:title',content:'Reports | StudyFlow AI'},{property:'og:description',content:'StudyFlow usage, quality, and learner feedback.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}] }),
  component: Reports,
})

function Reports(){
  const { user } = Route.useRouteContext()
  const listFeedback = useServerFn(listAdminFeedback)
  const resolveFeedback = useServerFn(resolveMaterialFeedback)
  const [data,setData]=useState<ReportRow[]>([])
  const [feedback,setFeedback]=useState<Feedback[]>([])
  async function loadFeedback(){try{setFeedback(await listFeedback() as Feedback[])}catch(error){toast.error(error instanceof Error?error.message:'Could not load feedback')}}
  useEffect(()=>{getCatalog().then(catalog=>setData(catalog.subjects.map(subject=>{const materials=catalog.materials.filter(material=>material.subject_id===subject.id);const total=materials.reduce((sum,material)=>sum+Number(material.average_rating),0);return{name:subject.name.split(' ')[0]||subject.name,materials:materials.length,rating:Number((total/Math.max(1,materials.length)).toFixed(1))}})));void loadFeedback()},[])
  function csv(){const text=['Type,Status,Material,Subject,Message,Date',...feedback.map(item=>[item.type,item.status,item.materials?.title??'',item.materials?.subjects?.name??'',item.message,new Date(item.created_at).toISOString()].map(value=>`"${String(value).replaceAll('"','""')}"`).join(','))].join('\n');const anchor=document.createElement('a');anchor.href=URL.createObjectURL(new Blob([text],{type:'text/csv'}));anchor.download='studyflow-feedback-report.csv';anchor.click()}
  async function resolve(id:string){try{await resolveFeedback({data:{feedbackId:id,status:'resolved'}});toast.success('Feedback resolved');await loadFeedback()}catch(error){toast.error(error instanceof Error?error.message:'Could not update feedback')}}
  const openCount=feedback.filter(item=>item.status==='open').length
  return <AdminGuard userId={user.id}><div className="page-wrap"><div className="page-title flex-row"><div><p className="eyebrow">Live database analytics</p><h1>Reports</h1><p>Understand catalog coverage, quality, and learner questions.</p></div><Button variant="outline" onClick={csv}><Download/>Export feedback CSV</Button></div><div className="charts-grid"><article className="chart-card"><h2>Materials by subject</h2><p>Catalog distribution across disciplines</p><div className="h-80"><ResponsiveContainer><BarChart data={data}><XAxis dataKey="name" fontSize={11}/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="materials" fill="var(--chart-1)" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div></article><article className="chart-card"><h2>Subject quality</h2><p>Average learner rating</p><div className="h-80"><ResponsiveContainer><PieChart><Pie data={data} dataKey="rating" nameKey="name" innerRadius={65} outerRadius={105}>{data.map((_,index)=><Cell key={index} fill={`var(--chart-${index%5+1})`}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div></article></div><section className="section-block"><div className="section-heading"><div><p className="eyebrow"><MessageCircleQuestion/> Learner feedback</p><h2>{openCount} open questions and comments</h2></div></div><div className="feedback-list">{feedback.map(item=><article key={item.id}><div><h3>{item.type} · {item.materials?.title}</h3><p>{item.message}</p><time>{item.materials?.subjects?.name} · {new Date(item.created_at).toLocaleString()}</time></div>{item.status==='open'?<Button variant="outline" onClick={()=>void resolve(item.id)}><Check/>Resolve</Button>:<span className="status-badge status-approved">Resolved</span>}</article>)}{!feedback.length&&<div className="empty-state compact"><MessageCircleQuestion/><h2>No feedback yet</h2><p>Student questions and comments will appear here.</p></div>}</div></section></div></AdminGuard>
}