'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { Circle, Group, Image as KonvaImage, Line, Text } from 'react-konva';
import { getLastName } from '@/lib/tactical/player-formatting';
import type { MarkerOptions } from '@/stores/tactical-animation-store';

interface AnimationMarkerProps {
  id: string;
  x: number; // % coords (0-100)
  y: number; // % coords (0-100)
  color: string;
  name: string;
  shirtNo: string;
  options: MarkerOptions;
  stageWidth: number;
  stageHeight: number;
  isSelected?: boolean;
  isBall?: boolean;
  draggable?: boolean;
  onClick?: (id: string, e?: unknown) => void;
  onDragEnd?: (id: string, x: number, y: number) => void;
}

export const AnimationMarker: React.FC<AnimationMarkerProps> = ({
  id,
  x,
  y,
  color,
  name,
  shirtNo,
  options,
  stageWidth,
  stageHeight,
  isSelected = false,
  isBall = false,
  draggable = true,
  onClick,
  onDragEnd,
}) => {
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);

  // マーカーサイズ: sizeScale (デフォルト1.0) を反映
  const baseDim = Math.min(stageWidth, stageHeight);
  const sizeScale = options.sizeScale ?? 1.0;
  const radius = (isBall ? baseDim * 0.022 : baseDim * 0.032) * sizeScale;

  const pxX = (x / 100) * stageWidth;
  const pxY = (y / 100) * stageHeight;

  // ラストネームを取得
  const displayName = getLastName(name);

  // 顔写真画像のロード
  useEffect(() => {
    if (options.insideContent === 'photo' && options.photoUrl) {
      const img = new window.Image();
      img.src = options.photoUrl;
      img.crossOrigin = 'Anonymous';
      img.onload = () => setLoadedImage(img);
      img.onerror = () => setLoadedImage(null);
    } else {
      setLoadedImage(null);
    }
  }, [options.insideContent, options.photoUrl]);

  if (isBall) {
    // リアルなサッカーボールの五角形・六角形パターン計算
    const centerR = radius * 0.42;
    const centerPentagonPts: number[] = [];
    const outerLines: Array<{
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    }> = [];
    const outerPatches: number[][] = [];

    for (let i = 0; i < 5; i++) {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      const cx = Math.cos(angle) * centerR;
      const cy = Math.sin(angle) * centerR;
      centerPentagonPts.push(cx, cy);

      const ox = Math.cos(angle) * radius;
      const oy = Math.sin(angle) * radius;
      outerLines.push({ x1: cx, y1: cy, x2: ox, y2: oy });

      const nextAngle = -Math.PI / 2 + ((i + 1) * 2 * Math.PI) / 5;
      const midAngle = (angle + nextAngle) / 2;
      const patchW = (2 * Math.PI) / 10;
      const p1x = Math.cos(midAngle - patchW * 0.45) * radius;
      const p1y = Math.sin(midAngle - patchW * 0.45) * radius;
      const p2x = Math.cos(midAngle + patchW * 0.45) * radius;
      const p2y = Math.sin(midAngle + patchW * 0.45) * radius;
      const innerX = Math.cos(midAngle) * (radius * 0.72);
      const innerY = Math.sin(midAngle) * (radius * 0.72);
      outerPatches.push([p1x, p1y, p2x, p2y, innerX, innerY]);
    }

    return (
      <Group
        id="marker-ball"
        x={pxX}
        y={pxY}
        draggable={draggable}
        onClick={(e) => onClick?.('ball', e)}
        onTap={(e) => onClick?.('ball', e)}
        onDragEnd={(e) => {
          if (onDragEnd) {
            const newX = Math.max(
              0,
              Math.min(100, (e.target.x() / stageWidth) * 100),
            );
            const newY = Math.max(
              0,
              Math.min(100, (e.target.y() / stageHeight) * 100),
            );
            onDragEnd('ball', newX, newY);
          }
        }}
      >
        {/* 白ベース円 */}
        <Circle
          radius={radius}
          fill="#ffffff"
          stroke="#0f172a"
          strokeWidth={Math.max(1.2, radius * 0.08)}
          perfectDrawEnabled={false}
        />

        {/* 外周黒パッチ */}
        {outerPatches.map((pts, idx) => (
          <Line
            key={`ball-patch-${idx}`}
            points={pts}
            closed
            fill="#0f172a"
            perfectDrawEnabled={false}
            listening={false}
          />
        ))}

        {/* 外周への放射ライン */}
        {outerLines.map((line, idx) => (
          <Line
            key={`ball-line-${idx}`}
            points={[line.x1, line.y1, line.x2, line.y2]}
            stroke="#0f172a"
            strokeWidth={Math.max(1, radius * 0.07)}
            perfectDrawEnabled={false}
            listening={false}
          />
        ))}

        {/* 中央黒五角形 */}
        <Line
          points={centerPentagonPts}
          closed
          fill="#0f172a"
          stroke="#0f172a"
          strokeWidth={Math.max(0.5, radius * 0.05)}
          perfectDrawEnabled={false}
          listening={false}
        />

        {/* 選択ハイライト */}
        {isSelected && (
          <Circle
            radius={radius + 4}
            stroke="#38bdf8"
            strokeWidth={2.5}
            dash={[4, 2]}
            perfectDrawEnabled={false}
            listening={false}
          />
        )}
      </Group>
    );
  }

  return (
    <Group
      id={`marker-${id}`}
      x={pxX}
      y={pxY}
      draggable={draggable}
      onClick={(e) => onClick?.(id, e)}
      onTap={(e) => onClick?.(id, e)}
      onDragEnd={(e) => {
        if (onDragEnd) {
          const newX = Math.max(
            0,
            Math.min(100, (e.target.x() / stageWidth) * 100),
          );
          const newY = Math.max(
            0,
            Math.min(100, (e.target.y() / stageHeight) * 100),
          );
          onDragEnd(id, newX, newY);
        }
      }}
    >
      {/* 選択ハイライト (ゴールドのグロー枠) */}
      {isSelected && (
        <Circle
          radius={radius + 5}
          stroke="#fbbf24"
          strokeWidth={3}
          perfectDrawEnabled={false}
          listening={false}
        />
      )}

      {/* マーカー本体サークル */}
      <Circle
        radius={radius}
        fill={color}
        stroke="#ffffff"
        strokeWidth={Math.max(1.5, radius * 0.12)}
        perfectDrawEnabled={false}
      />

      {/* 写真表示 */}
      {options.insideContent === 'photo' && loadedImage ? (
        <Group
          listening={false}
          clipFunc={(ctx) => {
            ctx.arc(0, 0, radius * 0.85, 0, Math.PI * 2, false);
          }}
        >
          <KonvaImage
            image={loadedImage}
            x={-radius * 0.85}
            y={-radius * 0.85}
            width={radius * 1.7}
            height={radius * 1.7}
            perfectDrawEnabled={false}
            listening={false}
          />
        </Group>
      ) : options.insideContent === 'number' && shirtNo ? (
        /* 背番号表示 (太字・ドロップシャドウでくっきり視認) */
        <Text
          text={shirtNo}
          fill="#ffffff"
          fontSize={Math.round(radius * 1.15)}
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
          fontStyle="bold"
          align="center"
          verticalAlign="middle"
          offsetX={radius}
          offsetY={radius * 0.58}
          width={radius * 2}
          shadowColor="#000000"
          shadowBlur={2}
          shadowOpacity={0.5}
          shadowOffset={{ x: 0, y: 1 }}
          perfectDrawEnabled={false}
          listening={false}
        />
      ) : null}

      {/* 下部ラベル (ラストネーム / 背番号: アウトライン縁取り + シャドウで文字つぶれ防止) */}
      {options.bottomLabel !== 'none' && (
        <Text
          text={
            options.bottomLabel === 'name'
              ? displayName
              : shirtNo
                ? `#${shirtNo}`
                : ''
          }
          fill="#ffffff"
          stroke="#020617"
          strokeWidth={Math.max(2, radius * 0.16)}
          fillAfterStrokeEnabled={true}
          fontSize={Math.max(11, Math.round(radius * 0.8))}
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
          fontStyle="bold"
          align="center"
          offsetX={radius * 3.5}
          offsetY={-radius * 1.3}
          width={radius * 7}
          shadowColor="#000000"
          shadowBlur={3}
          shadowOpacity={0.7}
          shadowOffset={{ x: 0, y: 1 }}
          perfectDrawEnabled={false}
          listening={false}
        />
      )}
    </Group>
  );
};
