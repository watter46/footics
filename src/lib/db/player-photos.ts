import { dispatchRefreshEvent } from './extension-db-queries';
import { db, type PlayerPhoto } from './schema';

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
