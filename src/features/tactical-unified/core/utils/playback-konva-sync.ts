import type Konva from 'konva';
import type { ResolvedSceneGraphDTO } from '@/lib/tactical/compiler/scene-graph-dto';
import type { CanvasNodesRegistry } from './canvas-registry';

function collectLayer(
  node: Konva.Node | null | undefined,
  layers: Set<Konva.Layer>,
): void {
  const layer = node?.getLayer();
  if (layer) {
    layers.add(layer);
  }
}

export function syncSceneGraphToKonva(
  registry: CanvasNodesRegistry,
  sceneGraph: ResolvedSceneGraphDTO,
): void {
  const dirtyLayers = new Set<Konva.Layer>();

  for (const item of sceneGraph.billboardItems) {
    let node: Konva.Node | null | undefined;
    if (item.kind === 'player') {
      node = registry.playerNodes.get(item.id);
    } else if (item.kind === 'ball') {
      node = registry.ballNode;
    } else {
      node = registry.textNodes.get(item.id);
    }

    if (!node) continue;

    node.position(item.positionPx);
    node.opacity(item.opacity);
    node.visible(item.visible);
    collectLayer(node, dirtyLayers);
  }

  for (const arrow of sceneGraph.arrows) {
    const entry = registry.arrowNodes.get(arrow.id);
    if (!entry) continue;

    if (entry.node) {
      entry.node.points([...arrow.flatPointsPx]);
      entry.node.opacity(arrow.opacity);
      entry.node.visible(arrow.visible);
      collectLayer(entry.node, dirtyLayers);
    }

    if (entry.startDotNode) {
      if (arrow.startMarkerPointPx) {
        entry.startDotNode.position(arrow.startMarkerPointPx);
      }
      entry.startDotNode.visible(arrow.visible);
      collectLayer(entry.startDotNode, dirtyLayers);
    }

    if (entry.endDotNode) {
      if (arrow.endMarkerPointPx) {
        entry.endDotNode.position(arrow.endMarkerPointPx);
      }
      entry.endDotNode.visible(arrow.visible);
      collectLayer(entry.endDotNode, dirtyLayers);
    }
  }

  for (const cl of sceneGraph.connectLines) {
    const entry = registry.connectLineNodes.get(cl.id);
    if (!entry) continue;

    const points = [...cl.flatPointsPx];
    for (const lineNode of [
      entry.glowNode,
      entry.highlightNode,
      entry.coreNode,
    ]) {
      if (!lineNode) continue;
      lineNode.points(points);
      lineNode.visible(cl.visible);
      collectLayer(lineNode, dirtyLayers);
    }
  }

  for (const zone of sceneGraph.zones) {
    const node = registry.zoneNodes.get(zone.id);
    if (!node) continue;

    if (zone.shapeType === 'polygon') {
      if ('points' in node && typeof node.points === 'function') {
        (node as Konva.Line).points([...(zone.flatPointsPx ?? [])]);
      }
    } else {
      node.position({ x: zone.xPx ?? 0, y: zone.yPx ?? 0 });
    }

    node.opacity(zone.opacity);
    node.visible(zone.visible);
    collectLayer(node, dirtyLayers);
  }

  for (const layer of dirtyLayers) {
    layer.batchDraw();
  }
}
