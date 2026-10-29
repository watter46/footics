import type { SelectedObject } from '../core/types';
import { selectActiveSlide } from '../stores/tactical-unified-selectors';
import type { TacticalUnifiedState } from '../stores/tactical-unified-store';

export function resolveSelectedObjectFromId(
  s: TacticalUnifiedState,
  id: string,
): SelectedObject {
  if (id === 'ball' || id.startsWith('ball')) {
    return { id, kind: 'ball' };
  }
  const slide = selectActiveSlide(s);
  if (slide?.arrows.some((a) => a.id === id)) {
    return { id, kind: 'arrow' };
  }
  if (slide?.zones.some((z) => z.id === id)) {
    return { id, kind: 'zone' };
  }
  if (slide?.texts.some((t) => t.id === id)) {
    return { id, kind: 'text' };
  }
  return { id, kind: 'player' };
}

export function executeRemoveSelected(s: TacticalUnifiedState) {
  s.deleteSelectedObjects(s.activeSlideId);
}
