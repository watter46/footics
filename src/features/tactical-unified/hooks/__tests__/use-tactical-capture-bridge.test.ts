import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { useTacticalCaptureBridge } from '../use-tactical-capture-bridge';

// Sonner のモック
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useTacticalCaptureBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTacticalUnifiedStore.setState((s) => ({
      ...s,
      project: {
        ...s.project,
        backgroundType: 'pitch',
        backgroundImageUrl: undefined,
      },
    }));
  });

  it('applies capture image to background, clears pitch players, and sets full boundaryBox when CustomEvent is received', () => {
    const store = useTacticalUnifiedStore.getState();
    store.resetProject();
    expect(
      store.project.slides[0]?.players.filter((p) => p.area === 'pitch'),
    ).toHaveLength(22);

    renderHook(() => useTacticalCaptureBridge());

    const testPayload = {
      id: 'capture_test_1',
      dataUrl: 'data:image/png;base64,mockCaptureData',
      timestamp: Date.now(),
      title: 'Tactical Clip',
    };

    act(() => {
      window.dispatchEvent(
        new CustomEvent('footics-tactical-capture-received', {
          detail: testPayload,
        }),
      );
    });

    const state = useTacticalUnifiedStore.getState();
    expect(state.project.backgroundType).toBe('image');
    expect(state.project.backgroundImageUrl).toBe(
      'data:image/png;base64,mockCaptureData',
    );
    // 22選手が全員ベンチ（ピッチ0人）に退避されていること
    const activeSlide = state.project.slides[0];
    expect(activeSlide?.players.filter((p) => p.area === 'pitch')).toHaveLength(
      0,
    );
    expect(activeSlide?.players.filter((p) => p.area === 'bench')).toHaveLength(
      22,
    );
    // boundaryBox がスクリーンショット用ボックス (2, 2, 96, 96) に自動フィットしていること
    expect(activeSlide?.boundaryBox).toEqual({
      x: 2,
      y: 2,
      width: 96,
      height: 96,
      enabled: true,
      fitTarget: 'pitch',
    });
  });

  it('applies capture image to background when window postMessage is received', () => {
    const store = useTacticalUnifiedStore.getState();
    store.resetProject();

    renderHook(() => useTacticalCaptureBridge());

    const testPayload = {
      id: 'capture_test_2',
      dataUrl: 'data:image/png;base64,mockCaptureViaPostMessage',
      timestamp: Date.now(),
      title: 'Tactical Clip 2',
    };

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'FOOTICS_TACTICAL_CAPTURE_PAYLOAD',
            payload: testPayload,
          },
        }),
      );
    });

    const state = useTacticalUnifiedStore.getState();
    expect(state.project.backgroundType).toBe('image');
    expect(state.project.backgroundImageUrl).toBe(
      'data:image/png;base64,mockCaptureViaPostMessage',
    );
    expect(
      state.project.slides[0]?.players.filter((p) => p.area === 'pitch'),
    ).toHaveLength(0);
  });
});
