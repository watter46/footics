import type { EventRow, Match } from '@/types';
import type { CustomEvent, MatchMemo } from '../schema';
import {
  dispatchRefreshEvent,
  getMatchMemo,
  putMatchMemo,
  saveCustomEvent,
} from './extension-db-queries';
import { db, type PlayerMaster, type PlayerPhoto } from './schema';

export { dispatchRefreshEvent, getMatchMemo, putMatchMemo, saveCustomEvent };

// ──────────────────────────────────────────────
// Custom Event Operations
// ──────────────────────────────────────────────

export async function getCustomEventsByMatch(
  matchId: string,
): Promise<CustomEvent[]> {
  return db.custom_events.where('match_id').equals(matchId).toArray();
}

export async function deleteCustomEvent(id: string): Promise<void> {
  const event = await db.custom_events.get(id);
  const matchId = event?.match_id;
  await db.custom_events.delete(id);
  if (matchId) dispatchRefreshEvent(matchId);
}

export async function getAllCustomEvents(): Promise<CustomEvent[]> {
  return db.custom_events.toArray();
}

// ──────────────────────────────────────────────
// Match Memo Operations
// ──────────────────────────────────────────────

export async function getAllMatchMemos(): Promise<MatchMemo[]> {
  return db.match_memos.toArray();
}

// ──────────────────────────────────────────────
// Match Registry Operations
// ──────────────────────────────────────────────

export async function getAllMatches(): Promise<Match[]> {
  return db.matches.toArray();
}

export async function getMatch(matchId: string): Promise<Match | null> {
  const data = await db.matches.get(matchId);
  return data ?? null;
}

export async function putMatch(match: Match): Promise<void> {
  await db.matches.put(match);
}

export async function putMatchesBatch(matches: Match[]): Promise<void> {
  await db.matches.bulkPut(matches);
}

// ──────────────────────────────────────────────
// Events Operations
// ──────────────────────────────────────────────

export async function getEventsByMatch(
  matchId: string | number,
): Promise<EventRow[]> {
  return db.events.where('match_id').equals(matchId).toArray();
}

export async function putMatchEventsBatch(events: EventRow[]): Promise<void> {
  await db.events.bulkPut(events);
}

export async function getAllEvents(): Promise<EventRow[]> {
  return db.events.toArray();
}

// ──────────────────────────────────────────────
// Combined/Atomic Operations
// ──────────────────────────────────────────────

/**
 * 試合情報とイベントデータをアトミックに保存する。
 * 既存の同 matchId に紐づくイベントを削除してから再挿入（delete-then-insert パターン）。
 * 複合主キー [match_id+id] を使用しているため、match_id インデックスで絞り込んで削除する。
 */
export async function saveMatchUnified(
  match: Match,
  events: EventRow[],
): Promise<void> {
  await db.transaction('rw', [db.matches, db.events], async () => {
    // Step 1: Upsert match metadata
    await db.matches.put(match);
    // Step 2: Delete old events for this match before reinserting
    await db.events.where('match_id').equals(match.id).delete();
    // Step 3: Bulk insert new events
    if (events.length > 0) {
      await db.events.bulkPut(events);
    }
  });
  dispatchRefreshEvent(match.id);
}

export async function deleteMatch(matchId: string): Promise<void> {
  await db.transaction('rw', [db.matches, db.events], async () => {
    await db.matches.delete(matchId);
    await db.events.where('match_id').equals(matchId).delete();
  });
}

// ──────────────────────────────────────────────
// Key-Value Store Operations
// ──────────────────────────────────────────────

export async function getKeyValue<T = any>(key: string): Promise<T | null> {
  const entry = await db.keyval.get(key);
  return (entry?.value as T) ?? null;
}

export async function setKeyValue<T = any>(
  key: string,
  value: T,
): Promise<void> {
  await db.keyval.put({
    key,
    value,
    updatedAt: Date.now(),
  });
}

export async function deleteKeyValue(key: string): Promise<void> {
  await db.keyval.delete(key);
}

// ──────────────────────────────────────────────
// Player Photo Operations
// ──────────────────────────────────────────────

/**
 * 選手の顔写真 (Blob) を専用テーブルに保存
 */
export async function savePlayerPhoto(
  playerId: number,
  photoBlob: Blob,
): Promise<void> {
  await db.player_photos.put({
    playerId,
    photoBlob,
    mimeType: photoBlob.type || 'image/webp',
    updatedAt: Date.now(),
  });
  dispatchRefreshEvent();
}

/**
 * 単一選手の写真を取得
 */
export async function getPlayerPhoto(
  playerId: number,
): Promise<PlayerPhoto | undefined> {
  return db.player_photos.get(playerId);
}

/**
 * 複数選手の写真を一括取得 (Map<playerId, Blob> 形式)
 */
export async function getPlayerPhotosBatch(
  playerIds: number[],
): Promise<Map<number, Blob>> {
  const map = new Map<number, Blob>();
  if (!playerIds || playerIds.length === 0) return map;

  const validIds = Array.from(new Set(playerIds)).filter(
    (id) => typeof id === 'number' && !Number.isNaN(id),
  );
  if (validIds.length === 0) return map;

  const photos = await db.player_photos
    .where('playerId')
    .anyOf(validIds)
    .toArray();
  for (const photo of photos) {
    if (photo.photoBlob) {
      map.set(photo.playerId, photo.photoBlob);
    }
  }
  return map;
}

/**
 * すべての選手写真を取得
 */
export async function getAllPlayerPhotos(): Promise<PlayerPhoto[]> {
  return db.player_photos.toArray();
}

/**
 * 選手の登録写真を削除
 */
export async function deletePlayerPhoto(
  playerId: number,
  _season?: string,
): Promise<void> {
  await db.player_photos.delete(playerId);
  dispatchRefreshEvent();
}

// ──────────────────────────────────────────────
// Player Master Operations (試合横断マスター・シーズン別対応)
// ──────────────────────────────────────────────

export function generatePlayerMasterId(
  season: string,
  playerId: number,
): string {
  return `${season}_${playerId}`;
}

/**
 * 単一選手のマスター情報を取得 (season指定があれば特定シーズン、無ければ該当playerIdの最新レコード)
 * player_photos から photoBlob を JOIN 結合して返す。
 */
export async function getPlayerMaster(
  playerId: number,
  season?: string,
): Promise<PlayerMaster | undefined> {
  let record: PlayerMaster | undefined;
  if (season) {
    const id = generatePlayerMasterId(season, playerId);
    record = await db.players.get(id);
  } else {
    record = await db.players.where('playerId').equals(playerId).first();
  }

  if (!record) return undefined;

  const photo = await db.player_photos.get(record.playerId);
  return {
    ...record,
    photoBlob: photo?.photoBlob,
  };
}

/**
 * シーズン別の選手マスター一覧を取得 (除外選手は除く)
 * player_photos から photoBlob を JOIN 結合して返す。
 */
export async function getPlayerMastersBySeason(
  season: string,
  teamName?: string,
): Promise<PlayerMaster[]> {
  const query = db.players.where('season').equals(season);
  let records: PlayerMaster[];
  if (teamName) {
    records = await query
      .filter((p) => (p.teamName || 'Chelsea') === teamName && !p.isExcluded)
      .toArray();
  } else {
    records = await query.filter((p) => !p.isExcluded).toArray();
  }

  if (records.length === 0) return [];

  const playerIds = records.map((p) => p.playerId);
  const photoMap = await getPlayerPhotosBatch(playerIds);

  return records.map((p) => ({
    ...p,
    photoBlob: photoMap.get(p.playerId),
  }));
}

/**
 * シーズン別の除外された選手マスター一覧（またはID Set）を取得
 * player_photos から photoBlob を JOIN 結合して返す。
 */
export async function getExcludedPlayerMastersBySeason(
  season: string,
  teamName?: string,
): Promise<PlayerMaster[]> {
  const query = db.players.where('season').equals(season);
  let records: PlayerMaster[];
  if (teamName) {
    records = await query
      .filter((p) => (p.teamName || 'Chelsea') === teamName && !!p.isExcluded)
      .toArray();
  } else {
    records = await query.filter((p) => !!p.isExcluded).toArray();
  }

  if (records.length === 0) return [];

  const playerIds = records.map((p) => p.playerId);
  const photoMap = await getPlayerPhotosBatch(playerIds);

  return records.map((p) => ({
    ...p,
    photoBlob: photoMap.get(p.playerId),
  }));
}

/**
 * 選手マスター情報を新規作成 / 更新
 * 物理 players テーブルには photoBlob を保存せず、photoBlob がある場合は savePlayerPhoto に委譲。
 */
export async function savePlayerMaster(
  player: Partial<PlayerMaster> & {
    playerId: number;
    name: string;
    season?: string;
  },
): Promise<void> {
  const season = player.season || '26-27';
  const id = player.id || generatePlayerMasterId(season, player.playerId);

  const existing = await db.players.get(id);
  const { photoBlob, ..._rest } = player;

  const updated: PlayerMaster = {
    id,
    playerId: player.playerId,
    name: player.name,
    season,
    defaultShirtNo: player.defaultShirtNo ?? existing?.defaultShirtNo,
    position: player.position ?? existing?.position ?? 'Other',
    photoUrl: player.photoUrl ?? existing?.photoUrl,
    teamName: player.teamName ?? existing?.teamName ?? 'Chelsea',
    isExcluded: player.isExcluded ?? false,
    updatedAt: Date.now(),
  };

  await db.players.put(updated);

  if (photoBlob) {
    await savePlayerPhoto(player.playerId, photoBlob);
  } else {
    dispatchRefreshEvent();
  }
}

/**
 * 複数選手のマスター情報を一括取得 (Map<playerId, PlayerMaster> 形式)
 * player_photos から photoBlob を JOIN 結合して返す。
 */
export async function getPlayersMasterBatch(
  playerIds: number[],
  season?: string,
): Promise<Map<number, PlayerMaster>> {
  const map = new Map<number, PlayerMaster>();
  if (!playerIds || playerIds.length === 0) return map;

  const validIds = Array.from(new Set(playerIds)).filter(
    (id) => typeof id === 'number' && !Number.isNaN(id),
  );
  if (validIds.length === 0) return map;

  let results: PlayerMaster[] = [];
  if (season) {
    results = await db.players
      .where('season')
      .equals(season)
      .filter((p) => validIds.includes(p.playerId))
      .toArray();
  } else {
    results = await db.players.where('playerId').anyOf(validIds).toArray();
  }

  const foundIds = results.map((p) => p.playerId);
  const photoMap = await getPlayerPhotosBatch(foundIds);

  for (const player of results) {
    map.set(player.playerId, {
      ...player,
      photoBlob: photoMap.get(player.playerId),
    });
  }
  return map;
}

/**
 * 全ての選手マスター情報を取得
 * player_photos から photoBlob を JOIN 結合して返す。
 */
export async function getAllPlayerMasters(): Promise<PlayerMaster[]> {
  const records = await db.players.toArray();
  if (records.length === 0) return [];

  const playerIds = records.map((p) => p.playerId);
  const photoMap = await getPlayerPhotosBatch(playerIds);

  return records.map((p) => ({
    ...p,
    photoBlob: photoMap.get(p.playerId),
  }));
}

/**
 * 選手マスター情報を削除またはシーズンから除外
 * 手動登録選手(ID < 0)は物理削除、プリセット/試合由来選手(ID > 0)はシーズン除外フラグ(isExcluded: true)を設定
 */
export async function deletePlayerMaster(
  playerId: number,
  season?: string,
): Promise<void> {
  const targetSeason = season || '26-27';
  const id = generatePlayerMasterId(targetSeason, playerId);

  if (playerId < 0) {
    // 手動追加の仮ID選手は物理削除
    await db.players.delete(id);
    await db.player_photos.delete(playerId);
  } else {
    // プリセットや試合データ由来の選手は該当シーズンから除外
    const existing = await db.players.get(id);
    if (existing) {
      await db.players.put({
        ...existing,
        isExcluded: true,
        updatedAt: Date.now(),
      });
    }
  }
  dispatchRefreshEvent();
}

/**
 * 手動追加選手（仮ID: tempPlayerId < 0）を正規のWhoScored ID（officialPlayerId > 0）に統合・紐付け
 * 写真（db.player_photos）があれば officialPlayerId に移行し、旧写真を削除。
 */
export async function mergePlayerId(
  tempPlayerId: number,
  officialPlayerId: number,
  season: string = '26-27',
  teamName: string = 'Chelsea',
): Promise<void> {
  const tempId = generatePlayerMasterId(season, tempPlayerId);
  const officialId = generatePlayerMasterId(season, officialPlayerId);

  await db.transaction('rw', [db.players, db.player_photos], async () => {
    const tempRecord = await db.players.get(tempId);
    const officialRecord = await db.players.get(officialId);

    // 背番号やポジションなど、手動設定されたデータを正規IDへ引き継ぐ
    await db.players.put({
      id: officialId,
      playerId: officialPlayerId,
      name:
        officialRecord?.name ||
        tempRecord?.name ||
        `Player ${officialPlayerId}`,
      season,
      defaultShirtNo:
        tempRecord?.defaultShirtNo ?? officialRecord?.defaultShirtNo,
      position: tempRecord?.position ?? officialRecord?.position ?? 'Other',
      photoUrl: tempRecord?.photoUrl ?? officialRecord?.photoUrl,
      teamName,
      isExcluded: false,
      updatedAt: Date.now(),
    });

    // 旧仮IDレコードの削除
    await db.players.delete(tempId);

    // 写真の移行
    const tempPhoto = await db.player_photos.get(tempPlayerId);
    const officialPhoto = await db.player_photos.get(officialPlayerId);
    if (tempPhoto && !officialPhoto) {
      await db.player_photos.put({
        ...tempPhoto,
        playerId: officialPlayerId,
        updatedAt: Date.now(),
      });
    }
    if (tempPhoto) {
      await db.player_photos.delete(tempPlayerId);
    }
  });

  dispatchRefreshEvent();
}
