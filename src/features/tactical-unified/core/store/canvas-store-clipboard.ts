import type { StoreApi } from 'zustand/vanilla';
import type {
  ArrowAnnotation,
  Player,
  TextAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';
import type {
  CanvasActions,
  CanvasClipboard,
  CanvasStore,
  SelectedObject,
} from '../types';

type SetState = StoreApi<CanvasStore>['setState'];
type GetState = StoreApi<CanvasStore>['getState'];

const OFFSET = 2.0;

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createClipboardActions(
  set: SetState,
  get: GetState,
  pushHistory: () => void,
): Pick<
  CanvasActions,
  'copySelectedObjects' | 'pasteObjects' | 'duplicateSelectedObjects'
> {
  const extractSelected = (): CanvasClipboard | null => {
    const { annotations, selectedObjects, selectedIds } = get();
    const idSet = new Set(
      selectedObjects.length > 0
        ? selectedObjects.map((o) => o.id)
        : selectedIds,
    );
    if (idSet.size === 0) return null;

    const markers = annotations.markers.filter((m) => idSet.has(m.id));
    const arrows = annotations.arrows.filter((a) => idSet.has(a.id));
    const zones = annotations.zones.filter((z) => idSet.has(z.id));
    const texts = annotations.texts.filter((t) => idSet.has(t.id));

    if (
      markers.length === 0 &&
      arrows.length === 0 &&
      zones.length === 0 &&
      texts.length === 0
    ) {
      return null;
    }

    return {
      markers: structuredClone(markers),
      arrows: structuredClone(arrows),
      zones: structuredClone(zones),
      texts: structuredClone(texts),
    };
  };

  const pasteClipboard = (clipboard: CanvasClipboard) => {
    pushHistory();
    const newSelectedObjects: SelectedObject[] = [];
    const newSelectedIds: string[] = [];

    const newMarkers: Player[] = clipboard.markers.map((m) => {
      const id = generateId('marker');
      newSelectedObjects.push({ id, kind: 'player' });
      newSelectedIds.push(id);
      return { ...m, id, x: m.x + OFFSET, y: m.y + OFFSET };
    });

    const newArrows: ArrowAnnotation[] = clipboard.arrows.map((a) => {
      const id = generateId('arrow');
      newSelectedObjects.push({ id, kind: 'arrow' });
      newSelectedIds.push(id);
      return {
        ...a,
        id,
        points: a.points.map((pt) => ({ x: pt.x + OFFSET, y: pt.y + OFFSET })),
      };
    });

    const newZones: ZoneAnnotation[] = clipboard.zones.map((z) => {
      const id = generateId('zone');
      newSelectedObjects.push({ id, kind: 'zone' });
      newSelectedIds.push(id);
      return {
        ...z,
        id,
        x: z.x !== undefined ? z.x + OFFSET : undefined,
        y: z.y !== undefined ? z.y + OFFSET : undefined,
        points: z.points?.map((pt) => ({ x: pt.x + OFFSET, y: pt.y + OFFSET })),
      };
    });

    const newTexts: TextAnnotation[] = clipboard.texts.map((t) => {
      const id = generateId('text');
      newSelectedObjects.push({ id, kind: 'text' });
      newSelectedIds.push(id);
      return { ...t, id, x: t.x + OFFSET, y: t.y + OFFSET };
    });

    set((s) => ({
      annotations: {
        markers: [...s.annotations.markers, ...newMarkers],
        arrows: [...s.annotations.arrows, ...newArrows],
        zones: [...s.annotations.zones, ...newZones],
        texts: [...s.annotations.texts, ...newTexts],
      },
      selectedObjects: newSelectedObjects,
      selectedIds: newSelectedIds,
    }));
  };

  return {
    copySelectedObjects: () => {
      const extracted = extractSelected();
      if (!extracted) return;
      set({ clipboard: extracted });
    },
    pasteObjects: () => {
      const { clipboard } = get();
      if (!clipboard) return;
      pasteClipboard(clipboard);
    },
    duplicateSelectedObjects: () => {
      const extracted = extractSelected();
      if (!extracted) return;
      set({ clipboard: extracted });
      pasteClipboard(extracted);
    },
  };
}
