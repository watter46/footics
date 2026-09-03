'use client';

import type React from 'react';
import { Group, Path } from 'react-konva';
import {
  SPOTLIGHT_BEAM_PATH,
  SPOTLIGHT_VIEWBOX_HEIGHT,
  SPOTLIGHT_VIEWBOX_WIDTH,
} from '@/lib/tactical/marker-assets';
import type { Player } from '@/lib/types/tactical-unified';

export interface PlayerFocusSpotlightProps {
  focus: NonNullable<Player['focus']>;
  radius: number;
  spotlightGroupRef?: React.Ref<any>;
}

export function PlayerFocusSpotlight({
  focus,
  radius,
  spotlightGroupRef,
}: PlayerFocusSpotlightProps) {
  if (!focus.enabled) return null;

  const focusColor = focus.color ?? '#ffffff';
  const focusOpacity = focus.opacity ?? 0.35;
  const focusRadiusMultiplier = focus.radius ?? 3;
  const markerW = radius * 2 * (focusRadiusMultiplier / 3);
  const spotlightScale = (markerW * 1.25) / SPOTLIGHT_VIEWBOX_WIDTH;
  const tx = -(SPOTLIGHT_VIEWBOX_WIDTH * spotlightScale) / 2;
  // フォーカスの最下部 (SPOTLIGHT_VIEWBOX_HEIGHT * spotlightScale) をリングの最下部 (radius * 0.55) に正確に一致させる
  const ty = radius * 0.55 - SPOTLIGHT_VIEWBOX_HEIGHT * spotlightScale;

  return (
    <Group ref={spotlightGroupRef} listening={false}>
      {/* 上から注ぐ光の柱 (ビーム) */}
      <Group x={tx} y={ty} scale={{ x: spotlightScale, y: spotlightScale }}>
        <Path
          data={SPOTLIGHT_BEAM_PATH}
          fill={focusColor}
          opacity={focusOpacity * 0.85}
          perfectDrawEnabled={false}
        />
      </Group>
    </Group>
  );
}
