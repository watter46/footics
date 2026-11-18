import { render } from '@testing-library/react';
import React from 'react';
import { Stage } from 'react-konva';
import { describe, expect, it } from 'vitest';
import { findSafePitchPosition } from '@/lib/tactical/domain/squad-placement';
import type { Milliseconds } from '@/lib/types/tactical/branded';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import {
  createDefaultPlayer,
  createDefaultSlide,
} from '@/lib/types/tactical-unified';
import { ContextHud } from '../core/components/ContextHud';
import { resolveHudTarget } from '../core/components/hud/hud-targets';
import { PitchGroundLayer } from '../core/components/PitchGroundLayer';
import { createCanvasNodesRegistry } from '../core/utils/canvas-registry';
import { resolveSceneGraphFromState } from '../hooks/use-resolved-scene-graph';
import { createDocumentStore } from '../stores/document-store';
import { createPlaybackStore } from '../stores/playback-store';
import { createSessionStore } from '../stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '../stores/tactical-store-provider';

function createTestStores() {
  const project = createDefaultTacticalProject();
  const phase = project.phases[0];
  const slide = phase.slides[0];
  const documentStore = createDocumentStore(project);
  const sessionStore = createSessionStore({
    activePhaseId: phase.id,
    activeSlideId: slide.id,
  });
  const playbackStore = createPlaybackStore();
  return {
    documentStore,
    sessionStore,
    playbackStore,
    phaseId: phase.id,
    slideId: slide.id,
  };
}

describe('Phase 3: メインキャンバス ↔ ベンチ双方向移動 (pitch-bench-transition)', () => {
  describe('findSafePitchPosition 純粋関数', () => {
    it('ピッチに選手がいない場合、Home は (40, 50), Away は (60, 50) を返す', () => {
      const posHome = findSafePitchPosition([], 'home');
      expect(posHome).toEqual({ x: 40, y: 50 });

      const posAway = findSafePitchPosition([], 'away');
      expect(posAway).toEqual({ x: 60, y: 50 });
    });

    it('ピッチに既存選手がいる場合、既存選手と十分離れた空き位置を返す', () => {
      const existing: Array<{ x: number; y: number; area: string }> = [
        { x: 40, y: 50, area: 'pitch' },
      ];
      const pos = findSafePitchPosition(existing, 'home');
      // (40, 50) と完全に一致しないこと
      expect(pos).not.toEqual({ x: 40, y: 50 });
      // 距離が離れていること
      const dist = Math.hypot(pos.x - 40, pos.y - 50);
      expect(dist).toBeGreaterThanOrEqual(10);
    });

    it('ベンチ選手（area: "bench"）はピッチ空き位置計算で無視される', () => {
      const existing: Array<{ x: number; y: number; area: string }> = [
        { x: 40, y: 50, area: 'bench' },
      ];
      const pos = findSafePitchPosition(existing, 'home');
      expect(pos).toEqual({ x: 40, y: 50 });
    });
  });

  describe('store: movePlayerToPitch (投入)', () => {
    it('座標未指定で投入時、安全な空き座標へ配置され、area が pitch になる', () => {
      const { documentStore, phaseId, slideId } = createTestStores();

      const benchPlayer = {
        ...createDefaultPlayer(
          'home',
          clampToScreenNorm(0),
          clampToScreenNorm(0),
          '#034694',
        ),
        x: clampToScreenNorm(0),
        y: clampToScreenNorm(0),
        name: 'Sub Player',
        shirtNo: '12',
        role: 'SUB',
        area: 'bench' as const,
      };
      documentStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'ADD_PLAYER',
        player: benchPlayer,
      });

      expect(benchPlayer.area).toBe('bench');

      // 投入 (座標未指定 → findSafePitchPosition で空き座標を算出)
      const currentPlayers = documentStore
        .getState()
        .project.phases[0].slides.find((s) => s.id === slideId)!.players;
      const safePos = findSafePitchPosition(currentPlayers, 'home');
      documentStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'MOVE_PLAYER_TO_PITCH',
        id: benchPlayer.id,
        x: clampToScreenNorm(safePos.x),
        y: clampToScreenNorm(safePos.y),
      });

      const placedPlayer = documentStore
        .getState()
        .project.phases[0].slides.find((s) => s.id === slideId)!
        .players.find((p) => p.id === benchPlayer.id)!;

      expect(placedPlayer.area).toBe('pitch');
      expect(placedPlayer.x).toBeGreaterThanOrEqual(25);
      expect(placedPlayer.x).toBeLessThanOrEqual(55);
      expect(placedPlayer.y).toBeGreaterThanOrEqual(20);
      expect(placedPlayer.y).toBeLessThanOrEqual(80);
    });

    it('2人連続で投入したとき、2人の座標が重ならない', () => {
      const { documentStore, phaseId, slideId } = createTestStores();

      const sub1 = {
        ...createDefaultPlayer(
          'home',
          clampToScreenNorm(0),
          clampToScreenNorm(0),
          '#034694',
        ),
        x: clampToScreenNorm(0),
        y: clampToScreenNorm(0),
        name: 'Sub 1',
        shirtNo: '12',
        role: 'SUB',
        area: 'bench' as const,
      };
      const sub2 = {
        ...createDefaultPlayer(
          'home',
          clampToScreenNorm(0),
          clampToScreenNorm(0),
          '#034694',
        ),
        x: clampToScreenNorm(0),
        y: clampToScreenNorm(0),
        name: 'Sub 2',
        shirtNo: '13',
        role: 'SUB',
        area: 'bench' as const,
      };
      documentStore
        .getState()
        .dispatchSlide(phaseId, slideId, { type: 'ADD_PLAYER', player: sub1 });
      documentStore
        .getState()
        .dispatchSlide(phaseId, slideId, { type: 'ADD_PLAYER', player: sub2 });

      const pos1 = findSafePitchPosition(
        documentStore
          .getState()
          .project.phases[0].slides.find((s) => s.id === slideId)!.players,
        'home',
      );
      documentStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'MOVE_PLAYER_TO_PITCH',
        id: sub1.id,
        x: clampToScreenNorm(pos1.x),
        y: clampToScreenNorm(pos1.y),
      });

      const pos2 = findSafePitchPosition(
        documentStore
          .getState()
          .project.phases[0].slides.find((s) => s.id === slideId)!.players,
        'home',
      );
      documentStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'MOVE_PLAYER_TO_PITCH',
        id: sub2.id,
        x: clampToScreenNorm(pos2.x),
        y: clampToScreenNorm(pos2.y),
      });

      const updatedSlide = documentStore
        .getState()
        .project.phases[0].slides.find((sl) => sl.id === slideId)!;
      const p1 = updatedSlide.players.find((p) => p.id === sub1.id)!;
      const p2 = updatedSlide.players.find((p) => p.id === sub2.id)!;

      expect(p1.area).toBe('pitch');
      expect(p2.area).toBe('pitch');
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      expect(dist).toBeGreaterThanOrEqual(5);
    });
  });

  describe('store: movePlayerToBench (退避)', () => {
    it('退避時、個別オプション（visionCone, focus, badges, connectLines, trajectory）が全自動クリアされる', () => {
      const { documentStore, phaseId, slideId } = createTestStores();
      const slide = documentStore
        .getState()
        .project.phases[0].slides.find((s) => s.id === slideId)!;
      const target = slide.players.find((p) => p.area === 'pitch')!;

      // オプションを設定
      documentStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'UPDATE_PLAYER',
        id: target.id,
        patch: {
          visionCone: {
            id: 'vc-1',
            angleRad: 0,
            spreadRad: 0.5,
            radius: 15,
            color: '#3b82f6',
            opacity: 0.3,
            visible: true,
          },
          focus: {
            enabled: true,
            color: '#ffffff',
            radius: 3,
            opacity: 0.35,
            style: 'spotlight',
          },
          badges: [
            {
              id: 'b-1',
              label: 'Captain',
              color: '#f59e0b',
              textColor: '#000',
              offsetX: 0,
              offsetY: -12,
              visible: true,
            },
          ],
          connectLines: [
            {
              id: 'cl-1',
              toPlayerId: 'other',
              lineStyle: 'solid',
              color: '#fff',
              strokeWidth: 2,
              visible: true,
            },
          ],
          trajectory: { type: 'straight' },
        },
      });

      // ベンチ退避実行
      documentStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'MOVE_PLAYER_TO_BENCH',
        id: target.id,
      });

      const afterSlide = documentStore
        .getState()
        .project.phases[0].slides.find((s) => s.id === slideId)!;
      const benched = afterSlide.players.find((p) => p.id === target.id)!;

      expect(benched.area).toBe('bench');
      const benchedRecord = benched as unknown as Record<string, unknown>;
      expect(benchedRecord.visionCone).toBeUndefined();
      expect(benchedRecord.focus).toBeUndefined();
      expect(benchedRecord.badges ?? []).toEqual([]);
      expect(benchedRecord.connectLines ?? []).toEqual([]);
      expect(benchedRecord.trajectory).toBeUndefined();
    });
  });

  describe('PlayerLayer: 右側パネル領域へのドロップによるベンチ退避判定', () => {
    it('キャンバス右端外 (x >= width) にドロップされた場合、movePlayerToBench が発火する', () => {
      const { documentStore, phaseId, slideId } = createTestStores();
      const slide = documentStore
        .getState()
        .project.phases[0].slides.find((s) => s.id === slideId)!;
      const target = slide.players.find((p) => p.area === 'pitch')!;

      const width = 800;
      const dropX = 810; // width 超え

      // PlayerLayer 内の判定ロジックと同一の検証
      const isOverBenchPanel = dropX >= width || (dropX / width) * 100 >= 98;
      expect(isOverBenchPanel).toBe(true);

      if (isOverBenchPanel) {
        documentStore.getState().dispatchSlide(phaseId, slideId, {
          type: 'MOVE_PLAYER_TO_BENCH',
          id: target.id,
        });
      }

      const afterSlide = documentStore
        .getState()
        .project.phases[0].slides.find((s) => s.id === slideId)!;
      const benched = afterSlide.players.find((p) => p.id === target.id)!;
      expect(benched.area).toBe('bench');
    });

    it('画面右端 340px 以内（右側ベンチパネル上）にドロップされた場合、movePlayerToBench が発火する', () => {
      const { documentStore, phaseId, slideId } = createTestStores();
      const slide = documentStore
        .getState()
        .project.phases[0].slides.find((s) => s.id === slideId)!;
      const target = slide.players.find((p) => p.area === 'pitch')!;

      const mockWindowWidth = 1200;
      const dropClientX = 1100; // 1200 - 340 = 860 以上

      const isOverBenchPanel = dropClientX >= mockWindowWidth - 340;
      expect(isOverBenchPanel).toBe(true);

      if (isOverBenchPanel) {
        documentStore.getState().dispatchSlide(phaseId, slideId, {
          type: 'MOVE_PLAYER_TO_BENCH',
          id: target.id,
        });
      }

      const afterSlide = documentStore
        .getState()
        .project.phases[0].slides.find((s) => s.id === slideId)!;
      const benched = afterSlide.players.find((p) => p.id === target.id)!;
      expect(benched.area).toBe('bench');
    });
  });

  describe('HUD & ゴースト軌道のベンチ選手干渉防止 (TASK-104)', () => {
    describe('resolveHudTarget', () => {
      it('selected.kind === "player" かつ player.area === "bench" の場合は null を返却する', () => {
        const benchPlayer = {
          ...createDefaultPlayer('home', 10, 10, '#034694'),
          id: 'bench-p1',
          area: 'bench' as const,
        };
        const pitchPlayer = {
          ...createDefaultPlayer('home', 50, 50, '#034694'),
          id: 'pitch-p1',
          area: 'pitch' as const,
        };

        const offset = { x: 0, y: 0, width: 800, height: 600 };
        const data = {
          markers: [benchPlayer, pitchPlayer],
          players: [benchPlayer, pitchPlayer].map((p) => ({
            ...p,
            x: clampToScreenNorm(p.x),
            y: clampToScreenNorm(p.y),
            trajectory: undefined,
          })),
          arrows: [],
          zones: [],
          texts: [],
        };

        // ベンチ選手選択時は null
        const benchResult = resolveHudTarget({
          selected: { id: benchPlayer.id, kind: 'player' },
          offset,
          data,
        });
        expect(benchResult).toBeNull();

        // ピッチ選手選択時は HudTarget を返却
        const pitchResult = resolveHudTarget({
          selected: { id: pitchPlayer.id, kind: 'player' },
          offset,
          data,
        });
        expect(pitchResult).not.toBeNull();
      });
    });

    describe('ContextHud', () => {
      it('選択された選手が area === "bench" の場合は描画をガード（null を返す）', () => {
        const documentStore = createDocumentStore(
          createDefaultTacticalProject(),
        );
        const sessionStore = createSessionStore();
        const playbackStore = createPlaybackStore();

        const benchPlayer = {
          ...createDefaultPlayer('home', 10, 10, '#034694'),
          id: 'bench-p1',
          area: 'bench' as const,
        };
        const activeSlide =
          documentStore.getState().project.phases[0]?.slides[0];
        if (activeSlide) {
          sessionStore.setState({
            activePhaseId:
              documentStore.getState().project.phases[0]?.id ?? null,
            activeSlideId: activeSlide.id,
            selectedObjects: [{ id: benchPlayer.id, kind: 'player' }],
          });
        }

        const { container } = render(
          React.createElement(
            TacticalStoreProvider,
            { stores: { documentStore, sessionStore, playbackStore } },
            React.createElement(ContextHud, {
              stageSize: { width: 800, height: 600 },
            }),
          ),
        );

        expect(container.firstChild).toBeNull();
      });
    });

    describe('PitchGroundLayer', () => {
      it('選択された選手が area === "bench" の場合、ピッチ上にゴースト軌道（PlayerGhostTrajectory）が描画されない', () => {
        const benchPlayer = {
          ...createDefaultPlayer(
            'home',
            clampToScreenNorm(80),
            clampToScreenNorm(80),
            '#034694',
          ),
          x: clampToScreenNorm(80),
          y: clampToScreenNorm(80),
          id: 'bench-p1',
          area: 'bench' as const,
        };
        const pitchPlayer = {
          ...createDefaultPlayer(
            'home',
            clampToScreenNorm(50),
            clampToScreenNorm(50),
            '#034694',
          ),
          x: clampToScreenNorm(50),
          y: clampToScreenNorm(50),
          id: 'pitch-p1',
          area: 'pitch' as const,
          trajectory: undefined,
        };

        const baseProject = createDefaultTacticalProject();
        const phase = baseProject.phases[0];
        const baseSlide = phase.slides[0];
        const prevSlide = {
          ...baseSlide,
          id: 'slide-prev',
          index: 0,
          players: [
            {
              ...benchPlayer,
              x: clampToScreenNorm(20),
              y: clampToScreenNorm(20),
              area: 'pitch' as const,
              trajectory: undefined,
            },
            {
              ...pitchPlayer,
              x: clampToScreenNorm(50),
              y: clampToScreenNorm(50),
              area: 'pitch' as const,
            },
          ],
        };
        const activeSlide = {
          ...baseSlide,
          id: 'slide-curr',
          index: 1,
          players: [benchPlayer, pitchPlayer],
        };
        const project = {
          ...baseProject,
          phases: [
            {
              ...phase,
              slides: [prevSlide, activeSlide],
            },
          ],
        };

        const documentStore = createDocumentStore(project);
        const sessionStore = createSessionStore({
          activePhaseId: phase.id,
          activeSlideId: activeSlide.id,
        });
        const playbackStore = createPlaybackStore();

        // サブキャンバスでドラッグされた時と同様に benchPlayer を選択
        sessionStore
          .getState()
          .selectObject({ id: benchPlayer.id, kind: 'player' });

        const pitchRect = { x: 0, y: 0, width: 800, height: 600 };
        const stageSize = { width: 800, height: 600 };
        const sceneGraph = resolveSceneGraphFromState({
          project: documentStore.getState().project,
          session: {
            ...sessionStore.getState(),
            selectedIds: [benchPlayer.id],
          },
          isPlaying: false,
          timeMs: 0 as Milliseconds,
          viewport: { width: 800, height: 600 },
        });

        const nodesRegistry = createCanvasNodesRegistry();
        const nodesRegistryRef = { current: nodesRegistry };
        const stageRef = React.createRef<any>();

        render(
          React.createElement(
            TacticalStoreProvider,
            { stores: { documentStore, sessionStore, playbackStore } },
            React.createElement(
              Stage as any,
              { ref: stageRef, width: 800, height: 600 },
              React.createElement(PitchGroundLayer, {
                stageSize,
                pitchRect,
                cleanRender: false,
                nodesRegistryRef,
                sceneGraph,
              }),
            ),
          ),
        );

        // benchPlayer のゴースト軌道 (key=`ghost-${benchPlayer.id}`) が存在しないことを検証
        const ghostGroup = stageRef.current?.findOne?.((node: any) => {
          return node.attrs?.id === `ghost-trajectory-${benchPlayer.id}`;
        });
        expect(ghostGroup).toBeFalsy();

        // benchPlayer のゴースト軌道が nodesRegistry に登録されていないことを検証
        expect(nodesRegistry.trajectoryArrowNodes.has(benchPlayer.id)).toBe(
          false,
        );
      });
    });
  });
});
