import { getPlayerPhotosBatch } from '@/lib/db/player-photos';
import {
  findPlayerPhotosByNames,
  getPlayersMasterBatch,
} from '@/lib/db/queries';
import type { PlayerMaster } from '@/lib/db/schema';

export interface PlayerPhotoTarget {
  key: string;
  playerId?: string | number;
  name?: string;
  photoUrl?: string;
}

export type PlayerPhotoSource =
  | { kind: 'blob'; blob: Blob }
  | { kind: 'url'; url: string };

function parseValidPlayerId(
  id: string | number | undefined,
): number | undefined {
  if (id === undefined || id === null || id === '') return undefined;
  const n = Number(id);
  if (Number.isNaN(n) || n === 0) return undefined;
  return n;
}

/**
 * 選手写真の取得ロジックを一括解決するリゾルバー。
 * 取得優先順位:
 * ① player_photos[playerId] の Blob
 * ② players マスターの photoBlob
 * ③ マーカー/ターゲット指定 photoUrl
 * ④ players マスターの photoUrl
 * ⑤ 選手名（正規化）一致の写真 Blob
 */
export async function resolvePlayerPhotoSources(
  targets: PlayerPhotoTarget[],
): Promise<Map<string, PlayerPhotoSource>> {
  const results = new Map<string, PlayerPhotoSource>();
  if (!targets || targets.length === 0) return results;

  // 同一 key の重複ターゲットは先頭1件にまとめる
  const uniqueTargets = new Map<string, PlayerPhotoTarget>();
  for (const t of targets) {
    if (t?.key && !uniqueTargets.has(t.key)) {
      uniqueTargets.set(t.key, t);
    }
  }
  const targetList = Array.from(uniqueTargets.values());
  if (targetList.length === 0) return results;

  // 有効な数値 playerId を持つ targets を抽出
  const targetsWithNumericId = targetList
    .map((t) => ({ target: t, numericId: parseValidPlayerId(t.playerId) }))
    .filter(
      (item): item is { target: PlayerPhotoTarget; numericId: number } =>
        item.numericId !== undefined,
    );

  // ① player_photos から Blob 一括取得
  const playerIdsForPhotos = Array.from(
    new Set(targetsWithNumericId.map((item) => item.numericId)),
  );

  let photoBlobs = new Map<number, Blob>();
  if (playerIdsForPhotos.length > 0) {
    try {
      photoBlobs = await getPlayerPhotosBatch(playerIdsForPhotos);
    } catch (error) {
      console.warn('Failed to get player photos batch:', error);
    }
  }

  for (const { target, numericId } of targetsWithNumericId) {
    const blob = photoBlobs.get(numericId);
    if (blob) {
      results.set(target.key, { kind: 'blob', blob });
    }
  }

  // ② & ④: ①で解決しなかった数値 playerId 持ち選手について players マスターを一括取得
  const unresolvedWithNumericId = targetsWithNumericId.filter(
    ({ target }) => !results.has(target.key),
  );
  const remainingPlayerIds = Array.from(
    new Set(unresolvedWithNumericId.map((item) => item.numericId)),
  );

  let masters = new Map<number, PlayerMaster>();
  if (remainingPlayerIds.length > 0) {
    try {
      masters = await getPlayersMasterBatch(remainingPlayerIds);
    } catch (error) {
      console.warn('Failed to get players master batch:', error);
    }
  }

  for (const { target, numericId } of unresolvedWithNumericId) {
    const master = masters.get(numericId);
    if (master?.photoBlob) {
      // ② players マスターの photoBlob
      results.set(target.key, { kind: 'blob', blob: master.photoBlob });
    } else {
      const targetUrl = target.photoUrl?.trim();
      const masterUrl = master?.photoUrl?.trim();
      if (targetUrl) {
        // ③ マーカー指定 photoUrl
        results.set(target.key, { kind: 'url', url: targetUrl });
      } else if (masterUrl) {
        // ④ マスターの photoUrl
        results.set(target.key, { kind: 'url', url: masterUrl });
      }
    }
  }

  // ③ 数値 playerId を持たないターゲットについて target.photoUrl を解決
  for (const target of targetList) {
    if (!results.has(target.key)) {
      const targetUrl = target.photoUrl?.trim();
      if (targetUrl) {
        results.set(target.key, { kind: 'url', url: targetUrl });
      }
    }
  }

  // ⑤ ①〜④ で未解決かつ name を持つ選手について名前一致 Blob を一括検索
  const unresolvedWithNames = targetList.filter((t) => {
    if (results.has(t.key)) return false;
    const name = t.name?.trim();
    return Boolean(name);
  });

  if (unresolvedWithNames.length > 0) {
    const namesToSearch = Array.from(
      new Set(unresolvedWithNames.map((t) => t.name!.trim())),
    );
    let nameBlobs = new Map<string, Blob>();
    try {
      nameBlobs = await findPlayerPhotosByNames(namesToSearch);
    } catch (error) {
      console.warn('Failed to find player photos by names:', error);
    }

    for (const target of unresolvedWithNames) {
      const trimmedName = target.name!.trim();
      const blob = nameBlobs.get(trimmedName);
      if (blob) {
        results.set(target.key, { kind: 'blob', blob });
      }
    }
  }

  return results;
}
