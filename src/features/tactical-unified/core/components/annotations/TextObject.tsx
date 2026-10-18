'use client';

import type { KonvaEventObject } from 'konva/lib/Node';
import React from 'react';
import { Text as KonvaText } from 'react-konva';
import type { TextAnnotation } from '@/lib/types/tactical-unified';
import { normX, normY, pxToNormX, pxToNormY } from './math-utils';

type KonvaClickEvent = KonvaEventObject<MouseEvent | TouchEvent>;

export interface TextObjectProps {
  text: TextAnnotation;
  stageSize: { width: number; height: number };
  isSelected: boolean;
  isEditing?: boolean;
  isInteractive?: boolean;
  onSelect: (e: KonvaClickEvent) => void;
  onDblClick: (e: KonvaClickEvent) => void;
  updateText: (textId: string, patch: Partial<TextAnnotation>) => void;
  nodesRegistryRef?: React.MutableRefObject<any>;
}

export const TextObject = React.memo(function TextObject({
  text,
  stageSize,
  isSelected,
  isEditing = false,
  isInteractive = true,
  onSelect,
  onDblClick,
  updateText,
  nodesRegistryRef,
}: TextObjectProps) {
  const { width, height } = stageSize;
  const fontStyle =
    [text.bold ? 'bold' : '', text.italic ? 'italic' : '']
      .filter(Boolean)
      .join(' ') || 'normal';

  return (
    <KonvaText
      ref={(node) => {
        if (nodesRegistryRef?.current?.textNodes) {
          if (node) {
            nodesRegistryRef.current.textNodes.set(text.id, node);
          } else {
            nodesRegistryRef.current.textNodes.delete(text.id);
          }
        }
      }}
      x={normX(text.x, width)}
      y={normY(text.y, height)}
      text={text.content}
      fontSize={text.fontSize}
      fontFamily="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
      fill={isSelected ? '#60a5fa' : text.color}
      fontStyle={fontStyle}
      visible={!isEditing}
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={onDblClick}
      onDblTap={onDblClick}
      perfectDrawEnabled={false}
      draggable={isInteractive && !isEditing && !text.locked}
      onDragStart={(e) => {
        if (!isSelected) {
          onSelect(e);
        }
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        const node = e.target;
        const newX = pxToNormX(node.x(), width);
        const newY = pxToNormY(node.y(), height);
        updateText(text.id, { x: newX, y: newY });
      }}
    />
  );
});
