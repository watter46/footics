import type { KonvaEventObject } from 'konva/lib/Node';
import { useCallback, useState } from 'react';
import { useSessionStore } from '@/features/tactical-unified/stores/tactical-store-provider';

export interface UseObjectDragLifecycleOptions {
  readonly isSelected: boolean;
  readonly onSelect?: (
    isShift: boolean,
    e: KonvaEventObject<DragEvent>,
  ) => void;
  readonly reopenHudOnEnd?: boolean;
  readonly cancelBubble?: boolean;
}

export interface UseObjectDragLifecycleResult {
  readonly isDragging: boolean;
  readonly beginDrag: (e: KonvaEventObject<DragEvent>) => void;
  readonly endDrag: () => void;
}

export function resolveEffectiveDragSelectedIds(
  selectedIds: readonly string[],
  targetId: string,
  isShift: boolean,
): readonly string[] {
  if (selectedIds.includes(targetId)) {
    return selectedIds;
  }
  return isShift ? [...selectedIds, targetId] : [targetId];
}

export function useObjectDragLifecycle(
  options: UseObjectDragLifecycleOptions,
): UseObjectDragLifecycleResult {
  const {
    isSelected,
    onSelect,
    reopenHudOnEnd = false,
    cancelBubble = true,
  } = options;

  const setSessionIsDragging = useSessionStore((s) => s.setIsDragging);
  const setIsHudOpen = useSessionStore((s) => s.setIsHudOpen);
  const [isDragging, setIsDragging] = useState(false);

  const beginDrag = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      if (cancelBubble) {
        e.cancelBubble = true;
      }
      setSessionIsDragging(true);
      setIsHudOpen(false);
      setIsDragging(true);

      if (!isSelected && onSelect) {
        const isShift = Boolean((e.evt as MouseEvent | undefined)?.shiftKey);
        onSelect(isShift, e);
      }
    },
    [cancelBubble, isSelected, onSelect, setIsHudOpen, setSessionIsDragging],
  );

  const endDrag = useCallback(() => {
    setSessionIsDragging(false);
    setIsDragging(false);
    if (reopenHudOnEnd) {
      setIsHudOpen(true);
    }
  }, [reopenHudOnEnd, setIsHudOpen, setSessionIsDragging]);

  return {
    isDragging,
    beginDrag,
    endDrag,
  };
}
