'use client';

import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import type { ReactNode } from 'react';
import { useCallback } from 'react';
import { Group, Layer } from 'react-konva';
import { useCanvasStore } from '../hooks/use-canvas-store';
import { ArrowObject } from './annotations/ArrowObject';
import { TextObject } from './annotations/TextObject';
import { ZoneObject } from './zones/ZoneObject';

export interface AnnotationLayerProps {
  width: number;
  height: number;
  activePolygonId?: string | null;
  mousePreviewPos?: { x: number; y: number } | null;
  editingTextId?: string | null;
  onStartEditText?: (textId: string) => void;
  nodesRegistryRef?: React.MutableRefObject<any>;
}

type KonvaClickEvent = KonvaEventObject<MouseEvent | TouchEvent>;

export function AnnotationLayer({
  width,
  height,
  activePolygonId,
  mousePreviewPos,
  editingTextId,
  onStartEditText,
  nodesRegistryRef,
}: AnnotationLayerProps): ReactNode {
  const zones = useCanvasStore((s) => s.annotations.zones);
  const arrows = useCanvasStore((s) => s.annotations.arrows);
  const texts = useCanvasStore((s) => s.annotations.texts);
  const markers = useCanvasStore((s) => s.annotations.markers);
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const activeTool = useCanvasStore((s) => s.activeTool);
  const selectObject = useCanvasStore((s) => s.selectObject);
  const updateZone = useCanvasStore((s) => s.updateZone);
  const updateArrow = useCanvasStore((s) => s.updateArrow);
  const updateText = useCanvasStore((s) => s.updateText);

  const isInteractive = activeTool === 'select';
  const stageSize = { width, height };

  const makeSelectHandler = useCallback(
    (id: string, kind: 'arrow' | 'zone' | 'text') => {
      return (e: KonvaClickEvent) => {
        e.cancelBubble = true;
        const isShift = (e.evt as MouseEvent)?.shiftKey ?? false;
        selectObject({ id, kind }, isShift);
      };
    },
    [selectObject],
  );

  return (
    <Layer>
      <Group>
        {zones.map((zone) => (
          <ZoneObject
            key={zone.id}
            zone={zone}
            stageSize={stageSize}
            isSelected={selectedIds.includes(zone.id)}
            onSelect={makeSelectHandler(zone.id, 'zone')}
            updateZone={updateZone}
            nodesRegistryRef={nodesRegistryRef}
            isCreatingThis={zone.id === activePolygonId}
            mousePreviewPos={mousePreviewPos}
          />
        ))}

        {arrows.map((arrow) => (
          <ArrowObject
            key={arrow.id}
            arrow={arrow}
            players={markers}
            stageSize={stageSize}
            isSelected={selectedIds.includes(arrow.id)}
            isInteractive={isInteractive}
            onSelect={makeSelectHandler(arrow.id, 'arrow')}
            updateArrow={updateArrow}
            nodesRegistryRef={nodesRegistryRef}
          />
        ))}

        {texts.map((text) => (
          <TextObject
            key={text.id}
            text={text}
            stageSize={stageSize}
            isSelected={selectedIds.includes(text.id)}
            isEditing={editingTextId === text.id}
            isInteractive={isInteractive}
            onSelect={makeSelectHandler(text.id, 'text')}
            onDblClick={(e) => {
              e.cancelBubble = true;
              onStartEditText?.(text.id);
            }}
            updateText={updateText}
            nodesRegistryRef={nodesRegistryRef}
          />
        ))}
      </Group>
    </Layer>
  );
}
