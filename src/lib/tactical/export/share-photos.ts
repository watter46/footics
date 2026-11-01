import { getPlayerPhotoKey } from '@/lib/tactical/player-photo-key';
import {
  type PlayerPhotoSource,
  type PlayerPhotoTarget,
  resolvePlayerPhotoSources,
} from '@/lib/tactical/player-photo-resolver';
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
): Map<string, PlayerPhotoTarget> {
  const target = new Map<string, PlayerPhotoTarget>();
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
      const key = getPlayerPhotoKey(p);
      if (isPhoto && key && !target.has(key)) {
        const photoUrl =
          (p.photoUrl || style.photoUrl || opt.photoUrl || '').trim() ||
          undefined;
        const name = typeof p.name === 'string' ? p.name : undefined;
        target.set(key, {
          key,
          playerId: p.playerId ?? p.id,
          name,
          photoUrl,
        });
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

  let sources = new Map<string, PlayerPhotoSource>();
  try {
    sources = await resolvePlayerPhotoSources(
      Array.from(targetPlayers.values()),
    );
  } catch (err) {
    console.warn('[share-payload] Failed to resolve player photos:', err);
  }

  // 各選手の画像を Base64 または URL として辞書化
  const promises = Array.from(sources.entries()).map(async ([key, source]) => {
    try {
      // パス A: Blob の場合は Base64 化
      if (source.kind === 'blob') {
        const base64 = await blobToBase64(source.blob);
        photoMap[key] = base64;
        return;
      }

      // パス B: URL
      const url = source.url;
      if (url && url.trim() !== '') {
        // すでに Data URL の場合
        if (url.startsWith('data:')) {
          photoMap[key] = url;
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
            photoMap[key] = base64;
            return;
          }
        } catch {
          // fetch 失敗時は URL のままフォールバック
        }
        photoMap[key] = url;
      }
    } catch (err) {
      console.warn(
        `[share-payload] Failed to pack photo for player ${key}:`,
        err,
      );
    }
  });

  await Promise.allSettled(promises);
  return photoMap;
}

/**
 * スライド内の選手画像 (insideContent === 'photo') をプリロードし、
 * ImageBitmap のマップ (playerId -> ImageBitmap) を返す
 */
export async function preloadPlayerPhotos(
  scenes: TacticalSceneLike[],
  existingPhotos?: Record<string, string>,
): Promise<Record<string, ImageBitmap>> {
  const result: Record<string, ImageBitmap> = {};
  if (typeof globalThis.createImageBitmap !== 'function') {
    return result;
  }

  // 1. 写真表示が必要な選手マーカーを抽出
  const targetPlayers = extractTargetPlayers(scenes);
  if (targetPlayers.size === 0) {
    return result;
  }

  // 2. existingPhotos にある選手とない選手を分離
  const existingToLoad: Array<{ key: string; photoData: string }> = [];
  const neededTargets: PlayerPhotoTarget[] = [];

  for (const [key, target] of targetPlayers) {
    const existing = existingPhotos?.[key];
    if (existing) {
      existingToLoad.push({ key, photoData: existing });
    } else {
      neededTargets.push(target);
    }
  }

  // 3. existingPhotos にない選手のみ resolver で一括解決（全員解決済みなら DB 呼出なし）
  let resolvedSources = new Map<string, PlayerPhotoSource>();
  if (neededTargets.length > 0) {
    try {
      resolvedSources = await resolvePlayerPhotoSources(neededTargets);
    } catch (err) {
      console.warn('[share-payload] Failed to resolve player photos:', err);
    }
  }

  // 4. 各選手の ImageBitmap を並列生成
  const existingPromises = existingToLoad.map(async ({ key, photoData }) => {
    try {
      const bitmap = await createBitmapFromUrlOrBase64(photoData);
      if (bitmap) {
        result[key] = bitmap;
      }
    } catch (err) {
      console.warn(
        `[share-payload] Failed to preload existing photo for player ${key}:`,
        err,
      );
    }
  });

  const resolvedPromises = Array.from(resolvedSources.entries()).map(
    async ([key, source]) => {
      try {
        if (source.kind === 'blob') {
          const bitmap = await createImageBitmap(source.blob);
          if (bitmap) {
            result[key] = bitmap;
          }
        } else if (source.kind === 'url') {
          const bitmap = await createBitmapFromUrlOrBase64(source.url);
          if (bitmap) {
            result[key] = bitmap;
          }
        }
      } catch (err) {
        console.warn(
          `[share-payload] Failed to preload photo for player ${key}:`,
          err,
        );
      }
    },
  );

  await Promise.allSettled([...existingPromises, ...resolvedPromises]);
  return result;
}

export const preloadSlidePlayerPhotos = preloadPlayerPhotos;

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
