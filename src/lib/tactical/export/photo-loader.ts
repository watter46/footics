import { getPlayersMasterBatch } from '@/lib/db/queries';
import type { TacticalScene } from '@/stores/tactical-animation-store';

/**
 * 選手写真の Blob キャッシュ（URL -> Blob）
 * ImageBitmap は Worker へ transfer するとメインスレッドで detached になるため、
 * 再利用可能な Blob レベルでメモリキャッシュを保持します。
 */
const photoBlobCache = new Map<string, Blob>();

/**
 * キャッシュの全クリア（テスト用・メモリ解放用）
 */
export function clearPhotoCache(): void {
  photoBlobCache.clear();
}

/**
 * 現在のキャッシュエントリ数を取得
 */
export function getPhotoCacheSize(): number {
  return photoBlobCache.size;
}

/**
 * 選手写真 (photoBlob / photoUrl) を ImageBitmap として事前ロード
 * - 写真を使用していない場合 (insideContent !== 'photo' など) は fetch 処理を完全にスキップ
 * - IndexedDB (players テーブル) に photoBlob が存在する場合は直接 createImageBitmap(blob) を生成 (0ms / 0 fetch)
 * - 外部URLの場合は一度取得した画像を Blob としてメモリにキャッシュし、2回目以降のフェッチを不要化
 */
export async function preloadPlayerPhotos(
  scenes: TacticalScene[],
): Promise<Record<string, ImageBitmap>> {
  const photos: Record<string, ImageBitmap> = {};

  if (typeof window === 'undefined' || !('createImageBitmap' in window)) {
    return photos;
  }

  // 写真表示が必要なマーカーのみを抽出 (playerId -> photoUrl)
  const targetPlayers = new Map<string, string | undefined>();
  for (const scene of scenes) {
    if (!scene.players) continue;
    for (const p of Object.values(scene.players)) {
      if (
        p.options?.insideContent === 'photo' &&
        !targetPlayers.has(p.playerId)
      ) {
        const url = p.options.photoUrl?.trim() || undefined;
        // 写真URLがあるか、もしくはplayerIdが存在する場合に対象とする
        targetPlayers.set(p.playerId, url);
      }
    }
  }

  // 写真が一切使われていない場合は、fetchループや非同期処理を完全スキップ
  if (targetPlayers.size === 0) {
    return photos;
  }

  // 1. IndexedDB から選手マスターを一括取得 (ローカル photoBlob を優先)
  const numericIds = Array.from(targetPlayers.keys())
    .map((id) => Number(id))
    .filter((id) => typeof id === 'number' && !Number.isNaN(id) && id > 0);

  let masterMap = new Map<number, { photoBlob?: Blob; photoUrl?: string }>();
  if (numericIds.length > 0) {
    try {
      masterMap = await getPlayersMasterBatch(numericIds);
    } catch (dbErr) {
      console.warn(
        '[photo-loader] Failed to fetch player masters from DB:',
        dbErr,
      );
    }
  }

  // 2. 各選手の ImageBitmap を並列生成 (DB Blob -> メモリキャッシュ -> 外部URL fetch)
  const promises = Array.from(targetPlayers.entries()).map(
    async ([playerId, specifiedUrl]) => {
      try {
        const numId = Number(playerId);
        const master = !Number.isNaN(numId) ? masterMap.get(numId) : undefined;

        // パス A: IndexedDB 内の photoBlob から直接生成 (最速・0 fetch)
        if (master?.photoBlob) {
          const bitmap = await createImageBitmap(master.photoBlob);
          photos[playerId] = bitmap;
          return;
        }

        // パス B: 外部 URL または Blob URL からの取得
        const url = specifiedUrl || master?.photoUrl;
        if (!url || url.trim() === '') {
          return;
        }

        let blob: Blob | undefined = photoBlobCache.get(url);

        if (!blob) {
          // タイムアウト設定 (外部サーバー遅延によるフリーズ防止: 3秒)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);

          try {
            const res = await fetch(url, {
              mode: 'cors',
              signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!res.ok) {
              console.warn(
                `Failed to fetch photo for player ${playerId} (${res.status} ${res.statusText}): ${url}`,
              );
              return;
            }
            blob = await res.blob();
            photoBlobCache.set(url, blob);
          } catch (fetchErr) {
            clearTimeout(timeoutId);
            console.warn(
              `Fetch error or timeout for player ${playerId} photo:`,
              fetchErr,
            );
            return;
          }
        }

        const bitmap = await createImageBitmap(blob);
        photos[playerId] = bitmap;
      } catch (e) {
        console.warn(`Failed to create ImageBitmap for player ${playerId}:`, e);
      }
    },
  );

  await Promise.allSettled(promises);
  return photos;
}
