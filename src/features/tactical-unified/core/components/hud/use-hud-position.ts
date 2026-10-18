import type React from 'react';
import { useCanvasStore } from '../../hooks/use-canvas-store';
import type { SelectedObject } from '../../types';
import { resolveHudTarget } from './hud-targets';

export interface UseHudPositionProps {
  selected?: SelectedObject;
  stageSize: { width: number; height: number };
  pitchRect?: { x: number; y: number; width: number; height: number };
  nodesRegistryRef?: React.MutableRefObject<any>;
}

export interface HudPosition {
  clampedX: number;
  clampedY: number;
  isBelow: boolean;
}

export function useHudPosition({
  selected,
  stageSize,
  pitchRect,
  nodesRegistryRef,
}: UseHudPositionProps): HudPosition | null {
  const arrows = useCanvasStore((s) => s.annotations.arrows);
  const zones = useCanvasStore((s) => s.annotations.zones);
  const texts = useCanvasStore((s) => s.annotations.texts);
  const markers = useCanvasStore((s) => s.annotations.markers);

  if (!selected) return null;

  const offset = pitchRect ?? {
    x: 0,
    y: 0,
    width: stageSize.width,
    height: stageSize.height,
  };

  const target = resolveHudTarget({
    selected,
    offset,
    nodesRegistryRef,
    data: { markers, arrows, zones, texts },
  });

  if (!target) return null;

  const clampedX = Math.max(120, Math.min(stageSize.width - 120, target.x));
  const isBelow = target.y - target.height / 2 - 50 < 10;
  const clampedY = isBelow
    ? target.y + target.height / 2 + 12
    : target.y - target.height / 2 - 12;

  return { clampedX, clampedY, isBelow };
}
