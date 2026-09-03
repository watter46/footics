'use client';

import type React from 'react';
import { Group, Line } from 'react-konva';
import type { Slide } from '@/lib/types/tactical-unified';
import { useTacticalUnifiedStore } from '@/stores/tactical-unified-store';
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
}

export function PlayerConnectLines({
  slide,
  stageSize,
  nodesRegistryRef,
  onSelectConnectLine,
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
              const x1 = normX(p.x, width);
              const y1 = normY(p.y, height);
              const x2 = normX(toPlayer.x, width);
              const y2 = normY(toPlayer.y, height);

              const dash =
                cl.lineStyle === 'dashed'
                  ? [6, 4]
                  : cl.lineStyle === 'dotted'
                    ? [2, 3]
                    : undefined;

              return (
                <Line
                  key={cl.id}
                  ref={(node) => {
                    if (nodesRegistryRef) {
                      if (node) {
                        nodesRegistryRef.current.connectLineNodes.set(
                          cl.id,
                          node,
                        );
                      } else {
                        nodesRegistryRef.current.connectLineNodes.delete(cl.id);
                      }
                    }
                  }}
                  points={[x1, y1, x2, y2]}
                  stroke={cl.color}
                  strokeWidth={cl.strokeWidth ?? 2}
                  dash={dash}
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
              );
            }),
        )}
    </Group>
  );
}
