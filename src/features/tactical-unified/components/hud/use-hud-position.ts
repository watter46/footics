import type React from 'react';
import type { SelectedObject } from '@/features/tactical-unified/stores/tactical-unified-store';
import type { Slide } from '@/lib/types/tactical-unified';
import type { CanvasNodesRegistry } from '../canvas/canvas-registry';
import {
  getArrowTarget,
  getTextTarget,
  getZoneTarget,
} from './hud-annotation-targets';
import {
  getBallTarget,
  getPlayerTarget,
  type HudRect,
  type HudTarget,
} from './hud-marker-targets';

export interface UseHudPositionProps {
  selected?: SelectedObject;
  activeSlide?: Slide;
  stageSize: { width: number; height: number };
  pitchRect?: { x: number; y: number; width: number; height: number };
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
}

export interface HudPosition {
  clampedX: number;
  clampedY: number;
  isBelow: boolean;
}

function resolveTarget(
  selected: SelectedObject,
  activeSlide: Slide,
  offset: HudRect,
  nodesRef?: React.MutableRefObject<CanvasNodesRegistry>,
): HudTarget | null {
  if (selected.kind === 'player') {
    const player = activeSlide.players.find((p) => p.id === selected.id);
    return player ? getPlayerTarget(player, offset, nodesRef) : null;
  }
  if (selected.kind === 'arrow') {
    const arrow = activeSlide.arrows.find((a) => a.id === selected.id);
    return arrow ? getArrowTarget(arrow, offset, nodesRef) : null;
  }
  if (selected.kind === 'zone') {
    const zone = activeSlide.zones.find((z) => z.id === selected.id);
    return zone ? getZoneTarget(zone, offset, nodesRef) : null;
  }
  if (selected.kind === 'text') {
    const text = activeSlide.texts.find((t) => t.id === selected.id);
    return text ? getTextTarget(text, offset, nodesRef) : null;
  }
  if (selected.kind === 'ball') {
    return getBallTarget(activeSlide.ball, offset, nodesRef);
  }
  return null;
}

export function useHudPosition({
  selected,
  activeSlide,
  stageSize,
  pitchRect,
  nodesRegistryRef,
}: UseHudPositionProps): HudPosition | null {
  if (!selected || !activeSlide) return null;

  const offset = pitchRect ?? {
    x: 0,
    y: 0,
    width: stageSize.width,
    height: stageSize.height,
  };

  const target = resolveTarget(selected, activeSlide, offset, nodesRegistryRef);
  if (!target) return null;

  const clampedX = Math.max(120, Math.min(stageSize.width - 120, target.x));
  const isTooCloseToTop = target.y - target.height / 2 - 50 < 10;
  const isBelow = isTooCloseToTop;
  const clampedY = isBelow
    ? target.y + target.height / 2 + 12
    : target.y - target.height / 2 - 12;

  return { clampedX, clampedY, isBelow };
}
