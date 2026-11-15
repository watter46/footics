'use client';

import { type ReactNode, useMemo } from 'react';
import { PlayerPhotoProvider } from '@/features/tactical-unified/core';
import { usePlayerPhotoRegistry } from '@/features/tactical-unified/objects/player/hooks/use-player-photo-registry';
import { selectDomainActivePhaseSlides } from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';

export interface TacticalPlayerPhotoProviderProps {
  children: ReactNode;
}

export function TacticalPlayerPhotoProvider({
  children,
}: TacticalPlayerPhotoProviderProps): React.JSX.Element {
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlides = useDocumentStore((s) =>
    selectDomainActivePhaseSlides(s.project, activePhaseId),
  );
  const allPhasePlayers = useMemo(
    () => activeSlides.flatMap((s) => s.players),
    [activeSlides],
  );
  const photos = usePlayerPhotoRegistry(allPhasePlayers);

  return <PlayerPhotoProvider photos={photos}>{children}</PlayerPhotoProvider>;
}
