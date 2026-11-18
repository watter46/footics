import { act, renderHook } from '@testing-library/react';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  TacticalStoreProvider,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import {
  resolveEffectiveDragSelectedIds,
  type UseObjectDragLifecycleOptions,
  useObjectDragLifecycle,
} from '../use-object-drag-lifecycle';

function createDragEvent(shiftKey = false): KonvaEventObject<DragEvent> {
  return {
    cancelBubble: false,
    evt: { shiftKey } as unknown as DragEvent,
  } as unknown as KonvaEventObject<DragEvent>;
}

function createWrapper(initialHudOpen = true) {
  return function Wrapper({ children }: { readonly children: ReactNode }) {
    return (
      <TacticalStoreProvider initialSession={{ isHudOpen: initialHudOpen }}>
        {children}
      </TacticalStoreProvider>
    );
  };
}

describe('useObjectDragLifecycle', () => {
  it('case 1: 未選択で beginDrag すると isDragging=true, session.isDragging=true, isHudOpen=false, onSelect(false, e) が呼ばれ、endDrag で戻る', () => {
    const onSelect = vi.fn();
    const dragEvent = createDragEvent(false);

    const { result } = renderHook(
      () => {
        const lifecycle = useObjectDragLifecycle({
          isSelected: false,
          onSelect,
        });
        const sessionIsDragging = useSessionStore((s) => s.isDragging);
        const isHudOpen = useSessionStore((s) => s.isHudOpen);
        return { lifecycle, sessionIsDragging, isHudOpen };
      },
      { wrapper: createWrapper(true) },
    );

    act(() => {
      result.current.lifecycle.beginDrag(dragEvent);
    });

    expect(dragEvent.cancelBubble).toBe(true);
    expect(result.current.lifecycle.isDragging).toBe(true);
    expect(result.current.sessionIsDragging).toBe(true);
    expect(result.current.isHudOpen).toBe(false);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(false, dragEvent);

    act(() => {
      result.current.lifecycle.endDrag();
    });

    expect(result.current.lifecycle.isDragging).toBe(false);
    expect(result.current.sessionIsDragging).toBe(false);
    expect(result.current.isHudOpen).toBe(false);
  });

  it('case 2: 選択済みで beginDrag すると onSelect は呼ばれず、reopenHudOnEnd=true 時は endDrag で isHudOpen=true になる', () => {
    const onSelect = vi.fn();
    const dragEvent = createDragEvent(true);
    const options: UseObjectDragLifecycleOptions = {
      isSelected: true,
      onSelect,
      reopenHudOnEnd: true,
    };

    const { result } = renderHook(
      () => {
        const lifecycle = useObjectDragLifecycle(options);
        const isHudOpen = useSessionStore((s) => s.isHudOpen);
        return { lifecycle, isHudOpen };
      },
      { wrapper: createWrapper(true) },
    );

    act(() => {
      result.current.lifecycle.beginDrag(dragEvent);
    });

    expect(onSelect).not.toHaveBeenCalled();
    expect(result.current.isHudOpen).toBe(false);

    act(() => {
      result.current.lifecycle.endDrag();
    });

    expect(result.current.isHudOpen).toBe(true);
  });

  it('case 3: resolveEffectiveDragSelectedIds が選択状態と Shift キーに応じて正しく解決する', () => {
    expect(resolveEffectiveDragSelectedIds(['p1'], 'p2', true)).toEqual([
      'p1',
      'p2',
    ]);
    expect(resolveEffectiveDragSelectedIds(['p1'], 'p2', false)).toEqual([
      'p2',
    ]);
    expect(resolveEffectiveDragSelectedIds(['p1', 'p2'], 'p1', false)).toEqual([
      'p1',
      'p2',
    ]);
  });
});
