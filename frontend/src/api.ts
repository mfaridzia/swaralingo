import { API_URL } from './config';
import { db } from './offline/db/dexie';
import { enqueueMutation, enqueueAudio as _enqueueAudio } from './offline/sync/engine';
import { getOfflineStore, isOnline } from './offline/store';

// Session auth via HttpOnly cookie (SameSite=None; Secure; Partitioned) — XSS tidak bisa baca token.
// credentials: 'include' agar cookie terkirim cross-site (vercel.app → workers.dev).

export { API_URL };

export interface ApiFetchOptions extends RequestInit {
  // Endpoint auth (login/register/google) memakai 401 untuk "credentials salah" —
  // bukan sesi expired. Set true agar apiFetch tidak me-redirect ke landing.
  skipAuthRedirect?: boolean;
}

export function clearAuth(): void {
  localStorage.removeItem('fluency_user');
}

// Paths that must always go to network (never cache offline)
const ONLINE_ONLY_PREFIXES = ['/auth/', '/auth', '/analyze', '/stats', '/transcribe', '/sync', '/seed'];

function shouldBypassInterceptor(path: string): boolean {
  return ONLINE_ONLY_PREFIXES.some(p => path.startsWith(p));
}

// Route map: API path prefix → Dexie table
const READ_TABLE_MAP: Record<string, 'logs' | 'chunks' | 'journals'> = {
  '/logs': 'logs',
  '/chunks': 'chunks',
  '/journals': 'journals',
};

function getReadTable(path: string): 'logs' | 'chunks' | 'journals' | null {
  for (const [prefix, table] of Object.entries(READ_TABLE_MAP)) {
    if (path.startsWith(prefix)) return table;
  }
  return null;
}

// Normalize created_at to ISO format for consistent Dexie sorting.
// Server sends "YYYY-MM-DD HH:MM:SS", client creates "YYYY-MM-DDTHH:MM:SS.sssZ".
function normalizeCreatedAt(created_at: string): string {
  if (!created_at) return created_at;
  if (/^\d{4}-\d{2}-\d{2}T/.test(created_at)) return created_at; // already ISO
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(created_at)) {
    return new Date(created_at.replace(' ', 'T') + 'Z').toISOString();
  }
  return created_at;
}

// Map Dexie-local records to API shape (add `id` from serverId/localId for React keys).
export function dexieToApiLogs(records: any[]): any[] {
  return records.map(r => ({
    ...r,
    id: r.serverId || r.localId,
    created_at: normalizeCreatedAt(r.created_at),
  }));
}

// Helper: convert Dexie records to server-like JSON response
function toJsonResponse(data: unknown, table?: string): Response {
  const mapped = table ? dexieToApiLogs(data as any[]) : data;
  return new Response(JSON.stringify({ success: true, data: mapped }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Helper: cache online GET response into Dexie
async function cacheGetResponse(table: 'logs' | 'chunks' | 'journals', userId: number, json: any): Promise<void> {
  if (!json.success || !Array.isArray(json.data)) return;

  for (const row of json.data) {
    const clientId = row.client_uuid || `server-${row.id}`;
    const base = {
      clientId,
      serverId: row.id,
      userId,
      updatedAt: row.updated_at || (row.created_at ? new Date(row.created_at).getTime() : Date.now()),
      synced: true,
    };

    if (table === 'logs') {
      await db.logs.put({
        ...base,
        user_input: row.user_input,
        ai_feedback: row.ai_feedback,
        improved_version: row.improved_version,
        audio_key: row.audio_key,
        audio_base64: row.audio_base64,
        mistake_category: row.mistake_category,
        created_at: normalizeCreatedAt(row.created_at),
      });
    } else if (table === 'chunks') {
      await db.chunks.put({
        ...base,
        phrase: row.phrase,
        meaning: row.meaning,
        example: row.example,
        category: row.category,
        next_review_at: row.next_review_at || row.created_at,
        interval: row.interval || 0,
        repetition: row.repetition || 0,
        easiness: row.easiness || 2.5,
        created_at: normalizeCreatedAt(row.created_at),
      });
    } else if (table === 'journals') {
      await db.journals.put({
        ...base,
        prompt: row.prompt,
        content: row.content,
        mood: row.mood,
        ai_reflection: row.ai_reflection,
        created_at: normalizeCreatedAt(row.created_at),
      });
    }
  }
}

// Satu-satunya jalur request API: attach cookie + auto-logout saat sesi invalid/expired.
// URL path relatif (mis. '/logs?userId=1') — API_URL di-prepend di sini.
// Offline-first: GET serves from Dexie, POST queues mutations, when offline mode enabled.
export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { skipAuthRedirect = false, ...fetchOptions } = options;
  const offline = !isOnline();
  const offlineMode = getOfflineStore().offlineModeEnabled;
  const isOnlineOnly = shouldBypassInterceptor(path);

  // --- Offline mode: intercept GET (read from Dexie when actually offline) ---
  if (offline && offlineMode && !isOnlineOnly && (fetchOptions.method || 'GET') === 'GET') {
    const table = getReadTable(path);
    if (table) {
      const records = await (table === 'logs' ? db.logs : table === 'chunks' ? db.chunks : db.journals)
        .orderBy('updatedAt')
        .reverse()
        .toArray();
      return toJsonResponse(records, table);
    }
    // Audio: serve from audioBlobs
    if (path.startsWith('/audio/')) {
      const key = path.replace('/audio/', '');
      const record = await db.audioBlobs.where('audioKey').equals(key).first();
      if (record && record.status === 'uploaded') {
        return new Response(record.blob, {
          status: 200,
          headers: { 'Content-Type': record.contentType },
        });
      }
      // Audio not cached locally — return 503
      return new Response(JSON.stringify({ success: false, error: 'Audio not available offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // --- Offline mode: intercept POST/PUT/DELETE (always queue locally, sync pushes in background) ---
  const reqMethod = (fetchOptions.method || 'GET').toUpperCase();
  if (offlineMode && !isOnlineOnly && (reqMethod === 'POST' || reqMethod === 'PUT' || reqMethod === 'DELETE') && path !== '/audio') {
    const body = fetchOptions.body ? JSON.parse(fetchOptions.body as string) : {};
    const table = getReadTable(path);

    if (table) {
      const operation = reqMethod === 'DELETE' ? 'delete' : reqMethod === 'PUT' ? 'update' : 'insert';
      // Inject created_at for inserts (body from mutations doesn't include it)
      if (operation === 'insert' && !body.created_at && !body.createdAt) {
        body.created_at = new Date().toISOString();
      }
      await enqueueMutation(table, operation, body);
      return toJsonResponse(body);
    }
  }

  // --- Online path (or online-only endpoint, or offline mode disabled) ---
  const res = await fetch(`${API_URL}${path}`, { ...fetchOptions, credentials: 'include' });

  if (res.status === 401 && !skipAuthRedirect) {
    clearAuth();
    if (window.location.pathname !== '/') window.location.href = '/';
    throw new Error('Session expired. Please sign in again.');
  }

  // Write-through cache: on successful online GET, cache in Dexie
  if (res.ok && (fetchOptions.method || 'GET') === 'GET' && offlineMode && !isOnlineOnly) {
    const table = getReadTable(path);
    if (table) {
      try {
        const cloned = res.clone();
        const json = await cloned.json();
        const userId = JSON.parse(localStorage.getItem('fluency_user') || '{}').id;
        if (userId) {
          await cacheGetResponse(table, userId, json);
        }
      } catch {
        // Cache write failed — non-critical, response still works
      }
    }
  }

  return res;
}
