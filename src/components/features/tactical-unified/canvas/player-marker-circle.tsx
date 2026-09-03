'use client';

import { Circle, Group, Image as KonvaImage, Text } from 'react-konva';
import type { Player } from '@/lib/types/tactical-unified';

export interface PlayerMarkerCircleProps {
  player: Player;
  radius: number;
  numScale: number;
  isSelected: boolean;
  loadedImage: HTMLImageElement | null;
}

export function PlayerMarkerCircle({
  player,
  radius,
  numScale,
  isSelected,
  loadedImage,
}: PlayerMarkerCircleProps) {
  return (
    <Group>
      {/* 写真表示時は周りの境界線（border/stroke）を無くし、選択時のみ選択枠を表示 */}
      <Circle
        radius={radius}
        fill={player.style.color}
        stroke={
          isSelected
            ? '#60a5fa'
            : player.style.insideContent === 'photo' && loadedImage
              ? undefined
              : (player.style.strokeColor ?? '#ffffff')
        }
        strokeWidth={
          isSelected
            ? 3
            : player.style.insideContent === 'photo' && loadedImage
              ? 0
              : (player.style.strokeWidth ?? 2)
        }
        shadowColor={isSelected ? '#3b82f6' : 'rgba(0,0,0,0)'}
        shadowBlur={isSelected ? 8 : 0}
        shadowOffset={{ x: 0, y: isSelected ? 2 : 0 }}
        shadowOpacity={isSelected ? 0.6 : 0}
        perfectDrawEnabled={false}
      />

      {/* 選手サークル内の表示: 写真 (insideContent === 'photo' かつ画像がある場合) */}
      {player.style.insideContent === 'photo' && loadedImage ? (
        <Group
          listening={false}
          clipFunc={(ctx) => {
            ctx.arc(0, 0, radius, 0, Math.PI * 2, false);
          }}
        >
          <KonvaImage
            image={loadedImage}
            x={-radius}
            y={-radius}
            width={radius * 2}
            height={radius * 2}
            perfectDrawEnabled={false}
            listening={false}
          />
        </Group>
      ) : player.style.insideContent === 'none' ? null : (
        /* 写真がない場合または insideContent === 'number' の場合は背番号を表示 */
        player.shirtNo && (
          <Text
            x={-radius}
            y={-radius * 0.55}
            width={radius * 2}
            text={player.shirtNo}
            fontSize={radius * 0.9 * numScale}
            fill="#ffffff"
            align="center"
            fontStyle="bold"
            listening={false}
            perfectDrawEnabled={false}
          />
        )
      )}
    </Group>
  );
}
