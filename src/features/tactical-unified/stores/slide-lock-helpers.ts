import type { Slide } from '@/lib/types/tactical-unified';
import type { SelectedObjectKind } from './tool-slice';

export function toggleSlideObjectLock(
  slide: Slide,
  objectId: string,
  kind: SelectedObjectKind,
): Slide {
  switch (kind) {
    case 'player':
      return {
        ...slide,
        players: slide.players.map((p) =>
          p.id === objectId ? { ...p, locked: !p.locked } : p,
        ),
      };
    case 'arrow':
      return {
        ...slide,
        arrows: slide.arrows.map((a) =>
          a.id === objectId ? { ...a, locked: !a.locked } : a,
        ),
      };
    case 'zone':
      return {
        ...slide,
        zones: slide.zones.map((z) =>
          z.id === objectId ? { ...z, locked: !z.locked } : z,
        ),
      };
    case 'text':
      return {
        ...slide,
        texts: slide.texts.map((t) =>
          t.id === objectId ? { ...t, locked: !t.locked } : t,
        ),
      };
    case 'ball':
      return {
        ...slide,
        ball: { ...slide.ball, locked: !slide.ball.locked },
      };
    default:
      return slide;
  }
}
