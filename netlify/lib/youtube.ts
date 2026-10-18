import { and, eq, gt, sql } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { database } from '../../db/index.js';
import { state } from '../../db/schema.js';
export class ApiError extends Error { constructor(public status: number, public code: string, message: string) { super(message); } }
export function key() { const value = Netlify.env.get('YOUTUBE_API_KEY'); if (!value) throw new ApiError(503, 'not_configured', 'YouTube discovery is not connected yet. Add YOUTUBE_API_KEY in Netlify project configuration → Environment variables, then redeploy.'); return value; }
export async function limit(id: string, max = 20, seconds = 60) {
 const db = database(); const bucket = Math.floor(Date.now() / (seconds * 1000));
 const k = 'rate:' + createHash('sha256').update(id + bucket).digest('hex');
 const [row] = await db.insert(state).values({ key:k, value:1, expiresAt:new Date(Date.now()+seconds*2000) }).onConflictDoUpdate({ target:state.key, set:{ value:sql`to_jsonb((${state.value}::text::integer + 1))` } }).returning();
 if (Number(row.value)>max) throw new ApiError(429,'rate_limited','Too many requests. Please try again in a minute.');
}
export async function youtube(resource: string, params: Record<string,string>) {
 const secret = key();
 const db = database();
 const blocked = await db.select().from(state).where(and(eq(state.key,'quota-cooldown'),gt(state.expiresAt,new Date())));
 if (blocked.length) throw new ApiError(429,'quota_exhausted','YouTube discovery has reached its API limit. Please try again later.');
 await limit('youtube-global', 36, 86400); // Bounded daily search budget; cache hits do not consume it.
 const url = new URL('https://www.googleapis.com/youtube/v3/'+resource);
 Object.entries({...params,key:secret}).forEach(([k,v])=>url.searchParams.set(k,v));
 for(let attempt=0;attempt<2;attempt++) {
  let response:Response;
  try { response=await fetch(url,{signal:AbortSignal.timeout(1200)}); } catch { if(attempt<1){await new Promise(r=>setTimeout(r,250*(attempt+1)));continue;} throw new ApiError(502,'source_unavailable','YouTube is taking too long to respond. Please try again.'); }
  if(response.status>=500 && attempt<1){await new Promise(r=>setTimeout(r,250*(attempt+1)));continue;}
  const data=await response.json();
  if(!response.ok){const reason=data.error?.errors?.[0]?.reason;
   if(reason==='quotaExceeded'||reason==='dailyLimitExceeded') { await db.insert(state).values({key:'quota-cooldown',value:true,expiresAt:new Date(Date.now()+3600000)}).onConflictDoUpdate({target:state.key,set:{expiresAt:new Date(Date.now()+3600000)}}); throw new ApiError(429,'quota_exhausted','YouTube daily discovery quota is exhausted. Please try again later.'); }
   throw new ApiError(response.status===403?503:502,'source_error','YouTube discovery is temporarily unavailable. Check the server API configuration.');
  }
  return data;
 }
 throw new ApiError(502,'source_error','YouTube is temporarily unavailable.');
}
export function validateQuery(input:string) {
 const q=input.normalize('NFKC').trim().replace(/\s+/g,' ');
 if(q.length<2||q.length>120||/[\p{Cc}]/u.test(q)) throw new ApiError(400,'invalid_query','Enter a music search between 2 and 120 characters.');
 if(/\b(hindi|punjabi|tamil|telugu|english|bhojpuri|marathi)\b/i.test(q)) throw new ApiError(400,'gujarati_only','NAVRATRI is dedicated to Gujarati-language music. Try a Gujarati artist, song, or category.');
 return q;
}
export async function discover(query:string, pageToken='', recent=false) {
 const q=validateQuery(query); if(pageToken&&!/^[a-zA-Z0-9_=-]{1,200}$/.test(pageToken)) throw new ApiError(400,'invalid_page','Invalid page token.');
 const db=database(); const cacheKey='search:'+createHash('sha256').update(JSON.stringify([q,pageToken,recent])).digest('hex');
 const [cached]=await db.select().from(state).where(and(eq(state.key,cacheKey),gt(state.expiresAt,new Date())));
 if(cached) return cached.value as any;
 const result=await youtube('search',{part:'snippet',type:'video',maxResults:'20',q:`${q} Gujarati music official`,videoEmbeddable:'true',videoCategoryId:'10',relevanceLanguage:'gu',safeSearch:'strict', ...(pageToken?{pageToken}:{}),...(recent?{order:'date',publishedAfter:new Date(Date.now()-7*86400000).toISOString()}:{})});
 const ids=[...new Set<string>((result.items||[]).map((x:any)=>x.id.videoId))];
 const details=ids.length?await youtube('videos',{part:'snippet,status',id:ids.join(',')}):{items:[]};
 const candidates=(details.items||[]).filter((v:any)=>v.status.embeddable && v.status.privacyStatus==='public').map((v:any)=>{
  const s=v.snippet; const audio=s.defaultAudioLanguage?.toLowerCase();
  // A Gujarati title or query alone does not verify the spoken/sung language.
  const approved=Boolean(audio && /^gu(?:-|$)/.test(audio) && s.categoryId==='10');
  return {id:v.id,title:s.title,channel:s.channelTitle,thumbnail:s.thumbnails?.high?.url||s.thumbnails?.medium?.url,publishedAt:s.publishedAt,language:audio||null,category:q,approved,reason:approved?'Gujarati audio language declared by source':'Requires human language verification',source:'youtube'};
 });
 const value={items:candidates.filter((x:any)=>x.approved),candidates,nextPageToken:result.nextPageToken||null,unverifiedCount:candidates.filter((x:any)=>!x.approved).length};
 await db.insert(state).values({key:cacheKey,value,expiresAt:new Date(Date.now()+3600000)}).onConflictDoUpdate({target:state.key,set:{value,expiresAt:new Date(Date.now()+3600000)}});
 return value;
}
export function failure(error:unknown) { const e=error instanceof ApiError?error:new ApiError(503,'service_unavailable','The music service is temporarily unavailable. Please try again later.'); return Response.json({error:e.message,code:e.code},{status:e.status,headers:{'Cache-Control':'no-store',...(e.status===429?{'Retry-After':'60'}:{})}}); }
