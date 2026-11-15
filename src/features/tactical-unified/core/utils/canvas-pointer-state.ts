import { useCallback, useMemo } from 'react';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { eraseEntitiesAtPoint } from '@/lib/tactical/domain/erase-entities';
import { toScreenNormPoint } from '@/lib/types/tactical/branded';
import type {
  DomainArrowAnnotation,
  DomainPlayer,
  DomainTextAnnotation,
  DomainZoneAnnotation,
} from '@/lib/types/tactical/domain-entities';
import type { DrawingPreviewState, DrawingTool } from '../types';

const EMPTY_PLAYERS: readonly DomainPlayer[] = [];

export function useCanvasPointerStore() {
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const activeTool = useSessionStore((s) => s.activeTool);
  const setActiveTool = useSessionStore((s) => s.setActiveTool);
  const continuousDrawing = useSessionStore((s) => s.continuousDrawing);
  const color = useSessionStore((s) => s.color);
  const strokeWidth = useSessionStore((s) => s.strokeWidth);
  const sessionDrawingPreview = useSessionStore((s) => s.drawingPreview);
  const setSessionDrawingPreview = useSessionStore((s) => s.setDrawingPreview);
  const connectingPlayerId = useSessionStore((s) => s.connectingPlayerId);
  const setConnectingPlayerId = useSessionStore((s) => s.setConnectingPlayerId);

  const dispatchSlide = useDocumentStore((s) => s.dispatchSlide);
  const activeSlide = useDocumentStore((s) =>
    selectDomainActiveSlide(s.project, activePhaseId, activeSlideId),
  );
  const players = activeSlide?.players ?? EMPTY_PLAYERS;

  const drawingPreview = useMemo<DrawingPreviewState | null>(() => {
    if (
      !sessionDrawingPreview ||
      sessionDrawingPreview.tool === 'polygon_zone' ||
      sessionDrawingPreview.polygonPoints !== undefined
    ) {
      return null;
    }
    return {
      isDrawing: true,
      tool: sessionDrawingPreview.tool as DrawingTool,
      startX: sessionDrawingPreview.startPoint.x,
      startY: sessionDrawingPreview.startPoint.y,
      currentX: sessionDrawingPreview.currentPoint.x,
      currentY: sessionDrawingPreview.currentPoint.y,
    };
  }, [sessionDrawingPreview]);

  const setDrawingPreview = useCallback(
    (preview: DrawingPreviewState | null) => {
      if (!preview) {
        setSessionDrawingPreview(null);
        return;
      }
      setSessionDrawingPreview({
        tool: preview.tool,
        startPoint: toScreenNormPoint(preview.startX, preview.startY),
        currentPoint: toScreenNormPoint(preview.currentX, preview.currentY),
      });
    },
    [setSessionDrawingPreview],
  );

  const addArrow = useCallback(
    (arrow: DomainArrowAnnotation) => {
      dispatchSlide(activePhaseId, activeSlideId, {
        type: 'ADD_ARROW',
        arrow,
      });
    },
    [dispatchSlide, activePhaseId, activeSlideId],
  );

  const addZone = useCallback(
    (zone: DomainZoneAnnotation) => {
      dispatchSlide(activePhaseId, activeSlideId, {
        type: 'ADD_ZONE',
        zone,
      });
    },
    [dispatchSlide, activePhaseId, activeSlideId],
  );

  const addText = useCallback(
    (text: DomainTextAnnotation) => {
      dispatchSlide(activePhaseId, activeSlideId, {
        type: 'ADD_TEXT',
        text,
      });
    },
    [dispatchSlide, activePhaseId, activeSlideId],
  );

  const addPlayer = useCallback(
    (player: DomainPlayer) => {
      dispatchSlide(activePhaseId, activeSlideId, {
        type: 'ADD_PLAYER',
        player,
      });
    },
    [dispatchSlide, activePhaseId, activeSlideId],
  );

  const eraseAtPoint = useCallback(
    (normPos: { x: number; y: number }, radius = 4) => {
      if (!activeSlide) return;
      const ids = eraseEntitiesAtPoint(activeSlide, normPos, radius);
      if (ids.length > 0) {
        dispatchSlide(activePhaseId, activeSlideId, {
          type: 'DELETE_ENTITIES',
          ids,
        });
      }
    },
    [activeSlide, dispatchSlide, activePhaseId, activeSlideId],
  );

  return {
    activeTool,
    setActiveTool,
    continuousDrawing,
    color,
    strokeWidth,
    players,
    drawingPreview,
    setDrawingPreview,
    addArrow,
    addZone,
    addText,
    addPlayer,
    eraseAtPoint,
    connectingPlayerId,
    setConnectingPlayerId,
  };
}
