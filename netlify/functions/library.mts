import type { Config } from '@netlify/functions';
import { getUser } from '@netlify/identity';
import { and, eq, gt, inArray } from 'drizzle-orm';
import { database } from '../../db/index.js';
import { library, catalog } from '../../db/schema.js';
import { ApiError, failure, limit } from '../lib/youtube.js';
// Persist video references, never duplicate API metadata into private libraries.
function ids(items: any[]) { return [...new Set(items.map(x=>typeof x==='string'?x:x?.id))].filter((id):id is string=>typeof id==='string'&&/^[\w-]{11}$/.test(id)); }
export default async (req:Request) => {try {
 const user=await getUser(); if(!user)return Response.json({error:'Sign in to save your library.'},{status:401});
 const db=database();
 if(req.method==='GET'){
  const [row]=await db.select().from(library).where(eq(library.userId,user.id));
  const data:any=row?.data||{favorites:[],playlists:[],history:[],searches:[]};
  const all=ids([...data.favorites,...data.history,...data.playlists.flatMap((p:any)=>p.tracks)]);
  const items=all.length?await db.select().from(catalog).where(and(inArray(catalog.id,all),eq(catalog.approved,true),gt(catalog.fetchedAt,new Date(Date.now()-28*86400000)))):[];
  const hydrate=(refs:string[])=>refs.map(id=>items.find(t=>t.id===id)).filter(Boolean).map((t:any)=>({id:t.id,title:t.title,channel:t.channel,thumbnail:t.thumbnail,publishedAt:t.publishedAt}));
  return Response.json({...data,favorites:hydrate(data.favorites),history:hydrate(data.history),playlists:data.playlists.map((p:any)=>({...p,tracks:hydrate(p.tracks)}))},{headers:{'Cache-Control':'private, no-store'}});
 }
 if(req.headers.get('Origin')!==new URL(req.url).origin)return new Response('Forbidden',{status:403});
 await limit('library:'+user.id,40);
 const raw=await req.text(); if(raw.length>150000)throw new ApiError(413,'library_too_large','Your library exceeds the storage limit.');
 let data:any;try{data=JSON.parse(raw);}catch{throw new ApiError(400,'invalid_library','Invalid library data.');}
 if(!Array.isArray(data.favorites)||!Array.isArray(data.playlists)||!Array.isArray(data.history)||!Array.isArray(data.searches)||data.playlists.length>100||data.favorites.length>500||data.history.length>100||data.playlists.some((p:any)=>typeof p.id!=='string'||typeof p.name!=='string'||!Array.isArray(p.tracks)||p.tracks.length>500))throw new ApiError(400,'invalid_library','Invalid library data.');
 const value={favorites:ids(data.favorites),history:ids(data.history),playlists:data.playlists.map((p:any)=>({id:p.id.slice(0,80),name:p.name.slice(0,80),tracks:ids(p.tracks)})),searches:data.searches.filter((s:any)=>typeof s==='string').slice(0,8).map((s:string)=>s.slice(0,120))};
 await db.insert(library).values({userId:user.id,data:value}).onConflictDoUpdate({target:library.userId,set:{data:value,updatedAt:new Date()}});return Response.json({success:true},{headers:{'Cache-Control':'private, no-store'}});
}catch(e){return failure(e);}};
export const config:Config={path:'/api/library',method:['GET','PUT']};
