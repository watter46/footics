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

  const clampedX = Math.max(160, Math.min(stageSize.width - 160, target.x));
  const MARGIN = 32;
  const HUD_HEIGHT = 44;
  const PADDING = 10;

  const targetTop = target.y - target.height / 2;
  const targetBottom = target.y + target.height / 2;

  const isBelow = targetTop - MARGIN - HUD_HEIGHT < PADDING;
  const clampedY = isBelow
    ? Math.min(stageSize.height - HUD_HEIGHT - PADDING, targetBottom + MARGIN)
    : Math.max(HUD_HEIGHT + PADDING, targetTop - MARGIN);

  return { clampedX, clampedY, isBelow };
}
