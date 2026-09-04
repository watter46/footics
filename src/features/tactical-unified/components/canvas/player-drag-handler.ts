import type { KonvaEventObject } from 'konva/lib/Node';
import type { CanvasNodesRegistry } from './canvas-registry';
import { updateAttachedArrows } from './player-drag-arrow-updater';
import { createPlayerDragContext } from './player-drag-context';
import {
  updateAttachedConnectLines,
  updateAttachedZonesAndTexts,
  updateMovingPlayerNodes,
  updateOnionSkinGhostLine,
  updatePlayerTrajectoryArrows,
} from './player-drag-node-updater';
import type { OnionSkinRefs, PlayerDragContext } from './player-drag-types';

export type { OnionSkinRefs, PlayerDragContext };
export { createPlayerDragContext };

export function handlePlayerDragMove({
  e,
  ctx,
  stageSize,
  nodesRegistryRef,
  onionSkinGhostLine,
}: {
  e: KonvaEventObject<DragEvent>;
  ctx: PlayerDragContext;
  stageSize: { width: number; height: number };
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  onionSkinGhostLine: any;
}): void {
  const registry = nodesRegistryRef?.current;
  const node = e.currentTarget;
  const curX = node.x();
  const curY = node.y();
  const dx = curX - ctx.startPx.x;
  const dy = curY - ctx.startPx.y;

  // 1. 同時選択ノードの追従移動
  updateMovingPlayerNodes(ctx, registry, dx, dy, stageSize);

  // 2. 軌跡矢印の追従更新
  updatePlayerTrajectoryArrows(ctx, registry, curX, curY, dx, dy, stageSize);

  // 3. オニオンスキン軌跡ガイド線更新
  updateOnionSkinGhostLine(ctx.prevPlayerPx, onionSkinGhostLine, curX, curY);

  // 4. アタッチ矢印の追従更新
  updateAttachedArrows({
    attachedArrows: ctx.attachedArrows,
    registry,
    dx,
    dy,
    stageSize,
  });

  // 5. コネクトライン更新
  updateAttachedConnectLines(ctx, registry, dx, dy, stageSize);

  // 6. ゾーン & テキスト更新
  updateAttachedZonesAndTexts(ctx, registry, dx, dy);

  // レイヤー再描画
  registry?.annotationLayer?.batchDraw();
  node.getLayer()?.batchDraw();
}
