import { act, renderHook } from '@testing-library/react';
import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBallDrag } from '@/features/tactical-unified/objects/ball/hooks/use-ball-drag';
import {
  TacticalStoreProvider,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import {
  clampToScreenNorm,
  type StagePixel,
} from '@/lib/types/tactical/branded';
import type { DomainPlayer } from '@/lib/types/tactical/domain-entities';
import { useMarkerDragHandlers } from '../use-marker-drag-handlers';

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <TacticalStoreProvider>{children}</TacticalStoreProvider>;
  };
}

function createMockKonvaDragEvent(x: number, y: number) {
  const node = {
    x: () => x,
    y: () => y,
    scale: vi.fn(),
    moveToTop: vi.fn(),
    getStage: () => null,
    getLayer: () => null,
  };
  return {
    target: node,
    currentTarget: node,
    evt: {},
  } as unknown as KonvaEventObject<DragEvent>;
}

describe('drag rAF throttling (useMarkerDragHandlers & useBallDrag)', () => {
  let rafCallbacks: Map<number, FrameRequestCallback>;
  let nextRafId: number;

  beforeEach(() => {
    rafCallbacks = new Map();
    nextRafId = 1;
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
      const id = nextRafId++;
      rafCallbacks.set(id, cb);
      return id;
    });
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id) => {
      rafCallbacks.delete(id);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const flushAllRaf = () => {
    const entries = Array.from(rafCallbacks.entries());
    rafCallbacks.clear();
    for (const [, cb] of entries) {
      cb(performance.now());
    }
  };

  it('case 1: 1フレーム内の連続 handleMarkerDragMove は rAF 発火時に最後の座標 1 回のみ反映される', () => {
    const marker = {
      id: 'p1',
      area: 'pitch',
      team: 'home',
      number: 10,
      name: 'Player 10',
      x: clampToScreenNorm(50, 0, 100),
      y: clampToScreenNorm(50, 0, 100),
      connectLines: [],
      badges: [],
      style: { markerType: 'circle', color: '#ff0000' },
    } as unknown as DomainPlayer;

    const { result } = renderHook(
      () => {
        const handlers = useMarkerDragHandlers({
          pitchRect: {
            x: 0 as StagePixel,
            y: 0 as StagePixel,
            width: 1000 as StagePixel,
            height: 500 as StagePixel,
          },
          visibleMarkers: [marker],
          selectedIds: ['p1'],
          selectObject: vi.fn(),
          updateMarker: vi.fn(),
          updateMarkers: vi.fn(),
          setIsDragging: vi.fn(),
          setIsHudOpen: vi.fn(),
        });
        const activeDragDelta = useSessionStore((s) => s.activeDragDelta);
        return { handlers, activeDragDelta };
      },
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.handlers.handleDragStart(
        createMockKonvaDragEvent(500, 250),
        'p1',
      );
      result.current.handlers.handleMarkerDragMove(
        createMockKonvaDragEvent(510, 255),
        'p1',
      );
      result.current.handlers.handleMarkerDragMove(
        createMockKonvaDragEvent(550, 275),
        'p1',
      );
      result.current.handlers.handleMarkerDragMove(
        createMockKonvaDragEvent(600, 300),
        'p1',
      );
    });

    // rAF 発火前は activeDragDelta が更新されない
    expect(result.current.activeDragDelta).toBeNull();
    expect(globalThis.requestAnimationFrame).toHaveBeenCalledTimes(1);

    act(() => {
      flushAllRaf();
    });

    // rAF 発火時に最後の座標 (600, 300 -> norm 60, 60 -> delta +10, +10) のみ反映される
    expect(result.current.activeDragDelta).toEqual({
      entityIds: ['p1'],
      deltaScreenNormX: 10,
      deltaScreenNormY: 10,
    });
  });

  it('case 2: rAF 発火前に handleDragEnd を呼ぶと未実行の rAF がキャンセルされ null が維持される', () => {
    const marker = {
      id: 'p1',
      area: 'pitch',
      team: 'home',
      number: 10,
      name: 'Player 10',
      x: clampToScreenNorm(50, 0, 100),
      y: clampToScreenNorm(50, 0, 100),
      connectLines: [],
      badges: [],
      style: { markerType: 'circle', color: '#ff0000' },
    } as unknown as DomainPlayer;

    const { result } = renderHook(
      () => {
        const handlers = useMarkerDragHandlers({
          pitchRect: {
            x: 0 as StagePixel,
            y: 0 as StagePixel,
            width: 1000 as StagePixel,
            height: 500 as StagePixel,
          },
          visibleMarkers: [marker],
          selectedIds: ['p1'],
          selectObject: vi.fn(),
          updateMarker: vi.fn(),
          updateMarkers: vi.fn(),
          setIsDragging: vi.fn(),
          setIsHudOpen: vi.fn(),
        });
        const activeDragDelta = useSessionStore((s) => s.activeDragDelta);
        return { handlers, activeDragDelta };
      },
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.handlers.handleDragStart(
        createMockKonvaDragEvent(500, 250),
        'p1',
      );
      result.current.handlers.handleMarkerDragMove(
        createMockKonvaDragEvent(600, 300),
        'p1',
      );
      result.current.handlers.handleDragEnd(
        createMockKonvaDragEvent(600, 300),
        marker,
      );
    });

    expect(globalThis.cancelAnimationFrame).toHaveBeenCalledTimes(1);
    expect(result.current.activeDragDelta).toBeNull();

    // 後に rAF が進んでも上書きされない
    act(() => {
      flushAllRaf();
    });
    expect(result.current.activeDragDelta).toBeNull();
  });

  it('case 3: useBallDrag でも連続 handleDragMove が 1 フレーム 1 回に統合され handleDragEnd でキャンセルされる', () => {
    const { result } = renderHook(
      () => {
        const ballDrag = useBallDrag({
          stageSize: { width: 1000, height: 500 },
        });
        const activeDragDelta = useSessionStore((s) => s.activeDragDelta);
        return { ballDrag, activeDragDelta };
      },
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.ballDrag.handleDragStart(
        createMockKonvaDragEvent(500, 250),
      );
      result.current.ballDrag.handleDragMove(
        createMockKonvaDragEvent(600, 300),
      );
      result.current.ballDrag.handleDragMove(
        createMockKonvaDragEvent(700, 350),
      );
    });

    expect(result.current.activeDragDelta).toBeNull();
    expect(globalThis.requestAnimationFrame).toHaveBeenCalledTimes(1);

    act(() => {
      flushAllRaf();
    });

    expect(result.current.activeDragDelta).toEqual({
      entityIds: ['ball'],
      deltaScreenNormX: 20,
      deltaScreenNormY: 20,
    });

    act(() => {
      result.current.ballDrag.handleDragMove(
        createMockKonvaDragEvent(750, 375),
      );
      result.current.ballDrag.handleDragEnd(createMockKonvaDragEvent(750, 375));
    });

    expect(globalThis.cancelAnimationFrame).toHaveBeenCalledTimes(1);
    expect(result.current.activeDragDelta).toBeNull();
  });
});
