'use client';

import { Arc, Group, Line } from 'react-konva';
import type { Player } from '@/lib/types/tactical-unified';
import { normX } from '../types';
import { PlayerVisionConeHandles } from './player-vision-cone-handles';

export interface PlayerVisionConeProps {
  cone: NonNullable<Player['visionCone']>;
  radius: number;
  isRing?: boolean;
  stageSize: { width: number; height: number };
  isSelected?: boolean;
  onUpdateVisionCone?: (
    patch: Partial<NonNullable<Player['visionCone']>>,
  ) => void;
  onSelectOption?: () => void;
}

function computeRingConePoints(
  angleRad: number,
  spreadRad: number,
  pxRadius: number,
  rx: number,
  ry: number,
): number[] {
  const startA = angleRad - spreadRad / 2;
  const endA = angleRad + spreadRad / 2;
  const steps = 36;
  const pts: number[] = [];

  // 外側円弧 (Outer Arc)
  for (let i = 0; i <= steps; i++) {
    const a = startA + (i / steps) * (endA - startA);
    pts.push(pxRadius * Math.cos(a), pxRadius * Math.sin(a));
  }
  // 内側楕円弧 (Inner Ellipse Arc - 逆順で閉じる)
  for (let i = steps; i >= 0; i--) {
    const a = startA + (i / steps) * (endA - startA);
    pts.push(rx * Math.cos(a), ry * Math.sin(a));
  }
  return pts;
}

export function PlayerVisionCone({
  cone,
  radius,
  isRing,
  stageSize,
  isSelected,
  onUpdateVisionCone,
  onSelectOption,
}: PlayerVisionConeProps) {
  if (!cone.visible) return null;
  const pxRadius = normX(cone.radius, stageSize.width);
  const spreadDeg = (cone.spreadRad * 180) / Math.PI;
  const angleDeg = (cone.angleRad * 180) / Math.PI - spreadDeg / 2;
  const alphaHex = Math.round((cone.opacity ?? 0.3) * 255)
    .toString(16)
    .padStart(2, '0');

  // 3D Foot Ring (足元楕円: rx=radius*1.15, ry=radius*0.55) の境界から視野を展開
  const rx = isRing ? radius * 1.15 : radius + 2;
  const ry = isRing ? radius * 0.55 : radius + 2;

  const handleClick = (e: { cancelBubble: boolean }) => {
    e.cancelBubble = true;
    onSelectOption?.();
  };

  return (
    <Group>
      {isRing ? (
        <Line
          points={computeRingConePoints(
            cone.angleRad,
            cone.spreadRad,
            pxRadius,
            rx,
            ry,
          )}
          closed={true}
          fill={cone.color + alphaHex}
          stroke={isSelected ? '#38bdf8' : undefined}
          strokeWidth={isSelected ? 2 : 0}
          shadowColor={isSelected ? '#38bdf8' : undefined}
          shadowBlur={isSelected ? 8 : 0}
          shadowOpacity={isSelected ? 0.8 : 0}
          listening={true}
          onClick={handleClick}
          onTap={handleClick}
        />
      ) : (
        <Arc
          x={0}
          y={0}
          innerRadius={radius + 2}
          outerRadius={pxRadius}
          angle={spreadDeg}
          rotation={angleDeg}
          fill={cone.color + alphaHex}
          stroke={isSelected ? '#38bdf8' : undefined}
          strokeWidth={isSelected ? 2 : 0}
          shadowColor={isSelected ? '#38bdf8' : undefined}
          shadowBlur={isSelected ? 8 : 0}
          shadowOpacity={isSelected ? 0.8 : 0}
          listening={true}
          onClick={handleClick}
          onTap={handleClick}
        />
      )}

      {isSelected && onUpdateVisionCone && (
        <PlayerVisionConeHandles
          cone={cone}
          pxRadius={pxRadius}
          stageSize={stageSize}
          onUpdateVisionCone={onUpdateVisionCone}
        />
      )}
    </Group>
  );
}
