'use client';

import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import { BallObject } from '@/features/tactical-unified/objects/ball/components/ball-object';
import type { ResolvedBillboardItem } from '@/lib/tactical/compiler/scene-graph-dto';
import { toScreenNormCoord } from '@/lib/types/tactical/branded';
import type {
  DomainTextAnnotation,
  PitchPlayer,
} from '@/lib/types/tactical/domain-entities';
import type { AspectRatio } from '@/lib/types/tactical-unified';
import type { PitchRectBounds } from '../utils/canvas-coordinates';
import type { CanvasNodesRegistry } from '../utils/canvas-registry';
import { TextObject } from './annotations/TextObject';
import { PlayerMarkerItem } from './PlayerMarkerItem';

export interface BillboardItemNodeProps {
  item: ResolvedBillboardItem;
  pitchRect: PitchRectBounds;
  baseDim: number;
  markerMode: string;
  aspectRatio?: AspectRatio;
  selectedIds: readonly string[];
  cleanRender?: boolean;
  isInteractive: boolean;
  connectingPlayerId: string | null;
  editingTextId?: string | null;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  onStartEditText?: (textId: string) => void;
  onDragStart: (e: KonvaEventObject<DragEvent>, markerId: string) => void;
  onDragMove: (e: KonvaEventObject<DragEvent>, markerId: string) => void;
  onDragEnd: (e: KonvaEventObject<DragEvent>, marker: PitchPlayer) => void;
  onClickMarker: (markerId: string, isShift: boolean) => void;
  onUpdateVisionCone: (
    marker: PitchPlayer,
    patch: Partial<NonNullable<PitchPlayer['visionCone']>>,
  ) => void;
  onSelectText: (
    e: KonvaEventObject<MouseEvent | TouchEvent>,
    textId: string,
  ) => void;
  updateText: (id: string, patch: Partial<DomainTextAnnotation>) => void;
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
}: BillboardItemNodeProps) {
  if (!item.visible) {
    return null;
  }

  if (item.kind === 'player') {
    const marker = item.player;
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
        onDragEnd={(e) => onDragEnd(e, marker)}
        onClick={onClickMarker}
        onUpdateVisionCone={(patch) => onUpdateVisionCone(marker, patch)}
        resolvedPlayer={item}
      />
    );
  }

  if (item.kind === 'ball') {
    return (
      <BallObject
        key="ball-object"
        ball={{
          x: toScreenNormCoord(50),
          y: toScreenNormCoord(50),
          visible: item.visible,
        }}
        resolvedBall={item}
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
    return (
      <TextObject
        key={item.id}
        textId={item.id}
        stageSize={{
          width: pitchRect.width,
          height: pitchRect.height,
        }}
        isSelected={!cleanRender && selectedIds.includes(item.id)}
        isEditing={editingTextId === item.id}
        isInteractive={!cleanRender && isInteractive}
        onSelect={(e) => onSelectText(e, item.id)}
        onDblClick={(e) => {
          e.cancelBubble = true;
          onStartEditText?.(item.id);
        }}
        updateText={updateText}
        nodesRegistryRef={nodesRegistryRef}
        resolvedText={item}
      />
    );
  }

  return null;
}
