'use client';

import { Text } from 'react-konva';
import type { DomainPlayer } from '@/lib/types/tactical/domain-entities';

export interface PlayerMarkerLabelProps {
  player: DomainPlayer;
  radius: number;
  displayName: string;
  labelScale: number;
}

export function PlayerMarkerLabel({
  player,
  radius,
  displayName,
  labelScale,
}: PlayerMarkerLabelProps) {
  if (player.style.bottomLabel === 'none') {
    return null;
  }

  const isRingWithName =
    player.style.markerType === 'ring' &&
    player.style.bottomLabel !== 'number' &&
    Boolean(displayName);

  if ((player.style.bottomLabel === 'name' || isRingWithName) && displayName) {
    return (
      <Text
        x={-radius * 2}
        y={radius + 3}
        width={radius * 4}
        text={displayName}
        fontSize={radius * 0.65 * labelScale}
        fill="#ffffff"
        stroke="#020617"
        strokeWidth={2}
        fillAfterStrokeEnabled={true}
        align="center"
        fontStyle="bold"
        listening={false}
        perfectDrawEnabled={false}
      />
    );
  }

  if (player.style.bottomLabel === 'number' && player.shirtNo) {
    return (
      <Text
        x={-radius * 2}
        y={radius + 3}
        width={radius * 4}
        text={`#${player.shirtNo}`}
        fontSize={radius * 0.65 * labelScale}
        fill="#ffffff"
        stroke="#020617"
        strokeWidth={2}
        fillAfterStrokeEnabled={true}
        align="center"
        fontStyle="bold"
        listening={false}
        perfectDrawEnabled={false}
      />
    );
  }

  return null;
}
