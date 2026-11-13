import {
  clampToScreenNorm,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import type {
  DomainArrowAnnotation,
  DomainPlayer,
  DomainTextAnnotation,
  DomainZoneAnnotation,
} from '@/lib/types/tactical/domain-entities';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import type { EntityKind } from './commands';

export interface ClipboardSelectionRef {
  readonly id: string;
  readonly kind: string;
}

export interface DomainTacticalClipboard {
  readonly players: readonly DomainPlayer[];
  readonly arrows: readonly DomainArrowAnnotation[];
  readonly zones: readonly DomainZoneAnnotation[];
  readonly texts: readonly DomainTextAnnotation[];
}

export interface ClonedClipboardResult {
  readonly players: readonly DomainPlayer[];
  readonly arrows: readonly DomainArrowAnnotation[];
  readonly zones: readonly DomainZoneAnnotation[];
  readonly texts: readonly DomainTextAnnotation[];
  readonly selectedRefs: readonly {
    readonly id: string;
    readonly kind: EntityKind;
  }[];
}

export function extractSelectedObjects(
  slide: DomainSlide,
  selectedObjects: readonly ClipboardSelectionRef[],
): DomainTacticalClipboard {
  const selectedKindById = new Map<string, string>();
  for (const obj of selectedObjects) {
    selectedKindById.set(obj.id, obj.kind);
  }

  return {
    players: slide.players
      .filter((p) => selectedKindById.get(p.id) === 'player')
      .map((p) => structuredClone(p)),
    arrows: slide.arrows
      .filter((a) => selectedKindById.get(a.id) === 'arrow')
      .map((a) => structuredClone(a)),
    zones: slide.zones
      .filter((z) => selectedKindById.get(z.id) === 'zone')
      .map((z) => structuredClone(z)),
    texts: slide.texts
      .filter((t) => selectedKindById.get(t.id) === 'text')
      .map((t) => structuredClone(t)),
  };
}

function cloneAndOffsetPlayers(
  players: readonly DomainPlayer[],
  offsetX: number,
  offsetY: number,
  playerIdMap: Map<string, string>,
  selectedRefs: { id: string; kind: EntityKind }[],
): DomainPlayer[] {
  return players.map((orig) => {
    const newId = crypto.randomUUID();
    playerIdMap.set(orig.id, newId);
    selectedRefs.push({ id: newId, kind: 'player' });

    const cloned = structuredClone(orig);
    const x = clampToScreenNorm(orig.x + offsetX, 2, 98);
    const y = clampToScreenNorm(orig.y + offsetY, 2, 98);

    if (cloned.area === 'bench') {
      return { ...cloned, id: newId, x, y };
    }

    return {
      ...cloned,
      id: newId,
      x,
      y,
      visionCone: undefined,
      connectLines: [],
      badges: [],
      focus: undefined,
      trajectory: undefined,
    };
  });
}

function cloneAndOffsetArrows(
  arrows: readonly DomainArrowAnnotation[],
  offsetX: number,
  offsetY: number,
  playerIdMap: ReadonlyMap<string, string>,
  selectedRefs: { id: string; kind: EntityKind }[],
): DomainArrowAnnotation[] {
  return arrows.map((orig) => {
    const newId = crypto.randomUUID();
    selectedRefs.push({ id: newId, kind: 'arrow' });

    const cloned = structuredClone(orig);
    const points = cloned.points.map((pt) =>
      toScreenNormPoint(
        Math.min(99, Math.max(1, pt.x + offsetX)),
        Math.min(99, Math.max(1, pt.y + offsetY)),
        true,
      ),
    );
    const controlPoint = cloned.controlPoint
      ? toScreenNormPoint(
          Math.min(99, Math.max(1, cloned.controlPoint.x + offsetX)),
          Math.min(99, Math.max(1, cloned.controlPoint.y + offsetY)),
          true,
        )
      : undefined;

    return {
      ...cloned,
      id: newId,
      points,
      controlPoint,
      sourcePlayerId:
        cloned.sourcePlayerId && playerIdMap.has(cloned.sourcePlayerId)
          ? playerIdMap.get(cloned.sourcePlayerId)
          : cloned.sourcePlayerId,
      targetPlayerId:
        cloned.targetPlayerId && playerIdMap.has(cloned.targetPlayerId)
          ? playerIdMap.get(cloned.targetPlayerId)
          : cloned.targetPlayerId,
    };
  });
}

function cloneAndOffsetZones(
  zones: readonly DomainZoneAnnotation[],
  offsetX: number,
  offsetY: number,
  selectedRefs: { id: string; kind: EntityKind }[],
): DomainZoneAnnotation[] {
  return zones.map((orig) => {
    const newId = crypto.randomUUID();
    selectedRefs.push({ id: newId, kind: 'zone' });

    const cloned = structuredClone(orig);
    if (cloned.shapeType === 'polygon') {
      return {
        ...cloned,
        id: newId,
        points: cloned.points.map((pt) =>
          toScreenNormPoint(
            Math.min(99, Math.max(1, pt.x + offsetX)),
            Math.min(99, Math.max(1, pt.y + offsetY)),
            true,
          ),
        ),
      };
    }

    return {
      ...cloned,
      id: newId,
      x: clampToScreenNorm(cloned.x + offsetX, 0, 98),
      y: clampToScreenNorm(cloned.y + offsetY, 0, 98),
    };
  });
}

export function cloneAndOffsetClipboard(
  clipboard: DomainTacticalClipboard,
  offsetX = 3,
  offsetY = 3,
): ClonedClipboardResult {
  const playerIdMap = new Map<string, string>();
  const selectedRefs: { id: string; kind: EntityKind }[] = [];

  const players = cloneAndOffsetPlayers(
    clipboard.players,
    offsetX,
    offsetY,
    playerIdMap,
    selectedRefs,
  );
  const arrows = cloneAndOffsetArrows(
    clipboard.arrows,
    offsetX,
    offsetY,
    playerIdMap,
    selectedRefs,
  );
  const zones = cloneAndOffsetZones(
    clipboard.zones,
    offsetX,
    offsetY,
    selectedRefs,
  );
  const texts = clipboard.texts.map((orig) => {
    const newId = crypto.randomUUID();
    selectedRefs.push({ id: newId, kind: 'text' });
    const cloned = structuredClone(orig);
    return {
      ...cloned,
      id: newId,
      x: clampToScreenNorm(cloned.x + offsetX, 0, 98),
      y: clampToScreenNorm(cloned.y + offsetY, 0, 98),
    };
  });

  return { players, arrows, zones, texts, selectedRefs };
}
