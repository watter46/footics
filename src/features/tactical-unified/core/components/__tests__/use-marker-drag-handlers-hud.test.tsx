import { act, renderHook } from '@testing-library/react';
import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import { useContext } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  TacticalStoreProvider,
  TacticalStoresContext,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import type { DomainPlayer } from '@/lib/types/tactical/domain-entities';
import { useMarkerDragHandlers } from '../use-marker-drag-handlers';

const TEST_MARKER: DomainPlayer = {
  id: 'player-1',
  team: 'home',
  area: 'pitch',
  x: 50 as DomainPlayer['x'],
  y: 50 as DomainPlayer['y'],
  style: {
    markerType: 'circle',
    insideContent: 'number',
    bottomLabel: 'none',
    color: '#ef4444',
    strokeColor: '#ffffff',
    strokeWidth: 2,
    sizeScale: 1,
    numberSizeScale: 1,
    labelSizeScale: 1,
  },
  connectLines: [],
  badges: [],
};

function createDragEvent(
  options: { x?: number; y?: number; shiftKey?: boolean } = {},
): KonvaEventObject<DragEvent> {
  const { x = 500, y = 300, shiftKey = false } = options;
  return {
    evt: { shiftKey } as unknown as DragEvent,
    target: {
      x: () => x,
      y: () => y,
      getLayer: () => null,
      getStage: () => null,
    },
  } as unknown as KonvaEventObject<DragEvent>;
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TacticalStoreProvider>{children}</TacticalStoreProvider>
);

describe('useMarkerDragHandlers HUD behavior', () => {
  it('keeps isHudOpen false when dragging an unselected marker', () => {
    const { result } = renderHook(
      () => {
        const stores = useContext(TacticalStoresContext);
        if (!stores) throw new Error('TacticalStoresContext not found');
        const handlers = useMarkerDragHandlers({
          pitchRect: { x: 0, y: 0, width: 1000, height: 600 },
          visibleMarkers: [TEST_MARKER],
          selectedIds: [],
          selectObject: (target, isShift) => {
            const obj =
              typeof target === 'string'
                ? { id: target, kind: 'player' as const }
                : target;
            stores.sessionStore.getState().selectObject(obj, isShift);
          },
          updateMarker: vi.fn(),
          updateMarkers: vi.fn(),
          setIsDragging: (v) => stores.sessionStore.getState().setIsDragging(v),
          setIsHudOpen: (v) => stores.sessionStore.getState().setIsHudOpen(v),
        });
        return { stores, handlers };
      },
      { wrapper },
    );

    act(() => {
      result.current.handlers.handleDragStart(
        createDragEvent(),
        TEST_MARKER.id,
      );
    });

    const state = result.current.stores.sessionStore.getState();
    expect(state.selectedObjects).toEqual([
      { id: TEST_MARKER.id, kind: 'player' },
    ]);
    expect(state.isDragging).toBe(true);
    expect(state.isHudOpen).toBe(false);
  });

  it('keeps isHudOpen false after handleDragEnd', () => {
    const { result } = renderHook(
      () => {
        const stores = useContext(TacticalStoresContext);
        if (!stores) throw new Error('TacticalStoresContext not found');
        const handlers = useMarkerDragHandlers({
          pitchRect: { x: 0, y: 0, width: 1000, height: 600 },
          visibleMarkers: [TEST_MARKER],
          selectedIds: [TEST_MARKER.id],
          selectObject: (target, isShift) => {
            const obj =
              typeof target === 'string'
                ? { id: target, kind: 'player' as const }
                : target;
            stores.sessionStore.getState().selectObject(obj, isShift);
          },
          updateMarker: vi.fn(),
          updateMarkers: vi.fn(),
          setIsDragging: (v) => stores.sessionStore.getState().setIsDragging(v),
          setIsHudOpen: (v) => stores.sessionStore.getState().setIsHudOpen(v),
        });
        return { stores, handlers };
      },
      { wrapper },
    );

    act(() => {
      result.current.stores.sessionStore.getState().setIsHudOpen(true);
      result.current.handlers.handleDragStart(
        createDragEvent(),
        TEST_MARKER.id,
      );
    });

    expect(result.current.stores.sessionStore.getState().isHudOpen).toBe(false);

    act(() => {
      result.current.handlers.handleDragEnd(createDragEvent(), TEST_MARKER);
    });

    const state = result.current.stores.sessionStore.getState();
    expect(state.isDragging).toBe(false);
    expect(state.isHudOpen).toBe(false);
  });

  it('selects unselected marker with shiftKey and moves all selected markers together', () => {
    const p1: DomainPlayer = {
      ...TEST_MARKER,
      id: 'p1',
      x: 20 as DomainPlayer['x'],
      y: 20 as DomainPlayer['y'],
    };
    const p2: DomainPlayer = {
      ...TEST_MARKER,
      id: 'p2',
      x: 50 as DomainPlayer['x'],
      y: 50 as DomainPlayer['y'],
    };
    const selectObjectSpy = vi.fn();
    const updateMarkerSpy = vi.fn();
    const updateMarkersSpy = vi.fn();

    const { result } = renderHook(
      () => {
        const stores = useContext(TacticalStoresContext);
        if (!stores) throw new Error('TacticalStoresContext not found');
        return useMarkerDragHandlers({
          pitchRect: { x: 0, y: 0, width: 1000, height: 600 },
          visibleMarkers: [p1, p2],
          selectedIds: ['p1'],
          selectObject: (target, isShift) => {
            selectObjectSpy(target, isShift);
            const obj =
              typeof target === 'string'
                ? { id: target, kind: 'player' as const }
                : target;
            stores.sessionStore.getState().selectObject(obj, isShift);
          },
          updateMarker: updateMarkerSpy,
          updateMarkers: updateMarkersSpy,
          setIsDragging: (v) => stores.sessionStore.getState().setIsDragging(v),
          setIsHudOpen: (v) => stores.sessionStore.getState().setIsHudOpen(v),
        });
      },
      { wrapper },
    );

    act(() => {
      result.current.handleDragStart(
        createDragEvent({ x: 500, y: 300, shiftKey: true }),
        'p2',
      );
      result.current.handleMarkerDragMove(
        createDragEvent({ x: 600, y: 360, shiftKey: true }),
        'p2',
      );
      result.current.handleDragEnd(
        createDragEvent({ x: 600, y: 360, shiftKey: true }),
        p2,
      );
    });

    expect(selectObjectSpy).toHaveBeenCalledWith('p2', true);
    expect(updateMarkerSpy).not.toHaveBeenCalled();
    expect(updateMarkersSpy).toHaveBeenCalledTimes(1);
    const updates = updateMarkersSpy.mock.calls[0]?.[0] as {
      id: string;
      patch: Partial<DomainPlayer>;
    }[];
    expect(updates.map((u) => u.id)).toEqual(['p1', 'p2']);
  });
});
