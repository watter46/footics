'use client';

import {
  type SelectedObject,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import type { Slide } from '@/lib/types/tactical-unified';
import { MarkerConnectorSection } from './marker-connector-section';
import { MarkerSpotlightSection } from './marker-spotlight-section';
import { MarkerVisionSection } from './marker-vision-section';

export interface AttachedElementInspectorProps {
  selected: SelectedObject;
  slideId: string;
  activeSlide: Slide;
  onDeselect?: () => void;
}

export function AttachedElementInspector({
  selected,
  slideId,
  activeSlide,
}: AttachedElementInspectorProps) {
  const updatePlayer = useTacticalUnifiedStore((s) => s.updatePlayer);

  if (!selected.parentPlayerId) {
    return null;
  }

  const player = activeSlide.players.find(
    (p) => p.id === selected.parentPlayerId,
  );
  if (!player) {
    return (
      <div className="p-4 text-xs text-white/50">Parent player not found.</div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3.5 text-slate-200 custom-scrollbar">
      {selected.kind === 'vision-cone' && (
        <MarkerVisionSection
          player={player}
          slideId={slideId}
          updatePlayer={updatePlayer}
        />
      )}
      {selected.kind === 'connect-line' && (
        <MarkerConnectorSection
          player={player}
          allPlayers={activeSlide.players}
          slideId={slideId}
          updatePlayer={updatePlayer}
        />
      )}
      {selected.kind === 'focus' && (
        <MarkerSpotlightSection
          player={player}
          slideId={slideId}
          updatePlayer={updatePlayer}
        />
      )}
    </div>
  );
}
