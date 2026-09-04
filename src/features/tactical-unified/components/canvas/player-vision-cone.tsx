'use client';

import { Arc, Circle, Group, Line } from 'react-konva';
import type { Player } from '@/lib/types/tactical-unified';

function normX(v: number, w: number) {
  return (v / 100) * w;
}

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

  // Interactive handles positions
  const dirHandleX = pxRadius * Math.cos(cone.angleRad);
  const dirHandleY = pxRadius * Math.sin(cone.angleRad);

  const edge1Angle = cone.angleRad - cone.spreadRad / 2;
  const edge1X = pxRadius * 0.85 * Math.cos(edge1Angle);
  const edge1Y = pxRadius * 0.85 * Math.sin(edge1Angle);

  const edge2Angle = cone.angleRad + cone.spreadRad / 2;
  const edge2X = pxRadius * 0.85 * Math.cos(edge2Angle);
  const edge2Y = pxRadius * 0.85 * Math.sin(edge2Angle);

  // 3D Foot Ring (足元楕円: rx=radius*1.15, ry=radius*0.55) の境界から視野を展開
  const rx = isRing ? radius * 1.15 : radius + 2;
  const ry = isRing ? radius * 0.55 : radius + 2;

  return (
    <Group>
      {isRing ? (
        /* 楕円リングの周りを自然に回る視野扇形 */
        <Line
          points={(() => {
            const startA = cone.angleRad - cone.spreadRad / 2;
            const endA = cone.angleRad + cone.spreadRad / 2;
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
          })()}
          closed={true}
          fill={cone.color + alphaHex}
          stroke={isSelected ? '#38bdf8' : undefined}
          strokeWidth={isSelected ? 1 : 0}
          listening={true}
          onClick={(e) => {
            e.cancelBubble = true;
            onSelectOption?.();
          }}
          onTap={(e) => {
            e.cancelBubble = true;
            onSelectOption?.();
          }}
        />
      ) : (
        /* 通常の正円マーカー用 Arc */
        <Arc
          x={0}
          y={0}
          innerRadius={radius + 2}
          outerRadius={pxRadius}
          angle={spreadDeg}
          rotation={angleDeg}
          fill={cone.color + alphaHex}
          stroke={isSelected ? '#38bdf8' : undefined}
          strokeWidth={isSelected ? 1 : 0}
          listening={true}
          onClick={(e) => {
            e.cancelBubble = true;
            onSelectOption?.();
          }}
          onTap={(e) => {
            e.cancelBubble = true;
            onSelectOption?.();
          }}
        />
      )}

      {isSelected && onUpdateVisionCone && (
        <Group>
          {/* 方向 & 視野長ドラッグハンドル */}
          <Circle
            x={dirHandleX}
            y={dirHandleY}
            radius={7}
            fill="#ffffff"
            stroke="#0284c7"
            strokeWidth={2}
            draggable
            shadowColor="rgba(0,0,0,0.5)"
            shadowBlur={3}
            onMouseEnter={(e) => {
              const c = e.target.getStage()?.container();
              if (c) c.style.cursor = 'grab';
            }}
            onMouseLeave={(e) => {
              const c = e.target.getStage()?.container();
              if (c) c.style.cursor = 'default';
            }}
            onDragMove={(e) => {
              e.cancelBubble = true;
              const curX = e.target.x();
              const curY = e.target.y();
              let angleRad = Math.atan2(curY, curX);
              if (angleRad < 0) angleRad += 2 * Math.PI;
              const newRadius = Math.max(
                8,
                Math.min(60, (Math.hypot(curX, curY) / stageSize.width) * 100),
              );
              onUpdateVisionCone({ angleRad, radius: Math.round(newRadius) });
            }}
          />

          {/* 広がり角ドラッグハンドル 1 */}
          <Circle
            x={edge1X}
            y={edge1Y}
            radius={5.5}
            fill="#38bdf8"
            stroke="#ffffff"
            strokeWidth={1.5}
            draggable
            onMouseEnter={(e) => {
              const c = e.target.getStage()?.container();
              if (c) c.style.cursor = 'ew-resize';
            }}
            onMouseLeave={(e) => {
              const c = e.target.getStage()?.container();
              if (c) c.style.cursor = 'default';
            }}
            onDragMove={(e) => {
              e.cancelBubble = true;
              const curX = e.target.x();
              const curY = e.target.y();
              let dragAngle = Math.atan2(curY, curX);
              if (dragAngle < 0) dragAngle += 2 * Math.PI;
              let diff = Math.abs(dragAngle - cone.angleRad);
              if (diff > Math.PI) diff = 2 * Math.PI - diff;
              const spreadRad = Math.max(0.3, Math.min(Math.PI, diff * 2));
              onUpdateVisionCone({ spreadRad });
            }}
          />

          {/* 広がり角ドラッグハンドル 2 */}
          <Circle
            x={edge2X}
            y={edge2Y}
            radius={5.5}
            fill="#38bdf8"
            stroke="#ffffff"
            strokeWidth={1.5}
            draggable
            onMouseEnter={(e) => {
              const c = e.target.getStage()?.container();
              if (c) c.style.cursor = 'ew-resize';
            }}
            onMouseLeave={(e) => {
              const c = e.target.getStage()?.container();
              if (c) c.style.cursor = 'default';
            }}
            onDragMove={(e) => {
              e.cancelBubble = true;
              const curX = e.target.x();
              const curY = e.target.y();
              let dragAngle = Math.atan2(curY, curX);
              if (dragAngle < 0) dragAngle += 2 * Math.PI;
              let diff = Math.abs(dragAngle - cone.angleRad);
              if (diff > Math.PI) diff = 2 * Math.PI - diff;
              const spreadRad = Math.max(0.3, Math.min(Math.PI, diff * 2));
              onUpdateVisionCone({ spreadRad });
            }}
          />
        </Group>
      )}
    </Group>
  );
}
