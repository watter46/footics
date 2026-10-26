import { getCloudflareContext } from '@opennextjs/cloudflare';

export interface KVNamespaceLike {
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ): Promise<void>;
  get(key: string, options?: { type?: 'text' | 'json' }): Promise<unknown>;
  delete?(key: string): Promise<void>;
}

function isKVNamespaceLike(obj: unknown): obj is KVNamespaceLike {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'put' in obj &&
    typeof (obj as KVNamespaceLike).put === 'function'
  );
}

interface CloudflareContextLike {
  env?: {
    TACTICAL_SHARE_KV?: unknown;
  };
}

export async function getKVBinding(): Promise<KVNamespaceLike | null> {
  // 1. 同期呼び出し (本番 Cloudflare Worker 環境)
  try {
    const ctx = getCloudflareContext() as CloudflareContextLike | undefined;
    const kv = ctx?.env?.TACTICAL_SHARE_KV;
    if (isKVNamespaceLike(kv)) {
      return kv;
    }
  } catch (_e) {
    // ignore
  }

  // 2. 非同期呼び出し (dev / proxy 環境)
  try {
    const ctx = (await getCloudflareContext({
      async: true,
    })) as CloudflareContextLike | undefined;
    const kv = ctx?.env?.TACTICAL_SHARE_KV;
    if (isKVNamespaceLike(kv)) {
      return kv;
    }
  } catch (_e) {
    // ignore
  }

  // 3. globalThis / process.env フォールバック
  try {
    const g = globalThis;
    const proc =
      'process' in g && typeof g.process === 'object' && g.process !== null
        ? (g.process as { env?: Record<string, unknown> })
        : undefined;
    const envObj =
      '__env__' in g && typeof g.__env__ === 'object' && g.__env__ !== null
        ? (g.__env__ as Record<string, unknown>)
        : undefined;
    const globalKv =
      proc?.env?.TACTICAL_SHARE_KV ||
      ('TACTICAL_SHARE_KV' in g ? g.TACTICAL_SHARE_KV : undefined) ||
      envObj?.TACTICAL_SHARE_KV;
    if (isKVNamespaceLike(globalKv)) {
      return globalKv;
    }
  } catch (_e) {
    // ignore
  }

  return null;
}
