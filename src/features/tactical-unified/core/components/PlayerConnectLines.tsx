'use client';

import type Konva from 'konva';
import { Fragment, type MutableRefObject } from 'react';
import { Line } from 'react-konva';
import { getMarkerBoundaryPoint } from '@/lib/tactical/marker-geometry';
import type { Player } from '@/lib/types/tactical-unified';

export interface PlayerConnectLinesProps {
  markers: Player[];
  width: number;
  height: number;
  selectedIds: string[];
  isInteractive: boolean;
  connectLineNodesRef: MutableRefObject<Map<string, Konva.Line>>;
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
              const lineColor = cl.color || p.style?.color || '#034694';
              const strokeWidth = cl.strokeWidth ?? 2;
              return (
                <Fragment key={cl.id}>
                  {/* 外側 / うっすら白枠 */}
                  <Line
                    ref={(node) => {
                      if (node)
                        connectLineNodesRef.current.set(`${cl.id}-bg`, node);
                      else connectLineNodesRef.current.delete(`${cl.id}-bg`);
                    }}
                    points={[p1.x, p1.y, p2.x, p2.y]}
                    stroke="rgba(255, 255, 255, 0.45)"
                    strokeWidth={strokeWidth + 1.5}
                    lineCap="round"
                    dash={dash}
                    listening={false}
                  />
                  {/* 内側 / メイン Line & 発光グロー */}
                  <Line
                    ref={(node) => {
                      if (node) connectLineNodesRef.current.set(cl.id, node);
                      else connectLineNodesRef.current.delete(cl.id);
                    }}
                    points={[p1.x, p1.y, p2.x, p2.y]}
                    stroke={lineColor}
                    strokeWidth={strokeWidth}
                    lineCap="round"
                    dash={dash}
                    shadowColor={lineColor}
                    shadowBlur={isClSelected ? 12 : 6}
                    shadowOpacity={isClSelected ? 1 : 0.8}
                    listening={isInteractive}
                    hitStrokeWidth={16}
                    onClick={(e) => {
                      e.cancelBubble = true;
                      onSelectConnectLine(cl.id, p.id);
                    }}
                    onTap={(e) => {
                      e.cancelBubble = true;
                      onSelectConnectLine(cl.id, p.id);
                    }}
                  />
                </Fragment>
              );
            }),
        )}
    </>
  );
}

export function updateConnectLinePositions(
  nodeMap: Map<string, Konva.Line>,
  markers: Player[],
  markerId: string,
  curX: number,
  curY: number,
  width: number,
  height: number,
) {
  for (const p of markers) {
    for (const cl of p.connectLines ?? []) {
      if (p.id === markerId || cl.toPlayerId === markerId) {
        const lineNode = nodeMap.get(cl.id);
        const bgNode = nodeMap.get(`${cl.id}-bg`);
        if (!lineNode && !bgNode) continue;
        const targetMarker = markers.find((m) => m.id === cl.toPlayerId);
        if (!targetMarker) continue;
        const sPos =
          p.id === markerId
            ? { x: curX, y: curY }
            : { x: (p.x / 100) * width, y: (p.y / 100) * height };
        const tPos =
          cl.toPlayerId === markerId
            ? { x: curX, y: curY }
            : {
                x: (targetMarker.x / 100) * width,
                y: (targetMarker.y / 100) * height,
              };
        const p1 = getMarkerBoundaryPoint(
          sPos,
          tPos,
          p,
          { width, height },
          true,
        );
        const p2 = getMarkerBoundaryPoint(
          tPos,
          sPos,
          targetMarker,
          { width, height },
          true,
        );
        const pts = [p1.x, p1.y, p2.x, p2.y];
        if (lineNode) lineNode.points(pts);
        if (bgNode) bgNode.points(pts);
      }
    }
  }
}
