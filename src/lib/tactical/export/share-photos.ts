import { getPlayerPhotosBatch, getPlayersMasterBatch } from '@/lib/db/queries';
import type { PitchAppearanceConfig } from '@/lib/types/tactical-unified';
import type { TacticalPlayerLike, TacticalSceneLike } from './share-payload';

/**
 * Blob を Base64 Data URL に変換する
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to base64 string'));
      }
    };
    reader.onerror = () => {
      reject(reader.error || new Error('FileReader encountered an error'));
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Base64 Data URL または 画像 URL から ImageBitmap を生成する
 */
export async function createBitmapFromUrlOrBase64(
  urlOrBase64: string,
): Promise<ImageBitmap | null> {
  if (typeof globalThis.createImageBitmap !== 'function') {
    return null;
  }
  try {
    const res = await fetch(urlOrBase64);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await createImageBitmap(blob);
  } catch (err) {
    console.warn('[share-payload] Failed to create bitmap from image:', err);
    return null;
  }
}

export const MARBLE_TEXTURE_PATH = '/assets/pitch-marble-texture.jpg';

/**
 * 大理石テクスチャ画像をプリロードして ImageBitmap を返す
 */
export async function preloadMarbleTextureBitmap(
  pitchAppearance?:
    | PitchAppearanceConfig
    | { texture?: string; pitchBackgroundType?: string },
): Promise<ImageBitmap | null> {
  const texture =
    (
      pitchAppearance as
        | { texture?: string; pitchBackgroundType?: string }
        | undefined
    )?.texture ?? pitchAppearance?.pitchBackgroundType;
  if (
    texture !== 'marble' ||
    typeof globalThis.createImageBitmap !== 'function'
  ) {
    return null;
  }
  return await createBitmapFromUrlOrBase64(MARBLE_TEXTURE_PATH);
}

function extractTargetPlayers(
  scenes: TacticalSceneLike[],
): Map<string, string | undefined> {
  const target = new Map<string, string | undefined>();
  for (const scene of scenes) {
    if (!scene.players) continue;
    const list: TacticalPlayerLike[] = Array.isArray(scene.players)
      ? scene.players
      : Object.values(scene.players);
    for (const p of list) {
      const opt = p.options || p;
      const style = p.style || {};
      const isPhoto =
        style.insideContent === 'photo' ||
        opt.insideContent === 'photo' ||
        p.insideContent === 'photo';
      const pid = String(p.playerId ?? p.id ?? '');
      if (isPhoto && pid && !target.has(pid)) {
        const url =
          (p.photoUrl || style.photoUrl || opt.photoUrl || '').trim() ||
          undefined;
        target.set(pid, url);
      }
    }
  }
  return target;
}

/**
 * シーン情報から使用されている選手画像を抽出し、
 * IndexedDB の photoBlob または指定 URL から Base64 / URL の辞書を作成する
 */
export async function packPlayerPhotos(
  scenes: TacticalSceneLike[],
): Promise<Record<string, string>> {
  const photoMap: Record<string, string> = {};
  const targetPlayers = extractTargetPlayers(scenes);
  if (targetPlayers.size === 0) return photoMap;

  // 1. IndexedDB から選手写真 Blob および マスター情報を取得
  const numericIds = Array.from(targetPlayers.keys())
    .map((id) => Number(id))
    .filter((id) => typeof id === 'number' && !Number.isNaN(id) && id > 0);

  let photoBlobMap = new Map<number, Blob>();
  let masterMap = new Map<number, { photoBlob?: Blob; photoUrl?: string }>();

  if (numericIds.length > 0) {
    try {
      const [blobs, masters] = await Promise.all([
        getPlayerPhotosBatch(numericIds),
        getPlayersMasterBatch(numericIds),
      ]);
      photoBlobMap = blobs;
      masterMap = masters;
    } catch (dbErr) {
      console.warn('[share-payload] Failed to fetch players data:', dbErr);
    }
  }

  // 2. 各選手の画像を Base64 または URL として辞書化
  const promises = Array.from(targetPlayers.entries()).map(
    async ([playerId, specifiedUrl]) => {
      try {
        const numId = Number(playerId);
        const photoBlob = !Number.isNaN(numId)
          ? photoBlobMap.get(numId)
          : undefined;
        const master = !Number.isNaN(numId) ? masterMap.get(numId) : undefined;

        // パス A: ローカル保存された photoBlob がある場合は Base64 化 (完全オフライン可)
        const blobToConvert = photoBlob || master?.photoBlob;
        if (blobToConvert) {
          const base64 = await blobToBase64(blobToConvert);
          photoMap[playerId] = base64;
          return;
        }

        // パス B: 指定 URL またはマスター photoUrl
        const url = specifiedUrl || master?.photoUrl;
        if (url && url.trim() !== '') {
          // すでに Data URL の場合
          if (url.startsWith('data:')) {
            photoMap[playerId] = url;
            return;
          }
          // 外部 URL の場合、一度 fetch して Base64 に変換可能なら変換して埋め込む（CORS が許す場合）
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            const res = await fetch(url, {
              mode: 'cors',
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (res.ok) {
              const blob = await res.blob();
              const base64 = await blobToBase64(blob);
              photoMap[playerId] = base64;
              return;
            }
          } catch {
            // fetch 失敗時は URL のままフォールバック
          }
          photoMap[playerId] = url;
        }
      } catch (err) {
        console.warn(
          `[share-payload] Failed to pack photo for player ${playerId}:`,
          err,
        );
      }
    },
  );

  await Promise.allSettled(promises);
  return photoMap;
}

/**
 * スライド内の選手画像 (insideContent === 'photo') をプリロードし、
 * ImageBitmap のマップ (playerId -> ImageBitmap) を返す
 */
export async function preloadSlidePlayerPhotos(
  slides: TacticalSceneLike[],
  existingPhotos?: Record<string, string>,
): Promise<Record<string, ImageBitmap>> {
  const result: Record<string, ImageBitmap> = {};
  if (typeof globalThis.createImageBitmap !== 'function') {
    return result;
  }

  // 1. 写真表示が必要な選手マーカーを抽出
  const targetPlayers = extractTargetPlayers(slides);
  if (targetPlayers.size === 0) {
    return result;
  }

  // 2. existingPhotos に無い選手について、IndexedDB の player_photos を一括取得
  const neededDbIds: number[] = [];
  for (const pid of targetPlayers.keys()) {
    if (!existingPhotos?.[pid]) {
      const numId = Number(pid);
      if (!Number.isNaN(numId) && numId > 0) {
        neededDbIds.push(numId);
      }
    }
  }

  let photoBlobMap = new Map<number, Blob>();
  if (neededDbIds.length > 0) {
    try {
      photoBlobMap = await getPlayerPhotosBatch(neededDbIds);
    } catch (err) {
      console.warn('[share-payload] Failed to batch load player photos:', err);
    }
  }

  // 3. 各選手の ImageBitmap を並列生成
  const promises = Array.from(targetPlayers.entries()).map(
    async ([playerId, specifiedUrl]) => {
      try {
        // パス A: 共有ペイロードや引数で渡された existingPhotos を優先
        const existing = existingPhotos?.[playerId];
        if (existing) {
          const bitmap = await createBitmapFromUrlOrBase64(existing);
          if (bitmap) {
            result[playerId] = bitmap;
          }
          return;
        }

        // パス B: IndexedDB の photoBlob
        const numId = Number(playerId);
        const blob = !Number.isNaN(numId) ? photoBlobMap.get(numId) : undefined;
        if (blob) {
          const bitmap = await createImageBitmap(blob);
          if (bitmap) {
            result[playerId] = bitmap;
          }
          return;
        }

        // パス C: 指定 URL
        if (specifiedUrl) {
          const bitmap = await createBitmapFromUrlOrBase64(specifiedUrl);
          if (bitmap) {
            result[playerId] = bitmap;
          }
        }
      } catch (err) {
        console.warn(
          `[share-payload] Failed to preload photo for player ${playerId}:`,
          err,
        );
      }
    },
  );

  await Promise.allSettled(promises);
  return result;
}

/**
 * 共有ペイロードの photos 辞書から ImageBitmap 辞書を復元する
 */
export async function unpackPlayerPhotos(
  photos: Record<string, string>,
): Promise<Record<string, ImageBitmap>> {
  const result: Record<string, ImageBitmap> = {};
  if (!photos || Object.keys(photos).length === 0) {
    return result;
  }

  const promises = Object.entries(photos).map(
    async ([playerId, urlOrBase64]) => {
      if (!urlOrBase64) return;
      const bitmap = await createBitmapFromUrlOrBase64(urlOrBase64);
      if (bitmap) {
        result[playerId] = bitmap;
      }
    },
  );

  await Promise.allSettled(promises);
  return result;
}
