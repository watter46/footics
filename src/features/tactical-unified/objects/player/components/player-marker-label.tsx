'use client';

import { Text } from 'react-konva';
import type { Player } from '@/lib/types/tactical-unified';

export interface PlayerMarkerLabelProps {
  player: Player;
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
  if (player.style.bottomLabel === 'name' && displayName) {
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
