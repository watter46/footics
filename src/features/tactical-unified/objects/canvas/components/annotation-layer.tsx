'use client';

/**
 * annotation-layer.tsx
 * Konva arrows / zones / text annotations for the unified canvas
 * 各アノテーション描画ロジックは annotations/ 配下に分離
 */

import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import { Group } from 'react-konva';
import { ZoneObject } from '@/features/tactical-unified/objects/zone';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import type { Slide } from '@/lib/types/tactical-unified';
import type { CanvasNodesRegistry } from '../helpers/canvas-registry';
import { ArrowObject } from './annotations/arrow-object';
import { TextObject } from './annotations/text-object';
import { getWavyPoints } from './annotations/wavy-arrow-math';

export { getWavyPoints };

interface AnnotationLayerProps {
  slide: Slide;
  stageSize: { width: number; height: number };
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  activePolygonId?: string | null;
  mousePreviewPos?: { x: number; y: number } | null;
  editingTextId?: string | null;
  onStartEditText?: (textId: string) => void;
}

type KonvaClickEvent =
  | KonvaEventObject<MouseEvent>
  | KonvaEventObject<TouchEvent>;

export function AnnotationLayer({
  slide,
  stageSize,
  nodesRegistryRef,
  activePolygonId,
  mousePreviewPos,
  editingTextId,
  onStartEditText,
}: AnnotationLayerProps) {
  const selectObject = useTacticalUnifiedStore((s) => s.selectObject);
  const selectedObjects = useTacticalUnifiedStore((s) => s.selectedObjects);
  const updateArrow = useTacticalUnifiedStore((s) => s.updateArrow);
  const updateZone = useTacticalUnifiedStore((s) => s.updateZone);
  const updateText = useTacticalUnifiedStore((s) => s.updateText);
  const setRightPanelTab = useTacticalUnifiedStore((s) => s.setRightPanelTab);
  const setRightPanelOpen = useTacticalUnifiedStore((s) => s.setRightPanelOpen);
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);

  function makeSelectHandler(id: string, kind: 'arrow' | 'zone' | 'text') {
    return (e: KonvaClickEvent) => {
      e.cancelBubble = true;
      const isShift = (e.evt as MouseEvent)?.shiftKey ?? false;
      selectObject({ id, kind }, isShift);
    };
  }

  function handleDblClick(e: KonvaClickEvent) {
    e.cancelBubble = true;
    setRightPanelTab('inspector');
    setRightPanelOpen(true);
  }

  return (
    <Group>
      {slide.zones.map((zone) => (
        <Group
          key={zone.id}
          onDblClick={handleDblClick}
          onDblTap={handleDblClick}
        >
          <ZoneObject
            zone={zone}
            slideId={activeSlideId}
            stageSize={stageSize}
            isSelected={selectedObjects.some((o) => o.id === zone.id)}
            onSelect={makeSelectHandler(zone.id, 'zone')}
            updateZone={updateZone}
            nodesRegistryRef={nodesRegistryRef}
            isCreatingThis={zone.id === activePolygonId}
            mousePreviewPos={mousePreviewPos}
          />
        </Group>
      ))}
      {slide.arrows.map((arrow) => (
        <Group
          key={arrow.id}
          onDblClick={handleDblClick}
          onDblTap={handleDblClick}
        >
          <ArrowObject
            arrow={arrow}
            slide={slide}
            slideId={activeSlideId}
            stageSize={stageSize}
            isSelected={selectedObjects.some((o) => o.id === arrow.id)}
            onSelect={makeSelectHandler(arrow.id, 'arrow')}
            updateArrow={updateArrow}
            nodesRegistryRef={nodesRegistryRef}
          />
        </Group>
      ))}
      {slide.texts.map((text) => (
        <Group key={text.id}>
          <TextObject
            text={text}
            slideId={activeSlideId}
            stageSize={stageSize}
            isSelected={selectedObjects.some((o) => o.id === text.id)}
            isEditing={editingTextId === text.id}
            onSelect={makeSelectHandler(text.id, 'text')}
            onDblClick={(e) => {
              e.cancelBubble = true;
              if (onStartEditText) {
                onStartEditText(text.id);
              } else {
                handleDblClick(e);
              }
            }}
            updateText={updateText}
            nodesRegistryRef={nodesRegistryRef}
          />
        </Group>
      ))}
    </Group>
  );
}
