import { z } from 'zod';
import { getPlayersMasterBatch } from '@/lib/db/queries';
import type {
  AnimationOrientation,
  TacticalScene,
} from '@/stores/tactical-animation-store';

export const TacticalExportSharePayloadSchema = z.object({
  version: z.number().default(1),
  createdAt: z.number(),
  title: z.string().optional(),
  scenes: z.array(z.any()), // TacticalScene[]
  orientation: z.enum(['vertical', 'horizontal']),
  teamVisibility: z.enum(['both', 'home', 'away']).optional().default('both'),
  photos: z.record(z.string(), z.string()).optional().default({}), // playerId -> base64 DataURL or Image URL
  exportFps: z
    .union([z.literal(30), z.literal(60)])
    .optional()
    .default(30),
});

export type TacticalExportSharePayload = z.infer<
  typeof TacticalExportSharePayloadSchema
> & {
  scenes: TacticalScene[];
  orientation: AnimationOrientation;
  exportFps: 30 | 60;
};

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
  if (typeof window === 'undefined' || !('createImageBitmap' in window)) {
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

/**
 * シーン情報から使用されている選手画像を抽出し、
 * IndexedDB の photoBlob または指定 URL から Base64 / URL の辞書を作成する
 */
export async function packPlayerPhotos(
  scenes: TacticalScene[],
): Promise<Record<string, string>> {
  const photoMap: Record<string, string> = {};

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
        targetPlayers.set(p.playerId, url);
      }
    }
  }

  if (targetPlayers.size === 0) {
    return photoMap;
  }

  // 1. IndexedDB から選手マスターを取得
  const numericIds = Array.from(targetPlayers.keys())
    .map((id) => Number(id))
    .filter((id) => typeof id === 'number' && !Number.isNaN(id) && id > 0);

  let masterMap = new Map<number, { photoBlob?: Blob; photoUrl?: string }>();
  if (numericIds.length > 0) {
    try {
      masterMap = await getPlayersMasterBatch(numericIds);
    } catch (dbErr) {
      console.warn('[share-payload] Failed to fetch players master:', dbErr);
    }
  }

  // 2. 各選手の画像を Base64 または URL として辞書化
  const promises = Array.from(targetPlayers.entries()).map(
    async ([playerId, specifiedUrl]) => {
      try {
        const numId = Number(playerId);
        const master = !Number.isNaN(numId) ? masterMap.get(numId) : undefined;

        // パス A: ローカル保存された photoBlob がある場合は Base64 化 (完全オフライン可)
        if (master?.photoBlob) {
          const base64 = await blobToBase64(master.photoBlob);
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
