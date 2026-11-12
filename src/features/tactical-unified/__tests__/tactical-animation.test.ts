import { act, renderHook } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  resolveSceneGraphFromState,
  useResolvedSceneGraph,
} from '@/features/tactical-unified/hooks/use-resolved-scene-graph';
import { useTacticalAnimation } from '@/features/tactical-unified/hooks/use-tactical-animation';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import { TacticalStoreProvider } from '@/features/tactical-unified/stores/tactical-store-provider';
import type { EphemeralSessionState } from '@/lib/tactical/compiler/scene-graph-dto';
import type { StageViewport } from '@/lib/tactical/engine/coordinates';
import {
  clampToScreenNorm,
  toMilliseconds,
} from '@/lib/types/tactical/branded';
import type {
  DomainSlide,
  DomainTacticalPhase,
  DomainTacticalProject,
} from '@/lib/types/tactical/domain-hierarchy';

function createTestProject(): DomainTacticalProject {
  const slide1: DomainSlide = {
    id: 'slide-1',
    index: 0,
    label: 'Slide 1',
    players: [
      {
        id: 'p1',
        shirtNo: '10',
        name: 'Player 1',
        position: 'FW',
        area: 'pitch',
        team: 'home',
        x: clampToScreenNorm(10),
        y: clampToScreenNorm(10),
        style: {
          markerType: 'circle',
          insideContent: 'number',
          bottomLabel: 'name',
          color: '#034694',
          strokeColor: '#ffffff',
          strokeWidth: 2,
          sizeScale: 1.0,
          numberSizeScale: 1.0,
          labelSizeScale: 1.0,
        },
        connectLines: [],
        badges: [],
      },
    ],
    arrows: [],
    zones: [],
    texts: [],
    ball: {
      x: clampToScreenNorm(10),
      y: clampToScreenNorm(10),
      visible: true,
    },
    transitionDurationMs: 1000,
    pauseMs: 500,
    easing: 'linear',
  };

  const slide2: DomainSlide = {
    id: 'slide-2',
    index: 1,
    label: 'Slide 2',
    players: [
      {
        id: 'p1',
        shirtNo: '10',
        name: 'Player 1',
        position: 'FW',
        area: 'pitch',
        team: 'home',
        x: clampToScreenNorm(30),
        y: clampToScreenNorm(30),
        style: {
          markerType: 'circle',
          insideContent: 'number',
          bottomLabel: 'name',
          color: '#034694',
          strokeColor: '#ffffff',
          strokeWidth: 2,
          sizeScale: 1.0,
          numberSizeScale: 1.0,
          labelSizeScale: 1.0,
        },
        connectLines: [],
        badges: [],
      },
    ],
    arrows: [],
    zones: [],
    texts: [],
    ball: {
      x: clampToScreenNorm(50),
      y: clampToScreenNorm(50),
      visible: true,
    },
    transitionDurationMs: 1000,
    pauseMs: 500,
    easing: 'linear',
  };

  const phase: DomainTacticalPhase = {
    id: 'phase-1',
    name: 'Phase 1',
    aspectRatio: '16:9',
    boundaryBox: {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      enabled: true,
      visible: false,
      fitTarget: 'pitch',
    },
    backgroundType: 'pitch',
    slides: [slide1, slide2],
  };

  return {
    id: 'test-project',
    version: '3.0.0',
    title: 'Test Project',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    homeColor: { primary: '#034694' },
    awayColor: { primary: '#ef4444' },
    pitchAppearance: {
      pitchBackgroundType: 'solid',
      overlayColor: '#0B303E',
      overlayOpacity: 1.0,
      lineColor: '#ffffff',
      lineWidth: 2.5,
      lineOpacity: 1.0,
    },
    screenBackground: { type: 'cinematic' },
    phases: [phase],
    tags: [],
  };
}

const viewport: StageViewport = {
  width: 1000,
  height: 500,
  offsetX: 0,
  offsetY: 0,
};

describe('Tactical Animation & Scene Graph Resolution (Phase 2)', () => {
  describe('resolveSceneGraphFromState', () => {
    it('静止フレーム (isPlaying: false) では activeSlideId のスライド状態をそのまま解決すること', () => {
      const project = createTestProject();
      const session: EphemeralSessionState = {
        activePhaseId: 'phase-1',
        activeSlideId: 'slide-1',
        selectedIds: [],
        activeDragDelta: null,
        drawingPreview: null,
      };

      const sceneGraph = resolveSceneGraphFromState({
        project,
        session,
        isPlaying: false,
        timeMs: toMilliseconds(0),
        viewport,
      });

      expect(sceneGraph).toBeDefined();
      expect(sceneGraph.viewport).toEqual(viewport);
      // slide-1 では p1 は x=10, y=10。viewport 1000x500 なので x = 100, y = 50
      const playerItem = sceneGraph.billboardItems.find(
        (b) => b.kind === 'player' && b.id === 'p1',
      );
      expect(playerItem).toBeDefined();
      if (playerItem && playerItem.kind === 'player') {
        expect(playerItem.positionPx.x).toBeCloseTo(100, 1);
        expect(playerItem.positionPx.y).toBeCloseTo(50, 1);
      }
    });

    it('再生中フレーム (isPlaying: true, timeMs: 750) では補間された座標が解決されること (Concrete Test Value: 750ms)', () => {
      const project = createTestProject();
      const session: EphemeralSessionState = {
        activePhaseId: 'phase-1',
        activeSlideId: 'slide-1',
        selectedIds: [],
        activeDragDelta: null,
        drawingPreview: null,
      };

      // slide 1: pauseMs: 500, transitionDurationMs: 1000.
      // At timeMs: 750: elapsed in seg = 750.
      // pauseMs = 500 なので、transition 進捗 = (750 - 500) / 1000 = 0.25 (linear).
      // p1 x: 10 + (30 - 10) * 0.25 = 15.
      // p1 y: 10 + (30 - 10) * 0.25 = 15.
      // positionPx.x = 1000 * 0.15 = 150, positionPx.y = 500 * 0.15 = 75.
      const sceneGraph = resolveSceneGraphFromState({
        project,
        session,
        isPlaying: true,
        timeMs: toMilliseconds(750),
        viewport,
      });

      expect(sceneGraph).toBeDefined();
      const playerItem = sceneGraph.billboardItems.find(
        (b) => b.kind === 'player' && b.id === 'p1',
      );
      expect(playerItem).toBeDefined();
      if (playerItem && playerItem.kind === 'player') {
        expect(playerItem.positionPx.x).toBeCloseTo(150, 1);
        expect(playerItem.positionPx.y).toBeCloseTo(75, 1);
      }
    });
  });

  describe('useTacticalAnimation hook', () => {
    it('playback-store の状態を更新し、ノードの命令的ミューテーションなしで再生・停止・シークを制御できること', () => {
      const project = createTestProject();
      const docStore = createDocumentStore(project);
      const sessStore = createSessionStore({
        activePhaseId: 'phase-1',
        activeSlideId: 'slide-1',
      });
      const playStore = createPlaybackStore();

      const wrapper = ({ children }: { children: ReactNode }) =>
        React.createElement(
          TacticalStoreProvider,
          {
            stores: {
              documentStore: docStore,
              sessionStore: sessStore,
              playbackStore: playStore,
            },
          },
          children,
        );

      const { result } = renderHook(() => useTacticalAnimation(), {
        wrapper,
      });

      // slide-1 (1000+500=1500)
      expect(result.current.totalDurationMs).toBe(1500);
      expect(result.current.currentPlaybackTime).toBe(0);

      // 1. play
      act(() => {
        result.current.playAnimation();
      });
      expect(playStore.getState().isPlaying).toBe(true);

      // 2. seekTo
      act(() => {
        result.current.seekTo(750);
      });
      expect(playStore.getState().timeMs).toBe(750);

      // 3. pause
      act(() => {
        result.current.pauseAnimation();
      });
      expect(playStore.getState().isPlaying).toBe(false);
      expect(playStore.getState().timeMs).toBe(750);

      // 4. stop
      act(() => {
        result.current.stopAnimation();
      });
      expect(playStore.getState().isPlaying).toBe(false);
      expect(playStore.getState().timeMs).toBe(0);
    });

    it('再生中 (isPlaying: true) で RAF を進めた際、onFrameEvaluated コールバックに補間された EvaluatedTimelineFrame が通知されること (Concrete Test Value: t=750ms)', () => {
      const callbacks: FrameRequestCallback[] = [];
      vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
        callbacks.push(cb);
        return callbacks.length;
      });
      vi.stubGlobal('cancelAnimationFrame', vi.fn());

      const project = createTestProject();
      const docStore = createDocumentStore(project);
      const sessStore = createSessionStore({
        activePhaseId: 'phase-1',
        activeSlideId: 'slide-1',
      });
      const playStore = createPlaybackStore();

      const onFrameEvaluated = vi.fn();

      const wrapper = ({ children }: { children: ReactNode }) =>
        React.createElement(
          TacticalStoreProvider,
          {
            stores: {
              documentStore: docStore,
              sessionStore: sessStore,
              playbackStore: playStore,
            },
          },
          children,
        );

      const { result } = renderHook(
        () => useTacticalAnimation({ onFrameEvaluated }),
        { wrapper },
      );

      act(() => {
        result.current.playAnimation();
      });

      // advance RAF: start at 1000, then 1750 (delta = 750ms)
      act(() => {
        callbacks.shift()?.(1000);
      });
      act(() => {
        callbacks.shift()?.(1750);
      });

      expect(onFrameEvaluated).toHaveBeenCalled();
      const lastCall = onFrameEvaluated.mock.lastCall?.[0];
      expect(lastCall).toBeDefined();
      expect(lastCall.slide).toBeDefined();
      // slide-1 (x=10, pause=500), slide-2 (x=30, dur=1000) -> at 750ms: 10 + 20 * 0.25 = 15
      expect(lastCall.slide.players[0].x).toBe(15);

      vi.unstubAllGlobals();
    });
  });

  describe('useResolvedSceneGraph hook', () => {
    it('TacticalStoreProvider の状態変化に応じて ResolvedSceneGraphDTO を導出すること', () => {
      const project = createTestProject();
      const docStore = createDocumentStore(project);
      const sessStore = createSessionStore({
        activePhaseId: 'phase-1',
        activeSlideId: 'slide-1',
      });
      const playStore = createPlaybackStore();

      const wrapper = ({ children }: { children: ReactNode }) =>
        React.createElement(
          TacticalStoreProvider,
          {
            stores: {
              documentStore: docStore,
              sessionStore: sessStore,
              playbackStore: playStore,
            },
          },
          children,
        );

      const { result } = renderHook(() => useResolvedSceneGraph(viewport), {
        wrapper,
      });

      // 静止状態: slide-1 の座標 (x: 100)
      const player1 = result.current.billboardItems.find(
        (b) => b.kind === 'player' && b.id === 'p1',
      );
      if (player1 && player1.kind === 'player') {
        expect(player1.positionPx.x).toBeCloseTo(100, 1);
      }

      // 再生中かつ 750ms に更新
      act(() => {
        playStore.getState().startPlayback();
        playStore.getState().setTimeMs(toMilliseconds(750));
      });

      const playerUpdated = result.current.billboardItems.find(
        (b) => b.kind === 'player' && b.id === 'p1',
      );
      if (playerUpdated && playerUpdated.kind === 'player') {
        expect(playerUpdated.positionPx.x).toBeCloseTo(150, 1);
      }
    });
  });
});
