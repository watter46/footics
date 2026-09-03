import type { KonvaEventObject } from 'konva/lib/Node';
import { getLastName } from '@/lib/tactical/player-formatting';
import { getQuadraticBezierPoints } from '@/lib/tactical/trajectory';
import type {
  ArrowAnnotation,
  Player,
  Slide,
  TextAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';
import type { CanvasNodesRegistry } from './canvas-registry';

function normX(v: number, w: number) {
  return (v / 100) * w;
}
function normY(v: number, h: number) {
  return (v / 100) * h;
}

export interface PlayerDragContext {
  movingPlayers: Array<{
    id: string;
    initialPx: { x: number; y: number };
    initialNorm: { x: number; y: number };
  }>;
  movingPlayerIds: string[];
  draggedPlayerId: string;
  startPx: { x: number; y: number };
  prevPlayerPx: { x: number; y: number } | null;
  attachedArrows: Array<{
    arrow: ArrowAnnotation;
    isSourceMoved: boolean;
    isTargetMoved: boolean;
    initialP0: { x: number; y: number };
    initialP1: { x: number; y: number };
    initialCp?: { x: number; y: number };
  }>;
  attachedConnectLines: Array<{
    lineId: string;
    sourcePlayerId: string;
    targetPlayerId: string;
    isSourceMoved: boolean;
    isTargetMoved: boolean;
    initialP1: { x: number; y: number };
    initialP2: { x: number; y: number };
  }>;
  attachedZones: Array<{
    zone: ZoneAnnotation;
    initialPts?: Array<{ x: number; y: number }>;
    initialX?: number;
    initialY?: number;
  }>;
  attachedTexts: Array<{
    text: TextAnnotation;
    initialX: number;
    initialY: number;
  }>;
}

export interface OnionSkinRefs {
  ghostGroup: any;
  ghostLine: any;
  ghostMarkerGroup: any;
  ghostCircle: any;
  ghostText: any;
  ghostLabel: any;
}

export function createPlayerDragContext({
  draggedPlayer,
  slide,
  prevSlide,
  stageSize,
  selectedObjects,
  selectObject,
  onionSkinRefs,
}: {
  draggedPlayer: Player;
  slide: Slide;
  prevSlide: Slide | null | undefined;
  stageSize: { width: number; height: number };
  selectedObjects: Array<{ id: string; kind: string }>;
  selectObject: (obj: { id: string; kind: 'player' }) => void;
  onionSkinRefs: OnionSkinRefs;
}): PlayerDragContext {
  const { width, height } = stageSize;
  const startPx = {
    x: normX(draggedPlayer.x, width),
    y: normY(draggedPlayer.y, height),
  };

  const selectedPlayerIds = selectedObjects
    .filter((o) => o.kind === 'player')
    .map((o) => o.id);

  const isDraggedSelected = selectedPlayerIds.includes(draggedPlayer.id);
  const movingPlayerIds = isDraggedSelected
    ? selectedPlayerIds
    : [draggedPlayer.id];

  if (!isDraggedSelected) {
    selectObject({ id: draggedPlayer.id, kind: 'player' });
  }

  const movingSet = new Set(movingPlayerIds);
  const movingPlayers = slide.players
    .filter((p) => movingSet.has(p.id) && p.area === 'pitch')
    .map((p) => ({
      id: p.id,
      initialPx: {
        x: normX(p.x, width),
        y: normY(p.y, height),
      },
      initialNorm: { x: p.x, y: p.y },
    }));

  // 前スライドにおける同一選手のゴースト座標取得 (オニオンスキン)
  const prevPlayer = prevSlide?.players.find((p) => p.id === draggedPlayer.id);
  let prevPlayerPx: { x: number; y: number } | null = null;

  if (prevPlayer && prevPlayer.area !== 'bench') {
    prevPlayerPx = {
      x: normX(prevPlayer.x, width),
      y: normY(prevPlayer.y, height),
    };
    if (onionSkinRefs.ghostGroup) {
      onionSkinRefs.ghostGroup.visible(true);
    }
    if (onionSkinRefs.ghostMarkerGroup) {
      onionSkinRefs.ghostMarkerGroup.position(prevPlayerPx);
    }
    if (onionSkinRefs.ghostLine) {
      onionSkinRefs.ghostLine.points([
        prevPlayerPx.x,
        prevPlayerPx.y,
        startPx.x,
        startPx.y,
      ]);
    }
    if (onionSkinRefs.ghostCircle) {
      onionSkinRefs.ghostCircle.fill(prevPlayer.style.color);
    }
    if (onionSkinRefs.ghostText) {
      onionSkinRefs.ghostText.text(prevPlayer.shirtNo || '');
    }
    if (onionSkinRefs.ghostLabel) {
      const pName = prevPlayer.name ? getLastName(prevPlayer.name) : '';
      onionSkinRefs.ghostLabel.text(pName);
    }
    onionSkinRefs.ghostGroup?.getLayer()?.batchDraw();
  } else {
    if (onionSkinRefs.ghostGroup) {
      onionSkinRefs.ghostGroup.visible(false);
      onionSkinRefs.ghostGroup.getLayer()?.batchDraw();
    }
  }

  // ドラッグ対象選手群に追従する矢印を抽出
  const attachedArrows: PlayerDragContext['attachedArrows'] = [];

  for (const arrow of slide.arrows) {
    const isSourceMoved = arrow.sourcePlayerId
      ? movingSet.has(arrow.sourcePlayerId)
      : false;
    const isTargetMoved = arrow.targetPlayerId
      ? movingSet.has(arrow.targetPlayerId)
      : false;
    if (!isSourceMoved && !isTargetMoved) continue;

    const p0 = arrow.points[0] ?? { x: 20, y: 50 };
    const p1 = arrow.points[1] ?? { x: 40, y: 50 };

    const sPxX = normX(p0.x, width);
    const sPxY = normY(p0.y, height);
    const ePxX = normX(p1.x, width);
    const ePxY = normY(p1.y, height);
    const cpX = arrow.controlPoint
      ? normX(arrow.controlPoint.x, width)
      : undefined;
    const cpY = arrow.controlPoint
      ? normY(arrow.controlPoint.y, height)
      : undefined;

    attachedArrows.push({
      arrow,
      isSourceMoved,
      isTargetMoved,
      initialP0: { x: sPxX, y: sPxY },
      initialP1: { x: ePxX, y: ePxY },
      initialCp:
        cpX !== undefined && cpY !== undefined ? { x: cpX, y: cpY } : undefined,
    });
  }

  // ドラッグ対象選手群に追従するコネクトラインを抽出
  const attachedConnectLines: PlayerDragContext['attachedConnectLines'] = [];

  const pitchPlayers = slide.players.filter((p) => p.area === 'pitch');
  const playerMap = new Map(pitchPlayers.map((p) => [p.id, p]));

  for (const p of pitchPlayers) {
    for (const cl of p.connectLines) {
      const targetP = playerMap.get(cl.toPlayerId);
      if (!targetP) continue;

      const isSourceMoved = movingSet.has(p.id);
      const isTargetMoved = movingSet.has(cl.toPlayerId);
      if (!isSourceMoved && !isTargetMoved) continue;

      attachedConnectLines.push({
        lineId: cl.id,
        sourcePlayerId: p.id,
        targetPlayerId: cl.toPlayerId,
        isSourceMoved,
        isTargetMoved,
        initialP1: { x: normX(p.x, width), y: normY(p.y, height) },
        initialP2: {
          x: normX(targetP.x, width),
          y: normY(targetP.y, height),
        },
      });
    }
  }

  return {
    movingPlayers,
    movingPlayerIds,
    draggedPlayerId: draggedPlayer.id,
    startPx,
    prevPlayerPx,
    attachedArrows,
    attachedConnectLines,
    attachedZones: [],
    attachedTexts: [],
  };
}

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
}) {
  const registry = nodesRegistryRef?.current;
  const node = e.currentTarget;
  const curX = node.x();
  const curY = node.y();
  const dx = curX - ctx.startPx.x;
  const dy = curY - ctx.startPx.y;

  const { width, height } = stageSize;

  // 1. 同時選択されている他の選手ノードを同一 Delta 分だけ滑らかに移動 (画面端クランプ付き)
  if (registry) {
    for (const p of ctx.movingPlayers) {
      if (p.id === ctx.draggedPlayerId) continue;
      const pNode = registry.playerNodes.get(p.id);
      if (pNode) {
        const nextX = Math.max(0, Math.min(width, p.initialPx.x + dx));
        const nextY = Math.max(0, Math.min(height, p.initialPx.y + dy));
        pNode.position({ x: nextX, y: nextY });
      }
    }
  }

  // 2. オニオンスキン軌跡ガイド線の更新
  if (ctx.prevPlayerPx && onionSkinGhostLine) {
    onionSkinGhostLine.points([
      ctx.prevPlayerPx.x,
      ctx.prevPlayerPx.y,
      curX,
      curY,
    ]);
  }

  // 3. アタッチされている矢印の追従更新
  if (registry) {
    for (const entry of ctx.attachedArrows) {
      const handles = registry.arrowNodes.get(entry.arrow.id);
      if (!handles?.node) continue;

      let sPxX = entry.initialP0.x;
      let sPxY = entry.initialP0.y;
      let ePxX = entry.initialP1.x;
      let ePxY = entry.initialP1.y;
      let cpX = entry.initialCp?.x;
      let cpY = entry.initialCp?.y;

      if (entry.isSourceMoved && entry.isTargetMoved) {
        sPxX = sPxX + dx;
        sPxY = sPxY + dy;
        ePxX = ePxX + dx;
        ePxY = ePxY + dy;
        if (cpX !== undefined && cpY !== undefined) {
          cpX = cpX + dx;
          cpY = cpY + dy;
        }
        if (handles.startHandleNode)
          handles.startHandleNode.position({ x: sPxX, y: sPxY });
        if (handles.endHandleNode)
          handles.endHandleNode.position({ x: ePxX, y: ePxY });
        if (handles.controlHandleNode) {
          const midX =
            cpX !== undefined && cpY !== undefined
              ? 0.25 * sPxX + 0.5 * cpX + 0.25 * ePxX
              : (sPxX + ePxX) / 2;
          const midY =
            cpX !== undefined && cpY !== undefined
              ? 0.25 * sPxY + 0.5 * cpY + 0.25 * ePxY
              : (sPxY + ePxY) / 2;
          handles.controlHandleNode.position({ x: midX, y: midY });
        }
      } else if (entry.isSourceMoved) {
        sPxX = sPxX + dx;
        sPxY = sPxY + dy;
        if (cpX !== undefined && cpY !== undefined) {
          cpX = cpX + dx * 0.5;
          cpY = cpY + dy * 0.5;
        }
        if (handles.startHandleNode)
          handles.startHandleNode.position({ x: sPxX, y: sPxY });
        if (handles.controlHandleNode) {
          const midX =
            cpX !== undefined && cpY !== undefined
              ? 0.25 * sPxX + 0.5 * cpX + 0.25 * ePxX
              : (sPxX + ePxX) / 2;
          const midY =
            cpX !== undefined && cpY !== undefined
              ? 0.25 * sPxY + 0.5 * cpY + 0.25 * ePxY
              : (sPxY + ePxY) / 2;
          handles.controlHandleNode.position({ x: midX, y: midY });
        }
      } else if (entry.isTargetMoved) {
        ePxX = ePxX + dx;
        ePxY = ePxY + dy;
        if (cpX !== undefined && cpY !== undefined) {
          cpX = cpX + dx * 0.5;
          cpY = cpY + dy * 0.5;
        }
        if (handles.endHandleNode)
          handles.endHandleNode.position({ x: ePxX, y: ePxY });
        if (handles.controlHandleNode) {
          const midX =
            cpX !== undefined && cpY !== undefined
              ? 0.25 * sPxX + 0.5 * cpX + 0.25 * ePxX
              : (sPxX + ePxX) / 2;
          const midY =
            cpX !== undefined && cpY !== undefined
              ? 0.25 * sPxY + 0.5 * cpY + 0.25 * ePxY
              : (sPxY + ePxY) / 2;
          handles.controlHandleNode.position({ x: midX, y: midY });
        }
      }

      const isDot =
        entry.arrow.endMarker === 'dot' ||
        entry.arrow.arrowType === 'route_line';
      const isCurved =
        entry.arrow.curveType === 'curved' ||
        entry.arrow.curveType === 'arc' ||
        entry.arrow.controlPoint !== undefined;

      if (isDot) {
        if (!isCurved) {
          const arrowDx = ePxX - sPxX;
          const arrowDy = ePxY - sPxY;
          const len = Math.hypot(arrowDx, arrowDy);
          const dotR = Math.max(5, entry.arrow.strokeWidth * 1.6);
          const shortenLen = Math.max(0, len - dotR);
          const ratio = len > 0 ? shortenLen / len : 0;
          handles.node.points([
            sPxX,
            sPxY,
            sPxX + arrowDx * ratio,
            sPxY + arrowDy * ratio,
          ]);
        } else if (cpX !== undefined && cpY !== undefined) {
          const pts = getQuadraticBezierPoints(
            sPxX,
            sPxY,
            cpX,
            cpY,
            ePxX,
            ePxY,
          );
          handles.node.points(pts);
        }
      } else {
        if (!isCurved) {
          handles.node.points([sPxX, sPxY, ePxX, ePxY]);
        } else if (cpX !== undefined && cpY !== undefined) {
          const pts = getQuadraticBezierPoints(
            sPxX,
            sPxY,
            cpX,
            cpY,
            ePxX,
            ePxY,
          );
          handles.node.points(pts);
        }
      }
    }

    // 4. コネクトライン更新
    for (const entry of ctx.attachedConnectLines) {
      const lineNode = registry.connectLineNodes.get(entry.lineId);
      if (!lineNode) continue;
      let x1 = entry.initialP1.x;
      let y1 = entry.initialP1.y;
      let x2 = entry.initialP2.x;
      let y2 = entry.initialP2.y;

      if (entry.isSourceMoved) {
        x1 = Math.max(0, Math.min(width, entry.initialP1.x + dx));
        y1 = Math.max(0, Math.min(height, entry.initialP1.y + dy));
      }
      if (entry.isTargetMoved) {
        x2 = Math.max(0, Math.min(width, entry.initialP2.x + dx));
        y2 = Math.max(0, Math.min(height, entry.initialP2.y + dy));
      }
      lineNode.points([x1, y1, x2, y2]);
    }

    // 5. ゾーン更新
    for (const entry of ctx.attachedZones) {
      const zNode = registry.zoneNodes.get(entry.zone.id);
      if (!zNode) continue;
      if (entry.initialX !== undefined && entry.initialY !== undefined) {
        zNode.position({
          x: entry.initialX + dx + (zNode.width() ?? 0) / 2,
          y: entry.initialY + dy + (zNode.height() ?? 0) / 2,
        });
      }
    }

    // 6. テキスト更新
    for (const entry of ctx.attachedTexts) {
      const tNode = registry.textNodes.get(entry.text.id);
      if (!tNode) continue;
      tNode.position({
        x: entry.initialX + dx,
        y: entry.initialY + dy,
      });
    }

    // 関連レイヤーの再描画
    registry.annotationLayer?.batchDraw();
  }

  node.getLayer()?.batchDraw();
}
