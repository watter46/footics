'use client';

import { Group, Rect, Text } from 'react-konva';
import type { Player } from '@/lib/types/tactical-unified';

export interface PlayerBadgeProps {
  badge: Player['badges'][number];
  radius: number;
  onSelectOption?: () => void;
}

export function PlayerBadge({
  badge,
  radius,
  onSelectOption,
}: PlayerBadgeProps) {
  if (!badge.visible) return null;
  const bw = Math.max(badge.label.length * 6 + 8, 24);
  const bh = 14;
  const bx = badge.offsetX - bw / 2;
  const by = -radius - bh - 4 + badge.offsetY;

  return (
    <Group
      x={bx}
      y={by}
      listening={true}
      onClick={(e) => {
        e.cancelBubble = true;
        onSelectOption?.();
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelectOption?.();
      }}
    >
      <Rect width={bw} height={bh} fill={badge.color} cornerRadius={3} />
      <Text
        x={0}
        y={2}
        width={bw}
        text={badge.label}
        fontSize={9}
        fill={badge.textColor}
        align="center"
        fontStyle="bold"
      />
    </Group>
  );
}
