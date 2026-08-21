import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { TacticalExportSharePayload } from './share-payload';

// メモリ内フォールバックストア (開発環境 / KV未設定時 / テスト用)
interface MemoryEntry {
  data: TacticalExportSharePayload;
  expiresAt: number;
}

const memoryStore = new Map<string, MemoryEntry>();

// 24時間 (86400秒)
const DEFAULT_TTL_SECONDS = 86400;

interface KVNamespaceLike {
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ): Promise<void>;
  get(key: string, options?: { type?: 'text' | 'json' }): Promise<any>;
}

async function getKVBinding(): Promise<KVNamespaceLike | null> {
  // 1. @opennextjs/cloudflare の getCloudflareContext から取得
  try {
    const { env } = await getCloudflareContext({ async: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kv = (env as any)?.TACTICAL_SHARE_KV;
    if (kv && typeof kv.put === 'function') {
      return kv as KVNamespaceLike;
    }
  } catch (_e) {
    // OpenNext context が存在しない環境 (Vitest等)
  }

  // 2. globalThis / process.env フォールバック
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const globalKv =
      (globalThis as any).process?.env?.TACTICAL_SHARE_KV ||
      (globalThis as any).TACTICAL_SHARE_KV;
    if (globalKv && typeof globalKv.put === 'function') {
      return globalKv as KVNamespaceLike;
    }
  } catch (_e) {
    // ignore
  }

  return null;
}

/**
 * 共有データを保存し、共有ID (8〜10文字) を発行する
 */
export async function saveSharedExportData(
  payload: TacticalExportSharePayload,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<string> {
  const shareId = generateShareId();
  const serialized = JSON.stringify(payload);

  // Cloudflare KV バインディングを試行
  try {
    const kv = await getKVBinding();
    if (kv) {
      await kv.put(shareId, serialized, {
        expirationTtl: ttlSeconds,
      });
      return shareId;
    }
  } catch (err) {
    console.warn(
      '[share-store] Cloudflare KV save failed, falling back to memory:',
      err,
    );
  }

  // メモリストアに保存
  memoryStore.set(shareId, {
    data: payload,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });

  // 期限切れエントリの簡易クリーンアップ
  cleanupExpiredMemoryEntries();

  return shareId;
}

/**
 * 共有IDからデータを取得する
 */
export async function getSharedExportData(
  shareId: string,
): Promise<TacticalExportSharePayload | null> {
  if (!shareId) return null;

  // Cloudflare KV バインディングを試行
  try {
    const kv = await getKVBinding();
    if (kv) {
      const raw = await kv.get(shareId, { type: 'json' });
      if (raw) {
        return raw as TacticalExportSharePayload;
      }
    }
  } catch (err) {
    console.warn(
      '[share-store] Cloudflare KV get failed, falling back to memory:',
      err,
    );
  }

  // メモリストアから取得
  const entry = memoryStore.get(shareId);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(shareId);
    return null;
  }

  return entry.data;
}

function generateShareId(): string {
  // 10桁の安全な英数字ID
  const chars = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ';
  let result = '';
  const bytes = new Uint8Array(10);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
    for (let i = 0; i < 10; i++) {
      result += chars[bytes[i] % chars.length];
    }
  } else {
    for (let i = 0; i < 10; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return result;
}

function cleanupExpiredMemoryEntries(): void {
  const now = Date.now();
  for (const [id, entry] of memoryStore.entries()) {
    if (now > entry.expiresAt) {
      memoryStore.delete(id);
    }
  }
}
