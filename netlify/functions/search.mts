import type { Config, Context } from '@netlify/functions';
import { database } from '../../db/index.js';
import { catalog } from '../../db/schema.js';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { discover, failure, key, limit } from '../lib/youtube.js';
export default async (req:Request,context:Context) => {try {
 key(); await limit('search:'+context.ip,12);
 const url=new URL(req.url); const result=await discover(url.searchParams.get('q')||'Gujarati Garba',url.searchParams.get('page')||'');
 const db=database(); const values=result.candidates.filter((t:any)=>t.thumbnail&&t.publishedAt).map((item:any)=>{const {source,...data}=item;return {...data,publishedAt:new Date(data.publishedAt),fetchedAt:new Date()};});
 if(values.length)await db.insert(catalog).values(values).onConflictDoUpdate({target:catalog.id,set:{title:sql`excluded.title`,channel:sql`excluded.channel`,thumbnail:sql`excluded.thumbnail`,fetchedAt:new Date(),approved:sql`${catalog.approved} OR excluded.approved`}});
 const ids=values.map((t:any)=>t.id);
 const approved=ids.length?await db.select({id:catalog.id,title:catalog.title,channel:catalog.channel,thumbnail:catalog.thumbnail,publishedAt:catalog.publishedAt}).from(catalog).where(and(inArray(catalog.id,ids),eq(catalog.approved,true))):[];
 return Response.json({items:approved.sort((a,b)=>ids.indexOf(a.id)-ids.indexOf(b.id)),nextPageToken:result.nextPageToken,unverifiedCount:values.length-approved.length},{headers:{'Cache-Control':'no-store'}});
}catch(error){return failure(error);}};
export const config:Config={path:'/api/search',method:'GET'};
