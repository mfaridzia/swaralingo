// node:path didukung workerd (nodejs_compat); node:fs TIDAK — dynamic import di LocalAudioStorage
import * as path from 'node:path';
import { getContext } from 'hono/context-storage';
import { isBunRuntime } from './config.js';
import type { R2Bucket } from '@cloudflare/workers-types';

const AUDIO_DIR = path.join(process.cwd(), 'audio');

// Key format: audio/{userId}/{uuid}.webm — mencegah path traversal & key tidak valid
const KEY_RE = /^audio\/\d+\/[0-9a-f-]{36}\.webm$/;

export interface StoredAudio {
  body: ReadableStream<Uint8Array>;
  contentType: string;
}

export interface AudioStorage {
  put(key: string, data: ArrayBuffer, contentType: string): Promise<void>;
  get(key: string): Promise<StoredAudio | null>;
  delete(key: string): Promise<void>;
}

export function isValidAudioKey(key: string): boolean {
  return KEY_RE.test(key);
}

export function keyUserId(key: string): string | null {
  return KEY_RE.test(key) ? key.split('/')[1] : null;
}

class R2AudioStorage implements AudioStorage {
  private get bucket(): R2Bucket {
    const env = getContext().env as Record<string, unknown>;
    const bucket = env.AUDIO_BUCKET as R2Bucket | undefined;
    if (!bucket) throw new Error('AUDIO_BUCKET binding is not configured');
    return bucket;
  }

  async put(key: string, data: ArrayBuffer, contentType: string): Promise<void> {
    await this.bucket.put(key, data, { httpMetadata: { contentType } });
  }

  async get(key: string): Promise<StoredAudio | null> {
    const obj = await this.bucket.get(key);
    if (!obj?.body) return null;
    return { body: obj.body as unknown as ReadableStream<Uint8Array>, contentType: obj.httpMetadata?.contentType || 'audio/webm' };
  }

  async delete(key: string): Promise<void> {
    await this.bucket.delete(key);
  }
}

class LocalAudioStorage implements AudioStorage {
  // node:fs tidak ada di workerd — import dinamis, hanya dieksekusi di runtime Bun
  private async fs() {
    return await import('node:fs/promises');
  }

  async put(key: string, data: ArrayBuffer, _contentType: string): Promise<void> {
    const fs = await this.fs();
    const full = path.join(AUDIO_DIR, key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, Buffer.from(data));
  }

  async get(key: string): Promise<StoredAudio | null> {
    try {
      const fs = await this.fs();
      const fh = await fs.open(path.join(AUDIO_DIR, key), 'r');
      return { body: fh.readableWebStream() as unknown as ReadableStream<Uint8Array>, contentType: 'audio/webm' };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const fs = await this.fs();
      await fs.unlink(path.join(AUDIO_DIR, key));
    } catch {
      // File tidak ada — abaikan
    }
  }
}

export function getAudioStorage(): AudioStorage {
  // Bun (local dev) → filesystem; workerd (wrangler dev / deploy) → R2
  return isBunRuntime ? new LocalAudioStorage() : new R2AudioStorage();
}
