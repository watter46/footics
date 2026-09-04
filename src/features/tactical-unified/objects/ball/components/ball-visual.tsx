'use client';

import React from 'react';
import { Circle, Image as KonvaImage } from 'react-konva';

interface BallVisualProps {
  radius: number;
  ballImage: HTMLImageElement | null;
  isSelected: boolean;
}

export const BallVisual = React.memo(function BallVisual({
  radius,
  ballImage,
  isSelected,
}: BallVisualProps) {
  return (
    <>
      {/* ヒットテスト用円 (クリック・ドラッグ検出を100%確実にする) */}
      <Circle
        radius={radius}
        fill="transparent"
        listening={true}
        perfectDrawEnabled={false}
      />

      {/* 選択中のハイライトリング */}
      {isSelected && (
        <Circle
          radius={radius + 3.5}
          stroke="#38bdf8"
          strokeWidth={1.5}
          dash={[3, 2]}
          shadowColor="#38bdf8"
          shadowBlur={4}
          shadowOpacity={0.6}
          listening={false}
          perfectDrawEnabled={false}
        />
      )}

      {/* リアルなサッカーボール画像 (SVG) */}
      {ballImage ? (
        <KonvaImage
          image={ballImage}
          x={-radius}
          y={-radius}
          width={radius * 2}
          height={radius * 2}
          perfectDrawEnabled={false}
          listening={false}
        />
      ) : (
        <Circle
          radius={radius}
          fill="#ffffff"
          stroke="#0f172a"
          strokeWidth={1.5}
          shadowColor="rgba(0,0,0,0.5)"
          shadowBlur={4}
          shadowOffset={{ x: 0, y: 2 }}
          shadowOpacity={0.4}
          perfectDrawEnabled={false}
          listening={false}
        />
      )}
    </>
  );
});
