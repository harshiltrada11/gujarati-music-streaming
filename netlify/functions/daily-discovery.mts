import type { Config } from '@netlify/functions';
import { synchronize } from '../lib/sync.js';
export default async () => { await synchronize(); };
export const config:Config={schedule:'0 3 * * *'};
