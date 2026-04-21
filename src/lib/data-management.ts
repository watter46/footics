import JSZip from 'jszip';
import type { EventRow, Match } from '@/types';
import {
  getAllCustomEvents,
  getAllEventMemos,
  getAllEvents,
  getAllMatches,
  getAllMatchMemos,
  getAllTacticalSnapshots,
  importMemosBatch,
  putMatchEventsBatch,
  putMatchesBatch,
  putTacticalSnapshotsBatch,
} from './db';

const BACKUP_VERSION = 3;

/**
 * 全データを ZIP 形式でエクスポートする
 */
export async function exportAllDataZip(): Promise<void> {
  const zip = new JSZip();

  // 1. Memos, Custom Events, Match Memos & Snapshots
  const [eventMemos, customEvents, matchMemos, tacticalSnapshots] =
    await Promise.all([
      getAllEventMemos(),
      getAllCustomEvents(),
      getAllMatchMemos(),
      getAllTacticalSnapshots(),
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

  // 2. Main Data (Matches, Events)
  const [matches, allEvents] = await Promise.all([
    getAllMatches(),
    getAllEvents(),
  ]);

  zip.file('matches.json', JSON.stringify(matches, null, 2));
  zip.file('events.json', JSON.stringify(allEvents, null, 2));

  // 3. Manifest
  zip.file(
    'manifest.json',
    JSON.stringify(
      {
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        matchCount: matches.length,
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

  let matchCount = 0;
  let memoCount = 0;

  // 2. Import Memos
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

  // 3. Import Matches
  try {
    const matchesFile = zip.file('matches.json');
    if (matchesFile) {
      const matchesText = await matchesFile.async('string');
      const rawMatches = JSON.parse(matchesText) as Array<
        Match & { matchId?: number }
      >;

      if (rawMatches.length > 0) {
        // Normalize: ensure every record has a string `id` field
        const normalizedMatches: Match[] = rawMatches.map((m) => ({
          ...m,
          id: String(m.id ?? m.matchId ?? ''),
        }));

        await putMatchesBatch(normalizedMatches);
        matchCount = normalizedMatches.length;
        console.log(`[footics] Matches restored: ${matchCount} matches`);
      }
    }
  } catch (err) {
    console.error('[footics] Failed to restore matches:', err);
  }

  // 4. Import Events
  try {
    const eventsFile = zip.file('events.json');
    if (eventsFile) {
      const eventsText = await eventsFile.async('string');
      const allEvents = JSON.parse(eventsText) as EventRow[];

      if (allEvents.length > 0) {
        await putMatchEventsBatch(allEvents);
        console.log(`[footics] Events restored: ${allEvents.length} events`);
      }
    }
  } catch (err) {
    console.error('[footics] Failed to restore events:', err);
  }

  return { matchCount, memoCount };
}
