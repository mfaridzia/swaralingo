import * as dotenv from 'dotenv';
dotenv.config();

import { getContext } from 'hono/context-storage';

export const PORT = process.env.PORT || 3000;

export function getEnvVar(key: string): string {
  try {
    const c = getContext();
    return c.env[key] || process.env[key] || '';
  } catch (e) {
    return process.env[key] || '';
  }
}

export const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

export const ANALYZE_MAX_REQUESTS = parseInt(process.env.ANALYZE_MAX_REQUESTS || '6', 10);
export const ANALYZE_LIMIT_WINDOW_MS = parseInt(process.env.ANALYZE_LIMIT_WINDOW_MS || '60000', 10);
export const AUTH_MAX_REQUESTS = parseInt(process.env.AUTH_MAX_REQUESTS || '15', 10);
export const AUTH_LIMIT_WINDOW_MS = parseInt(process.env.AUTH_LIMIT_WINDOW_MS || '60000', 10);
