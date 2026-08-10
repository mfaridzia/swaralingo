import Dexie, { type Table } from 'dexie';

// --- Shared interfaces ---

export interface LogRecord {
  localId?: number;        // auto-incremented by Dexie
  clientId: string;        // UUID v4, generated on creation
  serverId?: number;       // assigned by backend after sync
  userId: number;
  user_input: string;
  ai_feedback: string;
  improved_version: string;
  audio_key?: string | null;
  audio_base64?: string | null;
  audioBlobId?: number;    // FK ke audioBlobs untuk audio offline (sebelum sync)
  mistake_category?: string;
  created_at: string;      // ISO date from server or client
  updatedAt: number;       // epoch ms (LWW key)
  synced: boolean;         // true after successful server sync
}

export interface ChunkRecord {
  localId?: number;
  clientId: string;
  serverId?: number;
  userId: number;
  phrase: string;
  meaning: string;
  example: string;
  category: string;
  next_review_at: string;
  interval: number;
  repetition: number;
  easiness: number;
  created_at: string;
  updatedAt: number;
  synced: boolean;
}

export interface JournalRecord {
  localId?: number;
  clientId: string;
  serverId?: number;
  userId: number;
  prompt: string | null;
  content: string;
  mood: string;
  ai_reflection: string;
  created_at: string;
  updatedAt: number;
  synced: boolean;
}

export interface AudioBlobRecord {
  id?: number;
  audioKey?: string;       // assigned after upload
  blob: Blob;
  contentType: string;     // 'audio/webm'
  size: number;            // bytes
  status: 'local' | 'uploaded';
  createdAt: number;       // epoch ms
}

export interface PendingMutation {
  id?: number;
  table: 'logs' | 'chunks' | 'journals';
  operation: 'insert' | 'update' | 'delete';
  clientId: string;
  data: Record<string, unknown>;
  clientUpdatedAt: number;
  retries: number;
  status: 'pending' | 'syncing' | 'failed' | 'dead';
  lastError?: string;
  audioBlobId?: number;    // FK into audioBlobs if audio queued too
  createdAt: number;
}

// --- Database ---

export class SwaraLingoDB extends Dexie {
  logs!: Table<LogRecord, number>;
  chunks!: Table<ChunkRecord, number>;
  journals!: Table<JournalRecord, number>;
  audioBlobs!: Table<AudioBlobRecord, number>;
  pendingSync!: Table<PendingMutation, number>;

  constructor() {
    super('swaralingo');

    this.version(1).stores({
      logs: '++localId, clientId, userId, created_at, synced',
      chunks: '++localId, clientId, userId, created_at, synced',
      journals: '++localId, clientId, userId, created_at, synced',
      audioBlobs: '++id, audioKey, status',
      pendingSync: '++id, table, clientId, status, createdAt',
    });

    // v2: add updatedAt index for consistent epoch-ms sorting
    this.version(2).stores({
      logs: '++localId, clientId, userId, created_at, synced, updatedAt',
      chunks: '++localId, clientId, userId, created_at, synced, updatedAt',
      journals: '++localId, clientId, userId, created_at, synced, updatedAt',
      audioBlobs: '++id, audioKey, status',
      pendingSync: '++id, table, clientId, status, createdAt',
    });
  }
}

export const db = new SwaraLingoDB();
