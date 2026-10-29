'use client';

import type Konva from 'konva';
import type React from 'react';
import { Ellipse, Group, Shape } from 'react-konva';
import type { Player } from '@/lib/types/tactical-unified';

export interface PlayerMarkerRingFadeProps {
  player: Player;
  radius: number;
  numScale: number;
  isSelected: boolean;
  shapeRef?: React.Ref<Konva.Group>;
}

function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 6) {
    const r = Number.parseInt(cleanHex.slice(0, 2), 16);
    const g = Number.parseInt(cleanHex.slice(2, 4), 16);
    const b = Number.parseInt(cleanHex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

export function PlayerMarkerRingFade({
  player,
  radius,
  numScale: _numScale,
  isSelected,
  shapeRef,
}: PlayerMarkerRingFadeProps) {
  const color = player.style?.color || '#ffffff';
  const glowBlur = player.style?.glowBlur ?? 50;
  const glowOpacity = player.style?.glowOpacity ?? 1.0;
  const rx = radius * 2.3;
  const ry = radius * 1.1;
  const ringDepth = Math.max(3, radius * 0.24);

  return (
    <Group ref={shapeRef}>
      {/* 0. 透明ヒットエリア (クリック・ドラッグ用) */}
      <Ellipse
        radiusX={rx * 1.05}
        radiusY={ry * 1.05}
        fill="transparent"
        stroke="transparent"
        strokeWidth={0}
        listening={true}
        perfectDrawEnabled={false}
      />

      {/* 1. 3Dシリンダー側面（厚み部分の下部リム） */}
      <Shape
        sceneFunc={(context, shape) => {
          context.beginPath();
          context.ellipse(0, ringDepth, rx, ry, 0, 0, Math.PI, false);
          context.lineTo(-rx, 0);
          context.ellipse(0, 0, rx, ry, 0, Math.PI, 0, true);
          context.closePath();
          context.fillStrokeShape(shape);
        }}
        fill={hexToRgba(color, 0.3 * glowOpacity)}
        listening={false}
        perfectDrawEnabled={false}
      />

      {/* 2. 楕円ディスク（外周が明るく、中央に向かって透明に消滅するラジアルグラデーション） */}
      <Shape
        sceneFunc={(context) => {
          const rawCtx = context._context as CanvasRenderingContext2D;
          rawCtx.save();
          rawCtx.scale(1, ry / rx);

          const radGrad = rawCtx.createRadialGradient(0, 0, 0, 0, 0, rx);
          radGrad.addColorStop(0, hexToRgba(color, 0));
          radGrad.addColorStop(0.4, hexToRgba(color, 0));
          radGrad.addColorStop(0.7, hexToRgba(color, 0.2 * glowOpacity));
          radGrad.addColorStop(0.9, hexToRgba(color, 0.7 * glowOpacity));
          radGrad.addColorStop(1.0, hexToRgba(color, 1.0 * glowOpacity));

          rawCtx.beginPath();
          rawCtx.arc(0, 0, rx, 0, Math.PI * 2);
          rawCtx.fillStyle = radGrad;
          rawCtx.fill();
          rawCtx.restore();
        }}
        listening={false}
        perfectDrawEnabled={false}
      />

      {/* 3. 外側への多重フォグ減衰発光層（外側ほど薄くなる） */}
      {glowBlur > 0 && (
        <>
          {/* レイヤA: 最も外側に広がる淡い光彩（超広域フォグ・低不透明度） */}
          <Ellipse
            radiusX={rx}
            radiusY={ry}
            stroke={color}
            strokeWidth={8}
            shadowColor={color}
            shadowBlur={glowBlur * 1.5}
            shadowOpacity={0.9}
            opacity={glowOpacity * 0.35}
            listening={false}
            perfectDrawEnabled={false}
          />

          {/* レイヤB: 中間フォグ層（滑らかな減衰グラデーション） */}
          <Ellipse
            radiusX={rx}
            radiusY={ry}
            stroke={color}
            strokeWidth={4}
            shadowColor={color}
            shadowBlur={glowBlur * 0.8}
            shadowOpacity={0.9}
            opacity={glowOpacity * 0.65}
            listening={false}
            perfectDrawEnabled={false}
          />
        </>
      )}

      {/* 4. 外枠のシャープなストロークエッジ（芯） */}
      <Ellipse
        radiusX={rx}
        radiusY={ry}
        stroke={color}
        strokeWidth={2.4}
        shadowColor={color}
        shadowBlur={glowBlur * 0.3}
        shadowOpacity={0.9}
        opacity={1.0}
        listening={false}
        perfectDrawEnabled={false}
      />

      {/* 選択時ハイライトリング */}
      {isSelected && (
        <Ellipse
          radiusX={rx * 1.08}
          radiusY={ry * 1.08}
          stroke="#60a5fa"
          strokeWidth={2.5}
          shadowColor="#3b82f6"
          shadowBlur={8}
          shadowOpacity={0.9}
          listening={false}
          perfectDrawEnabled={false}
        />
      )}
    </Group>
  );
}
