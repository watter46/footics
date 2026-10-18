'use client';

import type Konva from 'konva';
import { useEffect, useRef, useState } from 'react';
import { Circle, Group, Line } from 'react-konva';
import { getMarkerBoundaryPoint } from '@/lib/tactical/marker-geometry';
import type { Player } from '@/lib/types/tactical-unified';

export interface PlayerConnectingGuideProps {
  connectingPlayerId: string;
  markers: Player[];
  width: number;
  height: number;
  baseDim: number;
}

export function PlayerConnectingGuide({
  connectingPlayerId,
  markers,
  width,
  height,
  baseDim,
}: PlayerConnectingGuideProps) {
  const groupRef = useRef<Konva.Group>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(
    null,
  );

  const source = markers.find((m) => m.id === connectingPlayerId);

  useEffect(() => {
    const stage = groupRef.current?.getStage();
    if (!stage) return;

    const handlePointerMove = () => {
      const pos = stage.getPointerPosition();
      if (pos) {
        setMousePos({ x: pos.x, y: pos.y });
      }
    };

    stage.on('pointermove', handlePointerMove);
    return () => {
      stage.off('pointermove', handlePointerMove);
    };
  }, []);

  if (!source) return null;

  const sPos = {
    x: (source.x / 100) * width,
    y: (source.y / 100) * height,
  };
  const sourceRadius = baseDim * 0.032 * (source.style?.sizeScale ?? 1.0);
  const candidates = markers.filter((m) => m.id !== connectingPlayerId);

  const p1 = mousePos
    ? getMarkerBoundaryPoint(sPos, mousePos, source, { width, height }, true)
    : null;

  return (
    <Group ref={groupRef} listening={false}>
      {/* 接続候補マーカーのターゲットリング (点線・シアン) */}
      {candidates.map((c) => {
        const cPos = {
          x: (c.x / 100) * width,
          y: (c.y / 100) * height,
        };
        const cRadius = baseDim * 0.032 * (c.style?.sizeScale ?? 1.0);
        return (
          <Group key={c.id}>
            <Circle
              x={cPos.x}
              y={cPos.y}
              radius={cRadius * 1.35}
              stroke="rgba(255, 255, 255, 0.4)"
              strokeWidth={3}
              dash={[4, 4]}
            />
            <Circle
              x={cPos.x}
              y={cPos.y}
              radius={cRadius * 1.35}
              stroke="#38bdf8"
              strokeWidth={2}
              dash={[4, 4]}
              shadowColor="#38bdf8"
              shadowBlur={8}
              shadowOpacity={0.8}
            />
          </Group>
        );
      })}

      {/* 接続元マーカーの強調リング (青色パルス・強調グロー) */}
      <Circle
        x={sPos.x}
        y={sPos.y}
        radius={sourceRadius * 1.4}
        stroke="rgba(255, 255, 255, 0.5)"
        strokeWidth={3.5}
      />
      <Circle
        x={sPos.x}
        y={sPos.y}
        radius={sourceRadius * 1.4}
        stroke="#0d99ff"
        strokeWidth={2.5}
        shadowColor="#0d99ff"
        shadowBlur={12}
        shadowOpacity={0.9}
      />

      {/* 動的ラバーバンド線プレビュー (マウスカーソル追従) */}
      {mousePos && p1 && (
        <>
          <Line
            points={[p1.x, p1.y, mousePos.x, mousePos.y]}
            stroke="rgba(255, 255, 255, 0.5)"
            strokeWidth={3.5}
            dash={[5, 5]}
            lineCap="round"
          />
          <Line
            points={[p1.x, p1.y, mousePos.x, mousePos.y]}
            stroke="#38bdf8"
            strokeWidth={2}
            dash={[5, 5]}
            lineCap="round"
            shadowColor="#38bdf8"
            shadowBlur={6}
            shadowOpacity={0.8}
          />
        </>
      )}
    </Group>
  );
}
