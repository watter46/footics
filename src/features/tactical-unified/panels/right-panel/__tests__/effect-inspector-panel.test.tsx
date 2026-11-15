import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ArrowHud } from '@/features/tactical-unified/core/components/hud/arrow-hud';
import { EffectInspectorPanel } from '@/features/tactical-unified/panels/right-panel/effect-inspector-panel';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { createDefaultDomainPlayer } from '@/lib/tactical/domain/formation-placement';
import { toScreenNormCoord } from '@/lib/types/tactical/branded';
import type {
  DomainArrowAnnotation,
  DomainZoneAnnotation,
} from '@/lib/types/tactical/domain-entities';

type TacticalStores = {
  documentStore: ReturnType<typeof createDocumentStore>;
  sessionStore: ReturnType<typeof createSessionStore>;
  playbackStore: ReturnType<typeof createPlaybackStore>;
};

function renderWithTacticalStores(
  ui: React.ReactElement,
  stores: TacticalStores,
) {
  return render(
    <TacticalStoreProvider stores={stores}>{ui}</TacticalStoreProvider>,
  );
}

function createTestArrow(
  id: string,
  patch?: Partial<DomainArrowAnnotation>,
): DomainArrowAnnotation {
  return {
    id,
    annotationType: 'arrow',
    arrowType: 'pass',
    curveType: 'straight',
    points: [
      { x: toScreenNormCoord(10), y: toScreenNormCoord(10) },
      { x: toScreenNormCoord(30), y: toScreenNormCoord(30) },
    ],
    color: '#ffffff',
    strokeWidth: 3,
    dashArray: [],
    startMarker: 'none',
    endMarker: 'arrow',
    ...patch,
  };
}

function createTestZone(
  id: string,
  patch?: Partial<Extract<DomainZoneAnnotation, { shapeType: 'rect' }>>,
): DomainZoneAnnotation {
  return {
    id,
    annotationType: 'zone',
    zoneType: 'highlight',
    shapeType: 'rect',
    x: toScreenNormCoord(10),
    y: toScreenNormCoord(10),
    width: 20,
    height: 20,
    color: '#f59e0b',
    opacity: 0.25,
    strokeWidth: 3,
    ...patch,
  };
}

describe('EffectInspectorPanel & ArrowHud (Phase 4)', () => {
  let stores: TacticalStores;
  let phaseId: string;
  let slideId: string;

  beforeEach(() => {
    const project = createDefaultTacticalProject();
    const p0 = project.phases[0]!;
    phaseId = p0.id;
    slideId = p0.slides[0]?.id ?? 'slide-1';
    stores = {
      documentStore: createDocumentStore(project),
      sessionStore: createSessionStore({
        activePhaseId: phaseId,
        activeSlideId: slideId,
        selectedObjects: [],
      }),
      playbackStore: createPlaybackStore(),
    };
  });

  describe('EffectInspectorPanel', () => {
    it('1. 何も選択されていない場合は何も表示されないこと', () => {
      const { container } = renderWithTacticalStores(
        <EffectInspectorPanel />,
        stores,
      );
      expect(container.firstChild).toBeNull();
    });

    it('2. 矢印選択時: エフェクト設定が表示され、エフェクトを "grow" に有効化できること', () => {
      const arrow = createTestArrow('arrow-1');
      stores.documentStore.getState().dispatch({
        type: 'APPLY_SLIDE_COMMAND',
        phaseId,
        slideId,
        command: { type: 'ADD_ARROW', arrow },
      });
      stores.sessionStore.setState({
        selectedObjects: [{ id: 'arrow-1', kind: 'arrow' }],
      });

      renderWithTacticalStores(<EffectInspectorPanel />, stores);

      // エフェクトパネルの見出しが存在すること
      expect(screen.getByTestId('arrow-effect-inspector')).toBeDefined();

      // エフェクト有効化（Grow 選択ボタンをクリック）
      const growBtn = screen.getByRole('radio', { name: /伸長/i });
      fireEvent.click(growBtn);

      const updatedSlide = selectDomainActiveSlide(
        stores.documentStore.getState().project,
        phaseId,
        slideId,
      );
      const updatedArrow = updatedSlide?.arrows.find((a) => a.id === 'arrow-1');
      expect(updatedArrow?.effect?.type).toBe('grow');
    });

    it('3. 矢印選択時: 伸長パラメータ（遅延、時間、維持、退場動作）を変更するとストアが更新されること', () => {
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
      stores.documentStore.getState().dispatch({
        type: 'APPLY_SLIDE_COMMAND',
        phaseId,
        slideId,
        command: { type: 'ADD_ARROW', arrow },
      });
      stores.sessionStore.setState({
        selectedObjects: [{ id: 'arrow-1', kind: 'arrow' }],
      });

      renderWithTacticalStores(<EffectInspectorPanel />, stores);

      // 開始遅延スライダーまたは数値入力の変更
      const delayInput = screen.getByLabelText(/開始遅延/i, {
        selector: 'input[type="range"]',
      });
      fireEvent.change(delayInput, { target: { value: '1.2' } });

      let updatedArrow = selectDomainActiveSlide(
        stores.documentStore.getState().project,
        phaseId,
        slideId,
      )?.arrows.find((a) => a.id === 'arrow-1');
      expect(updatedArrow?.effect?.delay).toBe(1.2);

      // 退場動作の切替: 'auto-hide' (自動消去)
      const autoHideBtn = screen.getByRole('radio', { name: /消去/i });
      fireEvent.click(autoHideBtn);

      updatedArrow = selectDomainActiveSlide(
        stores.documentStore.getState().project,
        phaseId,
        slideId,
      )?.arrows.find((a) => a.id === 'arrow-1');
      expect(updatedArrow?.effect?.exitAction).toBe('auto-hide');
    });

    it('4. マーカー（選手）選択時: 波紋エフェクト設定が表示され、設定変更でストアが更新されること', () => {
      const player = {
        ...createDefaultDomainPlayer('home', 40, 40, '#ff0000'),
        id: 'player-1',
      };
      stores.documentStore.getState().dispatch({
        type: 'APPLY_SLIDE_COMMAND',
        phaseId,
        slideId,
        command: { type: 'ADD_PLAYER', player },
      });
      stores.sessionStore.setState({
        selectedObjects: [{ id: 'player-1', kind: 'player' }],
      });

      renderWithTacticalStores(<EffectInspectorPanel />, stores);

      // エフェクト設定パネルの見出し
      expect(screen.getByTestId('player-effect-inspector')).toBeDefined();

      // 波紋 (Ripple) ボタンをクリック
      const rippleBtn = screen.getByRole('radio', { name: /波紋/i });
      fireEvent.click(rippleBtn);

      const updatedPlayer = selectDomainActiveSlide(
        stores.documentStore.getState().project,
        phaseId,
        slideId,
      )?.players.find((p) => p.id === 'player-1');
      expect(updatedPlayer?.style?.markerEffect?.type).toBe('ripple');
    });

    it('5. ゾーン選択時: パルスエフェクト設定が表示され、設定変更でストアが更新されること', () => {
      const zone = createTestZone('zone-1');
      stores.documentStore.getState().dispatch({
        type: 'APPLY_SLIDE_COMMAND',
        phaseId,
        slideId,
        command: { type: 'ADD_ZONE', zone },
      });
      stores.sessionStore.setState({
        selectedObjects: [{ id: 'zone-1', kind: 'zone' }],
      });

      renderWithTacticalStores(<EffectInspectorPanel />, stores);

      // エフェクト設定パネルの見出し
      expect(screen.getByTestId('zone-effect-inspector')).toBeDefined();

      // パルス (Pulse) ボタンをクリック
      const pulseBtn = screen.getByRole('radio', { name: /パルス/i });
      fireEvent.click(pulseBtn);

      const updatedZone = selectDomainActiveSlide(
        stores.documentStore.getState().project,
        phaseId,
        slideId,
      )?.zones.find((z) => z.id === 'zone-1');
      expect(updatedZone?.effect?.type).toBe('pulse');
    });

    it('6. 矢印選択時: 点線矢印の場合に flow および grow-and-flow エフェクトが選択できること', () => {
      const dashedArrow = createTestArrow('arrow-dashed-1', {
        dashArray: [8, 6],
      });
      stores.documentStore.getState().dispatch({
        type: 'APPLY_SLIDE_COMMAND',
        phaseId,
        slideId,
        command: { type: 'ADD_ARROW', arrow: dashedArrow },
      });
      stores.sessionStore.setState({
        selectedObjects: [{ id: 'arrow-dashed-1', kind: 'arrow' }],
      });

      renderWithTacticalStores(<EffectInspectorPanel />, stores);

      const flowBtn = screen.getByRole('radio', { name: /点線Flow/i });
      fireEvent.click(flowBtn);

      let updatedArrow = selectDomainActiveSlide(
        stores.documentStore.getState().project,
        phaseId,
        slideId,
      )?.arrows.find((a) => a.id === 'arrow-dashed-1');
      expect(updatedArrow?.effect?.type).toBe('flow');

      const growAndFlowBtn = screen.getByRole('radio', { name: /伸長\+Flow/i });
      fireEvent.click(growAndFlowBtn);

      updatedArrow = selectDomainActiveSlide(
        stores.documentStore.getState().project,
        phaseId,
        slideId,
      )?.arrows.find((a) => a.id === 'arrow-dashed-1');
      expect(updatedArrow?.effect?.type).toBe('grow-and-flow');
    });

    it('7. 選手選択時: 波紋カラーおよび最大半径スライダーの変更でストアが更新されること', () => {
      const basePlayer = createDefaultDomainPlayer('home', 40, 40, '#ff0000');
      const player = {
        ...basePlayer,
        id: 'player-1',
        style: {
          ...basePlayer.style,
          markerEffect: {
            type: 'ripple' as const,
            delay: 0,
            duration: 1.0,
            ringsCount: 3,
            repeatCount: 2,
            maxRadiusScale: 2.5,
            exitAction: 'keep' as const,
          },
        },
      };
      stores.documentStore.getState().dispatch({
        type: 'APPLY_SLIDE_COMMAND',
        phaseId,
        slideId,
        command: { type: 'ADD_PLAYER', player },
      });
      stores.sessionStore.setState({
        selectedObjects: [{ id: 'player-1', kind: 'player' }],
      });

      renderWithTacticalStores(<EffectInspectorPanel />, stores);

      // 最大半径スライダーの変更
      const radiusInput = screen.getByLabelText(/最大.*倍率/i, {
        selector: 'input[type="range"]',
      });
      fireEvent.change(radiusInput, { target: { value: '4.0' } });

      const updatedPlayer = selectDomainActiveSlide(
        stores.documentStore.getState().project,
        phaseId,
        slideId,
      )?.players.find((p) => p.id === 'player-1');
      expect(updatedPlayer?.style?.markerEffect?.maxRadiusScale).toBe(4.0);
    });

    it('8. 選手選択時: 移動軌跡エフェクト設定が表示され、設定変更でストアが更新されること', () => {
      const player = {
        ...createDefaultDomainPlayer('home', 40, 40, '#ff0000'),
        id: 'player-1',
      };
      stores.documentStore.getState().dispatch({
        type: 'APPLY_SLIDE_COMMAND',
        phaseId,
        slideId,
        command: { type: 'ADD_PLAYER', player },
      });
      stores.sessionStore.setState({
        selectedObjects: [{ id: 'player-1', kind: 'player' }],
      });

      renderWithTacticalStores(<EffectInspectorPanel />, stores);

      // 軌跡セクションが存在すること
      expect(
        screen.getByTestId('player-trajectory-effect-section'),
      ).toBeDefined();

      // 軌跡を ON にするボタン（またはラジオ）をクリック
      const onBtn = screen.getByRole('radio', { name: /^ON$/i });
      fireEvent.click(onBtn);

      const updatedPlayer = selectDomainActiveSlide(
        stores.documentStore.getState().project,
        phaseId,
        slideId,
      )?.players.find((p) => p.id === 'player-1');
      expect(updatedPlayer?.area).toBe('pitch');
      if (updatedPlayer?.area === 'pitch') {
        expect(updatedPlayer.trajectoryEffect?.enabled).toBe(true);
      }
    });
  });

  describe('ArrowHud ⚡️ ボタン', () => {
    it('9. ⚡️ ボタンをクリックすると伸長エフェクト (grow) と none がトグルすること', () => {
      const arrow = createTestArrow('arrow-hud-1');
      const project = createDefaultTacticalProject();
      const firstPhase = project.phases[0];
      const firstSlide = firstPhase.slides[0];
      project.phases[0] = {
        ...firstPhase,
        slides: [{ ...firstSlide, arrows: [arrow] }],
      };

      const documentStore = createDocumentStore(project);
      const sessionStore = createSessionStore({
        activePhaseId: firstPhase.id,
        activeSlideId: firstSlide.id,
      });
      const playbackStore = createPlaybackStore();

      renderWithTacticalStores(<ArrowHud arrowId="arrow-hud-1" />, {
        documentStore,
        sessionStore,
        playbackStore,
      });

      const toggleBtn = screen.getByTitle(/伸長エフェクト/i);
      expect(toggleBtn).toBeDefined();

      // 初回クリック: none/未設定 -> grow
      fireEvent.click(toggleBtn);
      const slideAfterEnable = selectDomainActiveSlide(
        documentStore.getState().project,
        firstPhase.id,
        firstSlide.id,
      );
      expect(slideAfterEnable?.arrows[0]?.effect?.type).toBe('grow');

      // 2回目クリック: grow -> none
      const activeToggleBtn = screen.getByTitle(/エフェクト解除/i);
      fireEvent.click(activeToggleBtn);
      const slideAfterDisable = selectDomainActiveSlide(
        documentStore.getState().project,
        firstPhase.id,
        firstSlide.id,
      );
      expect(slideAfterDisable?.arrows[0]?.effect?.type).toBe('none');
    });
  });
});
