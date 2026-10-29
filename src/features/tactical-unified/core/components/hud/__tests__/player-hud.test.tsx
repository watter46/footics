import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it } from 'vitest';
import { PlayerHud } from '@/features/tactical-unified/core/components/hud/player-hud';
import { createCanvasStore } from '@/features/tactical-unified/core/store/canvas-store';
import { CanvasStoreContext } from '@/features/tactical-unified/core/store/canvas-store-provider';
import type { CanvasStoreApi } from '@/features/tactical-unified/core/types';
import { createDefaultPlayer } from '@/lib/types/tactical-unified';

function renderWithStore(
  ui: React.ReactElement,
  initialStore?: CanvasStoreApi,
) {
  const store =
    initialStore ??
    createCanvasStore({
      mode: 'tactical-board',
      aspectRatio: '16:9',
    });
  const utils = render(
    <CanvasStoreContext.Provider value={store}>
      {ui}
    </CanvasStoreContext.Provider>,
  );
  return { store, ...utils };
}

describe('PlayerHud', () => {
  it('ring-fade マーカーの時に発光幅 (Blur) と発光透明度 (Opacity) の変更ボタンが表示され、クリックで値が増減すること', () => {
    const store = createCanvasStore({
      mode: 'tactical-board',
      aspectRatio: '16:9',
    });
    const player = {
      ...createDefaultPlayer('home', 50, 50, '#38bdf8'),
      id: 'p1',
      style: {
        ...createDefaultPlayer('home', 50, 50, '#38bdf8').style,
        markerType: 'ring-fade' as const,
        glowBlur: 50,
        glowOpacity: 1.0,
      },
    };
    store.getState().addMarker(player);

    renderWithStore(<PlayerHud playerId="p1" />, store);

    // 発光幅 (Blur) の増減テスト
    const blurIncBtn = screen.getByTitle('発光幅拡大');
    const blurDecBtn = screen.getByTitle('発光幅縮小');
    expect(blurIncBtn).toBeDefined();
    expect(blurDecBtn).toBeDefined();

    // 増加テスト: 50 -> 55
    fireEvent.click(blurIncBtn);
    let updatedPlayer = store
      .getState()
      .annotations.markers.find((m) => m.id === 'p1');
    expect(updatedPlayer?.style?.glowBlur).toBe(55);

    // 減少テスト: 55 -> 50
    fireEvent.click(blurDecBtn);
    updatedPlayer = store
      .getState()
      .annotations.markers.find((m) => m.id === 'p1');
    expect(updatedPlayer?.style?.glowBlur).toBe(50);

    // 発光透明度 (Opacity) の増減テスト
    const opacityIncBtn = screen.getByTitle('発光透明度拡大');
    const opacityDecBtn = screen.getByTitle('発光透明度縮小');
    expect(opacityIncBtn).toBeDefined();
    expect(opacityDecBtn).toBeDefined();

    // 減少テスト: 1.0 -> 0.9
    fireEvent.click(opacityDecBtn);
    updatedPlayer = store
      .getState()
      .annotations.markers.find((m) => m.id === 'p1');
    expect(updatedPlayer?.style?.glowOpacity).toBeCloseTo(0.9);

    // 増加テスト: 0.9 -> 1.0
    fireEvent.click(opacityIncBtn);
    updatedPlayer = store
      .getState()
      .annotations.markers.find((m) => m.id === 'p1');
    expect(updatedPlayer?.style?.glowOpacity).toBeCloseTo(1.0);
  });
});
