import { getCloudflareContext } from '@opennextjs/cloudflare';
import type {
  TacticalExportSharePayload,
  TacticalExportShareSummary,
} from './share-payload';

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
  delete?(key: string): Promise<void>;
}

async function getKVBinding(): Promise<KVNamespaceLike | null> {
  // 1. 同期呼び出し (本番 Cloudflare Worker 環境)
  try {
    const ctx = getCloudflareContext();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kv = (ctx?.env as any)?.TACTICAL_SHARE_KV;
    if (kv && typeof kv.put === 'function') {
      return kv as KVNamespaceLike;
    }
  } catch (_e) {
    // ignore
  }

  // 2. 非同期呼び出し (dev / proxy 環境)
  try {
    const ctx = await getCloudflareContext({ async: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kv = (ctx?.env as any)?.TACTICAL_SHARE_KV;
    if (kv && typeof kv.put === 'function') {
      return kv as KVNamespaceLike;
    }
  } catch (_e) {
    // ignore
  }

  // 3. globalThis / process.env フォールバック
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const globalKv =
      (globalThis as any).process?.env?.TACTICAL_SHARE_KV ||
      (globalThis as any).TACTICAL_SHARE_KV ||
      (globalThis as any).__env__?.TACTICAL_SHARE_KV;
    if (globalKv && typeof globalKv.put === 'function') {
      return globalKv as KVNamespaceLike;
    }
  } catch (_e) {
    // ignore
  }

  return null;
}

function createSummary(
  shareId: string,
  payload: TacticalExportSharePayload,
): TacticalExportShareSummary {
  return {
    shareId,
    title: payload.title || 'Untitled Animation',
    createdAt: payload.createdAt,
    sceneCount: Array.isArray(payload.scenes) ? payload.scenes.length : 0,
    aspectRatio: payload.aspectRatio,
    orientation: payload.orientation,
    hasBoundaryCrop: Boolean(payload.boundaryBox),
  };
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
  const summary = createSummary(shareId, payload);

  // Cloudflare KV バインディングを試行
  try {
    const kv = await getKVBinding();
    if (kv) {
      await kv.put(shareId, serialized, {
        expirationTtl: ttlSeconds,
      });

      // __index__ にサマリーを追加・更新
      try {
        const rawIndex = await kv.get('__index__', { type: 'json' });
        const existingIndex: TacticalExportShareSummary[] = Array.isArray(
          rawIndex,
        )
          ? rawIndex
          : [];
        const filtered = existingIndex.filter(
          (item) => item.shareId !== shareId,
        );
        filtered.unshift(summary);
        await kv.put('__index__', JSON.stringify(filtered.slice(0, 50)));
      } catch (idxErr) {
        console.warn('[share-store] Failed to update KV __index__:', idxErr);
      }

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

/**
 * 保存された共有データの一覧を最新順（最大50件）で取得する
 */
export async function listSharedExportData(): Promise<
  TacticalExportShareSummary[]
> {
  // Cloudflare KV バインディングを試行
  try {
    const kv = await getKVBinding();
    if (kv) {
      const rawIndex = await kv.get('__index__', { type: 'json' });
      if (Array.isArray(rawIndex)) {
        return [...rawIndex]
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 50);
      }
    }
  } catch (err) {
    console.warn(
      '[share-store] Cloudflare KV list failed, falling back to memory:',
      err,
    );
  }

  // メモリストアから取得
  cleanupExpiredMemoryEntries();
  const summaries: TacticalExportShareSummary[] = Array.from(
    memoryStore.entries(),
  )
    .map(([id, entry]) => createSummary(id, entry.data))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 50);

  return summaries;
}

/**
 * 共有データを削除する
 */
export async function deleteSharedExportData(
  shareId: string,
): Promise<boolean> {
  if (!shareId) return false;

  // Cloudflare KV バインディングを試行
  try {
    const kv = await getKVBinding();
    if (kv) {
      const existing = await kv.get(shareId);
      if (existing) {
        if (typeof kv.delete === 'function') {
          await kv.delete(shareId);
        }
        try {
          const rawIndex = await kv.get('__index__', { type: 'json' });
          if (Array.isArray(rawIndex)) {
            const filtered = rawIndex.filter(
              (item: TacticalExportShareSummary) => item.shareId !== shareId,
            );
            await kv.put('__index__', JSON.stringify(filtered));
          }
        } catch (_e) {
          // ignore
        }
        return true;
      }
      return false;
    }
  } catch (err) {
    console.warn(
      '[share-store] Cloudflare KV delete failed, falling back to memory:',
      err,
    );
  }

  // メモリストアから削除
  if (memoryStore.has(shareId)) {
    memoryStore.delete(shareId);
    return true;
  }

  return false;
}

/**
 * メモリストアを全消去する (テスト用)
 */
export function clearSharedExportMemoryStore(): void {
  memoryStore.clear();
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
