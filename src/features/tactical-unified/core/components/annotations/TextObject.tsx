'use client';

import type { KonvaEventObject } from 'konva/lib/Node';
import React from 'react';
import { Text as KonvaText } from 'react-konva';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/core/utils/canvas-registry';
import { useSessionStore } from '@/features/tactical-unified/stores/tactical-store-provider';
import type { ResolvedBillboardTextItem } from '@/lib/tactical/compiler/scene-graph-dto';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type { DomainTextAnnotation } from '@/lib/types/tactical/domain-entities';
import { pxToNormX, pxToNormY } from './math-utils';

type KonvaClickEvent = KonvaEventObject<MouseEvent | TouchEvent>;

export interface TextObjectProps {
  textId: string;
  locked?: boolean;
  stageSize: { width: number; height: number };
  isSelected: boolean;
  isEditing?: boolean;
  isInteractive?: boolean;
  onSelect: (e: KonvaClickEvent) => void;
  onDblClick: (e: KonvaClickEvent) => void;
  updateText: (textId: string, patch: Partial<DomainTextAnnotation>) => void;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  resolvedText: ResolvedBillboardTextItem;
}

export const TextObject = React.memo(function TextObject({
  textId,
  locked = false,
  stageSize,
  isSelected,
  isEditing = false,
  isInteractive = true,
  onSelect,
  onDblClick,
  updateText,
  nodesRegistryRef,
  resolvedText,
}: TextObjectProps) {
  const { width, height } = stageSize;
  const setIsDragging = useSessionStore((s) => s.setIsDragging);
  const setIsHudOpen = useSessionStore((s) => s.setIsHudOpen);
  const fontStyle =
    [resolvedText.bold ? 'bold' : '', resolvedText.italic ? 'italic' : '']
      .filter(Boolean)
      .join(' ') || 'normal';

  return (
    <KonvaText
      ref={(node) => {
        if (nodesRegistryRef?.current?.textNodes) {
          if (node) {
            nodesRegistryRef.current.textNodes.set(textId, node);
          } else {
            nodesRegistryRef.current.textNodes.delete(textId);
          }
        }
      }}
      x={resolvedText.positionPx.x}
      y={resolvedText.positionPx.y}
      text={resolvedText.content}
      fontSize={resolvedText.fontSizePx}
      fontFamily="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
      fill={isSelected ? '#60a5fa' : resolvedText.color}
      fontStyle={fontStyle}
      opacity={resolvedText.opacity}
      visible={!isEditing && resolvedText.visible}
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={onDblClick}
      onDblTap={onDblClick}
      perfectDrawEnabled={false}
      draggable={isInteractive && !isEditing && !locked}
      onDragStart={(e) => {
        setIsDragging(true);
        setIsHudOpen(false);
        if (!isSelected) {
          onSelect(e);
          setIsHudOpen(false);
        }
      }}
      onDragEnd={(e) => {
        setIsDragging(false);
        setIsHudOpen(false);
        e.cancelBubble = true;
        const node = e.target;
        const newX = clampToScreenNorm(pxToNormX(node.x(), width));
        const newY = clampToScreenNorm(pxToNormY(node.y(), height));
        updateText(textId, { x: newX, y: newY });
      }}
    />
  );
});
