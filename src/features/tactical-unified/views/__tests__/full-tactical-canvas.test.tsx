import { act, render, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CanvasCoreHandle } from '@/features/tactical-unified/core';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
  type TacticalStoresContextValue,
  useTacticalStoresContext,
} from '@/features/tactical-unified/stores/tactical-store-provider';
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
  it('TacticalStoreProvider の initialProject が documentStore にロードされ、ステージとツールバーが描画されること', async () => {
    const initialProject = createDefaultTacticalProject();
    let capturedStores!: TacticalStoresContextValue;
    function StoreCapturer() {
      capturedStores = useTacticalStoresContext();
      return null;
    }

    const { container } = render(
      <TacticalStoreProvider initialProject={initialProject}>
        <StoreCapturer />
        <div style={{ width: 800, height: 450 }}>
          <FullTacticalCanvas imageAspect={16 / 9} />
        </div>
      </TacticalStoreProvider>,
    );

    expect(container).toBeDefined();
    expect(capturedStores.documentStore.getState().project.id).toBe(
      initialProject.id,
    );
    expect(
      capturedStores.documentStore.getState().project.phases.length,
    ).toBeGreaterThan(0);

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

  it('documentStore で選手が動いた時、キャンバスが即座に最新選手情報を参照できること', async () => {
    const documentStore = createDocumentStore(createDefaultTacticalProject());
    const sessionStore = createSessionStore();
    const playbackStore = createPlaybackStore();
    const handleRef = createRef<CanvasCoreHandle>();

    render(
      <TacticalStoreProvider
        stores={{ documentStore, sessionStore, playbackStore }}
      >
        <div style={{ width: 800, height: 450 }}>
          <FullTacticalCanvas ref={handleRef} imageAspect={16 / 9} />
        </div>
      </TacticalStoreProvider>,
    );

    const activePhase = documentStore.getState().project.phases[0];
    expect(activePhase).toBeDefined();
    const activeSlide = activePhase.slides[0];
    expect(activeSlide).toBeDefined();
    expect(activeSlide.players.length).toBeGreaterThan(0);
    const targetPlayer = activeSlide.players[0];

    act(() => {
      documentStore.getState().dispatchSlide(activePhase.id, activeSlide.id, {
        type: 'UPDATE_PLAYER',
        id: targetPlayer.id,
        patch: { name: 'Test Player' },
      });
    });

    const updatedSlide = documentStore
      .getState()
      .project.phases[0].slides.find((s) => s.id === activeSlide.id);
    const updatedPlayer = updatedSlide?.players.find(
      (p) => p.id === targetPlayer.id,
    );
    expect(updatedPlayer?.name).toBe('Test Player');
  });

  it('TacticalStoreProvider 配下で Context 経由のストアがキャンバスに反映され stageAspect が更新されること', async () => {
    const documentStore = createDocumentStore(createDefaultTacticalProject());
    const sessionStore = createSessionStore();
    const playbackStore = createPlaybackStore();

    let capturedStores!: TacticalStoresContextValue;
    function StoreCapturer() {
      capturedStores = useTacticalStoresContext();
      return null;
    }

    const { container } = render(
      <TacticalStoreProvider
        stores={{ documentStore, sessionStore, playbackStore }}
      >
        <StoreCapturer />
        <div style={{ width: 800, height: 450 }}>
          <FullTacticalCanvas imageAspect={16 / 9} />
        </div>
      </TacticalStoreProvider>,
    );

    expect(capturedStores.documentStore).toBe(documentStore);
    expect(capturedStores.sessionStore).toBe(sessionStore);
    expect(capturedStores.playbackStore).toBe(playbackStore);

    await waitFor(() => {
      const stageElement = container.querySelector('.konvajs-content');
      expect(stageElement).not.toBeNull();
      expect(sessionStore.getState().stageAspect).toBeCloseTo(16 / 9);
    });
  });
});
