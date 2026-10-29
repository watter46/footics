import type { CanvasClipboard } from '../core/types';
import { selectActiveSlide } from '../stores/tactical-unified-selectors';
import type { TacticalUnifiedState } from '../stores/tactical-unified-store';

export function createAdapterClipboardHelpers(
  getState: () => TacticalUnifiedState,
  getClipboard: () => CanvasClipboard | null,
  setClipboard: (cb: CanvasClipboard) => void,
) {
  return {
    copySelectedObjects: () => {
      const s = getState();
      const slide = selectActiveSlide(s);
      if (!slide) return;
      const selectedSet = new Set(s.selectedObjects.map((o) => o.id));
      setClipboard({
        markers: slide.players.filter((p) => selectedSet.has(p.id)),
        arrows: slide.arrows.filter((a) => selectedSet.has(a.id)),
        zones: slide.zones.filter((z) => selectedSet.has(z.id)),
        texts: slide.texts.filter((t) => selectedSet.has(t.id)),
      });
    },
    pasteObjects: () => {
      const clipboard = getClipboard();
      if (!clipboard) return;
      const s = getState();
      const currentSlideId = s.activeSlideId;
      for (const m of clipboard.markers) {
        s.addPlayer({
          ...m,
          id: `${m.id}-copy-${Date.now()}`,
          x: m.x + 2,
          y: m.y + 2,
        });
      }
      for (const a of clipboard.arrows) {
        s.addArrow(currentSlideId, {
          ...a,
          id: `${a.id}-copy-${Date.now()}`,
          points: a.points.map((pt) => ({ x: pt.x + 2, y: pt.y + 2 })),
        });
      }
      for (const z of clipboard.zones) {
        s.addZone(currentSlideId, {
          ...z,
          id: `${z.id}-copy-${Date.now()}`,
          points: z.points
            ? z.points.map((pt) => ({ x: pt.x + 2, y: pt.y + 2 }))
            : [],
        });
      }
      for (const t of clipboard.texts) {
        s.addText(currentSlideId, {
          ...t,
          id: `${t.id}-copy-${Date.now()}`,
          x: t.x + 2,
          y: t.y + 2,
        });
      }
    },
    duplicateSelectedObjects: () => {
      const s = getState();
      const slide = selectActiveSlide(s);
      if (!slide) return;
      const selectedSet = new Set(s.selectedObjects.map((o) => o.id));
      const currentSlideId = s.activeSlideId;
      for (const m of slide.players.filter((p) => selectedSet.has(p.id))) {
        s.addPlayer({
          ...m,
          id: `${m.id}-copy-${Date.now()}`,
          x: m.x + 2,
          y: m.y + 2,
        });
      }
      for (const a of slide.arrows.filter((a) => selectedSet.has(a.id))) {
        s.addArrow(currentSlideId, {
          ...a,
          id: `${a.id}-copy-${Date.now()}`,
          points: a.points.map((pt) => ({ x: pt.x + 2, y: pt.y + 2 })),
        });
      }
    },
  };
}
