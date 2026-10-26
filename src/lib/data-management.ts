import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { BasePlayer, EventRow, Match, Player } from '@/types';
import {
  findPhotoBlob,
  getPhotoExtension,
  isChelseaTeam,
  isValidPhotoBlob,
  readInputAsUint8Array,
  toUint8Array,
  uint8ArrayToBlob,
} from './data-management-helpers';
import {
  generatePlayerMasterId,
  getAllCustomEvents,
  getAllEvents,
  getAllMatches,
  getAllMatchMemos,
  getAllPlayerMasters,
  importMemosBatch,
  putMatchEventsBatch,
  putMatchesBatch,
  savePlayerMaster,
} from './db';
import type { PlayerMaster } from './db/schema';
import { getSeasonFromDate } from './tactical/season-utils';

const BACKUP_VERSION = 5;

/**
 * 全データを ZIP 形式でエクスポートする
 */
export async function exportAllDataZip(): Promise<void> {
  const files: Record<string, Uint8Array> = {};

  // 1. Custom Events & Match Memos
  const [customEvents, matchMemos, playerMasters] = await Promise.all([
    getAllCustomEvents(),
    getAllMatchMemos(),
    getAllPlayerMasters(),
  ]);

  files['memos.json'] = strToU8(
    JSON.stringify(
      {
        custom_events: customEvents,
        match_memos: matchMemos,
      },
      null,
      2,
    ),
  );

  // 2. Main Data (Matches, Events, Players & Photos)
  const [matches, allEvents] = await Promise.all([
    getAllMatches(),
    getAllEvents(),
  ]);

  files['matches.json'] = strToU8(JSON.stringify(matches, null, 2));
  files['events.json'] = strToU8(JSON.stringify(allEvents, null, 2));

  let photoCount = 0;
  const sanitizedPlayers = await Promise.all(
    playerMasters.map(async (p) => {
      const { photoBlob, ...rest } = p;
      let photoFileName: string | undefined;

      if (isValidPhotoBlob(photoBlob)) {
        const ext = getPhotoExtension(photoBlob);
        const safeId = encodeURIComponent(p.id).replace(/%/g, '_');
        photoFileName = `${safeId}.${ext}`;

        try {
          const buffer = await toUint8Array(photoBlob);
          files[`photos/${photoFileName}`] = buffer;
          photoCount++;
        } catch (err) {
          console.warn(`[footics] Failed to serialize photo for ${p.id}:`, err);
        }
      }

      return {
        ...rest,
        ...(photoFileName ? { photoFileName } : {}),
      };
    }),
  );

  files['players.json'] = strToU8(JSON.stringify(sanitizedPlayers, null, 2));

  // 3. Manifest
  files['manifest.json'] = strToU8(
    JSON.stringify(
      {
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        matchCount: matches.length,
        playerCount: playerMasters.length,
        photoCount,
      },
      null,
      2,
    ),
  );

  // 4. Generate & Download
  const zipped = zipSync(files, { level: 6 });
  const blob = uint8ArrayToBlob(zipped, 'application/zip');
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];

  anchor.href = url;
  anchor.download = `footics_backup_${dateStr}.zip`;
  anchor.click();

  URL.revokeObjectURL(url);
}

/**
 * ZIP ファイルから全データを復元（マージ）する
 */
export async function importAllDataZip(file: File | Blob): Promise<{
  matchCount: number;
  memoCount: number;
  playerCount: number;
  photoCount: number;
}> {
  const fileBytes = await readInputAsUint8Array(file);
  const unzipped = unzipSync(fileBytes);

  let matchCount = 0;
  let memoCount = 0;
  let playerCount = 0;
  let photoCount = 0;

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

        for (const m of normalizedMatches) {
          const season = getSeasonFromDate(m.date);
          const homeTeamName = m.homeTeam?.name || m.teams?.home?.name;
          const awayTeamName = m.awayTeam?.name || m.teams?.away?.name;

          const syncPlayers = async (
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
              await savePlayerMaster({
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
            await syncPlayers(m.teams.home.players, 'Chelsea');
          }
          if (isChelseaTeam(awayTeamName) && m.teams?.away?.players) {
            await syncPlayers(m.teams.away.players, 'Chelsea');
          }
        }
      }
    }
  } catch (err) {
    console.error('[footics] Failed to restore matches:', err);
  }

  // 3. Import Players & Photos
  try {
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
        for (const p of rawPlayers) {
          if (!p || typeof p.playerId !== 'number') continue;
          const season = p.season || '26-27';
          const id = p.id || generatePlayerMasterId(season, p.playerId);

          const photoBlob = findPhotoBlob(unzipped, id, p.photoFileName);
          if (photoBlob) {
            photoCount++;
          }

          await savePlayerMaster({
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
          playerCount++;
        }
      }
    }
  } catch (err) {
    console.error('[footics] Failed to restore players:', err);
  }

  // 4. Import Events
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

  return { matchCount, memoCount, playerCount, photoCount };
}
