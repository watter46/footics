'use client';

import type React from 'react';
import { Circle, Group, Line } from 'react-konva';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { getMarkerBoundaryPoint } from '@/lib/tactical/marker-geometry';
import type { Slide } from '@/lib/types/tactical-unified';
import type { CanvasNodesRegistry } from './canvas-registry';

function normX(v: number, w: number) {
  return (v / 100) * w;
}
function normY(v: number, h: number) {
  return (v / 100) * h;
}

export interface PlayerConnectLinesProps {
  slide: Slide;
  stageSize: { width: number; height: number };
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  onSelectConnectLine?: (playerId: string) => void;
  selectedPlayerIds?: Set<string>;
}

export function PlayerConnectLines({
  slide,
  stageSize,
  nodesRegistryRef,
  onSelectConnectLine,
  selectedPlayerIds,
}: PlayerConnectLinesProps) {
  const { width, height } = stageSize;
  const teamVisibility = useTacticalUnifiedStore((s) => s.teamVisibility);
  const pitchPlayers = slide.players.filter(
    (p) =>
      p.area === 'pitch' &&
      (teamVisibility === 'both' ||
        p.team === teamVisibility ||
        p.team === 'neutral'),
  );
  const playerMap = new Map(pitchPlayers.map((p) => [p.id, p]));

  return (
    <Group listening={false}>
      {pitchPlayers
        .filter((p) => p.connectLines.length > 0)
        .flatMap((p) =>
          p.connectLines
            .filter((cl) => cl.visible && playerMap.has(cl.toPlayerId))
            .map((cl) => {
              const toPlayer = playerMap.get(cl.toPlayerId);
              if (!toPlayer) return null;
              const rawP1 = { x: normX(p.x, width), y: normY(p.y, height) };
              const rawP2 = {
                x: normX(toPlayer.x, width),
                y: normY(toPlayer.y, height),
              };

              const p1 = getMarkerBoundaryPoint(
                rawP1,
                rawP2,
                p,
                stageSize,
                true,
              );
              const p2 = getMarkerBoundaryPoint(
                rawP2,
                rawP1,
                toPlayer,
                stageSize,
                true,
              );
              const x1 = p1.x;
              const y1 = p1.y;
              const x2 = p2.x;
              const y2 = p2.y;

              const dash =
                cl.lineStyle === 'dashed'
                  ? [6, 4]
                  : cl.lineStyle === 'dotted'
                    ? [2, 3]
                    : undefined;

              const isLineSelected =
                Boolean(selectedPlayerIds?.has(p.id)) ||
                Boolean(selectedPlayerIds?.has(toPlayer.id)) ||
                Boolean(selectedPlayerIds?.has(cl.id));

              return (
                <Group key={cl.id}>
                  {/* 選択状態ハイライト (シアンのネオングロー層 & 両端アンカードット) */}
                  {isLineSelected && (
                    <>
                      <Line
                        points={[x1, y1, x2, y2]}
                        stroke="#38bdf8"
                        strokeWidth={(cl.strokeWidth ?? 2) + 6}
                        dash={dash}
                        opacity={0.7}
                        shadowColor="#38bdf8"
                        shadowBlur={10}
                        shadowOpacity={0.9}
                        listening={false}
                      />
                      <Circle
                        x={x1}
                        y={y1}
                        radius={4.5}
                        fill="#38bdf8"
                        stroke="#ffffff"
                        strokeWidth={1.5}
                        shadowColor="#38bdf8"
                        shadowBlur={4}
                        listening={false}
                      />
                      <Circle
                        x={x2}
                        y={y2}
                        radius={4.5}
                        fill="#38bdf8"
                        stroke="#ffffff"
                        strokeWidth={1.5}
                        shadowColor="#38bdf8"
                        shadowBlur={4}
                        listening={false}
                      />
                    </>
                  )}
                  {/* 外側拡散ネオングロー層 (程よく上品な淡い光) */}
                  <Line
                    ref={(node) => {
                      if (nodesRegistryRef) {
                        const entry =
                          nodesRegistryRef.current.connectLineNodes.get(
                            cl.id,
                          ) || {};
                        if (node) {
                          entry.glowNode = node;
                          nodesRegistryRef.current.connectLineNodes.set(
                            cl.id,
                            entry,
                          );
                        } else {
                          entry.glowNode = null;
                          if (!entry.highlightNode && !entry.coreNode) {
                            nodesRegistryRef.current.connectLineNodes.delete(
                              cl.id,
                            );
                          }
                        }
                      }
                    }}
                    points={[x1, y1, x2, y2]}
                    stroke={cl.color}
                    strokeWidth={(cl.strokeWidth ?? 2) + 4}
                    dash={dash}
                    opacity={0.35}
                    shadowColor={cl.color}
                    shadowBlur={8}
                    shadowOpacity={0.6}
                    listening={false}
                    perfectDrawEnabled={false}
                  />
                  {/* ネオン管中心の白熱コア (繊細なハイライト) */}
                  <Line
                    ref={(node) => {
                      if (nodesRegistryRef) {
                        const entry =
                          nodesRegistryRef.current.connectLineNodes.get(
                            cl.id,
                          ) || {};
                        if (node) {
                          entry.highlightNode = node;
                          nodesRegistryRef.current.connectLineNodes.set(
                            cl.id,
                            entry,
                          );
                        } else {
                          entry.highlightNode = null;
                          if (!entry.glowNode && !entry.coreNode) {
                            nodesRegistryRef.current.connectLineNodes.delete(
                              cl.id,
                            );
                          }
                        }
                      }
                    }}
                    points={[x1, y1, x2, y2]}
                    stroke="#ffffff"
                    strokeWidth={Math.max(0.75, (cl.strokeWidth ?? 2) * 0.4)}
                    dash={dash}
                    opacity={0.5}
                    listening={false}
                    perfectDrawEnabled={false}
                  />
                  {/* コアライン本体 (クリック・タップ受付用) */}
                  <Line
                    ref={(node) => {
                      if (nodesRegistryRef) {
                        const entry =
                          nodesRegistryRef.current.connectLineNodes.get(
                            cl.id,
                          ) || {};
                        if (node) {
                          entry.coreNode = node;
                          nodesRegistryRef.current.connectLineNodes.set(
                            cl.id,
                            entry,
                          );
                        } else {
                          entry.coreNode = null;
                          if (!entry.glowNode && !entry.highlightNode) {
                            nodesRegistryRef.current.connectLineNodes.delete(
                              cl.id,
                            );
                          }
                        }
                      }
                    }}
                    points={[x1, y1, x2, y2]}
                    stroke={cl.color}
                    strokeWidth={cl.strokeWidth ?? 2}
                    dash={dash}
                    opacity={0.9}
                    shadowColor={cl.color}
                    shadowBlur={3}
                    shadowOpacity={0.5}
                    listening={true}
                    onClick={(e) => {
                      e.cancelBubble = true;
                      onSelectConnectLine?.(p.id);
                    }}
                    onTap={(e) => {
                      e.cancelBubble = true;
                      onSelectConnectLine?.(p.id);
                    }}
                  />
                </Group>
              );
            }),
        )}
    </Group>
  );
}
