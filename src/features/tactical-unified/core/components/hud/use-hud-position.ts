import type React from 'react';
import type { SelectedObject } from '@/features/tactical-unified/core/types';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/core/utils/canvas-registry';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import {
  type HudOffsetRect,
  type HudTarget,
  resolveHudTarget,
} from './hud-targets';

export interface UseHudPositionProps {
  selected?: SelectedObject;
  stageSize: { width: number; height: number };
  pitchRect?: { x: number; y: number; width: number; height: number };
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  resolveExtraTarget?: (
    selected: SelectedObject,
    offset: HudOffsetRect,
  ) => HudTarget | null;
}

export interface HudPosition {
  clampedX: number;
  clampedY: number;
  isBelow: boolean;
  targetX?: number;
  targetY?: number;
  targetHeight?: number;
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

  return { clampedX, clampedY, isBelow, targetX, targetY, targetHeight };
}

export function useHudPosition({
  selected,
  stageSize,
  pitchRect,
  nodesRegistryRef,
  resolveExtraTarget,
}: UseHudPositionProps): HudPosition | null {
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const activeSlide = useDocumentStore((s) =>
    selectDomainActiveSlide(s.project, activePhaseId, activeSlideId),
  );

  if (!selected) return null;

  const players = activeSlide?.players ?? [];
  const arrows = activeSlide?.arrows ?? [];
  const zones = activeSlide?.zones ?? [];
  const texts = activeSlide?.texts ?? [];

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
    data: { players, arrows, zones, texts },
    resolveExtraTarget,
  });

  if (!target) return null;

  return computeClampedHudPos(target.x, target.y, target.height, stageSize);
}
