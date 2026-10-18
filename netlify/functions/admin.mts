import type { Config, Context } from '@netlify/functions';
import { getUser } from '@netlify/identity';
import { count, desc, eq, gt, and } from 'drizzle-orm';
import { database } from '../../db/index.js';
import { catalog, syncRuns } from '../../db/schema.js';
import { failure, limit } from '../lib/youtube.js';
import { synchronize } from '../lib/sync.js';
export default async (req:Request,context:Context) => {try {
 const user=await getUser();
 if(!user || !user.roles?.includes('admin')) return Response.json({error:'Administrator access required.'},{status:403});
 const db=database();
 if(req.method==='GET') { const runs=await db.select().from(syncRuns).orderBy(desc(syncRuns.startedAt)).limit(15); const pending=await db.select().from(catalog).where(and(eq(catalog.approved,false),gt(catalog.fetchedAt,new Date(Date.now()-28*86400000)))).limit(50); const [total]=await db.select({count:count()}).from(catalog); return Response.json({runs,pending,total:total.count,apiConfigured:Boolean(Netlify.env.get('YOUTUBE_API_KEY')),schedule:'Daily at 03:00 UTC; production execution must be verified in Netlify.'},{headers:{'Cache-Control':'private, no-store'}}); }
 if(req.headers.get('Origin')!==new URL(req.url).origin)return new Response('Forbidden',{status:403});
 await limit('admin:'+user.id,3);
 const data=await req.json();
 if(data.action==='sync') return Response.json(await synchronize());
 if(!/^[\w-]{11}$/.test(data.id)) return Response.json({error:'Invalid video ID.'},{status:400});
 if(data.action==='approve') await db.update(catalog).set({approved:true,reason:'Gujarati language verified by administrator'}).where(eq(catalog.id,data.id));
 else if(data.action==='remove') await db.delete(catalog).where(eq(catalog.id,data.id));
 else return Response.json({error:'Unknown action.'},{status:400});
 return Response.json({success:true});
}catch(e){return failure(e);}};
export const config:Config={path:'/api/admin',method:['GET','POST']};
