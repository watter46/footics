'use client';

import type React from 'react';
import { Ellipse, Group, Path, Text } from 'react-konva';
import {
  MARKER_PATHS,
  MARKER_VIEWBOX_SIZE,
} from '@/lib/tactical/marker-assets';
import type { Player } from '@/lib/types/tactical-unified';

export interface PlayerMarkerRingProps {
  player: Player;
  radius: number;
  numScale: number;
  isSelected: boolean;
  shapeRef?: React.Ref<any>;
}

export function PlayerMarkerRing({
  player,
  radius,
  numScale,
  isSelected,
  shapeRef,
}: PlayerMarkerRingProps) {
  return (
    <Group ref={shapeRef}>
      {/* 透明ヒットエリア (クリック・ドラッグ・Transformer変形のバウンディングボックス用) */}
      <Ellipse
        radiusX={radius * 1.15}
        radiusY={radius * 0.55}
        fill="transparent"
        stroke="transparent"
        strokeWidth={0}
        listening={true}
      />

      {/* 選択時ハイライトリング */}
      {isSelected && (
        <Ellipse
          radiusX={radius * 1.15}
          radiusY={radius * 0.55}
          stroke="#60a5fa"
          strokeWidth={3}
          shadowColor="#3b82f6"
          shadowBlur={8}
          shadowOpacity={0.8}
          listening={false}
        />
      )}

      {/* 立体5パーツSVGパス (各パーツの形状に沿った外側グロー層) */}
      <Group
        x={-(MARKER_VIEWBOX_SIZE * ((radius * 2) / MARKER_VIEWBOX_SIZE)) / 2}
        y={-(MARKER_VIEWBOX_SIZE * ((radius * 2) / MARKER_VIEWBOX_SIZE)) / 2}
        scale={{
          x: (radius * 2) / MARKER_VIEWBOX_SIZE,
          y: (radius * 2) / MARKER_VIEWBOX_SIZE,
        }}
        listening={false}
      >
        {/* 外側拡散ネオングロー層 (程よい広がりと上品な淡い光) */}
        {MARKER_PATHS.map((d) => (
          <Path
            key={`wide-glow-${d.slice(0, 20)}`}
            data={d}
            stroke={player.style.color}
            strokeWidth={4}
            shadowColor={player.style.color}
            shadowBlur={10}
            shadowOpacity={0.6}
            opacity={0.4}
            perfectDrawEnabled={false}
          />
        ))}

        {/* 各パーツ本体 (高輝度ネオンチューブ本体) */}
        {MARKER_PATHS.map((d) => (
          <Path
            key={d.slice(0, 20)}
            data={d}
            fill={player.style.color}
            stroke={isSelected ? '#60a5fa' : undefined}
            strokeWidth={isSelected ? 1 : 0}
            shadowColor={player.style.color}
            shadowBlur={5}
            shadowOpacity={0.7}
            perfectDrawEnabled={false}
          />
        ))}

        {/* ネオン管の中心白熱ハイライト (ネオン特有の高輝度ホワイトコア) */}
        {MARKER_PATHS.map((d) => (
          <Path
            key={`core-${d.slice(0, 20)}`}
            data={d}
            stroke="#ffffff"
            strokeWidth={0.5}
            opacity={0.45}
            perfectDrawEnabled={false}
          />
        ))}
      </Group>

      {/* リング中央の半透明ネオン発光楕円 (床に投影された淡いネオンライトプール) */}
      <Ellipse
        radiusX={radius * 0.72}
        radiusY={radius * 0.24}
        stroke={player.style.color}
        strokeWidth={1.5}
        shadowColor={player.style.color}
        shadowBlur={8}
        shadowOpacity={0.6}
        opacity={0.45}
        listening={false}
      />
      <Ellipse
        radiusX={radius * 0.68}
        radiusY={radius * 0.22}
        fill={player.style.color}
        opacity={0.2}
        listening={false}
      />

      {/* リング内背番号表示 */}
      {player.style.insideContent !== 'none' && player.shirtNo && (
        <Text
          x={-radius}
          y={-radius * 0.35}
          width={radius * 2}
          text={player.shirtNo}
          fontSize={radius * 0.75 * numScale}
          fill="#ffffff"
          align="center"
          fontStyle="bold"
          listening={false}
          perfectDrawEnabled={false}
        />
      )}
    </Group>
  );
}
