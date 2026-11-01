import { strFromU8, unzipSync } from 'fflate';
import type { BasePlayer, EventRow, Match, Player } from '@/types';
import {
  findPhotoBlob,
  isChelseaTeam,
  readInputAsUint8Array,
} from './data-management-helpers';
import {
  generatePlayerMasterId,
  importMemosBatch,
  mergeLegacyPlayersAndPhotos,
  putMatchEventsBatch,
  putMatchesBatch,
  savePlayerMastersBatch,
} from './db';
import { db, type PlayerMaster, type PlayerPhoto } from './db/schema';
import { getSeasonFromDate } from './tactical/season-utils';

export interface ImportZipResult {
  matchCount: number;
  memoCount: number;
  playerCount: number;
  photoCount: number;
  tacticalProjectCount?: number;
}

/**
 * ZIP ファイルから全データを復元（マージ）する
 */
export async function importAllDataZip(
  file: File | Blob,
): Promise<ImportZipResult> {
  const fileBytes = await readInputAsUint8Array(file);
  const unzipped = unzipSync(fileBytes);

  let matchCount = 0;
  let memoCount = 0;
  let playerCount = 0;
  let photoCount = 0;
  let tacticalProjectCount = 0;

  // 1. Import Memos
  try {
    const memosBytes = unzipped['memos.json'];
    if (memosBytes) {
      const memosText = strFromU8(memosBytes);
      const memosData = JSON.parse(memosText);
      const customEvents = Array.isArray(memosData?.custom_events)
        ? memosData.custom_events
        : [];
      const matchMemos = Array.isArray(memosData?.match_memos)
        ? memosData.match_memos
        : [];

      await importMemosBatch(customEvents, matchMemos);
      memoCount = customEvents.length + matchMemos.length;
    }
  } catch (err) {
    console.error('[footics] Failed to restore memos:', err);
  }

  // 2. Import Matches & Sync Chelsea Players to Master
  try {
    const matchesBytes = unzipped['matches.json'];
    if (matchesBytes) {
      const matchesText = strFromU8(matchesBytes);
      const rawMatches = JSON.parse(matchesText) as Array<
        Match & { matchId?: number }
      >;

      if (Array.isArray(rawMatches) && rawMatches.length > 0) {
        const normalizedMatches: Match[] = rawMatches.map((m) => ({
          ...m,
          id: String(m.id ?? m.matchId ?? ''),
        }));

        await putMatchesBatch(normalizedMatches);
        matchCount = normalizedMatches.length;

        const chelseaPlayersToSync: Array<{
          playerId: number;
          name: string;
          season: string;
          defaultShirtNo?: number;
          position: string;
          teamName: string;
        }> = [];

        for (const m of normalizedMatches) {
          const season = getSeasonFromDate(m.date);
          const homeTeamName = m.homeTeam?.name || m.teams?.home?.name;
          const awayTeamName = m.awayTeam?.name || m.teams?.away?.name;

          const collectPlayers = (
            players?: Array<Player | BasePlayer>,
            team = 'Chelsea',
          ) => {
            if (!Array.isArray(players)) return;
            for (const p of players) {
              if (!p?.playerId) continue;
              const shirtNo =
                'shirtNo' in p && typeof p.shirtNo === 'number'
                  ? p.shirtNo
                  : undefined;
              chelseaPlayersToSync.push({
                playerId: p.playerId,
                name: p.name || `Player ${p.playerId}`,
                season,
                defaultShirtNo: shirtNo,
                position: p.position || 'Sub',
                teamName: team,
              });
            }
          };

          if (isChelseaTeam(homeTeamName) && m.teams?.home?.players) {
            collectPlayers(m.teams.home.players, 'Chelsea');
          }
          if (isChelseaTeam(awayTeamName) && m.teams?.away?.players) {
            collectPlayers(m.teams.away.players, 'Chelsea');
          }
        }

        if (chelseaPlayersToSync.length > 0) {
          await savePlayerMastersBatch(chelseaPlayersToSync);
        }
      }
    }
  } catch (err) {
    console.error('[footics] Failed to restore matches:', err);
  }

  // 3. Tactical Projects & KeyVal
  try {
    const projectsBytes = unzipped['tactical_projects.json'];
    if (projectsBytes) {
      const projectsText = strFromU8(projectsBytes);
      const projects = JSON.parse(projectsText);
      if (Array.isArray(projects) && projects.length > 0) {
        await db.tactical_projects.bulkPut(projects);
        tacticalProjectCount = projects.length;
      }
    }
  } catch (err) {
    console.error('[footics] Failed to restore tactical projects:', err);
  }

  try {
    const keyvalBytes = unzipped['keyval.json'];
    if (keyvalBytes) {
      const keyvalText = strFromU8(keyvalBytes);
      const entries = JSON.parse(keyvalText);
      if (Array.isArray(entries) && entries.length > 0) {
        await db.keyval.bulkPut(entries);
      }
    }
  } catch (err) {
    console.error('[footics] Failed to restore keyval:', err);
  }

  // 4. Import Photos & Players
  try {
    const photoMapByPlayerId = new Map<number, Blob>();
    const standalonePhotos: PlayerPhoto[] = [];

    // 4.1 Parse player_photos.json if present
    const playerPhotosBytes = unzipped['player_photos.json'];
    if (playerPhotosBytes) {
      const text = strFromU8(playerPhotosBytes);
      const metaList = JSON.parse(text);
      if (Array.isArray(metaList)) {
        for (const item of metaList) {
          if (typeof item.playerId === 'number') {
            const photoBlob = findPhotoBlob(
              unzipped,
              String(item.playerId),
              item.photoFileName,
              item.playerId,
            );
            if (photoBlob) {
              photoMapByPlayerId.set(item.playerId, photoBlob);
              standalonePhotos.push({
                playerId: item.playerId,
                photoBlob,
                mimeType: item.mimeType || photoBlob.type || 'image/webp',
                updatedAt: item.updatedAt || Date.now(),
              });
            }
          }
        }
      }
    }

    if (standalonePhotos.length > 0) {
      await db.player_photos.bulkPut(standalonePhotos);
    }

    // 4.2 Parse players.json
    const playersBytes = unzipped['players.json'];
    if (playersBytes) {
      const playersText = strFromU8(playersBytes);
      const rawPlayers = JSON.parse(playersText) as Array<
        Partial<PlayerMaster> & {
          playerId?: number;
          name?: string;
          photoFileName?: string;
        }
      >;

      if (Array.isArray(rawPlayers) && rawPlayers.length > 0) {
        const playersToSave: Array<
          Partial<PlayerMaster> & { playerId: number; name: string }
        > = [];

        for (const p of rawPlayers) {
          if (!p || typeof p.playerId !== 'number') continue;
          const season = p.season || '26-27';
          const id = p.id || generatePlayerMasterId(season, p.playerId);

          let photoBlob = photoMapByPlayerId.get(p.playerId);
          if (!photoBlob) {
            photoBlob = findPhotoBlob(
              unzipped,
              id,
              p.photoFileName,
              p.playerId,
            );
            if (photoBlob) {
              photoMapByPlayerId.set(p.playerId, photoBlob);
            }
          }

          playersToSave.push({
            id,
            playerId: p.playerId,
            name: p.name || `Player ${p.playerId}`,
            season,
            defaultShirtNo: p.defaultShirtNo,
            position: p.position || 'Sub',
            photoBlob:
              photoBlob ??
              (p.photoBlob instanceof Blob ? p.photoBlob : undefined),
            photoUrl: p.photoUrl,
            teamName: p.teamName || 'Chelsea',
            isExcluded: p.isExcluded ?? false,
            updatedAt: p.updatedAt || Date.now(),
          });
        }

        if (playersToSave.length > 0) {
          await savePlayerMastersBatch(playersToSave);
          playerCount = playersToSave.length;
        }
      }
    }

    photoCount = photoMapByPlayerId.size;
  } catch (err) {
    console.error('[footics] Failed to restore players:', err);
  }

  // 5. Import Events
  try {
    const eventsBytes = unzipped['events.json'];
    if (eventsBytes) {
      const eventsText = strFromU8(eventsBytes);
      const allEvents = JSON.parse(eventsText) as EventRow[];

      if (Array.isArray(allEvents) && allEvents.length > 0) {
        const normalizedEvents = allEvents.map((e) => ({
          ...e,
          match_id: String(e.match_id || ''),
        }));
        await putMatchEventsBatch(normalizedEvents);
      }
    }
  } catch (err) {
    console.error('[footics] Failed to restore events:', err);
  }

  // 6. Merge legacy players and photos
  try {
    await mergeLegacyPlayersAndPhotos();
  } catch (err) {
    console.error('[footics] Failed to merge legacy players:', err);
  }

  return {
    matchCount,
    memoCount,
    playerCount,
    photoCount,
    tacticalProjectCount,
  };
}
