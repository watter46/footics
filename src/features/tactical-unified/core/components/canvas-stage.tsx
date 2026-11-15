'use client';

import type Konva from 'konva';
import type React from 'react';
import { Stage } from 'react-konva';
import { useResolvedSceneGraph } from '@/features/tactical-unified/hooks/use-resolved-scene-graph';
import type { ResolvedSceneGraphDTO } from '@/lib/tactical/compiler/scene-graph-dto';
import type { StageViewport } from '@/lib/tactical/engine/coordinates';
import type { PitchRectBounds } from '../utils/canvas-coordinates';
import type { CanvasNodesRegistry } from '../utils/canvas-registry';
import type { SelectionBox } from '../utils/canvas-selection-helpers';
import { BillboardObjectLayer } from './BillboardObjectLayer';
import { InteractionPreviewLayer } from './InteractionPreviewLayer';
import { PitchGroundLayer } from './PitchGroundLayer';

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

function ResolvedSceneGraphBridge({
  viewport,
  children,
}: {
  viewport: StageViewport;
  children: (sceneGraph: ResolvedSceneGraphDTO) => React.ReactNode;
}) {
  const sceneGraph = useResolvedSceneGraph(viewport);
  return <>{children(sceneGraph)}</>;
}

interface CanvasStageInnerProps extends CanvasStageViewProps {
  sceneGraph: ResolvedSceneGraphDTO;
}

function CanvasStageInner({
  stageRef,
  size,
  vRect,
  nodesRegistryRef,
  cleanRender,
  interaction,
  children,
  sceneGraph,
}: CanvasStageInnerProps) {
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
          nodesRegistryRef={nodesRegistryRef}
          cleanRender={cleanRender}
          listening={isInteractive}
          sceneGraph={sceneGraph}
        />
        <BillboardObjectLayer
          stageSize={size}
          pitchRect={vRect}
          editingTextId={interaction?.editingTextId ?? null}
          onStartEditText={interaction?.onStartEditText ?? NOOP_START_EDIT_TEXT}
          nodesRegistryRef={nodesRegistryRef}
          cleanRender={cleanRender}
          listening={isInteractive}
          sceneGraph={sceneGraph}
        />
        <InteractionPreviewLayer
          stageSize={size}
          pitchRect={vRect}
          selectionBox={interaction?.selectionBox ?? null}
          cleanRender={cleanRender}
          sceneGraph={sceneGraph}
        />
      </Stage>

      {children}
    </div>
  );
}

export function CanvasStage(props: CanvasStageViewProps) {
  if (props.size.width <= 0 || props.size.height <= 0) {
    return null;
  }

  const viewport: StageViewport = {
    width: props.vRect.width,
    height: props.vRect.height,
    offsetX: 0,
    offsetY: 0,
  };

  return (
    <ResolvedSceneGraphBridge viewport={viewport}>
      {(sceneGraph) => <CanvasStageInner {...props} sceneGraph={sceneGraph} />}
    </ResolvedSceneGraphBridge>
  );
}
