import type { Player, Slide } from '@/lib/types/tactical-unified';
import { setupOnionSkinGhost } from './player-drag-onionskin-helper';
import {
  type AttachedArrowEntry,
  type AttachedConnectLineEntry,
  normX,
  normY,
  type OnionSkinRefs,
  type PlayerDragContext,
} from './player-drag-types';

function toAttachedArrowEntry(
  arrow: Slide['arrows'][number],
  playerMap: Map<string, Player>,
  movingSet: Set<string>,
  stageSize: { width: number; height: number },
): AttachedArrowEntry | null {
  const isSource = arrow.sourcePlayerId
    ? movingSet.has(arrow.sourcePlayerId)
    : false;
  const isTarget = arrow.targetPlayerId
    ? movingSet.has(arrow.targetPlayerId)
    : false;
  if (!isSource && !isTarget) return null;

  const { width, height } = stageSize;
  const p0 = arrow.points[0] ?? { x: 20, y: 50 };
  const p1 = arrow.points[1] ?? { x: 40, y: 50 };
  const cpX = arrow.controlPoint
    ? normX(arrow.controlPoint.x, width)
    : undefined;
  const cpY = arrow.controlPoint
    ? normY(arrow.controlPoint.y, height)
    : undefined;

  return {
    arrow,
    sourcePlayer: arrow.sourcePlayerId
      ? playerMap.get(arrow.sourcePlayerId)
      : undefined,
    targetPlayer: arrow.targetPlayerId
      ? playerMap.get(arrow.targetPlayerId)
      : undefined,
    isSourceMoved: isSource,
    isTargetMoved: isTarget,
    initialP0: { x: normX(p0.x, width), y: normY(p0.y, height) },
    initialP1: { x: normX(p1.x, width), y: normY(p1.y, height) },
    initialCp:
      cpX !== undefined && cpY !== undefined ? { x: cpX, y: cpY } : undefined,
  };
}

function extractAttachedArrows(
  slide: Slide,
  playerMap: Map<string, Player>,
  movingSet: Set<string>,
  stageSize: { width: number; height: number },
): AttachedArrowEntry[] {
  const attached: AttachedArrowEntry[] = [];
  for (const arrow of slide.arrows) {
    const entry = toAttachedArrowEntry(arrow, playerMap, movingSet, stageSize);
    if (entry) attached.push(entry);
  }
  return attached;
}

function extractAttachedConnectLines(
  pitchPlayers: Player[],
  playerMap: Map<string, Player>,
  movingSet: Set<string>,
  stageSize: { width: number; height: number },
): AttachedConnectLineEntry[] {
  const { width, height } = stageSize;
  const attached: AttachedConnectLineEntry[] = [];
  for (const p of pitchPlayers) {
    for (const cl of p.connectLines) {
      const targetP = playerMap.get(cl.toPlayerId);
      if (!targetP) continue;
      const isSource = movingSet.has(p.id);
      const isTarget = movingSet.has(cl.toPlayerId);
      if (!isSource && !isTarget) continue;
      attached.push({
        lineId: cl.id,
        sourcePlayer: p,
        targetPlayer: targetP,
        sourcePlayerId: p.id,
        targetPlayerId: cl.toPlayerId,
        isSourceMoved: isSource,
        isTargetMoved: isTarget,
        initialP1: { x: normX(p.x, width), y: normY(p.y, height) },
        initialP2: { x: normX(targetP.x, width), y: normY(targetP.y, height) },
      });
    }
  }
  return attached;
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
  const selIds = selectedObjects
    .filter((o) => o.kind === 'player')
    .map((o) => o.id);
  const isSelected = selIds.includes(draggedPlayer.id);
  const movingPlayerIds = isSelected ? selIds : [draggedPlayer.id];
  if (!isSelected) selectObject({ id: draggedPlayer.id, kind: 'player' });

  const movingSet = new Set(movingPlayerIds);
  const movingPlayers = slide.players
    .filter((p) => movingSet.has(p.id) && p.area === 'pitch' && !p.locked)
    .map((p) => ({
      id: p.id,
      initialPx: { x: normX(p.x, width), y: normY(p.y, height) },
      initialNorm: { x: p.x, y: p.y },
    }));

  const prevPlayer = prevSlide?.players.find((p) => p.id === draggedPlayer.id);
  const prevPlayerPx = setupOnionSkinGhost(
    prevPlayer,
    startPx,
    stageSize,
    onionSkinRefs,
  );
  const pitchPlayers = slide.players.filter((p) => p.area === 'pitch');
  const playerMap = new Map(pitchPlayers.map((p) => [p.id, p]));

  return {
    movingPlayers,
    movingPlayerIds,
    draggedPlayerId: draggedPlayer.id,
    startPx,
    prevPlayerPx,
    attachedArrows: extractAttachedArrows(
      slide,
      playerMap,
      movingSet,
      stageSize,
    ),
    attachedConnectLines: extractAttachedConnectLines(
      pitchPlayers,
      playerMap,
      movingSet,
      stageSize,
    ),
    attachedZones: [],
    attachedTexts: [],
  };
}
