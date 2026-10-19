import type Konva from 'konva';
import type { PlayerTrajectory } from '@/lib/types/tactical-unified';

export interface ArrowNodeEntry {
  node: Konva.Arrow | null;
  startHandleNode?: Konva.Circle | null;
  endHandleNode?: Konva.Circle | null;
  controlHandleNode?: Konva.Circle | null;
}

export interface TrajectoryArrowNodeEntry {
  groupNode?: Konva.Group | null;
  arrowNode: Konva.Arrow | null;
  controlHandleNode?: Konva.Circle | null;
  startPx: { x: number; y: number };
  startPos: { x: number; y: number };
  trajectory?: PlayerTrajectory;
}

export interface ConnectLineNodeEntry {
  glowNode?: Konva.Line | null;
  highlightNode?: Konva.Line | null;
  coreNode?: Konva.Line | null;
}

export interface CanvasNodesRegistry {
  playerNodes: Map<string, Konva.Group>;
  arrowNodes: Map<string, ArrowNodeEntry>;
  trajectoryArrowNodes: Map<string, TrajectoryArrowNodeEntry>;
  textNodes: Map<string, Konva.Text>;
  zoneNodes: Map<string, Konva.Shape>;
  connectLineNodes: Map<string, ConnectLineNodeEntry>;
  ballNode: Konva.Group | null;
  annotationLayer: Konva.Layer | null;
  ballLayer: Konva.Layer | null;
  playerLayer: Konva.Layer | null;
  backgroundLayer: Konva.Layer | null;
  stage: Konva.Stage | null;
}

export function createCanvasNodesRegistry(): CanvasNodesRegistry {
  return {
    playerNodes: new Map(),
    arrowNodes: new Map(),
    trajectoryArrowNodes: new Map(),
    textNodes: new Map(),
    zoneNodes: new Map(),
    connectLineNodes: new Map(),
    ballNode: null,
    annotationLayer: null,
    ballLayer: null,
    playerLayer: null,
    backgroundLayer: null,
    stage: null,
  };
}
