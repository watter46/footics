'use client';

import type Konva from 'konva';
import type { MutableRefObject } from 'react';
import { Line } from 'react-konva';
import type { ResolvedConnectLinePrimitive } from '@/lib/tactical/compiler/scene-graph-dto';

export interface PlayerConnectLinesProps {
  selectedIds: readonly string[];
  isInteractive: boolean;
  connectLineNodesRef: MutableRefObject<Map<string, Konva.Line>>;
  onSelectConnectLine: (id: string, parentPlayerId: string) => void;
  resolvedConnectLines: readonly ResolvedConnectLinePrimitive[];
}

export function PlayerConnectLines({
  selectedIds,
  isInteractive,
  connectLineNodesRef,
  onSelectConnectLine,
  resolvedConnectLines,
}: PlayerConnectLinesProps) {
  return (
    <>
      {resolvedConnectLines
        .filter((cl) => cl.visible)
        .map((cl) => {
          const isSelected = selectedIds.includes(cl.id);
          return (
            <Line
              key={cl.id}
              ref={(node) => {
                if (node) connectLineNodesRef.current.set(cl.id, node);
                else connectLineNodesRef.current.delete(cl.id);
              }}
              points={[...cl.flatPointsPx]}
              stroke={isSelected ? '#60a5fa' : cl.color}
              strokeWidth={isSelected ? cl.strokeWidthPx + 1 : cl.strokeWidthPx}
              dash={cl.dashArrayPx.length > 0 ? [...cl.dashArrayPx] : undefined}
              opacity={isSelected ? 1 : 0.85}
              lineCap="round"
              hitStrokeWidth={16}
              listening={isInteractive}
              perfectDrawEnabled={false}
              onClick={(e) => {
                e.cancelBubble = true;
                onSelectConnectLine(cl.id, cl.fromPlayerId);
              }}
              onTap={(e) => {
                e.cancelBubble = true;
                onSelectConnectLine(cl.id, cl.fromPlayerId);
              }}
            />
          );
        })}
    </>
  );
}
