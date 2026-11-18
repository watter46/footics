'use client';

import type { ReactNode } from 'react';
import { memo } from 'react';
import { Group, Layer, Rect } from 'react-konva';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import {
  type PitchRectBounds,
  resolvePitchGroupTransform,
} from '../utils/canvas-coordinates';
import { PitchBackgroundImage } from './BackgroundImageLayer';

export interface PitchBackgroundLayerProps {
  stageSize: { width: number; height: number };
  pitchRect: PitchRectBounds;
}

export const PitchBackgroundLayer = memo(function PitchBackgroundLayer({
  stageSize,
  pitchRect,
}: PitchBackgroundLayerProps): ReactNode {
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const pitchTransform = useDocumentStore(
    (s) =>
      selectDomainActiveSlide(s.project, activePhaseId, activeSlideId)
        ?.pitchTransform,
  );

  const groupTransform = resolvePitchGroupTransform(pitchRect, pitchTransform);

  return (
    <Layer id="pitch-background-layer" listening={false}>
      <Rect
        x={0}
        y={0}
        width={stageSize.width}
        height={stageSize.height}
        fill="#000000"
        listening={false}
      />
      <Group
        x={groupTransform.x}
        y={groupTransform.y}
        scaleX={groupTransform.scaleX}
        scaleY={groupTransform.scaleY}
      >
        <PitchBackgroundImage
          width={pitchRect.width}
          height={pitchRect.height}
        />
      </Group>
    </Layer>
  );
});
