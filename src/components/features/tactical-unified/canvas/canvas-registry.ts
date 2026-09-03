import type Konva from 'konva';

export interface ArrowNodeEntry {
  node: Konva.Arrow | null;
  startHandleNode?: Konva.Circle | null;
  endHandleNode?: Konva.Circle | null;
  controlHandleNode?: Konva.Circle | null;
}

export interface ConnectLineNodeEntry {
  glowNode?: Konva.Line | null;
  highlightNode?: Konva.Line | null;
  coreNode?: Konva.Line | null;
}

export interface CanvasNodesRegistry {
  playerNodes: Map<string, Konva.Group>;
  arrowNodes: Map<string, ArrowNodeEntry>;
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
