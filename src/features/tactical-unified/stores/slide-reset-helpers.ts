import type { BoundaryBox, Slide } from '@/lib/types/tactical-unified';
import type { SelectedObject } from './tool-slice';

export function resetSlideObjectsData(
  slide: Slide,
  defaultBox: BoundaryBox,
): Slide {
  return {
    ...slide,
    arrows: slide.arrows.filter((a) => a.locked),
    zones: slide.zones.filter((z) => z.locked),
    texts: slide.texts.filter((t) => t.locked),
    players: slide.players
      .filter((p) => p.locked || p.style.markerType !== 'ring')
      .map((p) => {
        if (p.locked) return p;
        return {
          ...p,
          visionCone: undefined,
          connectLines: [],
          badges: [],
          focus: undefined,
          trajectory: undefined,
        };
      }),
    boundaryBox: slide.boundaryBox ?? { ...defaultBox },
  };
}

function isSelectedObjectLocked(obj: SelectedObject, slide: Slide): boolean {
  switch (obj.kind) {
    case 'player':
      return Boolean(slide.players.find((p) => p.id === obj.id)?.locked);
    case 'arrow':
      return Boolean(slide.arrows.find((a) => a.id === obj.id)?.locked);
    case 'zone':
      return Boolean(slide.zones.find((z) => z.id === obj.id)?.locked);
    case 'text':
      return Boolean(slide.texts.find((t) => t.id === obj.id)?.locked);
    default:
      return false;
  }
}

export function filterLockedSelectedObjects(
  selectedObjects: SelectedObject[],
  slide: Slide | undefined,
): SelectedObject[] {
  if (!slide) return [];
  return selectedObjects.filter((o) => isSelectedObjectLocked(o, slide));
}
