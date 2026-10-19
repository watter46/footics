import type React from 'react';
import { useCanvasStore } from '../../hooks/use-canvas-store';
import type { SelectedObject } from '../../types';
import {
  type HudOffsetRect,
  type HudTarget,
  resolveHudTarget,
} from './hud-targets';

export interface UseHudPositionProps {
  selected?: SelectedObject;
  stageSize: { width: number; height: number };
  pitchRect?: { x: number; y: number; width: number; height: number };
  nodesRegistryRef?: React.MutableRefObject<any>;
  resolveExtraTarget?: (
    selected: SelectedObject,
    offset: HudOffsetRect,
  ) => HudTarget | null;
}

export interface HudPosition {
  clampedX: number;
  clampedY: number;
  isBelow: boolean;
}

export function computeClampedHudPos(
  targetX: number,
  targetY: number,
  targetHeight: number,
  stageSize: { width: number; height: number },
): HudPosition {
  const clampedX = Math.max(160, Math.min(stageSize.width - 160, targetX));
  const MARGIN = 32;
  const HUD_HEIGHT = 44;
  const PADDING = 10;

  const targetTop = targetY - targetHeight / 2;
  const targetBottom = targetY + targetHeight / 2;

  const isBelow = targetTop - MARGIN - HUD_HEIGHT < PADDING;
  const clampedY = isBelow
    ? Math.min(stageSize.height - HUD_HEIGHT - PADDING, targetBottom + MARGIN)
    : Math.max(HUD_HEIGHT + PADDING, targetTop - MARGIN);

  return { clampedX, clampedY, isBelow };
}

export function useHudPosition({
  selected,
  stageSize,
  pitchRect,
  nodesRegistryRef,
  resolveExtraTarget,
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
    resolveExtraTarget,
  });

  if (!target) return null;

  return computeClampedHudPos(target.x, target.y, target.height, stageSize);
}
