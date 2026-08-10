import { db } from './db/dexie';
import { API_URL } from '../config';

/**
 * Progressive hydration: download recent data to Dexie when offline mode is enabled.
 * Called on settings toggle ON. React Query GET requests also write-through to Dexie
 * during normal online usage — this is the explicit, toggle-driven backfill.
 */
export async function backfillRecent(userId: number, days = 30): Promise<void> {
  try {
    // Fetch logs
    const logsRes = await fetch(`${API_URL}/logs`, { credentials: 'include' });
    if (logsRes.ok) {
      const logsJson = await logsRes.json();
      if (logsJson.success && Array.isArray(logsJson.data)) {
        const records = logsJson.data.map((l: any) => ({
          clientId: l.client_uuid || `server-${l.id}`,
          serverId: l.id,
          userId,
          user_input: l.user_input,
          ai_feedback: l.ai_feedback,
          improved_version: l.improved_version,
          audio_key: l.audio_key,
          audio_base64: l.audio_base64,
          mistake_category: l.mistake_category,
          created_at: l.created_at,
          updatedAt: l.updated_at || (new Date(l.created_at).getTime()),
          synced: true,
        }));
        await db.logs.bulkPut(records);
      }
    }

    // Fetch chunks
    const chunksRes = await fetch(`${API_URL}/chunks`, { credentials: 'include' });
    if (chunksRes.ok) {
      const chunksJson = await chunksRes.json();
      if (chunksJson.success && Array.isArray(chunksJson.data)) {
        const records = chunksJson.data.map((c: any) => ({
          clientId: c.client_uuid || `server-${c.id}`,
          serverId: c.id,
          userId,
          phrase: c.phrase,
          meaning: c.meaning,
          example: c.example,
          category: c.category,
          next_review_at: c.next_review_at || c.created_at,
          interval: c.interval || 0,
          repetition: c.repetition || 0,
          easiness: c.easiness || 2.5,
          created_at: c.created_at,
          updatedAt: c.updated_at || (new Date(c.created_at).getTime()),
          synced: true,
        }));
        await db.chunks.bulkPut(records);
      }
    }

    // Fetch journals
    const journalsRes = await fetch(`${API_URL}/journals`, { credentials: 'include' });
    if (journalsRes.ok) {
      const journalsJson = await journalsRes.json();
      if (journalsJson.success && Array.isArray(journalsJson.data)) {
        const records = journalsJson.data.map((j: any) => ({
          clientId: j.client_uuid || `server-${j.id}`,
          serverId: j.id,
          userId,
          prompt: j.prompt,
          content: j.content,
          mood: j.mood,
          ai_reflection: j.ai_reflection,
          created_at: j.created_at,
          updatedAt: j.updated_at || (new Date(j.created_at).getTime()),
          synced: true,
        }));
        await db.journals.bulkPut(records);
      }
    }
  } catch {
    // Backfill failed — progressive hydration will happen via React Query GETs on page visits
  }
}

export async function clearOfflineData(): Promise<void> {
  await db.logs.clear();
  await db.chunks.clear();
  await db.journals.clear();
  await db.audioBlobs.clear();
  await db.pendingSync.clear();
}
