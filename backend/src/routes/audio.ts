import { Hono } from 'hono';
import { getAudioStorage, isValidAudioKey, keyUserId } from '../audioStorage.js';
import { requireAuth } from '../middleware/auth.js';

const audioRouter = new Hono();

// Identitas dari session token — ownership check vs key, bukan userId query client (menutup IDOR)
audioRouter.use('*', requireAuth);

// POST /api/audio — body binary mentah (Blob dari MediaRecorder)
audioRouter.post('/', async (c) => {
  try {
    const userId = String(c.get('authUserId'));

    const contentType = c.req.header('Content-Type') || 'audio/webm';
    if (!contentType.startsWith('audio/')) {
      return c.json({ success: false, error: 'Invalid Content-Type, expected audio/*' }, 415);
    }

    const data = await c.req.arrayBuffer();
    if (data.byteLength === 0) {
      return c.json({ success: false, error: 'Empty audio body' }, 400);
    }

    const key = `audio/${userId}/${crypto.randomUUID()}.webm`;
    await getAudioStorage().put(key, data, contentType);

    return c.json({ success: true, data: { audioKey: key, size: data.byteLength, contentType } });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /api/audio/audio/{userId}/{uuid}.webm — wildcard karena key mengandung slash
audioRouter.get('/*', async (c) => {
  try {
    const key = decodeURIComponent(c.req.path.slice('/api/audio/'.length));
    if (!isValidAudioKey(key)) {
      return c.json({ success: false, error: 'Invalid audio key' }, 400);
    }

    const userId = String(c.get('authUserId'));
    if (keyUserId(key) !== userId) {
      return c.json({ success: false, error: 'Forbidden' }, 403);
    }

    const audio = await getAudioStorage().get(key);
    if (!audio) {
      return c.json({ success: false, error: 'Audio not found' }, 404);
    }

    const headers: Record<string, string> = {
      'Content-Type': audio.contentType,
      'Cache-Control': 'private, max-age=31536000, immutable',
    };
    if (c.req.query('download') === '1') {
      headers['Content-Disposition'] = `attachment; filename="speaking-log-${key.split('/')[2]}"`;
    }

    return c.body(audio.body, 200, headers);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// DELETE /api/audio/audio/{userId}/{uuid}.webm — pembersihan orphan jika save log gagal
audioRouter.delete('/*', async (c) => {
  try {
    const key = decodeURIComponent(c.req.path.slice('/api/audio/'.length));
    if (!isValidAudioKey(key)) {
      return c.json({ success: false, error: 'Invalid audio key' }, 400);
    }

    const userId = String(c.get('authUserId'));
    if (keyUserId(key) !== userId) {
      return c.json({ success: false, error: 'Forbidden' }, 403);
    }

    await getAudioStorage().delete(key);
    return c.json({ success: true, data: null });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default audioRouter;
