'use client';

import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import { Fragment, type ReactNode, useCallback } from 'react';
import { Group, Layer } from 'react-konva';
import type {
  ArrowAnnotation,
  Player,
  TextAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';
import { useCanvasStore } from '../hooks/use-canvas-store';
import type { CanvasNodesRegistry } from '../utils/canvas-registry';
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
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
}

export type KonvaClickEvent = KonvaEventObject<MouseEvent | TouchEvent>;

export interface AnnotationLayerRenderContext {
  stageSize: { width: number; height: number };
  isInteractive: boolean;
  selectedIds: string[];
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  makeSelectHandler: (
    id: string,
    kind: 'arrow' | 'zone' | 'text',
  ) => (e: KonvaClickEvent) => void;
  zones: ZoneAnnotation[];
  arrows: ArrowAnnotation[];
  texts: TextAnnotation[];
  markers: Player[];
  activePolygonId?: string | null;
  mousePreviewPos?: { x: number; y: number } | null;
  editingTextId?: string | null;
  onStartEditText?: (textId: string) => void;
  updateZone: (id: string, patch: Partial<ZoneAnnotation>) => void;
  updateArrow: (id: string, patch: Partial<ArrowAnnotation>) => void;
  updateText: (id: string, patch: Partial<TextAnnotation>) => void;
}

export type AnnotationLayerRenderer = (
  ctx: AnnotationLayerRenderContext,
) => ReactNode;

export const ANNOTATION_LAYER_RENDERERS: AnnotationLayerRenderer[] = [
  (ctx) =>
    ctx.zones.map((zone) => (
      <ZoneObject
        key={zone.id}
        zone={zone}
        stageSize={ctx.stageSize}
        isSelected={ctx.selectedIds.includes(zone.id)}
        isInteractive={ctx.isInteractive}
        onSelect={ctx.makeSelectHandler(zone.id, 'zone')}
        updateZone={ctx.updateZone}
        nodesRegistryRef={ctx.nodesRegistryRef}
        isCreatingThis={zone.id === ctx.activePolygonId}
        mousePreviewPos={ctx.mousePreviewPos}
      />
    )),
  (ctx) =>
    ctx.arrows.map((arrow) => (
      <ArrowObject
        key={arrow.id}
        arrow={arrow}
        players={ctx.markers}
        stageSize={ctx.stageSize}
        isSelected={ctx.selectedIds.includes(arrow.id)}
        isInteractive={ctx.isInteractive}
        onSelect={ctx.makeSelectHandler(arrow.id, 'arrow')}
        updateArrow={ctx.updateArrow}
        nodesRegistryRef={ctx.nodesRegistryRef}
      />
    )),
  (ctx) =>
    ctx.texts.map((text) => (
      <TextObject
        key={text.id}
        text={text}
        stageSize={ctx.stageSize}
        isSelected={ctx.selectedIds.includes(text.id)}
        isEditing={ctx.editingTextId === text.id}
        isInteractive={ctx.isInteractive}
        onSelect={ctx.makeSelectHandler(text.id, 'text')}
        onDblClick={(e) => {
          e.cancelBubble = true;
          ctx.onStartEditText?.(text.id);
        }}
        updateText={ctx.updateText}
        nodesRegistryRef={ctx.nodesRegistryRef}
      />
    )),
];

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
  const setIsHudOpen = useCanvasStore((s) => s.setIsHudOpen);

  const isInteractive = activeTool === 'select';
  const stageSize = { width, height };

  const makeSelectHandler = useCallback(
    (id: string, kind: 'arrow' | 'zone' | 'text') => {
      return (e: KonvaClickEvent) => {
        e.cancelBubble = true;
        const isShift = (e.evt as MouseEvent)?.shiftKey ?? false;
        selectObject({ id, kind }, isShift);
        setIsHudOpen(true);
      };
    },
    [selectObject, setIsHudOpen],
  );

  const renderCtx: AnnotationLayerRenderContext = {
    stageSize,
    isInteractive,
    selectedIds,
    nodesRegistryRef,
    makeSelectHandler,
    zones,
    arrows,
    texts,
    markers,
    activePolygonId,
    mousePreviewPos,
    editingTextId,
    onStartEditText,
    updateZone,
    updateArrow,
    updateText,
  };

  return (
    <Layer>
      <Group>
        {ANNOTATION_LAYER_RENDERERS.map((render, i) => (
          <Fragment key={i}>{render(renderCtx)}</Fragment>
        ))}
      </Group>
    </Layer>
  );
}
