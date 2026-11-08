import { getPlayerPhotoKey } from '@/lib/tactical/player-photo-key';
import type { Player } from '@/lib/types/tactical-unified';

export function buildPlayerPhotoRecord(
  players: Player[],
  photoMap: ReadonlyMap<string, HTMLImageElement | CanvasImageSource>,
): Record<string, CanvasImageSource> {
  const record: Record<string, CanvasImageSource> = {};
  for (const [key, img] of photoMap.entries()) {
    record[key] = img;
  }
  for (const p of players) {
    const key = getPlayerPhotoKey(p);
    const img = photoMap.get(key);
    if (img) {
      record[p.id] = img;
      if (p.playerId) {
        record[String(p.playerId)] = img;
      }
    }
  }
  return record;
}
