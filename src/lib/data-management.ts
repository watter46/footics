import JSZip from 'jszip';
import type { MatchBlobEntry, MatchMetadata, MatchSummary } from '@/types';
import {
  getAllCustomEvents,
  getAllEventMemos,
  getAllMatchBlobs,
  getAllMatchMemos,
  importMemosBatch,
  putMatchBlobsBatch,
  putMatchesBatch,
} from './db';

const BACKUP_VERSION = 1;

/**
 * 全データを ZIP 形式でエクスポートする
 */
export async function exportAllDataZip(): Promise<void> {
  const zip = new JSZip();

  // 1. Memos, Custom Events & Match Memos
  const [eventMemos, customEvents, matchMemos] = await Promise.all([
    getAllEventMemos(),
    getAllCustomEvents(),
    getAllMatchMemos(),
  ]);

  zip.file(
    'memos.json',
    JSON.stringify(
      {
        event_memos: eventMemos,
        custom_events: customEvents,
        match_memos: matchMemos,
      },
      null,
      2,
    ),
  );

  // 2. Match Blobs (Unified DB)
  const blobEntries = await getAllMatchBlobs();
  const matchMetadataList: { matchId: string; metadata: MatchMetadata }[] = [];

  const parquetFolder = zip.folder('parquet');

  for (const entry of blobEntries) {
    const matchId = entry.metadata.matchId;
    matchMetadataList.push({
      matchId,
      metadata: entry.metadata,
    });

    if (parquetFolder) {
      parquetFolder.file(`${matchId}_matches.parquet`, entry.matchesParquet);
      parquetFolder.file(`${matchId}_players.parquet`, entry.playersParquet);
      parquetFolder.file(`${matchId}_events.parquet`, entry.eventsParquet);
    }
  }

  zip.file('matches.json', JSON.stringify(matchMetadataList, null, 2));

  // 3. Manifest
  zip.file(
    'manifest.json',
    JSON.stringify(
      {
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        matchCount: blobEntries.length,
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
export async function importAllDataZip(
  file: File,
): Promise<{ matchCount: number; memoCount: number }> {
  const zip = await JSZip.loadAsync(file);

  // 1. Check Manifest
  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) throw new Error('Invalid backup: manifest.json missing');

  // 2. Import Memos
  let memoCount = 0;
  const memosFile = zip.file('memos.json');
  if (memosFile) {
    const memosData = JSON.parse(await memosFile.async('string'));
    const eventMemos = Array.isArray(memosData.event_memos)
      ? memosData.event_memos
      : [];
    const customEvents = Array.isArray(memosData.custom_events)
      ? memosData.custom_events
      : [];
    const matchMemos = Array.isArray(memosData.match_memos)
      ? memosData.match_memos
      : [];

    await importMemosBatch(eventMemos, customEvents, matchMemos);
    memoCount = eventMemos.length + customEvents.length + matchMemos.length;
  }

  // 3. Import Match Blobs
  let matchCount = 0;
  const matchesFile = zip.file('matches.json');
  if (matchesFile) {
    const matchesList = JSON.parse(await matchesFile.async('string'));
    const blobEntries: MatchBlobEntry[] = [];

    for (const mInfo of matchesList) {
      const matchId = mInfo.matchId;

      const pMatches = zip.file(`parquet/${matchId}_matches.parquet`);
      const pPlayers = zip.file(`parquet/${matchId}_players.parquet`);
      const pEvents = zip.file(`parquet/${matchId}_events.parquet`);

      if (pMatches && pPlayers && pEvents) {
        blobEntries.push({
          matchId,
          version: 1,
          metadata: mInfo.metadata,
          matchesParquet: await pMatches.async('arraybuffer'),
          playersParquet: await pPlayers.async('arraybuffer'),
          eventsParquet: await pEvents.async('arraybuffer'),
        });
      }
    }

    if (blobEntries.length > 0) {
      await putMatchBlobsBatch(blobEntries);

      // footics_db.matches ストアにも概要情報を登録
      const summaries: MatchSummary[] = blobEntries.map((e) => ({
        id: e.metadata.matchId,
        homeTeam: {
          id: e.metadata.teams.home.teamId,
          name: e.metadata.teams.home.name,
        },
        awayTeam: {
          id: e.metadata.teams.away.teamId,
          name: e.metadata.teams.away.name,
        },
        date: e.metadata.date,
        score: e.metadata.score,
        matchType: e.metadata.matchType,
      }));
      await putMatchesBatch(summaries);

      matchCount = blobEntries.length;
    }
  }

  return { matchCount, memoCount };
}
