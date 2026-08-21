'use client';

import type Konva from 'konva';
import React, { useEffect, useRef, useState } from 'react';
import { Circle, Group, Image as KonvaImage, Text } from 'react-konva';
import { getLastName } from '@/lib/tactical/player-formatting';
import { getSoccerBallImage } from '@/lib/tactical/soccer-ball-svg';
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

export const AnimationMarker = React.memo<AnimationMarkerProps>(
  ({
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
    const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(
      null,
    );
    const [ballImage, setBallImage] = useState<HTMLImageElement | null>(null);

    // マーカーサイズ: sizeScale (デフォルト1.0) を反映
    const baseDim = Math.min(stageWidth, stageHeight);
    const sizeScale = options.sizeScale ?? 1.0;
    const radius = (isBall ? baseDim * 0.022 : baseDim * 0.032) * sizeScale;

    const pxX = (x / 100) * stageWidth;
    const pxY = (y / 100) * stageHeight;

    // ラストネームを取得
    const displayName = getLastName(name);

    // サッカーボール画像のロード (SVG)
    useEffect(() => {
      if (isBall) {
        getSoccerBallImage()
          .then((img) => setBallImage(img))
          .catch(() => {});
      }
    }, [isBall]);

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

    const groupRef = useRef<Konva.Group>(null);

    // マーカーのキャッシュ化 (ドラッグ時のCPU負荷を激減させる)
    useEffect(() => {
      const timer = setTimeout(() => {
        if (groupRef.current) {
          const cachePadding = radius * 4;
          groupRef.current.cache({
            x: -cachePadding,
            y: -cachePadding,
            width: cachePadding * 2,
            height: cachePadding * 2,
            pixelRatio: 2,
          });
        }
      }, 50);
      return () => clearTimeout(timer);
    }, [
      radius,
      color,
      displayName,
      shirtNo,
      options,
      isSelected,
      isBall,
      loadedImage,
      ballImage,
    ]);

    if (isBall) {
      return (
        <Group
          ref={groupRef}
          id="marker-ball"
          x={pxX}
          y={pxY}
          draggable={draggable}
          dragBoundFunc={(pos) => ({
            x: Math.max(0, Math.min(stageWidth, pos.x)),
            y: Math.max(0, Math.min(stageHeight, pos.y)),
          })}
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
          {/* ヒットテスト用円 (クリック・ドラッグ検出を100%確実にする) */}
          <Circle
            radius={radius}
            fill="transparent"
            listening={true}
            perfectDrawEnabled={false}
          />

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
              perfectDrawEnabled={false}
              listening={false}
            />
          )}

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

    const hasStroke = Boolean(
      options.strokeWidth &&
        options.strokeWidth > 0 &&
        options.strokeColor !== 'none',
    );

    return (
      <Group
        ref={groupRef}
        id={`marker-${id}`}
        x={pxX}
        y={pxY}
        draggable={draggable}
        dragBoundFunc={(pos) => ({
          x: Math.max(0, Math.min(stageWidth, pos.x)),
          y: Math.max(0, Math.min(stageHeight, pos.y)),
        })}
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
        {/* 選択ハイライト */}
        {isSelected && (
          <Circle
            radius={radius + 5}
            stroke="#38bdf8"
            strokeWidth={3}
            dash={[5, 3]}
            perfectDrawEnabled={false}
            listening={false}
          />
        )}

        {/* マーカー本体サークル */}
        <Circle
          radius={radius}
          fill={color}
          stroke={hasStroke ? options.strokeColor || '#ffffff' : undefined}
          strokeWidth={
            hasStroke
              ? Math.max(1, (options.strokeWidth ?? 2) * (radius * 0.06))
              : 0
          }
          strokeEnabled={hasStroke}
          perfectDrawEnabled={false}
        />

        {/* 写真表示 または 背番号フォールバック */}
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
        ) : (options.insideContent === 'number' || options.insideContent === 'photo') && shirtNo ? (
          /* 背番号表示 (太字・高コントラスト・写真フォールバック含む) */
          <Text
            text={shirtNo}
            x={-radius}
            y={-radius}
            width={radius * 2}
            height={radius * 2}
            align="center"
            verticalAlign="middle"
            fill="#ffffff"
            fontSize={Math.max(
              8,
              Math.round(radius * 1.15 * (options.numberSizeScale ?? 1.0)),
            )}
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
            fontStyle="bold"
            perfectDrawEnabled={false}
            listening={false}
          />
        ) : null}

        {/* 下部ラベル (ラストネーム / 背番号: アウトライン縁取りで文字つぶれ防止・軽量描画) */}
        {options.bottomLabel !== 'none' && (
          <Text
            text={
              options.bottomLabel === 'name'
                ? displayName
                : shirtNo
                  ? `#${shirtNo}`
                  : ''
            }
            x={-radius * 3.5}
            y={radius * 1.25}
            width={radius * 7}
            align="center"
            fill="#ffffff"
            stroke="#020617"
            strokeWidth={Math.max(2, radius * 0.16)}
            fillAfterStrokeEnabled={true}
            fontSize={Math.max(
              8,
              Math.round(radius * 0.8 * (options.labelSizeScale ?? 1.0)),
            )}
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
            fontStyle="bold"
            perfectDrawEnabled={false}
            listening={false}
          />
        )}
      </Group>
    );
  },
);

AnimationMarker.displayName = 'AnimationMarker';
