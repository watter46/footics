/**
 * animation-trajectory-updater.ts
 * Manages player ghost movement trajectory Konva nodes during animation playback
 */
import Konva from 'konva';
import type { InterpolatedPlayerState } from '@/lib/tactical/unified-interpolation';

export function updatePlayerTrajectory(
  playerGroup: Konva.Group,
  pState: InterpolatedPlayerState,
  stageWidth: number,
  stageHeight: number,
  offsetX = 0,
  offsetY = 0,
  isPlaying = false,
): void {
  if (typeof playerGroup.find !== 'function') {
    return;
  }

  const trajectoryEffect = pState.trajectoryEffect;
  const startMarker =
    typeof playerGroup.findOne === 'function'
      ? playerGroup.findOne<Konva.Circle>('.trajectory-start-marker')
      : (playerGroup.find<Konva.Circle>('.trajectory-start-marker')?.[0] ??
        null);
  const line =
    typeof playerGroup.findOne === 'function'
      ? playerGroup.findOne<Konva.Line>('.trajectory-line')
      : (playerGroup.find<Konva.Line>('.trajectory-line')?.[0] ?? null);

  if (!isPlaying || !trajectoryEffect?.enabled || !pState.startPos) {
    if (startMarker && typeof startMarker.visible === 'function') {
      startMarker.visible(false);
    }
    if (line && typeof line.visible === 'function') {
      line.visible(false);
    }
    return;
  }

  const startPos = pState.startPos;
  const endPos = pState.endPos ?? { x: pState.x, y: pState.y };
  const totalMoveDist = Math.hypot(
    endPos.x - startPos.x,
    endPos.y - startPos.y,
  );

  // 始点と終点がほぼ同一（移動していない）場合は描画しない
  if (totalMoveDist < 0.1) {
    if (startMarker && typeof startMarker.visible === 'function') {
      startMarker.visible(false);
    }
    if (line && typeof line.visible === 'function') {
      line.visible(false);
    }
    return;
  }

  const distToEnd = Math.hypot(pState.x - endPos.x, pState.y - endPos.y);
  const isArrived = distToEnd < 0.05;

  // auto-hide かつ到達済みの場合は非表示
  if (trajectoryEffect.exitAction === 'auto-hide' && isArrived) {
    if (startMarker && typeof startMarker.visible === 'function') {
      startMarker.visible(false);
    }
    if (line && typeof line.visible === 'function') {
      line.visible(false);
    }
    return;
  }

  // 現在位置（px）
  const currPxX = offsetX + (pState.x / 100) * stageWidth;
  const currPxY = offsetY + (pState.y / 100) * stageHeight;
  // 始点位置（px）
  const startPxX = offsetX + (startPos.x / 100) * stageWidth;
  const startPxY = offsetY + (startPos.y / 100) * stageHeight;

  // playerGroup のローカル座標系（(0, 0) が現在の選手中心）
  const localStartX = startPxX - currPxX;
  const localStartY = startPxY - currPxY;

  const color = trajectoryEffect.color ?? pState.style?.color ?? '#3b82f6';
  const isDashed = trajectoryEffect.lineStyle === 'dashed';

  // 1. 始点マーカー（●）
  let markerNode = startMarker;
  if (!markerNode) {
    markerNode = new Konva.Circle({
      name: 'trajectory-start-marker',
      radius: 6,
      listening: false,
    });
    playerGroup.add(markerNode);
    if (typeof markerNode.moveToBottom === 'function') {
      markerNode.moveToBottom();
    }
  }
  markerNode.position({ x: localStartX, y: localStartY });
  markerNode.fill(color);
  markerNode.opacity(0.8 * pState.opacity);
  markerNode.visible(pState.visible);

  // 2. 追従ライン
  let lineNode = line;
  if (!lineNode) {
    lineNode = new Konva.Line({
      name: 'trajectory-line',
      strokeWidth: 2,
      listening: false,
    });
    playerGroup.add(lineNode);
    if (typeof lineNode.moveToBottom === 'function') {
      lineNode.moveToBottom();
    }
  }
  lineNode.points([localStartX, localStartY, 0, 0]);
  lineNode.stroke(color);
  lineNode.dash(isDashed ? [6, 4] : []);
  lineNode.opacity(0.8 * pState.opacity);
  lineNode.visible(pState.visible);
}
