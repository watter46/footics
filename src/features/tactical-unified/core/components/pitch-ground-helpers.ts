import type { KonvaEventObject } from 'konva/lib/Node';

export type KonvaClickEvent = KonvaEventObject<MouseEvent | TouchEvent>;

export function sortBySelectedIds<T extends { id: string }>(
  items: readonly T[],
  selectedIds: readonly string[],
): readonly T[] {
  if (selectedIds.length === 0) return items;
  return [...items].sort(
    (a, b) =>
      Number(selectedIds.includes(a.id)) - Number(selectedIds.includes(b.id)),
  );
}

export function buildSelectHandlerMap<T extends { id: string }>(
  items: readonly T[],
  kind: 'zone' | 'arrow',
  selectObject: (
    obj: { id: string; kind: 'zone' | 'arrow' },
    multi: boolean,
  ) => void,
  setIsHudOpen: (open: boolean) => void,
): Map<string, (e: KonvaClickEvent) => void> {
  const map = new Map<string, (e: KonvaClickEvent) => void>();
  for (const item of items) {
    map.set(item.id, (e: KonvaClickEvent) => {
      e.cancelBubble = true;
      selectObject(
        { id: item.id, kind },
        (e.evt as MouseEvent)?.shiftKey ?? false,
      );
      setIsHudOpen(true);
    });
  }
  return map;
}
