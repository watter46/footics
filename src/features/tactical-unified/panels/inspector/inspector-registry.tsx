'use client';

import type React from 'react';
import {
  type SelectedObject,
  type SelectedObjectKind,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import type { Slide } from '@/lib/types/tactical-unified';
import { ArrowInspector } from './arrow-inspector';
import { AttachedElementInspector } from './attached-element-inspector';
import { BallInspector } from './ball-inspector';
import { PlayerInspector } from './player-inspector';
import { TextInspector } from './text-inspector';
import { ZoneInspector } from './zone-inspector';

export interface InspectorComponentProps {
  selected: SelectedObject;
  slideId: string;
  activeSlide: Slide;
  onDeselect: () => void;
}

export interface InspectorEntry {
  getTitle: (selected: SelectedObject, slide: Slide) => string;
  component: React.ComponentType<InspectorComponentProps>;
}

function PlayerInspectorEntryComponent({
  selected,
  slideId,
  activeSlide,
  onDeselect,
}: InspectorComponentProps) {
  const player = activeSlide.players.find((p) => p.id === selected.id);
  const updatePlayer = useTacticalUnifiedStore((s) => s.updatePlayer);
  const addArrow = useTacticalUnifiedStore((s) => s.addArrow);
  const removePlayer = useTacticalUnifiedStore((s) => s.removePlayer);

  if (!player) return null;

  return (
    <PlayerInspector
      player={player}
      allPlayers={activeSlide.players}
      slideId={slideId}
      updatePlayer={updatePlayer}
      addArrow={addArrow}
      onRemove={() => {
        removePlayer(slideId, player.id);
        onDeselect();
      }}
    />
  );
}

function ArrowInspectorEntryComponent({
  selected,
  slideId,
  activeSlide,
  onDeselect,
}: InspectorComponentProps) {
  const arrow = activeSlide.arrows.find((a) => a.id === selected.id);
  const updateArrow = useTacticalUnifiedStore((s) => s.updateArrow);
  const removeArrow = useTacticalUnifiedStore((s) => s.removeArrow);

  if (!arrow) return null;

  return (
    <ArrowInspector
      arrow={arrow}
      slideId={slideId}
      updateArrow={updateArrow}
      onRemove={() => {
        removeArrow(slideId, arrow.id);
        onDeselect();
      }}
    />
  );
}

function ZoneInspectorEntryComponent({
  selected,
  slideId,
  activeSlide,
  onDeselect,
}: InspectorComponentProps) {
  const zone = activeSlide.zones.find((z) => z.id === selected.id);
  const updateZone = useTacticalUnifiedStore((s) => s.updateZone);
  const removeZone = useTacticalUnifiedStore((s) => s.removeZone);

  if (!zone) return null;

  return (
    <ZoneInspector
      zone={zone}
      slideId={slideId}
      updateZone={updateZone}
      onRemove={() => {
        removeZone(slideId, zone.id);
        onDeselect();
      }}
    />
  );
}

function TextInspectorEntryComponent({
  selected,
  slideId,
  activeSlide,
  onDeselect,
}: InspectorComponentProps) {
  const text = activeSlide.texts.find((t) => t.id === selected.id);
  const updateText = useTacticalUnifiedStore((s) => s.updateText);
  const removeText = useTacticalUnifiedStore((s) => s.removeText);

  if (!text) return null;

  return (
    <TextInspector
      text={text}
      slideId={slideId}
      updateText={updateText}
      onRemove={() => {
        removeText(slideId, text.id);
        onDeselect();
      }}
    />
  );
}

function BallInspectorEntryComponent({ slideId }: InspectorComponentProps) {
  return <BallInspector slideId={slideId} />;
}

export const inspectorRegistry: Partial<
  Record<SelectedObjectKind, InspectorEntry>
> = {
  player: {
    getTitle: (selected, slide) => {
      const player = slide.players.find((p) => p.id === selected.id);
      if (player?.style?.markerType === 'ring') {
        return 'Ring';
      }
      if (player?.shirtNo) {
        return `Player #${player.shirtNo}`;
      }
      return 'Player';
    },
    component: PlayerInspectorEntryComponent,
  },
  arrow: {
    getTitle: () => 'Arrow & Line',
    component: ArrowInspectorEntryComponent,
  },
  zone: {
    getTitle: () => 'Zone',
    component: ZoneInspectorEntryComponent,
  },
  text: {
    getTitle: () => 'Text',
    component: TextInspectorEntryComponent,
  },
  ball: {
    getTitle: () => 'Ball',
    component: BallInspectorEntryComponent,
  },
  'vision-cone': {
    getTitle: () => 'Vision Cone',
    component: AttachedElementInspector,
  },
  'connect-line': {
    getTitle: () => 'Connect Line',
    component: AttachedElementInspector,
  },
  focus: {
    getTitle: () => 'Focus Spotlight',
    component: AttachedElementInspector,
  },
};
