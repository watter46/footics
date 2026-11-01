import { dispatchRefreshEvent } from './extension-db-queries';
import {
  generatePlayerMasterId,
  isLegacyOrTempPlayerId,
  normalizePlayerNameForMatch,
  resolveMergedPosition,
  resolveMergedShirtNo,
  updateTacticalProjectsPlayerIds,
} from './player-merge';
import { getPlayerPhotosBatch } from './player-photos';
import { db, type PlayerMaster } from './schema';

export * from './player-merge';
export * from './player-photos';

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
  const isChelseaOrUndefined = !teamName || teamName === 'Chelsea';
  const query = isChelseaOrUndefined
    ? db.players.where('season').equals(season)
    : db.players.where('[season+teamName]').equals([season, teamName]);
  const records = await query
    .filter((p) => {
      const matchExcluded = isExcluded ? !!p.isExcluded : !p.isExcluded;
      return isChelseaOrUndefined
        ? (p.teamName || 'Chelsea') === 'Chelsea' && matchExcluded
        : matchExcluded;
    })
    .toArray();
  return attachPhotos(records);
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

export const getPlayerMastersBySeason = (
  season: string,
  teamName?: string,
): Promise<PlayerMaster[]> =>
  queryPlayerMastersByFilter(season, false, teamName);

export const getExcludedPlayerMastersBySeason = (
  season: string,
  teamName?: string,
): Promise<PlayerMaster[]> =>
  queryPlayerMastersByFilter(season, true, teamName);

export type SavePlayerMasterInput = Partial<PlayerMaster> & {
  playerId: number;
  name: string;
  season?: string;
};

export async function savePlayerMastersBatch(
  players: SavePlayerMasterInput[],
): Promise<void> {
  if (players.length === 0) return;

  await db.transaction(
    'rw',
    [db.players, db.player_photos, db.tactical_projects],
    async () => {
      const negativePlayers = await db.players
        .where('playerId')
        .below(0)
        .toArray();
      const legacyRangePlayers = await db.players
        .where('playerId')
        .between(345000, 346000, true, false)
        .toArray();
      const tempPlayers = [...negativePlayers, ...legacyRangePlayers];
      const idMap = new Map<string, string>();

      for (const player of players) {
        const season = player.season || '26-27';
        const teamName = player.teamName || 'Chelsea';
        const id = player.id || generatePlayerMasterId(season, player.playerId);
        const existing = await db.players.get(id);
        const { photoBlob } = player;

        let matchedTempIndex = -1;
        if (!isLegacyOrTempPlayerId(player.playerId)) {
          const normName = normalizePlayerNameForMatch(player.name);
          matchedTempIndex = tempPlayers.findIndex((tp) => {
            const tpSeason = tp.season || '26-27';
            const tpTeam = tp.teamName || 'Chelsea';
            return (
              tpSeason === season &&
              tpTeam === teamName &&
              normalizePlayerNameForMatch(tp.name) === normName
            );
          });
        }

        let defaultShirtNo = player.defaultShirtNo ?? existing?.defaultShirtNo;
        let position =
          player.position && player.position !== 'Sub'
            ? player.position
            : existing?.position && existing.position !== 'Sub'
              ? existing.position
              : (player.position ?? existing?.position ?? 'Other');
        let photoUrl = player.photoUrl ?? existing?.photoUrl;
        let photoToSave = photoBlob;

        if (matchedTempIndex !== -1) {
          const [matchedTemp] = tempPlayers.splice(matchedTempIndex, 1);
          idMap.set(String(matchedTemp.playerId), String(player.playerId));

          defaultShirtNo = resolveMergedShirtNo(
            matchedTemp.defaultShirtNo,
            defaultShirtNo,
          );
          position = resolveMergedPosition(matchedTemp.position, position);
          photoUrl = matchedTemp.photoUrl ?? photoUrl;

          const tempPhoto = await db.player_photos.get(matchedTemp.playerId);
          if (tempPhoto?.photoBlob && !photoToSave) {
            photoToSave = tempPhoto.photoBlob;
          }

          await db.players.delete(matchedTemp.id);
          await db.player_photos.delete(matchedTemp.playerId);
        }

        const updated: PlayerMaster = {
          id,
          playerId: player.playerId,
          name: player.name,
          season,
          defaultShirtNo,
          position,
          photoUrl,
          teamName,
          isExcluded: player.isExcluded ?? existing?.isExcluded ?? false,
          updatedAt: Date.now(),
        };

        await db.players.put(updated);
        if (photoToSave) {
          await db.player_photos.put({
            playerId: player.playerId,
            photoBlob: photoToSave,
            mimeType: photoToSave.type || 'image/webp',
            updatedAt: Date.now(),
          });
        }
      }

      if (idMap.size > 0) {
        await updateTacticalProjectsPlayerIds(idMap);
      }
    },
  );

  dispatchRefreshEvent();
}

export const savePlayerMaster = (
  player: SavePlayerMasterInput,
): Promise<void> => savePlayerMastersBatch([player]);

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

  if (isLegacyOrTempPlayerId(playerId)) {
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
