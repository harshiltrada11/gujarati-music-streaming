import { and, eq, lt, sql } from 'drizzle-orm';
import { database } from '../../db/index.js';
import { catalog, state, syncRuns } from '../../db/schema.js';
import { ApiError, discover, key } from './youtube.js';
export async function synchronize() {
 const db=database(); const id=crypto.randomUUID(); const now=new Date();
 const lock=await db.insert(state).values({key:'sync-lock',value:id,expiresAt:new Date(Date.now()+120000)}).onConflictDoUpdate({target:state.key,set:{value:id,expiresAt:new Date(Date.now()+120000)},setWhere:lt(state.expiresAt,now)}).returning();
 if(!lock.length) throw new ApiError(409,'sync_running','A synchronization is already in progress.');
 await db.insert(syncRuns).values({id,status:'running'});
 let added=0;
 try {
  // Delete stale API-derived metadata instead of retaining it beyond policy limits.
  await db.delete(catalog).where(lt(catalog.fetchedAt,new Date(Date.now()-28*86400000)));
  await db.delete(state).where(lt(state.expiresAt,now));
  key();
  for(const query of ['Gujarati Garba Navratri','Gujarati folk bhajan devotional','Gujarati film new song']) {
   const result=await discover(query,'',true);
   const values=result.candidates.filter((item:any)=>item.thumbnail&&item.publishedAt&&new Date(item.publishedAt).getTime()<=Date.now()).map((item:any)=>{const {source,...data}=item;return {...data,publishedAt:new Date(data.publishedAt),fetchedAt:new Date()};});
   if(values.length){
    const rows=await db.insert(catalog).values(values).onConflictDoUpdate({target:catalog.id,set:{title:sql`excluded.title`,channel:sql`excluded.channel`,thumbnail:sql`excluded.thumbnail`,fetchedAt:new Date(),language:sql`excluded.language`,approved:sql`${catalog.approved} OR excluded.approved`}}).returning({id:catalog.id});
    added+=rows.length;
   }
  }
  await db.update(syncRuns).set({status:'success',completedAt:new Date(),added,message:'Metadata refreshed. Unverified audio languages await admin review.'}).where(eq(syncRuns.id,id));
  return {status:'success',processed:added};
 } catch(error) {
  await db.update(syncRuns).set({status:'failed',completedAt:new Date(),added,message:error instanceof ApiError?error.code:'database_or_source_failure'}).where(eq(syncRuns.id,id)); throw error;
 } finally {await db.delete(state).where(and(eq(state.key,'sync-lock'),sql`${state.value} = ${JSON.stringify(id)}::jsonb`));}
}
