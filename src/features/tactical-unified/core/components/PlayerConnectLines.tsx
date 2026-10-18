'use client';

import type Konva from 'konva';
import type React from 'react';
import { Line } from 'react-konva';
import { getMarkerBoundaryPoint } from '@/lib/tactical/marker-geometry';
import type { Player } from '@/lib/types/tactical-unified';

export interface PlayerConnectLinesProps {
  markers: Player[];
  width: number;
  height: number;
  selectedIds: string[];
  isInteractive: boolean;
  connectLineNodesRef: React.MutableRefObject<Map<string, Konva.Line>>;
  onSelectConnectLine: (id: string, parentPlayerId: string) => void;
}

export function PlayerConnectLines({
  markers,
  width,
  height,
  selectedIds,
  isInteractive,
  connectLineNodesRef,
  onSelectConnectLine,
}: PlayerConnectLinesProps) {
  return (
    <>
      {markers
        .filter((p) => p.connectLines && p.connectLines.length > 0)
        .flatMap((p) =>
          (p.connectLines ?? [])
            .filter((cl) => cl.visible)
            .map((cl) => {
              const toPlayer = markers.find((m) => m.id === cl.toPlayerId);
              if (!toPlayer) return null;
              const rawP1 = { x: (p.x / 100) * width, y: (p.y / 100) * height };
              const rawP2 = {
                x: (toPlayer.x / 100) * width,
                y: (toPlayer.y / 100) * height,
              };
              const p1 = getMarkerBoundaryPoint(
                rawP1,
                rawP2,
                p,
                { width, height },
                true,
              );
              const p2 = getMarkerBoundaryPoint(
                rawP2,
                rawP1,
                toPlayer,
                { width, height },
                true,
              );
              const dash =
                cl.lineStyle === 'dashed'
                  ? [6, 4]
                  : cl.lineStyle === 'dotted'
                    ? [2, 3]
                    : undefined;
              const isClSelected = selectedIds.includes(cl.id);
              return (
                <Line
                  key={cl.id}
                  ref={(node) => {
                    if (node) connectLineNodesRef.current.set(cl.id, node);
                    else connectLineNodesRef.current.delete(cl.id);
                  }}
                  points={[p1.x, p1.y, p2.x, p2.y]}
                  stroke={cl.color || '#38bdf8'}
                  strokeWidth={cl.strokeWidth ?? 2}
                  dash={dash}
                  shadowColor={isClSelected ? '#38bdf8' : undefined}
                  shadowBlur={isClSelected ? 8 : 0}
                  listening={isInteractive}
                  hitStrokeWidth={15}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    onSelectConnectLine(cl.id, p.id);
                  }}
                  onTap={(e) => {
                    e.cancelBubble = true;
                    onSelectConnectLine(cl.id, p.id);
                  }}
                />
              );
            }),
        )}
    </>
  );
}
