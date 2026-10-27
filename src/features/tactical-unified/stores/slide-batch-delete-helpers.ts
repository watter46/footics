import type { Slide } from '@/lib/types/tactical-unified';
import type { SelectedObject, SelectedObjectKind } from './tool-slice';

export interface BatchDeleteResult {
  updatedSlide: Slide;
  remainingSelectedObjects: SelectedObject[];
  hasChanges: boolean;
}

export function executeBatchDeleteOnSlide(
  slide: Slide,
  selectedObjects: SelectedObject[],
): BatchDeleteResult {
  if (selectedObjects.length === 0) {
    return {
      updatedSlide: slide,
      remainingSelectedObjects: selectedObjects,
      hasChanges: false,
    };
  }

  const selectedMap = new Map<string, SelectedObjectKind>();
  for (const obj of selectedObjects) {
    selectedMap.set(obj.id, obj.kind);
  }

  const removablePlayerIds = new Set<string>();
  for (const p of slide.players) {
    if (selectedMap.get(p.id) === 'player' && !p.locked) {
      removablePlayerIds.add(p.id);
    }
  }

  const removableArrowIds = new Set<string>();
  for (const a of slide.arrows) {
    if (selectedMap.get(a.id) === 'arrow' && !a.locked) {
      removableArrowIds.add(a.id);
    }
  }

  const removableZoneIds = new Set<string>();
  for (const z of slide.zones) {
    if (selectedMap.get(z.id) === 'zone' && !z.locked) {
      removableZoneIds.add(z.id);
    }
  }

  const removableTextIds = new Set<string>();
  for (const t of slide.texts) {
    if (selectedMap.get(t.id) === 'text' && !t.locked) {
      removableTextIds.add(t.id);
    }
  }

  if (
    removablePlayerIds.size === 0 &&
    removableArrowIds.size === 0 &&
    removableZoneIds.size === 0 &&
    removableTextIds.size === 0
  ) {
    return {
      updatedSlide: slide,
      remainingSelectedObjects: selectedObjects,
      hasChanges: false,
    };
  }

  const updatedSlide: Slide = {
    ...slide,
    players: slide.players
      .filter((p) => !removablePlayerIds.has(p.id))
      .map((p) => ({
        ...p,
        connectLines: p.connectLines.filter(
          (cl) => !removablePlayerIds.has(cl.toPlayerId),
        ),
      })),
    arrows: slide.arrows.filter(
      (a) =>
        !removableArrowIds.has(a.id) &&
        !(a.sourcePlayerId && removablePlayerIds.has(a.sourcePlayerId)) &&
        !(a.targetPlayerId && removablePlayerIds.has(a.targetPlayerId)),
    ),
    zones: slide.zones.filter((z) => !removableZoneIds.has(z.id)),
    texts: slide.texts.filter((t) => !removableTextIds.has(t.id)),
  };

  const remainingSelectedObjects = selectedObjects.filter((obj) => {
    if (obj.kind === 'player') return !removablePlayerIds.has(obj.id);
    if (obj.kind === 'arrow') return !removableArrowIds.has(obj.id);
    if (obj.kind === 'zone') return !removableZoneIds.has(obj.id);
    if (obj.kind === 'text') return !removableTextIds.has(obj.id);
    return true;
  });

  return {
    updatedSlide,
    remainingSelectedObjects,
    hasChanges: true,
  };
}
