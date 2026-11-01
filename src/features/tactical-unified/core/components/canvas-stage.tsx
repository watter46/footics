'use client';

import type Konva from 'konva';
import type React from 'react';
import { Stage } from 'react-konva';
import type { PitchRectBounds } from '../utils/canvas-coordinates';
import type { CanvasNodesRegistry } from '../utils/canvas-registry';
import type { SelectionBox } from '../utils/canvas-selection-helpers';
import { BillboardObjectLayer } from './BillboardObjectLayer';
import { InteractionPreviewLayer } from './InteractionPreviewLayer';
import { PitchGroundLayer } from './PitchGroundLayer';
import { ViewportCropOverlay } from './ViewportCropOverlay';

export interface CanvasStageInteraction {
  stageHandlers: Pick<
    React.ComponentProps<typeof Stage>,
    | 'onPointerDown'
    | 'onPointerMove'
    | 'onPointerUp'
    | 'onWheel'
    | 'onDragStart'
    | 'onDragEnd'
  >;
  activePolygonId: string | null;
  mousePreviewPos: { x: number; y: number } | null;
  selectionBox: SelectionBox | null;
  editingTextId: string | null;
  onStartEditText: (textId: string) => void;
}

export interface CanvasStageViewProps {
  stageRef?: React.Ref<Konva.Stage>;
  size: { width: number; height: number };
  vRect: PitchRectBounds;
  nodesRegistryRef: React.MutableRefObject<CanvasNodesRegistry>;
  cleanRender?: boolean;
  interaction?: CanvasStageInteraction;
  children?: React.ReactNode;
}

export type CanvasStageProps = CanvasStageViewProps;

const NOOP_START_EDIT_TEXT = () => {};

export function CanvasStage({
  stageRef,
  size,
  vRect,
  nodesRegistryRef,
  cleanRender,
  interaction,
  children,
}: CanvasStageViewProps) {
  if (size.width <= 0 || size.height <= 0) {
    return null;
  }

  const isInteractive = Boolean(interaction);
  const stageHandlers = interaction?.stageHandlers;

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: size.width,
        height: size.height,
      }}
    >
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        dragDistance={3}
        onPointerDown={stageHandlers?.onPointerDown}
        onPointerMove={stageHandlers?.onPointerMove}
        onPointerUp={stageHandlers?.onPointerUp}
        onWheel={stageHandlers?.onWheel}
        onDragStart={stageHandlers?.onDragStart}
        onDragEnd={stageHandlers?.onDragEnd}
        listening={isInteractive}
      >
        <PitchGroundLayer
          stageSize={size}
          pitchRect={vRect}
          activePolygonId={interaction?.activePolygonId ?? null}
          mousePreviewPos={interaction?.mousePreviewPos ?? null}
          nodesRegistryRef={nodesRegistryRef}
          cleanRender={cleanRender}
          listening={isInteractive}
        />
        <BillboardObjectLayer
          stageSize={size}
          pitchRect={vRect}
          editingTextId={interaction?.editingTextId ?? null}
          onStartEditText={interaction?.onStartEditText ?? NOOP_START_EDIT_TEXT}
          nodesRegistryRef={nodesRegistryRef}
          cleanRender={cleanRender}
          listening={isInteractive}
        />
        <InteractionPreviewLayer
          stageSize={size}
          pitchRect={vRect}
          selectionBox={interaction?.selectionBox ?? null}
          activePolygonId={interaction?.activePolygonId ?? null}
          mousePreviewPos={interaction?.mousePreviewPos ?? null}
          cleanRender={cleanRender}
        />
      </Stage>

      <ViewportCropOverlay
        stageSize={size}
        pitchRect={vRect}
        cleanRender={cleanRender}
      />

      {children}
    </div>
  );
}
