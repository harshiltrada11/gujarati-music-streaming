import { pgTable, text, timestamp, integer, jsonb, boolean } from 'drizzle-orm/pg-core';
export const catalog = pgTable('catalog', {
 id: text('id').primaryKey(), title: text('title').notNull(), channel: text('channel').notNull(), thumbnail: text('thumbnail').notNull(), publishedAt: timestamp('published_at').notNull(), fetchedAt: timestamp('fetched_at').notNull().defaultNow(), language: text('language'), category: text('category').notNull(), approved: boolean('approved').notNull().default(false), reason: text('reason').notNull(),
}).enableRLS();
export const syncRuns = pgTable('sync_runs', { id: text('id').primaryKey(), startedAt: timestamp('started_at').notNull().defaultNow(), completedAt: timestamp('completed_at'), status: text('status').notNull(), added: integer('added').notNull().default(0), message: text('message') }).enableRLS();
export const state = pgTable('app_state', { key: text('key').primaryKey(), value: jsonb('value').notNull(), expiresAt: timestamp('expires_at').notNull() }).enableRLS();
export const library = pgTable('user_library', { userId: text('user_id').primaryKey(), data: jsonb('data').notNull(), updatedAt: timestamp('updated_at').notNull().defaultNow() }).enableRLS();
