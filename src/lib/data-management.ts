import JSZip from 'jszip';
import type { EventRow, Match, Player } from '@/types';
import {
  generatePlayerMasterId,
  getAllCustomEvents,
  getAllEventMemos,
  getAllEvents,
  getAllMatches,
  getAllMatchMemos,
  getAllPlayerMasters,
  getAllTacticalSnapshots,
  importMemosBatch,
  putMatchEventsBatch,
  putMatchesBatch,
  putTacticalSnapshotsBatch,
  savePlayerMaster,
} from './db';
import type { PlayerMaster } from './db/schema';
import { getSeasonFromDate } from './tactical/season-utils';

const BACKUP_VERSION = 5;

function isChelseaTeam(name?: string): boolean {
  if (!name) return false;
  return name.toLowerCase().includes('chelsea');
}

/**
 * 拡張子の判定
 */
function getPhotoExtension(blob?: any): string {
  if (!blob) return 'png';
  const type = typeof blob.type === 'string' ? blob.type : '';
  if (type.includes('jpeg') || type.includes('jpg')) return 'jpg';
  if (type.includes('webp')) return 'webp';
  if (type.includes('svg')) return 'svg';
  return 'png';
}

function getMimeTypeFromFileName(fileName: string): string {
  if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg'))
    return 'image/jpeg';
  if (fileName.endsWith('.webp')) return 'image/webp';
  if (fileName.endsWith('.svg')) return 'image/svg+xml';
  return 'image/png';
}

function isValidPhotoBlob(blob: unknown): blob is Blob {
  if (!blob) return false;
  if (typeof blob !== 'object') return false;
  const b = blob as any;
  if (typeof b.size === 'number' && b.size === 0) return false;
  return true;
}

/**
 * 全データを ZIP 形式でエクスポートする
 */
export async function exportAllDataZip(): Promise<void> {
  const zip = new JSZip();

  // 1. Memos, Custom Events, Match Memos & Snapshots
  const [
    eventMemos,
    customEvents,
    matchMemos,
    tacticalSnapshots,
    playerMasters,
  ] = await Promise.all([
    getAllEventMemos(),
    getAllCustomEvents(),
    getAllMatchMemos(),
    getAllTacticalSnapshots(),
    getAllPlayerMasters(),
  ]);

  zip.file(
    'memos.json',
    JSON.stringify(
      {
        event_memos: eventMemos,
        custom_events: customEvents,
        match_memos: matchMemos,
        tactical_snapshots: tacticalSnapshots,
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

  zip.file('matches.json', JSON.stringify(matches, null, 2));
  zip.file('events.json', JSON.stringify(allEvents, null, 2));

  // 選手マスターから画像を分離して photos/ フォルダに格納
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
          if (typeof (photoBlob as any).arrayBuffer === 'function') {
            const buffer = await (photoBlob as any).arrayBuffer();
            zip.file(`photos/${photoFileName}`, buffer);
            photoCount++;
          } else {
            zip.file(`photos/${photoFileName}`, photoBlob as any);
            photoCount++;
          }
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

  zip.file('players.json', JSON.stringify(sanitizedPlayers, null, 2));

  // 3. Manifest
  zip.file(
    'manifest.json',
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
  const blob = await zip.generateAsync({ type: 'blob' });
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
  const fileData =
    typeof (file as any).arrayBuffer === 'function'
      ? await (file as any).arrayBuffer()
      : file;
  const zip = await JSZip.loadAsync(fileData);

  let matchCount = 0;
  let memoCount = 0;
  let playerCount = 0;
  let photoCount = 0;

  // 1. Import Memos
  try {
    const memosFile = zip.file('memos.json');
    if (memosFile) {
      const memosText = await memosFile.async('string');
      const memosData = JSON.parse(memosText);
      const eventMemos = Array.isArray(memosData.event_memos)
        ? memosData.event_memos
        : [];
      const customEvents = Array.isArray(memosData.custom_events)
        ? memosData.custom_events
        : [];
      const matchMemos = Array.isArray(memosData.match_memos)
        ? memosData.match_memos
        : [];
      const tacticalSnapshots = Array.isArray(memosData.tactical_snapshots)
        ? memosData.tactical_snapshots
        : [];

      await importMemosBatch(eventMemos, customEvents, matchMemos);
      if (tacticalSnapshots.length > 0) {
        await putTacticalSnapshotsBatch(tacticalSnapshots);
      }

      memoCount =
        eventMemos.length +
        customEvents.length +
        matchMemos.length +
        tacticalSnapshots.length;
      console.log(`[footics] Memos restored: ${memoCount} items`);
    }
  } catch (err) {
    console.error('[footics] Failed to restore memos:', err);
  }

  // 2. Import Matches & Sync Chelsea Players to Master
  try {
    const matchesFile = zip.file('matches.json');
    if (matchesFile) {
      const matchesText = await matchesFile.async('string');
      const rawMatches = JSON.parse(matchesText) as Array<
        Match & { matchId?: number }
      >;

      if (Array.isArray(rawMatches) && rawMatches.length > 0) {
        // Normalize: ensure every record has a string `id` field
        const normalizedMatches: Match[] = rawMatches.map((m) => ({
          ...m,
          id: String(m.id ?? m.matchId ?? ''),
        }));

        await putMatchesBatch(normalizedMatches);
        matchCount = normalizedMatches.length;
        console.log(`[footics] Matches restored: ${matchCount} matches`);

        // 試合データからシーズンを導出してチェルシー選手を PlayerMaster へ同期
        for (const m of normalizedMatches) {
          const season = getSeasonFromDate(m.date);
          const homeTeamName = m.homeTeam?.name || m.teams?.home?.name;
          const awayTeamName = m.awayTeam?.name || m.teams?.away?.name;

          const syncPlayers = async (players?: Player[], team = 'Chelsea') => {
            if (!Array.isArray(players)) return;
            for (const p of players) {
              if (!p?.playerId) continue;
              await savePlayerMaster({
                playerId: p.playerId,
                name: p.name || `Player ${p.playerId}`,
                season,
                defaultShirtNo: p.shirtNo,
                position: p.position || 'Sub',
                teamName: team,
              });
            }
          };

          if (isChelseaTeam(homeTeamName) && m.teams?.home?.players) {
            await syncPlayers(m.teams.home.players as Player[], 'Chelsea');
          }
          if (isChelseaTeam(awayTeamName) && m.teams?.away?.players) {
            await syncPlayers(m.teams.away.players as Player[], 'Chelsea');
          }
        }
      }
    }
  } catch (err) {
    console.error('[footics] Failed to restore matches:', err);
  }

  // 3. Import Players & Photos (with legacy schema normalization and backward compatibility)
  try {
    const playersFile = zip.file('players.json');
    if (playersFile) {
      const playersText = await playersFile.async('string');
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

          // 1) 写真Blobの復元 (photos/ フォルダから探索)
          let photoBlob: Blob | undefined;

          if (p.photoFileName) {
            const photoFile = zip.file(`photos/${p.photoFileName}`);
            if (photoFile) {
              const u8 = await photoFile.async('uint8array');
              const mime = getMimeTypeFromFileName(p.photoFileName);
              photoBlob = new Blob([u8 as unknown as BlobPart], { type: mime });
            }
          }

          // photoFileName が未指定またはファイルが見つからない場合のフォールバック探索
          if (!photoBlob) {
            const safeId = encodeURIComponent(id).replace(/%/g, '_');
            const candidatePaths = [
              `photos/${safeId}.png`,
              `photos/${safeId}.jpg`,
              `photos/${safeId}.webp`,
              `photos/${safeId}`,
              `photos/${id}.png`,
              `photos/${id}.jpg`,
              `photos/${id}.webp`,
              `photos/${id}`,
            ];
            for (const path of candidatePaths) {
              const photoFile = zip.file(path);
              if (photoFile) {
                const u8 = await photoFile.async('uint8array');
                const mime = getMimeTypeFromFileName(path);
                photoBlob = new Blob([u8 as unknown as BlobPart], {
                  type: mime,
                });
                break;
              }
            }
          }

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
        console.log(
          `[footics] Players restored: ${playerCount} players (${photoCount} photos)`,
        );
      }
    }
  } catch (err) {
    console.error('[footics] Failed to restore players:', err);
  }

  // 4. Import Events
  try {
    const eventsFile = zip.file('events.json');
    if (eventsFile) {
      const eventsText = await eventsFile.async('string');
      const allEvents = JSON.parse(eventsText) as EventRow[];

      if (Array.isArray(allEvents) && allEvents.length > 0) {
        // Normalize events: ensure match_id is present
        const normalizedEvents = allEvents.map((e) => ({
          ...e,
          match_id: String(e.match_id || ''),
        }));
        await putMatchEventsBatch(normalizedEvents);
        console.log(
          `[footics] Events restored: ${normalizedEvents.length} events`,
        );
      }
    }
  } catch (err) {
    console.error('[footics] Failed to restore events:', err);
  }

  return { matchCount, memoCount, playerCount, photoCount };
}
