'use client';

import { createContext, useContext } from 'react';
import { getPlayerPhotoKey } from '@/lib/tactical/player-photo-key';

export type PlayerPhotoMap = ReadonlyMap<string, HTMLImageElement>;

const PlayerPhotoContext = createContext<PlayerPhotoMap | null>(null);

export function PlayerPhotoProvider({
  photos,
  children,
}: {
  photos: PlayerPhotoMap;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <PlayerPhotoContext.Provider value={photos}>
      {children}
    </PlayerPhotoContext.Provider>
  );
}

export function usePlayerPhotoImage(marker: {
  playerId?: string | number;
  id: string;
  style?: { insideContent?: string };
}): HTMLImageElement | null {
  const photos = useContext(PlayerPhotoContext);
  if (marker.style?.insideContent !== 'photo') {
    return null;
  }
  if (!photos) {
    return null;
  }
  const key = getPlayerPhotoKey(marker);
  return photos.get(key) ?? null;
}
