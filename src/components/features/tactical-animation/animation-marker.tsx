'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { Circle, Group, Image as KonvaImage, Text } from 'react-konva';
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
  onClick?: (id: string) => void;
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

  // マーカーサイズ: 縦・横どちらでも適正なサイズになるよう最小基準で計算
  const baseDim = Math.min(stageWidth, stageHeight);
  const radius = isBall ? baseDim * 0.022 : baseDim * 0.032;

  const pxX = (x / 100) * stageWidth;
  const pxY = (y / 100) * stageHeight;

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
    return (
      <Group
        id="marker-ball"
        x={pxX}
        y={pxY}
        draggable={draggable}
        onClick={() => onClick?.('ball')}
        onTap={() => onClick?.('ball')}
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
        {/* 外枠 */}
        <Circle
          radius={radius}
          fill="#ffffff"
          stroke="#0f172a"
          strokeWidth={2}
          perfectDrawEnabled={false}
        />
        {/* サッカーボールの中心アクセント */}
        <Circle
          radius={radius * 0.45}
          fill="#f97316"
          perfectDrawEnabled={false}
          listening={false}
        />
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
      onClick={() => onClick?.(id)}
      onTap={() => onClick?.(id)}
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
      {/* 選択ハイライト */}
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

      {/* 下部ラベル (選手名 / 背番号: アウトライン縁取り + シャドウで文字つぶれ防止) */}
      {options.bottomLabel !== 'none' && (
        <Text
          text={
            options.bottomLabel === 'name' ? name : shirtNo ? `#${shirtNo}` : ''
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
