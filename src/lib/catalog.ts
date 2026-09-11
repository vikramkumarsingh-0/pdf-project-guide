import { supabase } from '@/integrations/supabase/client';import type { MaterialDoc } from './recommendation';
export type Subject={id:string;name:string;category:string;description:string};
export async function getCatalog(){const[{data:materials,error},{data:subjects}]=await Promise.all([supabase.from('materials').select('*,subjects(name)').order('average_rating',{ascending:false}),supabase.from('subjects').select('*').order('name')]);if(error)throw error;return{materials:(materials||[]) as MaterialDoc[],subjects:(subjects||[]) as Subject[]}}
export async function openMaterial(m:MaterialDoc,userId?:string){if(userId){await supabase.from('material_views').insert({user_id:userId,material_id:m.id});}window.open(m.url,'_blank','noopener,noreferrer')}
