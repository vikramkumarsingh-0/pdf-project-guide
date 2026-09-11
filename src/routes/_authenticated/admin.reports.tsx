import { createFileRoute } from '@tanstack/react-router';
import { useEffect,useState } from 'react';
import { BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer,PieChart,Pie,Cell } from 'recharts';
import { Download } from 'lucide-react';
import { AdminGuard } from '@/components/study/admin-guard';
import { getCatalog } from '@/lib/catalog';
import { Button } from '@/components/ui/button';

type ReportRow={name:string;materials:number;rating:number};
export const Route=createFileRoute('/_authenticated/admin/reports')({
 head:()=>({meta:[{title:'Reports and analytics | StudyFlow AI'},{name:'description',content:'Real system activity, material, and rating analytics.'},{property:'og:title',content:'Reports | StudyFlow AI'},{property:'og:description',content:'StudyFlow usage and learning analytics.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:Reports,
});
function Reports(){
 const{user}=Route.useRouteContext();
 const[data,setData]=useState<ReportRow[]>([]);
 useEffect(()=>{getCatalog().then(catalog=>setData(catalog.subjects.map(subject=>{
  const materials=catalog.materials.filter(material=>material.subject_id===subject.id);
  const total=materials.reduce((sum,material)=>sum+Number(material.average_rating),0);
  return{name:subject.name.split(' ')[0]||subject.name,materials:materials.length,rating:Number((total/Math.max(1,materials.length)).toFixed(1))};
 })))},[]);
 function csv(){const text=['Subject,Materials,Average rating',...data.map(row=>`${row.name},${row.materials},${row.rating}`)].join('\n');const anchor=document.createElement('a');anchor.href=URL.createObjectURL(new Blob([text],{type:'text/csv'}));anchor.download='studyflow-report.csv';anchor.click()}
 return <AdminGuard userId={user.id}><div className="page-wrap"><div className="page-title flex-row"><div><p className="eyebrow">Live database analytics</p><h1>Reports</h1><p>Understand catalog coverage and resource quality.</p></div><Button variant="outline" onClick={csv}><Download/>Export CSV</Button></div><div className="charts-grid"><article className="chart-card"><h2>Materials by subject</h2><p>Catalog distribution across disciplines</p><div className="h-80"><ResponsiveContainer><BarChart data={data}><XAxis dataKey="name" fontSize={11}/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="materials" fill="var(--chart-1)" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div></article><article className="chart-card"><h2>Subject quality</h2><p>Average learner rating</p><div className="h-80"><ResponsiveContainer><PieChart><Pie data={data} dataKey="rating" nameKey="name" innerRadius={65} outerRadius={105}>{data.map((_,index)=><Cell key={index} fill={`var(--chart-${index%5+1})`}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div></article></div></div></AdminGuard>
}
