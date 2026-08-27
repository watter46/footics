import type Konva from 'konva';

export interface ArrowNodeEntry {
  node: Konva.Arrow | null;
  startHandleNode?: Konva.Circle | null;
  endHandleNode?: Konva.Circle | null;
  controlHandleNode?: Konva.Circle | null;
}

export interface CanvasNodesRegistry {
  arrowNodes: Map<string, ArrowNodeEntry>;
  textNodes: Map<string, Konva.Text>;
  zoneNodes: Map<string, Konva.Shape>;
  connectLineNodes: Map<string, Konva.Line>;
  ballNode: Konva.Group | null;
  annotationLayer: Konva.Layer | null;
  ballLayer: Konva.Layer | null;
  playerLayer: Konva.Layer | null;
}

export function createCanvasNodesRegistry(): CanvasNodesRegistry {
  return {
    arrowNodes: new Map(),
    textNodes: new Map(),
    zoneNodes: new Map(),
    connectLineNodes: new Map(),
    ballNode: null,
    annotationLayer: null,
    ballLayer: null,
    playerLayer: null,
  };
}
