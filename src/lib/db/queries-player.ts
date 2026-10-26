import { dispatchRefreshEvent } from './extension-db-queries';
import { db, type PlayerMaster, type PlayerPhoto } from './schema';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

async function attachPhotos(records: PlayerMaster[]): Promise<PlayerMaster[]> {
  if (records.length === 0) return [];
  const playerIds = records.map((p) => p.playerId);
  const photoMap = await getPlayerPhotosBatch(playerIds);
  return records.map((p) => ({ ...p, photoBlob: photoMap.get(p.playerId) }));
}

async function queryPlayerMastersByFilter(
  season: string,
  isExcluded: boolean,
  teamName?: string,
): Promise<PlayerMaster[]> {
  const query = db.players.where('season').equals(season);
  const records = await query
    .filter((p) => {
      const matchExcluded = isExcluded ? !!p.isExcluded : !p.isExcluded;
      return teamName
        ? (p.teamName || 'Chelsea') === teamName && matchExcluded
        : matchExcluded;
    })
    .toArray();
  return attachPhotos(records);
}

// ──────────────────────────────────────────────
// Player Photo Operations
// ──────────────────────────────────────────────

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

export async function getPlayerPhoto(
  playerId: number,
): Promise<PlayerPhoto | undefined> {
  return db.player_photos.get(playerId);
}

export async function getPlayerPhotosBatch(
  playerIds: number[],
): Promise<Map<number, Blob>> {
  const map = new Map<number, Blob>();
  const validIds = Array.from(new Set(playerIds ?? [])).filter(
    (id) => typeof id === 'number' && !Number.isNaN(id),
  );
  if (validIds.length === 0) return map;

  const photos = await db.player_photos
    .where('playerId')
    .anyOf(validIds)
    .toArray();
  for (const photo of photos) {
    if (photo.photoBlob) map.set(photo.playerId, photo.photoBlob);
  }
  return map;
}

export async function getAllPlayerPhotos(): Promise<PlayerPhoto[]> {
  return db.player_photos.toArray();
}

export async function deletePlayerPhoto(
  playerId: number,
  _season?: string,
): Promise<void> {
  await db.player_photos.delete(playerId);
  dispatchRefreshEvent();
}

// ──────────────────────────────────────────────
// Player Master Operations
// ──────────────────────────────────────────────

export function generatePlayerMasterId(
  season: string,
  playerId: number,
): string {
  return `${season}_${playerId}`;
}

export async function getPlayerMaster(
  playerId: number,
  season?: string,
): Promise<PlayerMaster | undefined> {
  const record = season
    ? await db.players.get(generatePlayerMasterId(season, playerId))
    : await db.players.where('playerId').equals(playerId).first();

  if (!record) return undefined;
  const photo = await db.player_photos.get(record.playerId);
  return { ...record, photoBlob: photo?.photoBlob };
}

export async function getPlayerMastersBySeason(
  season: string,
  teamName?: string,
): Promise<PlayerMaster[]> {
  return queryPlayerMastersByFilter(season, false, teamName);
}

export async function getExcludedPlayerMastersBySeason(
  season: string,
  teamName?: string,
): Promise<PlayerMaster[]> {
  return queryPlayerMastersByFilter(season, true, teamName);
}

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
  const { photoBlob } = player;

  const resolvedPosition =
    player.position && player.position !== 'Sub'
      ? player.position
      : existing?.position && existing.position !== 'Sub'
        ? existing.position
        : (player.position ?? existing?.position ?? 'Other');

  const updated: PlayerMaster = {
    id,
    playerId: player.playerId,
    name: player.name,
    season,
    defaultShirtNo: player.defaultShirtNo ?? existing?.defaultShirtNo,
    position: resolvedPosition,
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

export async function getPlayersMasterBatch(
  playerIds: number[],
  season?: string,
): Promise<Map<number, PlayerMaster>> {
  const map = new Map<number, PlayerMaster>();
  const validIds = Array.from(new Set(playerIds ?? [])).filter(
    (id) => typeof id === 'number' && !Number.isNaN(id),
  );
  if (validIds.length === 0) return map;

  const results = season
    ? await db.players
        .where('season')
        .equals(season)
        .filter((p) => validIds.includes(p.playerId))
        .toArray()
    : await db.players.where('playerId').anyOf(validIds).toArray();

  const photoMap = await getPlayerPhotosBatch(results.map((p) => p.playerId));
  for (const player of results) {
    map.set(player.playerId, {
      ...player,
      photoBlob: photoMap.get(player.playerId),
    });
  }
  return map;
}

export async function getAllPlayerMasters(): Promise<PlayerMaster[]> {
  const records = await db.players.toArray();
  return attachPhotos(records);
}

export async function deletePlayerMaster(
  playerId: number,
  season?: string,
): Promise<void> {
  const targetSeason = season || '26-27';
  const id = generatePlayerMasterId(targetSeason, playerId);

  if (playerId < 0) {
    await db.players.delete(id);
    await db.player_photos.delete(playerId);
  } else {
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

    await db.players.delete(tempId);

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
