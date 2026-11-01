import { strToU8, type Zippable, zipSync } from 'fflate';
import {
  getPhotoExtension,
  isValidPhotoBlob,
  toUint8Array,
  uint8ArrayToBlob,
} from './data-management-helpers';
import {
  getAllCustomEvents,
  getAllEvents,
  getAllMatches,
  getAllMatchMemos,
  getAllPlayerMasters,
  getAllPlayerPhotos,
} from './db';
import { db } from './db/schema';

const BACKUP_VERSION = 5;

/**
 * 全データを ZIP 形式でエクスポートする
 */
export async function exportAllDataZip(): Promise<void> {
  const files: Zippable = {};

  // 1. Custom Events & Match Memos
  const [
    customEvents,
    matchMemos,
    playerMasters,
    playerPhotos,
    tacticalProjects,
    keyvalEntries,
  ] = await Promise.all([
    getAllCustomEvents(),
    getAllMatchMemos(),
    getAllPlayerMasters(),
    getAllPlayerPhotos(),
    db.tactical_projects.toArray(),
    db.keyval.toArray(),
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

  // 2. Main Data (Matches & Events)
  const [matches, allEvents] = await Promise.all([
    getAllMatches(),
    getAllEvents(),
  ]);

  files['matches.json'] = strToU8(JSON.stringify(matches, null, 2));
  files['events.json'] = strToU8(JSON.stringify(allEvents, null, 2));

  // 3. Tactical Projects & KeyVal
  files['tactical_projects.json'] = strToU8(
    JSON.stringify(tacticalProjects, null, 2),
  );
  files['keyval.json'] = strToU8(JSON.stringify(keyvalEntries, null, 2));

  // 4. Photos & Metadata (Stored with level 0 - no compression for image binary)
  let photoCount = 0;
  const photoMap = new Map<number, string>();

  const playerPhotosMeta = await Promise.all(
    playerPhotos.map(async (photo) => {
      const ext = getPhotoExtension(photo.photoBlob);
      const photoFileName = `${photo.playerId}.${ext}`;
      photoMap.set(photo.playerId, photoFileName);

      if (isValidPhotoBlob(photo.photoBlob)) {
        try {
          const buffer = await toUint8Array(photo.photoBlob);
          files[`photos/${photoFileName}`] = [buffer, { level: 0 }];
          photoCount++;
        } catch (err) {
          console.warn(
            `[footics] Failed to serialize photo for ${photo.playerId}:`,
            err,
          );
        }
      }

      return {
        playerId: photo.playerId,
        mimeType: photo.mimeType || photo.photoBlob?.type || 'image/webp',
        updatedAt: photo.updatedAt,
        photoFileName,
      };
    }),
  );

  files['player_photos.json'] = strToU8(
    JSON.stringify(playerPhotosMeta, null, 2),
  );

  // 5. Players (backward-compatible photoFileName, without photoBlob)
  const sanitizedPlayers = playerMasters.map((p) => {
    const { photoBlob, ...rest } = p;
    const photoFileName = photoMap.get(p.playerId);
    return {
      ...rest,
      ...(photoFileName ? { photoFileName } : {}),
    };
  });

  files['players.json'] = strToU8(JSON.stringify(sanitizedPlayers, null, 2));

  // 6. Manifest
  files['manifest.json'] = strToU8(
    JSON.stringify(
      {
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        matchCount: matches.length,
        playerCount: playerMasters.length,
        photoCount,
        tacticalProjectCount: tacticalProjects.length,
      },
      null,
      2,
    ),
  );

  // 7. Generate & Download
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
