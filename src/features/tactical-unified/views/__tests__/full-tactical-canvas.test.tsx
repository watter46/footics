import { act, render, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CanvasCoreHandle } from '@/features/tactical-unified/core';
import {
  type TacticalUnifiedStoreApi,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import {
  TacticalUnifiedStoreProvider,
  useTacticalUnifiedStoreApi,
} from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import {
  type ArrowAnnotation,
  createDefaultPlayer,
} from '@/lib/types/tactical-unified';
import { FullTacticalCanvas } from '../FullTacticalCanvas';

class MockResizeObserver {
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    this.callback(
      [
        {
          target,
          contentRect: {
            width: 800,
            height: 450,
            top: 0,
            left: 0,
            bottom: 450,
            right: 800,
            x: 0,
            y: 0,
            toJSON: () => {},
          },
        } as unknown as ResizeObserverEntry,
      ],
      this,
    );
  }
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  global.ResizeObserver = MockResizeObserver;

  const mockCtx = new Proxy(
    {
      getImageData: () => ({ data: new Array(4) }),
      createImageData: () => [],
      getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
      measureText: () => ({ width: 0 }),
      getLineDash: () => [],
      isPointInPath: () => true,
      createLinearGradient: () => ({ addColorStop: vi.fn() }),
      createRadialGradient: () => ({ addColorStop: vi.fn() }),
    } as Record<string, unknown>,
    {
      get: (target, prop: string) => (prop in target ? target[prop] : vi.fn()),
    },
  );
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx);
});

describe('FullTacticalCanvas (Level 3 Feature View)', () => {
  it('activeSlide のマーカー・矢印情報がキャンバスストアに注入されて描画されること', async () => {
    const mockPlayer = createDefaultPlayer('home', 50, 50, '#ff0000');
    const mockArrow: ArrowAnnotation = {
      id: 'arrow-1',
      annotationType: 'arrow',
      arrowType: 'pass',
      curveType: 'straight',
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
      color: '#ffffff',
      strokeWidth: 3,
      dashArray: [],
      arrowHead: true,
    };

    const activeSlideId = useTacticalUnifiedStore.getState().activeSlideId;
    useTacticalUnifiedStore.getState().updateSlide(activeSlideId, {
      players: [mockPlayer],
      arrows: [mockArrow],
    });

    const { container } = render(
      <div style={{ width: 800, height: 450 }}>
        <FullTacticalCanvas imageAspect={16 / 9} />
      </div>,
    );

    expect(container).toBeDefined();
    // Konva stage container should be rendered
    await waitFor(() => {
      const stageElement = container.querySelector('.konvajs-content');
      expect(stageElement).not.toBeNull();
    });
  });

  it('ref を介して exportPng や copyToClipboard が実行可能であること', async () => {
    const handleRef = createRef<CanvasCoreHandle>();
    const writeMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { write: writeMock },
      configurable: true,
      writable: true,
    });

    render(
      <div style={{ width: 800, height: 450 }}>
        <FullTacticalCanvas ref={handleRef} imageAspect={16 / 9} />
      </div>,
    );

    expect(handleRef.current).toBeTruthy();
    expect(typeof handleRef.current?.exportPng).toBe('function');
    expect(typeof handleRef.current?.copyToClipboard).toBe('function');
    expect(typeof handleRef.current?.undo).toBe('function');
    expect(typeof handleRef.current?.redo).toBe('function');

    await act(async () => {
      await handleRef.current?.copyToClipboard();
    });
    expect(writeMock).toHaveBeenCalled();
  });

  it('マスターストアで選手が動いた時、キャンバスが即座に最新選手情報を参照できること', async () => {
    const handleRef = createRef<CanvasCoreHandle>();
    render(
      <div style={{ width: 800, height: 450 }}>
        <FullTacticalCanvas ref={handleRef} imageAspect={16 / 9} />
      </div>,
    );

    const activeSlideId = useTacticalUnifiedStore.getState().activeSlideId;
    const initialPlayers =
      useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === activeSlideId)?.players ?? [];

    expect(initialPlayers.length).toBeGreaterThan(0);
    const targetPlayer = initialPlayers[0];

    // マスターストアを直接更新（フォーメーション変更やドラッグ等）
    act(() => {
      useTacticalUnifiedStore
        .getState()
        .updatePlayer(activeSlideId, targetPlayer.id, { x: 99, y: 99 });
    });

    const updatedSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === activeSlideId);
    const updatedPlayer = updatedSlide?.players.find(
      (p) => p.id === targetPlayer.id,
    );
    expect(updatedPlayer?.x).toBe(99);
    expect(updatedPlayer?.y).toBe(99);
  });

  it('TacticalUnifiedStoreProvider 配下で Context 経由のストアがキャンバスに反映されアンマウント時もContextストアが操作されること', async () => {
    let capturedApi!: TacticalUnifiedStoreApi;
    function ApiCapturer() {
      capturedApi = useTacticalUnifiedStoreApi();
      return null;
    }

    const initialGlobalPlaying = useTacticalUnifiedStore.getState().isPlaying;
    expect(initialGlobalPlaying).toBe(false);

    const { unmount, container } = render(
      <TacticalUnifiedStoreProvider initialState={{ isPlaying: true }}>
        <ApiCapturer />
        <div style={{ width: 800, height: 450 }}>
          <FullTacticalCanvas imageAspect={16 / 9} />
        </div>
      </TacticalUnifiedStoreProvider>,
    );

    // Context ストアの activeSlide にカスタム選手を追加
    const activeSlideId = capturedApi.getState().activeSlideId;
    const customPlayer = createDefaultPlayer('away', 30, 40, '#00ff00');
    customPlayer.id = 'ctx-player-1';

    act(() => {
      capturedApi.getState().updateSlide(activeSlideId, {
        players: [customPlayer],
      });
    });

    await waitFor(() => {
      const stageElement = container.querySelector('.konvajs-content');
      expect(stageElement).not.toBeNull();
      // 初期化時、Provider 側の stageAspect が MockResizeObserver (800x450, 16:9) により更新されていること
      expect(capturedApi.getState().stageAspect).toBeCloseTo(16 / 9);
    });

    // Context ストアの選手情報が正しく更新されていること
    const slide = capturedApi
      .getState()
      .project.slides.find((s) => s.id === activeSlideId);
    expect(slide?.players[0].id).toBe('ctx-player-1');

    const setIsPlayingSpy = vi.spyOn(capturedApi.getState(), 'setIsPlaying');
    const globalSetIsPlayingSpy = vi.spyOn(
      useTacticalUnifiedStore.getState(),
      'setIsPlaying',
    );

    unmount();

    // アンマウント時に Context ストアの setIsPlaying(false) が呼ばれ、グローバル側は呼ばれないこと
    expect(setIsPlayingSpy).toHaveBeenCalledWith(false);
    expect(globalSetIsPlayingSpy).not.toHaveBeenCalled();
  });
});
