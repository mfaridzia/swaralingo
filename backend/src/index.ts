import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { PORT, CORS_ORIGIN } from './config.js';

import authRouter from './routes/auth.js';
import logsRouter from './routes/logs.js';
import chunksRouter from './routes/chunks.js';
import statsRouter from './routes/stats.js';
import analyzeRouter from './routes/analyze.js';
import seedRouter from './routes/seed.js';
import journalsRouter from './routes/journals.js';
import audioRouter from './routes/audio.js';
import transcribeRouter from './routes/transcribe.js';

import { initDB } from './database.js';

import { contextStorage } from 'hono/context-storage';

if (process.env.NODE_ENV !== 'production') {
  await initDB();
}

const app = new Hono();

app.use('*', contextStorage());

app.get('/api/init-db', async (c) => {
  try {
    await initDB();
    return c.json({ success: true, message: 'Database initialized/migrated successfully' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.use('/*', (c, next) => {
  const origin = c.env?.CORS_ORIGIN || CORS_ORIGIN;
  const corsMiddleware = cors({
    origin,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });
  return corsMiddleware(c, next);
});

app.route('/api/auth', authRouter);
app.route('/api/logs', logsRouter);
app.route('/api/chunks', chunksRouter);
app.route('/api/stats', statsRouter);
app.route('/api/analyze', analyzeRouter);
app.route('/api/seed', seedRouter);
app.route('/api/journals', journalsRouter);
app.route('/api/audio', audioRouter);
app.route('/api/transcribe', transcribeRouter);

export default {
  port: PORT,
  fetch: app.fetch,
};
