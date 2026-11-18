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
} from '@/lib/tactical/trajectory';
import type {
  CanvasNodesRegistry,
  TrajectoryArrowNodeEntry,
} from './canvas-registry';

const TRAJECTORY_VISIBILITY_THRESHOLD_PX = 4;

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
    const isCurved =
      entry.trajectory !== undefined && entry.trajectory.type !== 'straight';

    if (isCurved) {
      const cp = getBezierControlPointPx(
        entry.startPx,
        endPx,
        entry.trajectory,
        stageSize,
      );
      const points = getQuadraticBezierPoints(
        entry.startPx.x,
        entry.startPx.y,
        cp.x,
        cp.y,
        endPx.x,
        endPx.y,
      );
      entry.arrowNode.points(points);
      entry.controlHandleNode?.position(
        getBezierMidpoint(entry.startPx, endPx, cp),
      );
    } else {
      entry.arrowNode.points([
        entry.startPx.x,
        entry.startPx.y,
        endPx.x,
        endPx.y,
      ]);
      entry.controlHandleNode?.position({
        x: (entry.startPx.x + endPx.x) / 2,
        y: (entry.startPx.y + endPx.y) / 2,
      });
    }
  }

  return (
    entry.arrowNode?.getLayer() ??
    entry.groupNode?.getLayer() ??
    entry.ghostGroupNode?.getLayer() ??
    null
  );
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

    const trajectoryEntry = registry.trajectoryArrowNodes.get(playerId);
    if (trajectoryEntry) {
      const layer = syncTrajectoryEntryKonva(
        trajectoryEntry,
        { x: pos.xPx, y: pos.yPx },
        stageSize,
      );
      if (layer) dirtyLayers.add(layer);
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
  const entry = registry.trajectoryArrowNodes.get('ball');
  if (!entry) return;

  const layer = syncTrajectoryEntryKonva(entry, ballPx, stageSize);
  layer?.batchDraw();
}
