import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ArrowHud } from '@/features/tactical-unified/core/components/hud/arrow-hud';
import { createCanvasStore } from '@/features/tactical-unified/core/store/canvas-store';
import { CanvasStoreContext } from '@/features/tactical-unified/core/store/canvas-store-provider';
import type { CanvasStoreApi } from '@/features/tactical-unified/core/types';
import { EffectInspectorPanel } from '@/features/tactical-unified/panels/right-panel/effect-inspector-panel';
import {
  createTacticalUnifiedStore,
  type TacticalUnifiedStoreApi,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import { TacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import type { ArrowAnnotation } from '@/lib/types/tactical/annotations';
import { createDefaultPlayer } from '@/lib/types/tactical-unified';

function renderWithTacticalStore(
  ui: React.ReactElement,
  store: TacticalUnifiedStoreApi,
) {
  return render(
    <TacticalUnifiedStoreContext.Provider value={store}>
      {ui}
    </TacticalUnifiedStoreContext.Provider>,
  );
}

function renderWithCanvasStore(ui: React.ReactElement, store: CanvasStoreApi) {
  return render(
    <CanvasStoreContext.Provider value={store}>
      {ui}
    </CanvasStoreContext.Provider>,
  );
}

function createTestArrow(
  id: string,
  patch?: Partial<ArrowAnnotation>,
): ArrowAnnotation {
  return {
    id,
    annotationType: 'arrow',
    arrowType: 'pass',
    curveType: 'straight',
    points: [
      { x: 10, y: 10 },
      { x: 30, y: 30 },
    ],
    color: '#ffffff',
    strokeWidth: 3,
    dashArray: [],
    arrowHead: true,
    ...patch,
  };
}

describe('EffectInspectorPanel & ArrowHud (Phase 4)', () => {
  let tacticalStore: TacticalUnifiedStoreApi;
  const slideId = 'slide-1';

  beforeEach(() => {
    tacticalStore = createTacticalUnifiedStore();
    const state = tacticalStore.getState();
    const phase = state.project.phases[0];
    const firstSlideId = phase?.slides[0]?.id ?? slideId;
    tacticalStore.setState({
      activeSlideId: firstSlideId,
      selectedObjects: [],
    });
  });

  describe('EffectInspectorPanel', () => {
    it('1. 何も選択されていない場合は何も表示されないこと', () => {
      const { container } = renderWithTacticalStore(
        <EffectInspectorPanel />,
        tacticalStore,
      );
      expect(container.firstChild).toBeNull();
    });

    it('2. 矢印選択時: エフェクト設定が表示され、エフェクトを "grow" に有効化できること', () => {
      const state = tacticalStore.getState();
      const currentSlideId = state.activeSlideId;
      const arrow = createTestArrow('arrow-1');

      state.addArrow(currentSlideId, arrow);
      tacticalStore.setState({
        selectedObjects: [{ id: 'arrow-1', kind: 'arrow' }],
      });

      const updateArrowSpy = vi.spyOn(tacticalStore.getState(), 'updateArrow');

      renderWithTacticalStore(<EffectInspectorPanel />, tacticalStore);

      // エフェクトパネルの見出しが存在すること
      expect(screen.getByTestId('arrow-effect-inspector')).toBeDefined();

      // エフェクト有効化（Grow 選択ボタンをクリック）
      const growBtn = screen.getByRole('radio', { name: /伸長/i });
      fireEvent.click(growBtn);

      expect(updateArrowSpy).toHaveBeenCalledWith(
        currentSlideId,
        'arrow-1',
        expect.objectContaining({
          effect: expect.objectContaining({
            type: 'grow',
          }),
        }),
      );
      updateArrowSpy.mockRestore();
    });

    it('3. 矢印選択時: 伸長パラメータ（遅延、時間、維持、退場動作）を変更すると updateArrow が呼ばれること', () => {
      const state = tacticalStore.getState();
      const currentSlideId = state.activeSlideId;
      const arrow = createTestArrow('arrow-1', {
        effect: {
          type: 'grow',
          delay: 0.5,
          duration: 0.8,
          holdDuration: 0.5,
          exitAction: 'keep',
          fadeDuration: 0.3,
          easing: 'ease-out',
        },
      });

      state.addArrow(currentSlideId, arrow);
      tacticalStore.setState({
        selectedObjects: [{ id: 'arrow-1', kind: 'arrow' }],
      });

      const updateArrowSpy = vi.spyOn(tacticalStore.getState(), 'updateArrow');

      renderWithTacticalStore(<EffectInspectorPanel />, tacticalStore);

      // 開始遅延スライダーまたは数値入力の変更
      const delayInput = screen.getByLabelText(/開始遅延/i, {
        selector: 'input[type="range"]',
      });
      fireEvent.change(delayInput, { target: { value: '1.2' } });

      expect(updateArrowSpy).toHaveBeenCalledWith(
        currentSlideId,
        'arrow-1',
        expect.objectContaining({
          effect: expect.objectContaining({
            delay: 1.2,
          }),
        }),
      );

      // 退場動作の切替: 'auto-hide' (自動消去)
      const autoHideBtn = screen.getByRole('radio', { name: /消去/i });
      fireEvent.click(autoHideBtn);

      expect(updateArrowSpy).toHaveBeenCalledWith(
        currentSlideId,
        'arrow-1',
        expect.objectContaining({
          effect: expect.objectContaining({
            exitAction: 'auto-hide',
          }),
        }),
      );

      updateArrowSpy.mockRestore();
    });

    it('4. マーカー（選手）選択時: 波紋エフェクト設定が表示され、設定変更で updatePlayer が呼ばれること', () => {
      const state = tacticalStore.getState();
      const currentSlideId = state.activeSlideId;
      const player = {
        ...createDefaultPlayer('home', 40, 40, '#ff0000'),
        id: 'player-1',
      };

      state.addPlayer(player);
      tacticalStore.setState({
        selectedObjects: [{ id: 'player-1', kind: 'player' }],
      });

      const updatePlayerSpy = vi.spyOn(
        tacticalStore.getState(),
        'updatePlayer',
      );

      renderWithTacticalStore(<EffectInspectorPanel />, tacticalStore);

      // エフェクト設定パネルの見出し
      expect(screen.getByTestId('player-effect-inspector')).toBeDefined();

      // 波紋 (Ripple) ボタンをクリック
      const rippleBtn = screen.getByRole('radio', { name: /波紋/i });
      fireEvent.click(rippleBtn);

      expect(updatePlayerSpy).toHaveBeenCalledWith(
        currentSlideId,
        'player-1',
        expect.objectContaining({
          style: expect.objectContaining({
            markerEffect: expect.objectContaining({
              type: 'ripple',
            }),
          }),
        }),
      );

      updatePlayerSpy.mockRestore();
    });
  });

  describe('ArrowHud ⚡️ ボタン', () => {
    it('5. ⚡️ ボタンをクリックすると伸長エフェクト (grow) と none がトグルすること', () => {
      const canvasStore = createCanvasStore({
        mode: 'tactical-board',
        aspectRatio: '16:9',
      });
      const arrow = createTestArrow('arrow-hud-1', {
        points: [
          { x: 10, y: 10 },
          { x: 50, y: 50 },
        ],
      });

      canvasStore.getState().addArrow(arrow);

      const updateArrowSpy = vi.spyOn(canvasStore.getState(), 'updateArrow');

      const { rerender } = renderWithCanvasStore(
        <ArrowHud arrowId="arrow-hud-1" />,
        canvasStore,
      );

      const toggleBtn = screen.getByTitle(/伸長エフェクト/i);
      expect(toggleBtn).toBeDefined();

      // 初回クリック: none/未設定 -> grow
      fireEvent.click(toggleBtn);
      expect(updateArrowSpy).toHaveBeenCalledWith(
        'arrow-hud-1',
        expect.objectContaining({
          effect: expect.objectContaining({
            type: 'grow',
          }),
        }),
      );

      // エフェクト付与状態にストアを更新して再レンダー
      canvasStore.getState().updateArrow('arrow-hud-1', {
        effect: {
          type: 'grow',
          delay: 0.5,
          duration: 0.8,
          holdDuration: 0.5,
          exitAction: 'keep',
          fadeDuration: 0.3,
          easing: 'ease-out',
        },
      });

      rerender(
        <CanvasStoreContext.Provider value={canvasStore}>
          <ArrowHud arrowId="arrow-hud-1" />
        </CanvasStoreContext.Provider>,
      );

      // 2回目クリック: grow -> none
      const activeToggleBtn = screen.getByTitle(/エフェクト解除/i);
      fireEvent.click(activeToggleBtn);

      expect(updateArrowSpy).toHaveBeenCalledWith(
        'arrow-hud-1',
        expect.objectContaining({
          effect: expect.objectContaining({
            type: 'none',
          }),
        }),
      );

      updateArrowSpy.mockRestore();
    });
  });
});
