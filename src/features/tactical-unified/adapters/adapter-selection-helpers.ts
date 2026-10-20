import type { SelectedObject } from '../core/types';
import type { TacticalUnifiedState } from '../stores/tactical-unified-store';

export function resolveSelectedObjectFromId(
  s: TacticalUnifiedState,
  id: string,
): SelectedObject {
  if (id === 'ball' || id.startsWith('ball')) {
    return { id, kind: 'ball' };
  }
  const slide = s.project.slides.find((sl) => sl.id === s.activeSlideId);
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
  const slide = s.project.slides.find((sl) => sl.id === s.activeSlideId);
  for (const obj of s.selectedObjects) {
    switch (obj.kind) {
      case 'player':
        if (!slide?.players.find((p) => p.id === obj.id)?.locked) {
          s.removePlayer(s.activeSlideId, obj.id);
        }
        break;
      case 'arrow':
        if (!slide?.arrows.find((a) => a.id === obj.id)?.locked) {
          s.removeArrow(s.activeSlideId, obj.id);
        }
        break;
      case 'zone':
        if (!slide?.zones.find((z) => z.id === obj.id)?.locked) {
          s.removeZone(s.activeSlideId, obj.id);
        }
        break;
      case 'text':
        if (!slide?.texts.find((t) => t.id === obj.id)?.locked) {
          s.removeText(s.activeSlideId, obj.id);
        }
        break;
    }
  }
  s.clearSelection();
}
