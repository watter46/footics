import type {
  ArrowAnnotation,
  Player,
  Slide,
  TextAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';
import type { SelectedObject, SelectedObjectKind } from './tool-slice';

export interface TacticalClipboard {
  players: Player[];
  arrows: ArrowAnnotation[];
  zones: ZoneAnnotation[];
  texts: TextAnnotation[];
}

export function extractSelectedObjects(
  slide: Slide,
  selectedObjects: SelectedObject[],
): TacticalClipboard {
  const selectedSet = new Map<string, SelectedObjectKind>();
  for (const obj of selectedObjects) {
    selectedSet.set(obj.id, obj.kind);
  }

  const players: Player[] = [];
  const arrows: ArrowAnnotation[] = [];
  const zones: ZoneAnnotation[] = [];
  const texts: TextAnnotation[] = [];

  for (const player of slide.players) {
    if (selectedSet.get(player.id) === 'player') {
      players.push(structuredClone(player));
    }
  }

  for (const arrow of slide.arrows) {
    if (selectedSet.get(arrow.id) === 'arrow') {
      arrows.push(structuredClone(arrow));
    }
  }

  for (const zone of slide.zones) {
    if (selectedSet.get(zone.id) === 'zone') {
      zones.push(structuredClone(zone));
    }
  }

  for (const text of slide.texts) {
    if (selectedSet.get(text.id) === 'text') {
      texts.push(structuredClone(text));
    }
  }

  return { players, arrows, zones, texts };
}

function cloneAndOffsetPlayers(
  players: Player[],
  offsetX: number,
  offsetY: number,
  playerIdMap: Map<string, string>,
  newSelectedObjects: SelectedObject[],
): Player[] {
  return players.map((orig) => {
    const newId = crypto.randomUUID();
    playerIdMap.set(orig.id, newId);
    newSelectedObjects.push({ id: newId, kind: 'player' });

    const cloned = structuredClone(orig);

    return {
      ...cloned,
      id: newId,
      x: Math.min(98, Math.max(2, orig.x + offsetX)),
      y: Math.min(98, Math.max(2, orig.y + offsetY)),
      visionCone: undefined,
      connectLines: [],
      badges: [],
      focus: undefined,
      trajectory: undefined,
    };
  });
}

function cloneAndOffsetArrows(
  arrows: ArrowAnnotation[],
  offsetX: number,
  offsetY: number,
  playerIdMap: Map<string, string>,
  newSelectedObjects: SelectedObject[],
): ArrowAnnotation[] {
  return arrows.map((orig) => {
    const newId = crypto.randomUUID();
    newSelectedObjects.push({ id: newId, kind: 'arrow' });

    const cloned = structuredClone(orig);
    const points = (cloned.points || []).map((pt) => ({
      x: Math.min(99, Math.max(1, pt.x + offsetX)),
      y: Math.min(99, Math.max(1, pt.y + offsetY)),
    }));

    const controlPoint = cloned.controlPoint
      ? {
          x: Math.min(99, Math.max(1, cloned.controlPoint.x + offsetX)),
          y: Math.min(99, Math.max(1, cloned.controlPoint.y + offsetY)),
        }
      : undefined;

    const sourcePlayerId =
      cloned.sourcePlayerId && playerIdMap.has(cloned.sourcePlayerId)
        ? playerIdMap.get(cloned.sourcePlayerId)
        : cloned.sourcePlayerId;

    const targetPlayerId =
      cloned.targetPlayerId && playerIdMap.has(cloned.targetPlayerId)
        ? playerIdMap.get(cloned.targetPlayerId)
        : cloned.targetPlayerId;

    return {
      ...cloned,
      id: newId,
      points,
      controlPoint,
      sourcePlayerId,
      targetPlayerId,
    };
  });
}

function cloneAndOffsetZones(
  zones: ZoneAnnotation[],
  offsetX: number,
  offsetY: number,
  newSelectedObjects: SelectedObject[],
): ZoneAnnotation[] {
  return zones.map((orig) => {
    const newId = crypto.randomUUID();
    newSelectedObjects.push({ id: newId, kind: 'zone' });

    const cloned = structuredClone(orig);
    const points = (cloned.points || []).map((pt) => ({
      x: Math.min(99, Math.max(1, pt.x + offsetX)),
      y: Math.min(99, Math.max(1, pt.y + offsetY)),
    }));

    const x =
      cloned.x !== undefined
        ? Math.min(98, Math.max(0, cloned.x + offsetX))
        : undefined;
    const y =
      cloned.y !== undefined
        ? Math.min(98, Math.max(0, cloned.y + offsetY))
        : undefined;

    return { ...cloned, id: newId, x, y, points };
  });
}

function cloneAndOffsetTexts(
  texts: TextAnnotation[],
  offsetX: number,
  offsetY: number,
  newSelectedObjects: SelectedObject[],
): TextAnnotation[] {
  return texts.map((orig) => {
    const newId = crypto.randomUUID();
    newSelectedObjects.push({ id: newId, kind: 'text' });
    const cloned = structuredClone(orig);
    return {
      ...cloned,
      id: newId,
      x: Math.min(98, Math.max(0, cloned.x + offsetX)),
      y: Math.min(98, Math.max(0, cloned.y + offsetY)),
    };
  });
}

export function cloneAndOffsetObjects(
  items: TacticalClipboard,
  offsetX = 3,
  offsetY = 3,
): {
  newPlayers: Player[];
  newArrows: ArrowAnnotation[];
  newZones: ZoneAnnotation[];
  newTexts: TextAnnotation[];
  newSelectedObjects: SelectedObject[];
} {
  const playerIdMap = new Map<string, string>();
  const newSelectedObjects: SelectedObject[] = [];

  const newPlayers = cloneAndOffsetPlayers(
    items.players,
    offsetX,
    offsetY,
    playerIdMap,
    newSelectedObjects,
  );
  const newArrows = cloneAndOffsetArrows(
    items.arrows,
    offsetX,
    offsetY,
    playerIdMap,
    newSelectedObjects,
  );
  const newZones = cloneAndOffsetZones(
    items.zones,
    offsetX,
    offsetY,
    newSelectedObjects,
  );
  const newTexts = cloneAndOffsetTexts(
    items.texts,
    offsetX,
    offsetY,
    newSelectedObjects,
  );

  return {
    newPlayers,
    newArrows,
    newZones,
    newTexts,
    newSelectedObjects,
  };
}
