import {
  CHELSEA_PRESETS_BY_SEASON,
  type Season,
} from '@/lib/tactical/chelsea-preset';
import { dispatchRefreshEvent } from './extension-db-queries';
import { getPlayerPhotosBatch } from './player-photos';
import { db, type PlayerMaster } from './schema';

// ──────────────────────────────────────────────
// Player Merge Helpers
// ──────────────────────────────────────────────

export function isLegacyOrTempPlayerId(id: number): boolean {
  return id < 0 || (id >= 345000 && id < 346000);
}

export function generatePlayerMasterId(
  season: string,
  playerId: number,
): string {
  return `${season}_${playerId}`;
}

export function normalizePlayerNameForMatch(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function resolveMergedShirtNo(
  manualNo: number | undefined,
  officialNo: number | undefined,
): number | undefined {
  return manualNo !== undefined && manualNo !== 99
    ? manualNo
    : (officialNo ?? manualNo);
}

export function resolveMergedPosition(
  manualPos: string | undefined,
  officialPos: string | undefined,
): string {
  if (manualPos && manualPos !== 'Sub' && manualPos !== 'Other')
    return manualPos;
  if (officialPos && officialPos !== 'Sub') return officialPos;
  return manualPos ?? officialPos ?? 'Other';
}

export async function updateTacticalProjectsPlayerIds(
  idMap: Map<string, string>,
): Promise<void> {
  if (idMap.size === 0) return;
  const projects = await db.tactical_projects.toArray();
  for (const project of projects) {
    let updated = false;
    for (const phase of project.phases ?? []) {
      for (const slide of phase.slides ?? []) {
        for (const player of slide.players ?? []) {
          if (player.playerId && idMap.has(player.playerId)) {
            player.playerId = idMap.get(player.playerId)!;
            updated = true;
          }
        }
      }
    }
    if (updated) {
      await db.tactical_projects.put({
        ...project,
        updatedAt: new Date().toISOString(),
      });
    }
  }
}

export async function mergePlayerId(
  tempPlayerId: number,
  officialPlayerId: number,
  season: string = '26-27',
  teamName: string = 'Chelsea',
): Promise<void> {
  const tempId = generatePlayerMasterId(season, tempPlayerId);
  const officialId = generatePlayerMasterId(season, officialPlayerId);

  await db.transaction(
    'rw',
    [db.players, db.player_photos, db.tactical_projects],
    async () => {
      const tempRecord = await db.players.get(tempId);
      const officialRecord = await db.players.get(officialId);

      const resolvedShirtNo = resolveMergedShirtNo(
        tempRecord?.defaultShirtNo,
        officialRecord?.defaultShirtNo,
      );
      const resolvedPosition = resolveMergedPosition(
        tempRecord?.position,
        officialRecord?.position,
      );

      await db.players.put({
        id: officialId,
        playerId: officialPlayerId,
        name:
          officialRecord?.name ||
          tempRecord?.name ||
          `Player ${officialPlayerId}`,
        season,
        defaultShirtNo: resolvedShirtNo,
        position: resolvedPosition,
        photoUrl: tempRecord?.photoUrl ?? officialRecord?.photoUrl,
        teamName,
        isExcluded: false,
        updatedAt: Date.now(),
      });

      await db.players.delete(tempId);

      const tempPhoto = await db.player_photos.get(tempPlayerId);
      if (tempPhoto) {
        await db.player_photos.put({
          ...tempPhoto,
          playerId: officialPlayerId,
          updatedAt: Date.now(),
        });
        await db.player_photos.delete(tempPlayerId);
      }

      const idMap = new Map<string, string>([
        [String(tempPlayerId), String(officialPlayerId)],
      ]);
      await updateTacticalProjectsPlayerIds(idMap);
    },
  );

  dispatchRefreshEvent();
}

export async function findPlayerPhotoByName(
  name: string,
): Promise<Blob | undefined> {
  const norm = normalizePlayerNameForMatch(name);
  if (!norm) return undefined;

  const players = await db.players.toArray();
  for (const p of players) {
    if (normalizePlayerNameForMatch(p.name) === norm) {
      const photo = await db.player_photos.get(p.playerId);
      if (photo?.photoBlob) return photo.photoBlob;
    }
  }
  return undefined;
}

export async function findPlayerPhotosByNames(
  names: string[],
): Promise<Map<string, Blob>> {
  const result = new Map<string, Blob>();
  if (!names || names.length === 0) return result;

  const normToNames = new Map<string, string[]>();
  for (const name of names) {
    const norm = normalizePlayerNameForMatch(name);
    if (!norm) continue;
    const list = normToNames.get(norm);
    if (list) list.push(name);
    else normToNames.set(norm, [name]);
  }
  if (normToNames.size === 0) return result;

  const players = await db.players.toArray();
  const normToPlayers = new Map<string, PlayerMaster[]>();
  const matchedPlayerIds: number[] = [];

  for (const p of players) {
    const pNorm = normalizePlayerNameForMatch(p.name);
    if (normToNames.has(pNorm)) {
      const list = normToPlayers.get(pNorm);
      if (list) list.push(p);
      else normToPlayers.set(pNorm, [p]);
      matchedPlayerIds.push(p.playerId);
    }
  }
  if (matchedPlayerIds.length === 0) return result;

  const photosMap = await getPlayerPhotosBatch(matchedPlayerIds);
  for (const [norm, matchedList] of normToPlayers.entries()) {
    const match = matchedList.find((p) => photosMap.has(p.playerId));
    if (match) {
      const blob = photosMap.get(match.playerId)!;
      for (const inputName of normToNames.get(norm) ?? []) {
        result.set(inputName, blob);
      }
    }
  }
  return result;
}

export async function mergeLegacyPlayersAndPhotos(
  season?: string,
): Promise<void> {
  await db.transaction(
    'rw',
    [db.players, db.player_photos, db.tactical_projects],
    async () => {
      const allPlayers = await db.players.toArray();
      const legacyPlayers = allPlayers.filter(
        (p) =>
          isLegacyOrTempPlayerId(p.playerId) &&
          (!season || (p.season || '26-27') === season),
      );
      if (legacyPlayers.length === 0) return;

      const idMap = new Map<string, string>();

      for (const legacy of legacyPlayers) {
        const legacySeason = legacy.season || season || '26-27';
        const legacyTeam = legacy.teamName || 'Chelsea';
        const normName = normalizePlayerNameForMatch(legacy.name);

        let officialRecord = allPlayers.find(
          (p) =>
            !isLegacyOrTempPlayerId(p.playerId) &&
            (p.season || '26-27') === legacySeason &&
            (p.teamName || 'Chelsea') === legacyTeam &&
            normalizePlayerNameForMatch(p.name) === normName,
        );

        if (!officialRecord) {
          const presets =
            CHELSEA_PRESETS_BY_SEASON[legacySeason as Season] ||
            CHELSEA_PRESETS_BY_SEASON['26-27'];
          const presetMatch = presets?.find(
            (pr) => normalizePlayerNameForMatch(pr.name) === normName,
          );
          if (presetMatch) {
            officialRecord = {
              id: generatePlayerMasterId(legacySeason, presetMatch.playerId),
              playerId: presetMatch.playerId,
              name: presetMatch.name,
              season: legacySeason,
              defaultShirtNo: presetMatch.shirtNo,
              position: presetMatch.position,
              teamName: legacyTeam,
              isExcluded: false,
              updatedAt: Date.now(),
            };
            allPlayers.push(officialRecord);
          }
        }

        if (!officialRecord) {
          continue;
        }

        idMap.set(String(legacy.playerId), String(officialRecord.playerId));

        await db.players.put({
          ...officialRecord,
          defaultShirtNo: resolveMergedShirtNo(
            legacy.defaultShirtNo,
            officialRecord.defaultShirtNo,
          ),
          position: resolveMergedPosition(
            legacy.position,
            officialRecord.position,
          ),
          photoUrl: legacy.photoUrl ?? officialRecord.photoUrl,
          updatedAt: Date.now(),
        });

        const legacyPhoto = await db.player_photos.get(legacy.playerId);
        const existingPhoto = await db.player_photos.get(
          officialRecord.playerId,
        );
        if (legacyPhoto?.photoBlob && !existingPhoto?.photoBlob) {
          await db.player_photos.put({
            playerId: officialRecord.playerId,
            photoBlob: legacyPhoto.photoBlob,
            mimeType: legacyPhoto.mimeType || 'image/webp',
            updatedAt: Date.now(),
          });
        }

        await db.players.delete(legacy.id);
        await db.player_photos.delete(legacy.playerId);
      }

      if (idMap.size > 0) {
        await updateTacticalProjectsPlayerIds(idMap);
      }
    },
  );

  dispatchRefreshEvent();
}
