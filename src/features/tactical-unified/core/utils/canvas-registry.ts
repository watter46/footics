import type Konva from 'konva';
import type {
  DomainArrowAnnotation,
  DomainPlayerTrajectory,
} from '@/lib/types/tactical/domain-entities';
import type { PitchRectBounds } from './canvas-coordinates';

export interface ArrowNodeEntry {
  node: Konva.Arrow | null;
  startHandleNode?: Konva.Circle | null;
  endHandleNode?: Konva.Circle | null;
  controlHandleNode?: Konva.Circle | null;
  startDotNode?: Konva.Circle | null;
  endDotNode?: Konva.Circle | null;
  sourcePlayerId?: string;
  targetPlayerId?: string;
  arrowType?: DomainArrowAnnotation['arrowType'];
  curveType?: DomainArrowAnnotation['curveType'];
  startMarker?: DomainArrowAnnotation['startMarker'];
  endMarker?: DomainArrowAnnotation['endMarker'];
  startPx?: { x: number; y: number };
  endPx?: { x: number; y: number };
  controlPointPx?: { x: number; y: number };
  sourceRadiusPx?: number;
  targetRadiusPx?: number;
  dotRadiusPx?: number;
}

export interface TrajectoryArrowNodeEntry {
  groupNode?: Konva.Group | null;
  ghostGroupNode?: Konva.Group | null;
  arrowNode: Konva.Arrow | null;
  controlHandleNode?: Konva.Circle | null;
  startPx: { x: number; y: number };
  startPos: { x: number; y: number };
  endPos?: { x: number; y: number };
  trajectory?: DomainPlayerTrajectory;
}

export interface ConnectLineNodeEntry {
  glowNode?: Konva.Line | null;
  highlightNode?: Konva.Line | null;
  coreNode?: Konva.Line | null;
  fromPlayerId?: string;
  toPlayerId?: string;
}

export interface CanvasNodesRegistry {
  playerNodes: Map<string, Konva.Group>;
  arrowNodes: Map<string, ArrowNodeEntry>;
  trajectoryArrowNodes: Map<string, TrajectoryArrowNodeEntry>;
  textNodes: Map<string, Konva.Text>;
  zoneNodes: Map<string, Konva.Shape>;
  zoneTransformers?: Map<string, Konva.Transformer>;
  connectLineNodes: Map<string, ConnectLineNodeEntry>;
  connectLineNodeMap?: Map<string, Konva.Line>;
  ballNode: Konva.Group | null;
  annotationLayer: Konva.Layer | null;
  ballLayer: Konva.Layer | null;
  playerLayer: Konva.Layer | null;
  backgroundLayer: Konva.Layer | null;
  stage: Konva.Stage | null;
  pitchRect?: PitchRectBounds | null;
}

export function createCanvasNodesRegistry(): CanvasNodesRegistry {
  return {
    playerNodes: new Map(),
    arrowNodes: new Map(),
    trajectoryArrowNodes: new Map(),
    textNodes: new Map(),
    zoneNodes: new Map(),
    zoneTransformers: new Map(),
    connectLineNodes: new Map(),
    ballNode: null,
    annotationLayer: null,
    ballLayer: null,
    playerLayer: null,
    backgroundLayer: null,
    stage: null,
    pitchRect: null,
  };
}
