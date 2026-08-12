import db from '../database.js';

/**
 * Pre-fetch initial dashboard data for new login session.
 * Called during login/register/google-auth to eliminate extra round trips.
 * Returns null if any query fails (non-blocking — auth still succeeds).
 */
export async function getInitialDashboardData(userId: number) {
  try {
    const [logs, chunks]: [any[], any[]] = await Promise.all([
      db.query(`
        SELECT id, user_input, ai_feedback, improved_version, created_at, audio_key,
               CASE WHEN audio_key IS NULL THEN NULL END AS audio_base64
        FROM practice_logs WHERE user_id = ? AND deleted_at IS NULL
        ORDER BY created_at DESC LIMIT 10
      `).all(userId),
      db.query(`
        SELECT id, phrase, meaning, example, category, created_at
        FROM sentence_chunks WHERE user_id = ? AND deleted_at IS NULL
        ORDER BY created_at DESC LIMIT 10
      `).all(userId),
    ]);

    // Normalize date format: Turso returns "YYYY-MM-DD HH:MM:SS" → ISO 8601
    const fmtDate = (d: string | null) => {
      if (d && typeof d === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(d)) {
        return d.replace(' ', 'T') + '.000Z';
      }
      return d;
    };
    const normalizedLogs = logs.map((l: any) => ({ ...l, created_at: fmtDate(l.created_at) }));
    const normalizedChunks = chunks.map((c: any) => ({ ...c, created_at: fmtDate(c.created_at) }));

    return {
      logs: { success: true, data: normalizedLogs },
      chunks: { success: true, data: normalizedChunks },
    };
  } catch (err) {
    console.error('Failed to preload dashboard data:', err);
    return null;
  }
}
