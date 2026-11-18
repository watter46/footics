import type Konva from 'konva';
import {
  generateWavyLinePoints,
  offsetArrowEndpoints,
  subdivideQuadraticBezier,
} from '@/lib/tactical/compiler/geometry-primitives';
import {
  getBezierControlPointPx,
  getBezierMidpoint,
  getQuadraticBezierPoints,
} from '@/lib/tactical/engine/trajectory';
import type { DomainPlayerTrajectory } from '@/lib/types/tactical/domain-entities';
import type {
  CanvasNodesRegistry,
  TrajectoryArrowNodeEntry,
  TrajectoryEffectLineEntry,
} from './canvas-registry';

const TRAJECTORY_VISIBILITY_THRESHOLD_PX = 4;

export function computeKonvaTrajectoryPoints(
  startPx: { x: number; y: number },
  endPx: { x: number; y: number },
  trajectory: DomainPlayerTrajectory | undefined,
  stageSize: { width: number; height: number },
): { points: number[]; handleMidPx: { x: number; y: number } } {
  const isCurved = trajectory !== undefined && trajectory.type !== 'straight';

  if (isCurved) {
    const cp = getBezierControlPointPx(startPx, endPx, trajectory, stageSize);
    const points = getQuadraticBezierPoints(
      startPx.x,
      startPx.y,
      cp.x,
      cp.y,
      endPx.x,
      endPx.y,
    );
    return {
      points,
      handleMidPx: getBezierMidpoint(startPx, endPx, cp),
    };
  }

  return {
    points: [startPx.x, startPx.y, endPx.x, endPx.y],
    handleMidPx: {
      x: (startPx.x + endPx.x) / 2,
      y: (startPx.y + endPx.y) / 2,
    },
  };
}

export function syncTrajectoryEntryKonva(
  entry: TrajectoryArrowNodeEntry,
  endPx: { x: number; y: number },
  stageSize: { width: number; height: number },
): Konva.Layer | null {
  const dist = Math.hypot(endPx.x - entry.startPx.x, endPx.y - entry.startPx.y);
  const visible = dist >= TRAJECTORY_VISIBILITY_THRESHOLD_PX;

  entry.groupNode?.visible(visible);
  entry.ghostGroupNode?.visible(visible);

  if (visible && entry.arrowNode) {
    const { points, handleMidPx } = computeKonvaTrajectoryPoints(
      entry.startPx,
      endPx,
      entry.trajectory,
      stageSize,
    );
    entry.arrowNode.points(points);
    entry.controlHandleNode?.position(handleMidPx);
  }

  return (
    entry.arrowNode?.getLayer() ??
    entry.groupNode?.getLayer() ??
    entry.ghostGroupNode?.getLayer() ??
    null
  );
}

export function syncTrajectoryEffectLineKonva(
  entry: TrajectoryEffectLineEntry,
  endPx: { x: number; y: number },
  stageSize: { width: number; height: number },
): Konva.Layer | null {
  const dist = Math.hypot(endPx.x - entry.startPx.x, endPx.y - entry.startPx.y);
  const visible = dist >= TRAJECTORY_VISIBILITY_THRESHOLD_PX;

  entry.lineNode?.visible(visible);

  if (visible && entry.lineNode) {
    const { points } = computeKonvaTrajectoryPoints(
      entry.startPx,
      endPx,
      entry.trajectory,
      stageSize,
    );
    entry.lineNode.points(points);
  }

  return entry.lineNode?.getLayer() ?? null;
}

export function syncObjectTrajectoryKonva(
  registry: CanvasNodesRegistry,
  objectId: string,
  endPx: { x: number; y: number },
  stageSize: { width: number; height: number },
): Konva.Layer[] {
  const layers: Konva.Layer[] = [];

  const arrowEntry = registry.trajectoryArrowNodes.get(objectId);
  if (arrowEntry) {
    const layer = syncTrajectoryEntryKonva(arrowEntry, endPx, stageSize);
    if (layer) layers.push(layer);
  }

  const effectEntry = registry.trajectoryEffectLines?.get(objectId);
  if (effectEntry) {
    const layer = syncTrajectoryEffectLineKonva(effectEntry, endPx, stageSize);
    if (layer) layers.push(layer);
  }

  return layers;
}

function resolvePlayerPosition(
  playerId: string | undefined,
  movedPlayers: ReadonlyMap<string, { xPx: number; yPx: number }>,
  registry: CanvasNodesRegistry,
  fallback?: { x: number; y: number },
): { x: number; y: number } | undefined {
  if (!playerId) return fallback;
  const moved = movedPlayers.get(playerId);
  if (moved) return { x: moved.xPx, y: moved.yPx };
  const node = registry.playerNodes.get(playerId);
  if (node) return node.position();
  return fallback;
}

export function syncPlayerDragKonvaNodes(params: {
  registry: CanvasNodesRegistry;
  movedPlayers: ReadonlyMap<string, { xPx: number; yPx: number }>;
  primaryPlayerId?: string;
  stageSize: { width: number; height: number };
}): void {
  const { registry, movedPlayers, primaryPlayerId, stageSize } = params;
  const dirtyLayers = new Set<Konva.Layer>();

  for (const [playerId, pos] of movedPlayers) {
    if (playerId !== primaryPlayerId) {
      const playerNode = registry.playerNodes.get(playerId);
      if (playerNode) {
        playerNode.position({ x: pos.xPx, y: pos.yPx });
        const layer = playerNode.getLayer();
        if (layer) dirtyLayers.add(layer);
      }
    }

    const trajectoryLayers = syncObjectTrajectoryKonva(
      registry,
      playerId,
      { x: pos.xPx, y: pos.yPx },
      stageSize,
    );
    for (const layer of trajectoryLayers) {
      dirtyLayers.add(layer);
    }
  }

  for (const entry of registry.connectLineNodes.values()) {
    const involvesMoved =
      (entry.fromPlayerId !== undefined &&
        movedPlayers.has(entry.fromPlayerId)) ||
      (entry.toPlayerId !== undefined && movedPlayers.has(entry.toPlayerId));
    if (!involvesMoved) continue;

    const fromPx = resolvePlayerPosition(
      entry.fromPlayerId,
      movedPlayers,
      registry,
    );
    const toPx = resolvePlayerPosition(
      entry.toPlayerId,
      movedPlayers,
      registry,
    );
    if (!fromPx || !toPx) continue;

    const points = [fromPx.x, fromPx.y, toPx.x, toPx.y];
    entry.glowNode?.points(points);
    entry.highlightNode?.points(points);
    entry.coreNode?.points(points);

    const layer =
      entry.coreNode?.getLayer() ??
      entry.highlightNode?.getLayer() ??
      entry.glowNode?.getLayer();
    if (layer) dirtyLayers.add(layer);
  }

  for (const entry of registry.arrowNodes.values()) {
    const involvesMoved =
      (entry.sourcePlayerId !== undefined &&
        movedPlayers.has(entry.sourcePlayerId)) ||
      (entry.targetPlayerId !== undefined &&
        movedPlayers.has(entry.targetPlayerId));
    if (!involvesMoved) continue;

    const startPx = resolvePlayerPosition(
      entry.sourcePlayerId,
      movedPlayers,
      registry,
      entry.startPx,
    );
    const endPx = resolvePlayerPosition(
      entry.targetPlayerId,
      movedPlayers,
      registry,
      entry.endPx,
    );
    if (!startPx || !endPx) continue;

    const cp = entry.curveType === 'curved' ? entry.controlPointPx : undefined;
    const offset = offsetArrowEndpoints({
      startX: startPx.x,
      startY: startPx.y,
      endX: endPx.x,
      endY: endPx.y,
      cpX: cp?.x,
      cpY: cp?.y,
      sourcePlayerRadius: entry.sourcePlayerId
        ? entry.sourceRadiusPx
        : undefined,
      targetPlayerRadius: entry.targetPlayerId
        ? entry.targetRadiusPx
        : undefined,
      startMarker: entry.startMarker,
      endMarker: entry.endMarker,
      dotRadius: entry.dotRadiusPx,
    });

    let points: number[];
    if (entry.arrowType === 'dribble') {
      points = generateWavyLinePoints(
        offset.startX,
        offset.startY,
        offset.endX,
        offset.endY,
      );
    } else if (entry.curveType === 'curved' && cp) {
      points = subdivideQuadraticBezier(
        offset.startX,
        offset.startY,
        cp.x,
        cp.y,
        offset.endX,
        offset.endY,
      );
    } else {
      points = [offset.startX, offset.startY, offset.endX, offset.endY];
    }

    entry.node?.points(points);
    entry.startDotNode?.position({
      x: offset.startMarkerX,
      y: offset.startMarkerY,
    });
    entry.endDotNode?.position({
      x: offset.endMarkerX,
      y: offset.endMarkerY,
    });
    entry.startHandleNode?.position(startPx);
    entry.endHandleNode?.position(endPx);

    const layer = entry.node?.getLayer();
    if (layer) dirtyLayers.add(layer);
  }

  for (const layer of dirtyLayers) {
    layer.batchDraw();
  }
}

export function syncBallDragKonvaNodes(params: {
  registry: CanvasNodesRegistry;
  ballPx: { x: number; y: number };
  stageSize: { width: number; height: number };
}): void {
  const { registry, ballPx, stageSize } = params;
  const layers = syncObjectTrajectoryKonva(registry, 'ball', ballPx, stageSize);
  for (const layer of new Set(layers)) {
    layer.batchDraw();
  }
}
