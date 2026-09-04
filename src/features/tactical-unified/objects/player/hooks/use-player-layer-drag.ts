'use client';

import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import { useRef } from 'react';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/objects/canvas';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import type { Player, Slide } from '@/lib/types/tactical-unified';
import type { OnionSkinRefs, PlayerDragContext } from '../types';
import {
  createPlayerDragContext,
  handlePlayerDragMove,
} from './player-drag-handler';

interface UsePlayerLayerDragOptions {
  slide: Slide;
  prevSlide: Slide | null | undefined;
  stageSize: { width: number; height: number };
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
}

export function usePlayerLayerDrag({
  slide,
  prevSlide,
  stageSize,
  nodesRegistryRef,
}: UsePlayerLayerDragOptions) {
  const selectedObjects = useTacticalUnifiedStore((s) => s.selectedObjects);
  const selectObject = useTacticalUnifiedStore((s) => s.selectObject);
  const movePlayer = useTacticalUnifiedStore((s) => s.movePlayer);
  const moveMultiplePlayersByDelta = useTacticalUnifiedStore(
    (s) => s.moveMultiplePlayersByDelta,
  );
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);

  // オニオンスキン (前スライドゴースト表示) 用 Refs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ghostGroupRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ghostLineRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ghostMarkerGroupRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ghostCircleRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ghostTextRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ghostLabelRef = useRef<any>(null);

  const dragContextRef = useRef<PlayerDragContext | null>(null);

  const handleDragStart = (
    _e: KonvaEventObject<DragEvent>,
    draggedPlayer: Player,
  ) => {
    dragContextRef.current = createPlayerDragContext({
      draggedPlayer,
      slide,
      prevSlide,
      stageSize,
      selectedObjects,
      selectObject,
      onionSkinRefs: {
        ghostGroup: ghostGroupRef.current,
        ghostLine: ghostLineRef.current,
        ghostMarkerGroup: ghostMarkerGroupRef.current,
        ghostCircle: ghostCircleRef.current,
        ghostText: ghostTextRef.current,
        ghostLabel: ghostLabelRef.current,
      },
    });
  };

  const handleDragMove = (e: KonvaEventObject<DragEvent>, _player: Player) => {
    const ctx = dragContextRef.current;
    if (!ctx) return;
    handlePlayerDragMove({
      e,
      ctx,
      stageSize,
      nodesRegistryRef,
      onionSkinGhostLine: ghostLineRef.current,
    });
  };

  const handleDragEnd = (
    e: KonvaEventObject<DragEvent>,
    draggedPlayer: Player,
  ) => {
    const ctx = dragContextRef.current;
    const { width, height } = stageSize;
    const node = e.currentTarget;

    if (ctx && ctx.movingPlayerIds.length > 0) {
      const deltaNormX = ((node.x() - ctx.startPx.x) / width) * 100;
      const deltaNormY = ((node.y() - ctx.startPx.y) / height) * 100;

      moveMultiplePlayersByDelta(
        activeSlideId,
        ctx.movingPlayerIds,
        deltaNormX,
        deltaNormY,
      );
    } else {
      const finalNormX = Math.max(0, Math.min(100, (node.x() / width) * 100));
      const finalNormY = Math.max(0, Math.min(100, (node.y() / height) * 100));
      movePlayer(activeSlideId, draggedPlayer.id, finalNormX, finalNormY);
    }

    if (ghostGroupRef.current) {
      ghostGroupRef.current.visible(false);
      ghostGroupRef.current.getLayer()?.batchDraw();
    }

    dragContextRef.current = null;
  };

  const onionSkinRefs: OnionSkinRefs = {
    ghostGroup: ghostGroupRef.current,
    ghostLine: ghostLineRef.current,
    ghostMarkerGroup: ghostMarkerGroupRef.current,
    ghostCircle: ghostCircleRef.current,
    ghostText: ghostTextRef.current,
    ghostLabel: ghostLabelRef.current,
  };

  return {
    ghostGroupRef,
    ghostLineRef,
    ghostMarkerGroupRef,
    ghostCircleRef,
    ghostTextRef,
    ghostLabelRef,
    onionSkinRefs,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  };
}
