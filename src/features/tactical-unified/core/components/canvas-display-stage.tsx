'use client';

import type Konva from 'konva';
import type React from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { useCanvasStore } from '../hooks/use-canvas-store';
import { useCanvasViewport } from '../hooks/use-canvas-viewport';
import {
  type CanvasNodesRegistry,
  createCanvasNodesRegistry,
} from '../utils/canvas-registry';
import { applyBoundaryCropToPitchRect } from '../utils/preview-scene-projector';
import { CanvasStage } from './canvas-stage';

export interface CanvasDisplayStageProps {
  className?: string;
  imageAspect?: number;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  onStageSizeChange?: (size: { width: number; height: number }) => void;
}

export function CanvasDisplayStage({
  className = '',
  imageAspect,
  nodesRegistryRef: injectedRegistryRef,
  onStageSizeChange,
}: CanvasDisplayStageProps) {
  const stageRef = useRef<Konva.Stage | null>(null);

  const { containerRef, containerSize, vRect } = useCanvasViewport({
    imageAspect,
    onStageSizeChange,
  });

  const boundaryBox = useCanvasStore((s) => s.boundaryBox);
  const effectiveVRect = useMemo(
    () => applyBoundaryCropToPitchRect(vRect, boundaryBox),
    [vRect, boundaryBox],
  );

  const internalRegistryRef = useRef<CanvasNodesRegistry>(
    createCanvasNodesRegistry(),
  );
  const nodesRegistryRef = injectedRegistryRef ?? internalRegistryRef;

  useEffect(() => {
    nodesRegistryRef.current.stage = stageRef.current;
    nodesRegistryRef.current.pitchRect = effectiveVRect;
    return () => {
      if (nodesRegistryRef.current.stage === stageRef.current) {
        nodesRegistryRef.current.stage = null;
      }
    };
  }, [nodesRegistryRef, effectiveVRect]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none bg-surface-l0 ${className}`}
    >
      <CanvasStage
        stageRef={stageRef}
        size={containerSize}
        vRect={effectiveVRect}
        nodesRegistryRef={nodesRegistryRef}
        cleanRender={true}
      />
    </div>
  );
}
