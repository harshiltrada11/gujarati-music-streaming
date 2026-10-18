import type { Config } from '@netlify/functions';
import { and, desc, eq, gt } from 'drizzle-orm';
import { database } from '../../db/index.js';
import { catalog } from '../../db/schema.js';
import { failure } from '../lib/youtube.js';
export default async () => {try {const items=await database().select({id:catalog.id,title:catalog.title,channel:catalog.channel,thumbnail:catalog.thumbnail,publishedAt:catalog.publishedAt}).from(catalog).where(and(eq(catalog.approved,true),gt(catalog.fetchedAt,new Date(Date.now()-28*86400000)))).orderBy(desc(catalog.publishedAt)).limit(40);return Response.json({items},{headers:{'Cache-Control':'no-store'}});}catch(e){return failure(e);}};
export const config:Config={path:'/api/catalog',method:'GET'};
