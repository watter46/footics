import type { EventRow, Match } from '@/types';
import type {
  CustomEvent,
  EventMemo,
  MatchMemo,
  TacticalSnapshot,
} from '../schema';
import { SHORTCUT_ACTIONS } from '../shortcuts';
import { db, type PlayerMaster } from './schema';

// ──────────────────────────────────────────────
// Notification Helper
// ──────────────────────────────────────────────

/**
 * データの変更をアプリ全体に通知する。
 * Web本体の useDataSync フックがこのイベントを購読してキャッシュを無効化する。
 */
export function dispatchRefreshEvent(matchId?: string | number): void {
  if (typeof window === 'undefined') return;

  console.log('[db] Dispatching REFRESH_DATA event, matchId:', matchId);
  window.dispatchEvent(
    new CustomEvent('footics-action', {
      detail: {
        action: SHORTCUT_ACTIONS.REFRESH_DATA,
        matchId: matchId ? String(matchId) : undefined,
      },
    }),
  );
}

// ──────────────────────────────────────────────
// Event Memo Operations (TanStack Query 用)
// ──────────────────────────────────────────────

export async function getEventMemosByMatch(
  matchId: number,
): Promise<EventMemo[]> {
  return db.event_memos.where('matchId').equals(matchId).toArray();
}

export async function putEventMemo(memo: EventMemo): Promise<void> {
  await db.event_memos.put(memo);
  dispatchRefreshEvent(memo.matchId);
}

export async function getAllEventMemos(): Promise<EventMemo[]> {
  return db.event_memos.toArray();
}

// ──────────────────────────────────────────────
// Custom Event Operations
// ──────────────────────────────────────────────

export async function saveCustomEvent(event: CustomEvent): Promise<void> {
  await db.custom_events.put(event);
  dispatchRefreshEvent(event.match_id);
}

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

export async function getMatchMemo(matchId: string): Promise<MatchMemo | null> {
  const data = await db.match_memos.get(matchId);
  return data ?? null;
}

export async function putMatchMemo(memo: MatchMemo): Promise<void> {
  await db.match_memos.put(memo);
  dispatchRefreshEvent(memo.matchId);
}

export async function getAllMatchMemos(): Promise<MatchMemo[]> {
  return db.match_memos.toArray();
}

// ──────────────────────────────────────────────
// Tactical Snapshots Operations
// ──────────────────────────────────────────────

export async function getTacticalSnapshot(
  matchId: string,
): Promise<TacticalSnapshot | null> {
  const data = await db.tactical_snapshots.get(matchId);
  return data ?? null;
}

export async function putTacticalSnapshot(
  snapshot: TacticalSnapshot,
): Promise<void> {
  await db.tactical_snapshots.put(snapshot);
}

export async function deleteTacticalSnapshot(matchId: string): Promise<void> {
  await db.tactical_snapshots.delete(matchId);
}

export async function getAllTacticalSnapshots(): Promise<TacticalSnapshot[]> {
  return db.tactical_snapshots.toArray();
}

export async function putTacticalSnapshotsBatch(
  snapshots: TacticalSnapshot[],
): Promise<void> {
  await db.tactical_snapshots.bulkPut(snapshots);
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
 */
export async function getPlayerMaster(
  playerId: number,
  season?: string,
): Promise<PlayerMaster | undefined> {
  if (season) {
    const id = generatePlayerMasterId(season, playerId);
    return db.players.get(id);
  }
  return db.players.where('playerId').equals(playerId).first();
}

/**
 * シーズン別の選手マスター一覧を取得 (除外選手は除く)
 */
export async function getPlayerMastersBySeason(
  season: string,
  teamName?: string,
): Promise<PlayerMaster[]> {
  const query = db.players.where('season').equals(season);
  if (teamName) {
    return query
      .filter((p) => (p.teamName || 'Chelsea') === teamName && !p.isExcluded)
      .toArray();
  }
  return query.filter((p) => !p.isExcluded).toArray();
}

/**
 * シーズン別の除外された選手マスター一覧（またはID Set）を取得
 */
export async function getExcludedPlayerMastersBySeason(
  season: string,
  teamName?: string,
): Promise<PlayerMaster[]> {
  const query = db.players.where('season').equals(season);
  if (teamName) {
    return query
      .filter((p) => (p.teamName || 'Chelsea') === teamName && !!p.isExcluded)
      .toArray();
  }
  return query.filter((p) => !!p.isExcluded).toArray();
}

/**
 * 選手マスター情報を新規作成 / 更新
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
  const updated: PlayerMaster = {
    id,
    playerId: player.playerId,
    name: player.name,
    season,
    defaultShirtNo: player.defaultShirtNo ?? existing?.defaultShirtNo,
    position: player.position ?? existing?.position ?? 'Other',
    photoBlob: player.photoBlob ?? existing?.photoBlob,
    photoUrl: player.photoUrl ?? existing?.photoUrl,
    teamName: player.teamName ?? existing?.teamName ?? 'Chelsea',
    isExcluded: player.isExcluded ?? false,
    updatedAt: Date.now(),
  };

  await db.players.put(updated);
  dispatchRefreshEvent();
}

/**
 * 選手の顔写真 (Blob) を保存
 * 既存レコードがあればそのメタデータを引き継ぎ、無ければ新規作成
 */
export async function savePlayerPhoto(
  playerId: number,
  blob: Blob,
  name?: string,
  season?: string,
): Promise<void> {
  const targetSeason = season || '26-27';
  const id = generatePlayerMasterId(targetSeason, playerId);
  const existing = await db.players.get(id);

  await db.players.put({
    id,
    playerId,
    name: name || existing?.name || `Player ${playerId}`,
    season: targetSeason,
    defaultShirtNo: existing?.defaultShirtNo,
    position: existing?.position || 'Sub',
    photoBlob: blob,
    photoUrl: existing?.photoUrl,
    teamName: existing?.teamName || 'Chelsea',
    updatedAt: Date.now(),
  });
  dispatchRefreshEvent();
}

/**
 * 複数選手のマスター情報を一括取得 (Map<playerId, PlayerMaster> 形式)
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

  for (const player of results) {
    map.set(player.playerId, player);
  }
  return map;
}

/**
 * 全ての選手マスター情報を取得
 */
export async function getAllPlayerMasters(): Promise<PlayerMaster[]> {
  return db.players.toArray();
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
  } else {
    // プリセットや試合データ由来の選手は該当シーズンから除外
    const existing = await db.players.get(id);
    await db.players.put({
      id,
      playerId,
      name: existing?.name || `Player ${playerId}`,
      season: targetSeason,
      defaultShirtNo: existing?.defaultShirtNo,
      position: existing?.position || 'Other',
      photoBlob: existing?.photoBlob,
      photoUrl: existing?.photoUrl,
      teamName: existing?.teamName || 'Chelsea',
      isExcluded: true,
      updatedAt: Date.now(),
    });
  }
  dispatchRefreshEvent();
}

/**
 * 手動追加選手（仮ID: tempPlayerId < 0）を正規のWhoScored ID（officialPlayerId > 0）に統合・紐付け
 */
export async function mergePlayerId(
  tempPlayerId: number,
  officialPlayerId: number,
  season: string = '26-27',
  teamName: string = 'Chelsea',
): Promise<void> {
  const tempId = generatePlayerMasterId(season, tempPlayerId);
  const officialId = generatePlayerMasterId(season, officialPlayerId);

  await db.transaction('rw', [db.players], async () => {
    const tempRecord = await db.players.get(tempId);
    const officialRecord = await db.players.get(officialId);

    // 写真や背番号、ポジションなど、手動設定されたデータを正規IDへ引き継ぐ
    await db.players.put({
      id: officialId,
      playerId: officialPlayerId,
      name: officialRecord?.name || tempRecord?.name || `Player ${officialPlayerId}`,
      season,
      defaultShirtNo:
        tempRecord?.defaultShirtNo ?? officialRecord?.defaultShirtNo,
      position: tempRecord?.position ?? officialRecord?.position ?? 'Other',
      photoBlob: tempRecord?.photoBlob ?? officialRecord?.photoBlob,
      photoUrl: tempRecord?.photoUrl ?? officialRecord?.photoUrl,
      teamName,
      isExcluded: false,
      updatedAt: Date.now(),
    });

    // 旧仮IDのレコードを削除
    await db.players.delete(tempId);
  });

  dispatchRefreshEvent();
}

/**
 * 選手の登録写真を削除
 */
export async function deletePlayerPhoto(
  playerId: number,
  season?: string,
): Promise<void> {
  const targetSeason = season || '26-27';
  const id = generatePlayerMasterId(targetSeason, playerId);
  const existing = await db.players.get(id);
  if (existing) {
    await db.players.put({
      ...existing,
      photoBlob: undefined,
      photoUrl: undefined,
      updatedAt: Date.now(),
    });
    dispatchRefreshEvent();
  }
}
