import { normalizeTacticalProject } from '@/lib/tactical/acl/legacy-project-translator';
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
  manualNo?: number,
  officialNo?: number,
): number | undefined {
  return manualNo !== undefined && manualNo !== 99
    ? manualNo
    : (officialNo ?? manualNo);
}

export function resolveMergedPosition(
  manualPos?: string,
  officialPos?: string,
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
  const rawProjects = await db.tactical_projects.toArray();
  for (const rawProject of rawProjects) {
    const bundle = normalizeTacticalProject(rawProject);
    const project = bundle.project;
    let updated = false;

    const newPhases = project.phases.map((phase) => ({
      ...phase,
      slides: phase.slides.map((slide) => ({
        ...slide,
        players: slide.players.map((player) => {
          if (player.playerId && idMap.has(player.playerId)) {
            updated = true;
            return { ...player, playerId: idMap.get(player.playerId)! };
          }
          return player;
        }),
      })),
    }));

    if (updated) {
      const updatedBundle = normalizeTacticalProject({
        ...project,
        phases: newPhases,
        updatedAt: new Date().toISOString(),
      });
      await db.tactical_projects.put(updatedBundle.project);
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

      await updateTacticalProjectsPlayerIds(
        new Map([[String(tempPlayerId), String(officialPlayerId)]]),
      );
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
  if (!names?.length) return result;

  const normToNames = new Map<string, string[]>();
  for (const name of names) {
    const norm = normalizePlayerNameForMatch(name);
    if (norm) normToNames.set(norm, [...(normToNames.get(norm) ?? []), name]);
  }
  if (!normToNames.size) return result;

  const players = await db.players.toArray();
  const matched = players.filter((p) =>
    normToNames.has(normalizePlayerNameForMatch(p.name)),
  );
  if (!matched.length) return result;

  const photosMap = await getPlayerPhotosBatch(matched.map((p) => p.playerId));
  for (const p of matched) {
    const blob = photosMap.get(p.playerId);
    if (blob) {
      for (const inputName of normToNames.get(
        normalizePlayerNameForMatch(p.name),
      ) ?? []) {
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

        if (!officialRecord) continue;

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
