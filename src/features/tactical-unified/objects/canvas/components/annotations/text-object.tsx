'use client';

/**
 * text-object.tsx
 * ピッチ上テキスト描画
 */

import type { KonvaEventObject } from 'konva/lib/Node';
import React from 'react';
import { Text as KonvaText } from 'react-konva';
import type { TextAnnotation } from '@/lib/types/tactical-unified';
import type { CanvasNodesRegistry } from '../../helpers/canvas-registry';
import { normX, normY, pxToNormX, pxToNormY } from './math-utils';

type KonvaClickEvent =
  | KonvaEventObject<MouseEvent>
  | KonvaEventObject<TouchEvent>;

export interface TextObjectProps {
  text: TextAnnotation;
  slideId: string;
  stageSize: { width: number; height: number };
  isSelected: boolean;
  isEditing: boolean;
  onSelect: (e: KonvaClickEvent) => void;
  onDblClick: (e: KonvaClickEvent) => void;
  updateText: (
    slideId: string,
    textId: string,
    patch: Partial<TextAnnotation>,
  ) => void;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
}

export const TextObject = React.memo(function TextObject({
  text,
  slideId,
  stageSize,
  isSelected,
  isEditing,
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
        if (nodesRegistryRef) {
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
      stroke="#020617"
      strokeWidth={text.fontSize > 24 ? 2 : 1}
      fillAfterStrokeEnabled={true}
      visible={!isEditing}
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={onDblClick}
      onDblTap={onDblClick}
      perfectDrawEnabled={false}
      draggable={isSelected && !isEditing && !text.locked}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        const node = e.target;
        const newX = pxToNormX(node.x(), width);
        const newY = pxToNormY(node.y(), height);
        updateText(slideId, text.id, { x: newX, y: newY });
      }}
    />
  );
});
