import { API_URL } from './config';
import { db } from './offline/db/dexie';
import { enqueueMutation } from './offline/sync/engine';
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
  localStorage.removeItem('swaralingo_token');
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

// Helper: cache online GET response into Dexie (upsert by clientId — no duplicates)
async function cacheGetResponse(table: 'logs' | 'chunks' | 'journals', userId: number, json: any): Promise<void> {
  if (!json.success || !Array.isArray(json.data)) return;

  const dexieTable = table === 'logs' ? db.logs : table === 'chunks' ? db.chunks : db.journals;
  const rows = json.data as any[];

  // Find existing records by clientId so we upsert (not blind insert → duplicates)
  const clientIds = rows.map(r => r.client_uuid || `server-${r.id}`);
  const existing = await dexieTable.where('clientId').anyOf(clientIds).toArray();
  const existingByClient = new Map(existing.map(r => [r.clientId, r]));

  const records = rows.map(row => {
    const clientId = row.client_uuid || `server-${row.id}`;
    const prev = existingByClient.get(clientId);
    const localId = prev?.localId; // undefined if new → Dexie auto-generates
    const base = {
      localId,
      clientId,
      serverId: row.id,
      userId,
      updatedAt: row.updated_at || (row.created_at ? new Date(row.created_at).getTime() : Date.now()),
      synced: true,
    };

    if (table === 'logs') {
      return {
        ...base,
        user_input: row.user_input,
        ai_feedback: row.ai_feedback,
        improved_version: row.improved_version,
        audio_key: row.audio_key || (prev as any)?.audio_key,
        audio_base64: row.audio_base64,
        audioBlobId: (prev as any)?.audioBlobId, // preserve offline audio ref
        mistake_category: row.mistake_category,
        created_at: normalizeCreatedAt(row.created_at),
      };
    } else if (table === 'chunks') {
      const createdAt = normalizeCreatedAt(row.created_at);
      return {
        ...base,
        phrase: row.phrase,
        meaning: row.meaning,
        example: row.example,
        category: row.category,
        next_review_at: row.next_review_at || createdAt,
        interval: row.interval || 0,
        repetition: row.repetition || 0,
        easiness: row.easiness || 2.5,
        created_at: createdAt,
      };
    } else {
      // journals
      return {
        ...base,
        prompt: row.prompt,
        content: row.content,
        mood: row.mood,
        ai_reflection: row.ai_reflection,
        created_at: normalizeCreatedAt(row.created_at),
      };
    }
  });

  await (dexieTable as any).bulkPut(records);
}

// Satu-satunya jalur request API: attach cookie + auto-logout saat sesi invalid/expired.
// URL path relatif (mis. '/logs?userId=1') — API_URL di-prepend di sini.
// Offline-first: GET serves from Dexie, POST queues mutations, when offline mode enabled.
export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { skipAuthRedirect = false, ...fetchOptions } = options;
  const offlineMode = getOfflineStore().offlineModeEnabled;
  const isOnlineOnly = shouldBypassInterceptor(path);
  const reqMethod = (fetchOptions.method || 'GET').toUpperCase();

  const serveGetFromDexie = async () => {
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
      return new Response(JSON.stringify({ success: false, error: 'Audio not available offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    throw new Error('Not found in Dexie');
  };

  // --- Offline mode: intercept GET (read from Dexie ONLY when offline) ---
  if (offlineMode && !isOnlineOnly && reqMethod === 'GET' && !isOnline()) {
    try {
      return await serveGetFromDexie();
    } catch {
      // Fall through to online if serveGetFromDexie fails
    }
  }

  // --- Offline mode: intercept POST/PUT/DELETE (always queue locally, sync pushes in background) ---
  if (offlineMode && !isOnlineOnly && (reqMethod === 'POST' || reqMethod === 'PUT' || reqMethod === 'DELETE') && path !== '/audio') {
    let body: Record<string, unknown> = {};
    try {
      body = fetchOptions.body ? JSON.parse(fetchOptions.body as string) : {};
    } catch {
      // Ignored
    }
    const table = getReadTable(path);

    if (table) {
      const operation = reqMethod === 'DELETE' ? 'delete' : reqMethod === 'PUT' ? 'update' : 'insert';
      
      // Determine clientId for update or delete
      if (operation === 'update' || operation === 'delete') {
        if (!body.clientId && !body.client_uuid && !body.clientUuid && !body.id) {
          const pathSegments = path.split('?')[0].split('/');
          const lastSegment = pathSegments[pathSegments.length - 1];
          const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
          if (uuidRegex.test(lastSegment)) {
            body.clientId = lastSegment;
          } else {
            const urlParams = new URLSearchParams(path.split('?')[1] || '');
            const idParam = urlParams.get('id') || urlParams.get('clientId') || urlParams.get('client_uuid') || urlParams.get('clientUuid');
            if (idParam) {
              body.clientId = idParam;
            }
          }
        }
      }

      // Inject defaults for inserts (mutation body may omit these)
      if (operation === 'insert') {
        if (!body.created_at && !body.createdAt) body.created_at = new Date().toISOString();
        if (table === 'chunks') {
          if (body.interval == null) body.interval = 0;
          if (body.repetition == null) body.repetition = 0;
          if (body.easiness == null) body.easiness = 2.5;
        }
      }
      const clientId = await enqueueMutation(table, operation, body);
      // Read back full record from Dexie (body alone is incomplete — missing server-only fields like mood)
      const dexieTable = table === 'logs' ? db.logs : table === 'chunks' ? db.chunks : db.journals;
      const record = await dexieTable.where('clientId').equals(clientId).first();
      if (record) {
        return toJsonResponse(dexieToApiLogs([record])[0]);
      }
      return toJsonResponse(body);
    }
  }

  // --- Online path (or online-only endpoint, or offline mode disabled) ---
  try {
    const token = localStorage.getItem('swaralingo_token');
    const headers = {
      ...(fetchOptions.headers || {}),
    } as Record<string, string>;

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}${path}`, { 
      ...fetchOptions, 
      headers,
      credentials: 'include' 
    });

    if (res.status === 401 && !skipAuthRedirect) {
      clearAuth();
      if (window.location.pathname !== '/') window.location.href = '/';
      throw new Error('Session expired. Please sign in again.');
    }

    // Write-through cache: on successful online GET, cache in Dexie
    if (res.ok && reqMethod === 'GET' && offlineMode && !isOnlineOnly) {
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
          // Cache write failed — non-critical
        }
      }
    }

    return res;
  } catch (err) {
    if (offlineMode && !isOnlineOnly && reqMethod === 'GET') {
      try {
        return await serveGetFromDexie();
      } catch {
        // Fall through
      }
    }
    throw err;
  }
}

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
  window.dispatchEvent(new CustomEvent('showToast', { detail: { message, type } }));
}
