'use client';

import { useCallback, useRef, useState } from 'react';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import type { PitchTransform } from '@/lib/types/tactical-unified';
import {
  DEFAULT_PITCH_PERSPECTIVE,
  type PitchRectBounds,
  type Point2D,
  screenToPitch,
  stageToPitch,
} from '../helpers/canvas-coordinates';
import {
  type CameraParams,
  unprojectScreenToPitch,
} from '../helpers/matrix-coordinates';
import { useCanvasSpaceKey } from './use-canvas-space-key';

export interface UseCanvasPitchPanOptions {
  activeSlideId: string;
  isPitchLocked: boolean;
  pitchTransformRef: React.MutableRefObject<PitchTransform>;
  applyPitchTransformToNodes: (
    panX: number,
    panY: number,
    zoom: number,
    tilt?: number,
  ) => void;
  stageSize?: { width: number; height: number };
  effectivePitch?: { x: number; y: number; width?: number; height?: number };
}

interface PanSessionState {
  isPanning: boolean;
  startX: number;
  startY: number;
  startPanX: number;
  startPanY: number;
  hasMoved: boolean;
  grabPitchPos: Point2D;
  pitchRect: PitchRectBounds;
}

function resolvePitchRect(
  effectivePitch?: { x: number; y: number; width?: number; height?: number },
  stageSize?: { width: number; height: number },
): PitchRectBounds {
  const width = effectivePitch?.width ?? stageSize?.width ?? 1920;
  const height = effectivePitch?.height ?? stageSize?.height ?? 1080;
  const x = effectivePitch?.x ?? 0;
  const y = effectivePitch?.y ?? 0;
  return { x, y, width, height };
}

function getUnprojectedPitchPos(
  pos: Point2D,
  pitchRect: PitchRectBounds,
  transform: PitchTransform,
  stageSize?: { width: number; height: number },
): Point2D {
  const panX = transform.panX ?? 0;
  const panY = transform.panY ?? 0;
  const zoom = transform.zoom ?? 1;
  const tilt = transform.tilt ?? 0;

  if (Math.abs(tilt) < 1e-5) {
    return stageToPitch(pos, pitchRect, panX, panY, zoom);
  }

  const stageWidth = stageSize?.width ?? pitchRect.x * 2 + pitchRect.width;
  const stageHeight = stageSize?.height ?? pitchRect.y * 2 + pitchRect.height;

  const cameraParams: CameraParams = {
    tilt,
    zoom,
    panX,
    panY,
    stageWidth,
    stageHeight,
    pitchWidth: pitchRect.width,
    pitchHeight: pitchRect.height,
    pitchX: pitchRect.x,
    pitchY: pitchRect.y,
    pitchRect,
  };

  const norm = unprojectScreenToPitch(pos, cameraParams);
  if (norm) {
    return { x: norm.x * pitchRect.width, y: norm.y * pitchRect.height };
  }
  return screenToPitch(
    pos,
    pitchRect,
    panX,
    panY,
    zoom,
    tilt,
    DEFAULT_PITCH_PERSPECTIVE,
  );
}

function compute3DPan(
  screenPos: Point2D,
  pitchPos: Point2D,
  pitchRect: PitchRectBounds,
  zoom: number,
  tilt: number,
): { panX: number; panY: number } {
  const safeZoom = Math.max(0.001, zoom);
  const safeTilt = Math.max(0, Math.min(85, tilt));
  const tiltRad = (safeTilt * Math.PI) / 180;
  const cosTilt = Math.max(0.05, Math.cos(tiltRad));
  const sinTilt = Math.sin(tiltRad);

  const cx = pitchRect.x + pitchRect.width / 2;
  const cy = pitchRect.y + pitchRect.height / 2;
  const relX = screenPos.x - cx;
  const relY = screenPos.y - cy;

  const localX = pitchPos.x - pitchRect.width / 2;
  const localY = pitchPos.y - pitchRect.height / 2;

  const x3d = safeZoom * localX;
  const y3d = safeZoom * localY * cosTilt;
  const z3d = safeZoom * localY * sinTilt;

  if (
    DEFAULT_PITCH_PERSPECTIVE &&
    DEFAULT_PITCH_PERSPECTIVE > 0 &&
    safeTilt > 0
  ) {
    const scale = DEFAULT_PITCH_PERSPECTIVE / (DEFAULT_PITCH_PERSPECTIVE - z3d);
    const safeScale = Math.abs(scale) < 1e-4 ? 1 : scale;
    return {
      panX: relX / safeScale - x3d,
      panY: relY / safeScale - y3d,
    };
  }

  return {
    panX: relX - x3d,
    panY: relY - y3d,
  };
}

function createPanSessionState(
  pos: Point2D,
  pitchTransform: PitchTransform,
  effectivePitch?: { x: number; y: number; width?: number; height?: number },
  stageSize?: { width: number; height: number },
): PanSessionState {
  const panX = pitchTransform.panX ?? 0;
  const panY = pitchTransform.panY ?? 0;
  const pitchRect = resolvePitchRect(effectivePitch, stageSize);
  const grabPitchPos = getUnprojectedPitchPos(
    pos,
    pitchRect,
    pitchTransform,
    stageSize,
  );

  return {
    isPanning: true,
    startX: pos.x,
    startY: pos.y,
    startPanX: panX,
    startPanY: panY,
    hasMoved: false,
    grabPitchPos,
    pitchRect,
  };
}

function computeNextPan(
  pos: Point2D,
  state: PanSessionState,
  zoom: number,
  tilt: number,
): { panX: number; panY: number } {
  if (Math.abs(tilt) < 1e-5) {
    const dx = pos.x - state.startX;
    const dy = pos.y - state.startY;
    return {
      panX: state.startPanX + dx,
      panY: state.startPanY + dy,
    };
  }

  return compute3DPan(pos, state.grabPitchPos, state.pitchRect, zoom, tilt);
}

export function useCanvasPitchPan({
  activeSlideId,
  isPitchLocked,
  pitchTransformRef,
  applyPitchTransformToNodes,
  stageSize,
  effectivePitch,
}: UseCanvasPitchPanOptions) {
  const activeTool = useTacticalUnifiedStore((s) => s.activeTool);
  const updatePitchTransform = useTacticalUnifiedStore(
    (s) => s.updatePitchTransform,
  );
  const clearSelection = useTacticalUnifiedStore((s) => s.clearSelection);

  const [isPanning, setIsPanning] = useState(false);
  const { isSpacePressed, isSpacePressedRef } = useCanvasSpaceKey();
  const panStateRef = useRef<PanSessionState | null>(null);

  const handlePointerDown = useCallback(
    (pos: Point2D, isBg: boolean, isInsidePitch = true) => {
      const isSpace = isSpacePressedRef.current;
      const canPan =
        isSpace ||
        (activeTool === 'select' && !isPitchLocked && isBg && isInsidePitch);
      if (!canPan) return false;

      panStateRef.current = createPanSessionState(
        pos,
        pitchTransformRef.current,
        effectivePitch,
        stageSize,
      );
      setIsPanning(true);
      return true;
    },
    [
      activeTool,
      isPitchLocked,
      isSpacePressedRef,
      pitchTransformRef,
      stageSize,
      effectivePitch,
    ],
  );

  const handlePointerMove = useCallback(
    (pos: Point2D) => {
      if (!panStateRef.current?.isPanning) return false;

      const state = panStateRef.current;
      if (
        !state.hasMoved &&
        Math.hypot(pos.x - state.startX, pos.y - state.startY) >= 4
      ) {
        state.hasMoved = true;
      }

      const zoom = pitchTransformRef.current.zoom ?? 1;
      const tilt = pitchTransformRef.current.tilt ?? 0;
      const { panX, panY } = computeNextPan(pos, state, zoom, tilt);

      applyPitchTransformToNodes(panX, panY, zoom, tilt);
      return true;
    },
    [applyPitchTransformToNodes, pitchTransformRef],
  );

  const handlePointerUp = useCallback(() => {
    if (!panStateRef.current?.isPanning) return false;

    const { hasMoved } = panStateRef.current;
    panStateRef.current = null;
    setIsPanning(false);

    if (hasMoved) {
      updatePitchTransform(
        activeSlideId,
        {
          panX: pitchTransformRef.current.panX,
          panY: pitchTransformRef.current.panY,
        },
        true,
      );
    } else {
      clearSelection();
    }
    return true;
  }, [activeSlideId, clearSelection, updatePitchTransform, pitchTransformRef]);

  return {
    isPanning,
    isSpacePressed,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
