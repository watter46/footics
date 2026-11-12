'use client';

import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import { BallObject } from '@/features/tactical-unified/objects/ball/components/ball-object';
import type {
  ResolvedBillboardBallItem,
  ResolvedBillboardPlayerItem,
  ResolvedBillboardTextItem,
  ResolvedSceneGraphDTO,
} from '@/lib/tactical/compiler/scene-graph-dto';
import type {
  AspectRatio,
  Player,
  TextAnnotation,
} from '@/lib/types/tactical-unified';
import type { PitchRectBounds } from '../utils/canvas-coordinates';
import type { CanvasNodesRegistry } from '../utils/canvas-registry';
import { TextObject } from './annotations/TextObject';
import type { BillboardItem } from './billboard-depth-sort';
import { PlayerMarkerItem } from './PlayerMarkerItem';

export interface BillboardItemNodeProps {
  item: BillboardItem;
  pitchRect: PitchRectBounds;
  baseDim: number;
  markerMode: string;
  aspectRatio?: AspectRatio;
  selectedIds: string[];
  cleanRender?: boolean;
  isInteractive: boolean;
  connectingPlayerId: string | null;
  editingTextId?: string | null;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  onStartEditText?: (textId: string) => void;
  onDragStart: (e: KonvaEventObject<DragEvent>, markerId: string) => void;
  onDragMove: (e: KonvaEventObject<DragEvent>, markerId: string) => void;
  onDragEnd: (e: KonvaEventObject<DragEvent>, marker: Player) => void;
  onClickMarker: (markerId: string, isShift: boolean) => void;
  onUpdateVisionCone: (
    marker: Player,
    patch: Partial<NonNullable<Player['visionCone']>>,
  ) => void;
  onSelectText: (
    e: KonvaEventObject<MouseEvent | TouchEvent>,
    textId: string,
  ) => void;
  updateText: (id: string, patch: Partial<TextAnnotation>) => void;
  sceneGraph?: ResolvedSceneGraphDTO | null;
}

export function BillboardItemNode({
  item,
  pitchRect,
  baseDim,
  markerMode,
  aspectRatio,
  selectedIds,
  cleanRender,
  isInteractive,
  connectingPlayerId,
  editingTextId,
  nodesRegistryRef,
  onStartEditText,
  onDragStart,
  onDragMove,
  onDragEnd,
  onClickMarker,
  onUpdateVisionCone,
  onSelectText,
  updateText,
  sceneGraph,
}: BillboardItemNodeProps) {
  if (item.kind === 'player') {
    const marker = item.data;
    const resolvedPlayer =
      sceneGraph?.billboardItems.find(
        (b): b is ResolvedBillboardPlayerItem =>
          b.kind === 'player' && b.id === marker.id,
      ) ?? null;
    return (
      <PlayerMarkerItem
        key={marker.id}
        marker={marker}
        width={pitchRect.width}
        height={pitchRect.height}
        baseDim={baseDim}
        markerMode={markerMode}
        aspectRatio={aspectRatio}
        isSelected={!cleanRender && selectedIds.includes(marker.id)}
        isInteractive={!cleanRender && isInteractive}
        cleanRender={cleanRender}
        connectingPlayerId={connectingPlayerId}
        nodesRegistryRef={nodesRegistryRef}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        onClick={onClickMarker}
        onUpdateVisionCone={(patch) => onUpdateVisionCone(marker, patch)}
        resolvedPlayer={resolvedPlayer}
      />
    );
  }

  if (item.kind === 'ball') {
    const ball = item.data;
    const resolvedBall = sceneGraph?.billboardItems.find(
      (b): b is ResolvedBillboardBallItem => b.kind === 'ball',
    );
    const effectiveBall = (() => {
      if (!resolvedBall || pitchRect.width <= 0 || pitchRect.height <= 0) {
        return ball;
      }
      const defaultBaseRadius = Math.max(8, baseDim * 0.022);
      const calculatedSizeScale =
        defaultBaseRadius > 0 ? resolvedBall.radiusPx / defaultBaseRadius : 1.0;
      return {
        ...ball,
        x: (resolvedBall.positionPx.x / pitchRect.width) * 100,
        y: (resolvedBall.positionPx.y / pitchRect.height) * 100,
        sizeScale: calculatedSizeScale,
      };
    })();

    return (
      <BallObject
        key="ball-object"
        ball={effectiveBall}
        stageSize={{
          width: pitchRect.width,
          height: pitchRect.height,
        }}
        nodesRegistryRef={nodesRegistryRef}
        cleanRender={cleanRender}
      />
    );
  }

  if (item.kind === 'text') {
    const text = item.data;
    const resolvedText =
      sceneGraph?.billboardItems.find(
        (b): b is ResolvedBillboardTextItem =>
          b.kind === 'text' && b.id === text.id,
      ) ?? null;
    return (
      <TextObject
        key={text.id}
        text={text}
        stageSize={{
          width: pitchRect.width,
          height: pitchRect.height,
        }}
        isSelected={!cleanRender && selectedIds.includes(text.id)}
        isEditing={editingTextId === text.id}
        isInteractive={!cleanRender && isInteractive}
        onSelect={(e) => onSelectText(e, text.id)}
        onDblClick={(e) => {
          e.cancelBubble = true;
          onStartEditText?.(text.id);
        }}
        updateText={updateText}
        nodesRegistryRef={nodesRegistryRef}
        resolvedText={resolvedText}
      />
    );
  }

  return null;
}
