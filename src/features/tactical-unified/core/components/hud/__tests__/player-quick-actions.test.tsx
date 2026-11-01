import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it } from 'vitest';
import { VisionConeAction } from '@/features/tactical-unified/core/components/hud/player-quick-actions';
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

describe('PlayerQuickActions - VisionConeAction', () => {
  it('視野コーンがOFF (visible: false または undefined) の時は視野カラーピッカーが表示されないこと', () => {
    const store = createCanvasStore({
      mode: 'tactical-board',
      aspectRatio: '16:9',
    });
    const player = {
      ...createDefaultPlayer('home', 50, 50, '#38bdf8'),
      id: 'p1',
      visionCone: undefined,
    };
    store.getState().addMarker(player);

    renderWithStore(<VisionConeAction player={player} />, store);

    expect(screen.queryByTitle('視野カラー変更')).toBeNull();
  });

  it('視野コーンがON (visible: true) の時に視野カラーピッカーが表示され、色変更時に updateMarker が呼ばれて色が更新されること', () => {
    const store = createCanvasStore({
      mode: 'tactical-board',
      aspectRatio: '16:9',
    });
    const player = {
      ...createDefaultPlayer('home', 50, 50, '#38bdf8'),
      id: 'p1',
      visionCone: {
        id: 'vc-1',
        angleRad: 0,
        spreadRad: (60 * Math.PI) / 180,
        radius: 13,
        color: '#38bdf8',
        opacity: 0.3,
        visible: true,
      },
    };
    store.getState().addMarker(player);

    renderWithStore(<VisionConeAction player={player} />, store);

    const colorPickerTrigger = screen.getByTitle('視野カラー変更');
    expect(colorPickerTrigger).toBeDefined();

    // MiniColorPicker パレットを開く
    fireEvent.click(colorPickerTrigger);

    // パレット内の #ef4444 ボタンをクリック
    const redColorBtn = screen.getByTitle('#ef4444');
    expect(redColorBtn).toBeDefined();
    fireEvent.click(redColorBtn);

    // ストアのマーカーの visionCone.color が更新されたことを検証
    const updatedPlayer = store
      .getState()
      .annotations.markers.find((m) => m.id === 'p1');
    expect(updatedPlayer?.visionCone?.color).toBe('#ef4444');
  });
});
