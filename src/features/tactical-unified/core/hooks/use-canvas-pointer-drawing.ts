'use client';

import type { KonvaEventObject } from 'konva/lib/Node';
import { useCallback } from 'react';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { toScreenNormPoint } from '@/lib/types/tactical/branded';
import {
  commitDrawingShape,
  createRingFadeMarker,
  createRingMarker,
  createTextAnnotation,
} from '../utils/canvas-drawing-factory';

export interface UseCanvasPointerDrawingOptions {
  vRect: { width: number; height: number };
}

export function useCanvasPointerDrawing({
  vRect,
}: UseCanvasPointerDrawingOptions) {
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const activeTool = useSessionStore((s) => s.activeTool);
  const setActiveTool = useSessionStore((s) => s.setActiveTool);
  const color = useSessionStore((s) => s.color);
  const strokeWidth = useSessionStore((s) => s.strokeWidth);
  const drawingPreview = useSessionStore((s) => s.drawingPreview);
  const setDrawingPreview = useSessionStore((s) => s.setDrawingPreview);
  const clearSelection = useSessionStore((s) => s.clearSelection);

  const dispatchSlide = useDocumentStore((s) => s.dispatchSlide);
  const playersCount = useDocumentStore(
    (s) =>
      selectDomainActiveSlide(s.project, activePhaseId, activeSlideId)?.players
        .length ?? 0,
  );

  const getNormPos = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition() ?? { x: 0, y: 0 };
      const normX = vRect.width > 0 ? (pos.x / vRect.width) * 100 : 0;
      const normY = vRect.height > 0 ? (pos.y / vRect.height) * 100 : 0;
      return {
        normX: Math.max(0, Math.min(100, normX)),
        normY: Math.max(0, Math.min(100, normY)),
      };
    },
    [vRect.width, vRect.height],
  );

  const handlePointerDown = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (activeTool === 'select') {
        if (e.target === e.target.getStage()) clearSelection();
        return;
      }
      const { normX, normY } = getNormPos(e);
      if (['pass', 'dribble', 'zone'].includes(activeTool)) {
        const pt = toScreenNormPoint(normX, normY);
        setDrawingPreview({
          tool: activeTool,
          startPoint: pt,
          currentPoint: pt,
        });
      } else if (activeTool === 'text') {
        dispatchSlide(activePhaseId, activeSlideId, {
          type: 'ADD_TEXT',
          text: createTextAnnotation(normX, normY, '#ffffff'),
        });
        setActiveTool('select');
      } else if (activeTool === 'player-ring-fade') {
        dispatchSlide(activePhaseId, activeSlideId, {
          type: 'ADD_PLAYER',
          player: createRingFadeMarker(
            normX,
            normY,
            color || '#ffffff',
            `${playersCount + 1}`,
          ),
        });
        setActiveTool('select');
      } else if (activeTool === 'player-ring') {
        dispatchSlide(activePhaseId, activeSlideId, {
          type: 'ADD_PLAYER',
          player: createRingMarker(
            normX,
            normY,
            '#3b82f6',
            `${playersCount + 1}`,
          ),
        });
        setActiveTool('select');
      }
    },
    [
      activeTool,
      activePhaseId,
      activeSlideId,
      getNormPos,
      clearSelection,
      setDrawingPreview,
      dispatchSlide,
      playersCount,
      color,
      setActiveTool,
    ],
  );

  const handlePointerMove = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!drawingPreview) return;
      const { normX, normY } = getNormPos(e);
      setDrawingPreview({
        ...drawingPreview,
        currentPoint: toScreenNormPoint(normX, normY),
      });
    },
    [drawingPreview, getNormPos, setDrawingPreview],
  );

  const handlePointerUp = useCallback(() => {
    if (!drawingPreview) return;
    commitDrawingShape(
      drawingPreview,
      color,
      strokeWidth,
      (arrow) =>
        dispatchSlide(activePhaseId, activeSlideId, {
          type: 'ADD_ARROW',
          arrow,
        }),
      (zone) =>
        dispatchSlide(activePhaseId, activeSlideId, { type: 'ADD_ZONE', zone }),
    );
    setDrawingPreview(null);
  }, [
    drawingPreview,
    color,
    strokeWidth,
    dispatchSlide,
    activePhaseId,
    activeSlideId,
    setDrawingPreview,
  ]);

  return { handlePointerDown, handlePointerMove, handlePointerUp };
}
