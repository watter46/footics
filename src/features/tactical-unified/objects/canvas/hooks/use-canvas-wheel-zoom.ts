'use client';

import type { KonvaEventObject } from 'konva/lib/Node';
import { useCallback, useEffect, useRef } from 'react';
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

export interface UseCanvasWheelZoomOptions {
  containerRef?: React.RefObject<HTMLDivElement | null>;
  stageSize: { width: number; height: number };
  effectivePitch?: { x: number; y: number; width?: number; height?: number };
  pitchTransformRef: React.MutableRefObject<PitchTransform>;
  activeSlideId: string;
  updatePitchTransform: (
    slideId: string,
    transform: Partial<PitchTransform>,
  ) => void;
  applyPitchTransformToNodes: (
    panX: number,
    panY: number,
    zoom: number,
    tilt?: number,
  ) => void;
}

function resolvePitchBounds(
  effectivePitch?: { x: number; y: number; width?: number; height?: number },
  stageSize?: { width: number; height: number },
): PitchRectBounds {
  const width = effectivePitch?.width ?? stageSize?.width ?? 1920;
  const height = effectivePitch?.height ?? stageSize?.height ?? 1080;
  const x = effectivePitch?.x ?? 0;
  const y = effectivePitch?.y ?? 0;
  return { x, y, width, height };
}

function getWheelPointerPos(
  e: KonvaEventObject<WheelEvent>,
  containerEl: HTMLDivElement | null,
  stageWidth: number,
  stageHeight: number,
): Point2D {
  const evt = e.evt;
  if (containerEl && evt && typeof evt === 'object' && 'clientX' in evt) {
    const rect = containerEl.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top,
    };
  }
  const stage = e.target.getStage();
  return (
    stage?.getPointerPosition() ?? {
      x: stageWidth / 2,
      y: stageHeight / 2,
    }
  );
}

function getPitchPosAtPointer(
  pos: Point2D,
  pitchRect: PitchRectBounds,
  transform: PitchTransform,
  stageSize: { width: number; height: number },
): Point2D {
  const panX = transform.panX ?? 0;
  const panY = transform.panY ?? 0;
  const zoom = transform.zoom ?? 1;
  const tilt = transform.tilt ?? 0;

  if (Math.abs(tilt) < 1e-5) {
    return stageToPitch(pos, pitchRect, panX, panY, zoom);
  }

  const cameraParams: CameraParams = {
    tilt,
    zoom,
    panX,
    panY,
    stageWidth: stageSize.width,
    stageHeight: stageSize.height,
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

function computeZoomPanAdjustment(
  pos: Point2D,
  pitchPos: Point2D,
  pitchRect: PitchRectBounds,
  oldPanX: number,
  oldPanY: number,
  oldZoom: number,
  nextZoom: number,
  tilt: number,
): { nextPanX: number; nextPanY: number } {
  const cx = pitchRect.x + pitchRect.width / 2;
  const cy = pitchRect.y + pitchRect.height / 2;
  const relX = pos.x - cx;
  const relY = pos.y - cy;

  if (Math.abs(tilt) < 1e-5) {
    const scaleRatio = nextZoom / oldZoom;
    return {
      nextPanX: relX - (relX - oldPanX) * scaleRatio,
      nextPanY: relY - (relY - oldPanY) * scaleRatio,
    };
  }

  const safeTilt = Math.max(0, Math.min(85, tilt));
  const tiltRad = (safeTilt * Math.PI) / 180;
  const cosTilt = Math.max(0.05, Math.cos(tiltRad));
  const sinTilt = Math.sin(tiltRad);

  const localX = pitchPos.x - pitchRect.width / 2;
  const localY = pitchPos.y - pitchRect.height / 2;

  const x3d = nextZoom * localX;
  const y3d = nextZoom * localY * cosTilt;
  const z3d = nextZoom * localY * sinTilt;

  if (
    DEFAULT_PITCH_PERSPECTIVE &&
    DEFAULT_PITCH_PERSPECTIVE > 0 &&
    safeTilt > 0
  ) {
    const scale = DEFAULT_PITCH_PERSPECTIVE / (DEFAULT_PITCH_PERSPECTIVE - z3d);
    const safeScale = Math.abs(scale) < 1e-4 ? 1 : scale;
    return {
      nextPanX: relX / safeScale - x3d,
      nextPanY: relY / safeScale - y3d,
    };
  }

  return {
    nextPanX: relX - x3d,
    nextPanY: relY - y3d,
  };
}

export function useCanvasWheelZoom({
  containerRef,
  stageSize,
  effectivePitch,
  pitchTransformRef,
  activeSlideId,
  updatePitchTransform,
  applyPitchTransformToNodes,
}: UseCanvasWheelZoomOptions) {
  const wheelTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
    };
  }, []);

  const handleWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const pos = getWheelPointerPos(
        e,
        containerRef?.current ?? null,
        stageSize.width,
        stageSize.height,
      );

      const oldZoom = pitchTransformRef.current.zoom ?? 1;
      const oldPanX = pitchTransformRef.current.panX ?? 0;
      const oldPanY = pitchTransformRef.current.panY ?? 0;
      const tilt = pitchTransformRef.current.tilt ?? 0;
      const zoomFactor = e.evt.deltaY < 0 ? 1.08 : 1 / 1.08;
      const nextZoom = Math.max(0.2, Math.min(5.0, oldZoom * zoomFactor));
      if (Math.abs(nextZoom - oldZoom) < 0.0001) return;

      const pitchRect = resolvePitchBounds(effectivePitch, stageSize);
      const pitchPos = getPitchPosAtPointer(
        pos,
        pitchRect,
        pitchTransformRef.current,
        stageSize,
      );

      const { nextPanX, nextPanY } = computeZoomPanAdjustment(
        pos,
        pitchPos,
        pitchRect,
        oldPanX,
        oldPanY,
        oldZoom,
        nextZoom,
        tilt,
      );

      applyPitchTransformToNodes(nextPanX, nextPanY, nextZoom, tilt);

      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
      wheelTimeoutRef.current = setTimeout(() => {
        updatePitchTransform(activeSlideId, {
          zoom: pitchTransformRef.current.zoom,
          panX: pitchTransformRef.current.panX,
          panY: pitchTransformRef.current.panY,
          tilt: pitchTransformRef.current.tilt,
        });
      }, 150);
    },
    [
      containerRef,
      stageSize,
      effectivePitch,
      activeSlideId,
      updatePitchTransform,
      applyPitchTransformToNodes,
      pitchTransformRef,
    ],
  );

  return { handleWheel };
}
