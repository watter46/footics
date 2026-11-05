'use client';

import { type ReactNode, useMemo } from 'react';
import { PlayerPhotoProvider } from '@/features/tactical-unified/core';
import { usePlayerPhotoRegistry } from '@/features/tactical-unified/objects/player/hooks/use-player-photo-registry';
import { selectActivePhaseSlides } from '@/features/tactical-unified/stores/tactical-unified-selectors';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';

export interface TacticalPlayerPhotoProviderProps {
  children: ReactNode;
}

export function TacticalPlayerPhotoProvider({
  children,
}: TacticalPlayerPhotoProviderProps): React.JSX.Element {
  const activeSlides = useTacticalUnifiedStoreContext(selectActivePhaseSlides);
  const allPhasePlayers = useMemo(
    () => activeSlides.flatMap((s) => s.players ?? []),
    [activeSlides],
  );
  const photos = usePlayerPhotoRegistry(allPhasePlayers);

  return <PlayerPhotoProvider photos={photos}>{children}</PlayerPhotoProvider>;
}
