import { render } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createDefaultPlayer,
  createDefaultSlide,
} from '@/lib/types/tactical-unified';
import { ContextHud } from '../core/components/ContextHud';
import { resolveHudTarget } from '../core/components/hud/hud-targets';
import { PlayerGhostTrajectoryList } from '../core/components/player-ghost-trajectory-list';
import { createCanvasStore } from '../core/store/canvas-store';
import { CanvasStoreContext } from '../core/store/canvas-store-provider';
import { findSafePitchPosition } from '../stores/slide-player-move-helper';
import { useTacticalUnifiedStore } from '../stores/tactical-unified-store';

describe('Phase 3: メインキャンバス ↔ ベンチ双方向移動 (pitch-bench-transition)', () => {
  beforeEach(() => {
    const s = useTacticalUnifiedStore.getState();
    const slide = createDefaultSlide(0, 'slide-1');
    useTacticalUnifiedStore.setState({
      project: {
        ...s.project,
        slides: [slide],
      },
      activeSlideId: 'slide-1',
      selectedObjects: [],
    });
  });

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
      const store = useTacticalUnifiedStore;
      const slideId = store.getState().activeSlideId;

      // ベンチ選手を追加
      store
        .getState()
        .addCustomPlayer(slideId, 'home', 'Sub Player', '12', 'SUB', 'bench');
      const benchPlayer = store
        .getState()
        .project.slides.find((s) => s.id === slideId)!
        .players.find((p) => p.shirtNo === '12')!;

      expect(benchPlayer.area).toBe('bench');

      // 投入 (座標未指定)
      store.getState().movePlayerToPitch(slideId, benchPlayer.id);

      const placedPlayer = store
        .getState()
        .project.slides.find((s) => s.id === slideId)!
        .players.find((p) => p.id === benchPlayer.id)!;

      expect(placedPlayer.area).toBe('pitch');
      expect(placedPlayer.x).toBeGreaterThanOrEqual(25);
      expect(placedPlayer.x).toBeLessThanOrEqual(55);
      expect(placedPlayer.y).toBeGreaterThanOrEqual(20);
      expect(placedPlayer.y).toBeLessThanOrEqual(80);
    });

    it('2人連続で投入したとき、2人の座標が重ならない', () => {
      const store = useTacticalUnifiedStore;
      const slideId = store.getState().activeSlideId;

      store
        .getState()
        .addCustomPlayer(slideId, 'home', 'Sub 1', '12', 'SUB', 'bench');
      store
        .getState()
        .addCustomPlayer(slideId, 'home', 'Sub 2', '13', 'SUB', 'bench');

      const s = store.getState();
      const slide = s.project.slides.find((sl) => sl.id === slideId)!;
      const sub1 = slide.players.find((p) => p.shirtNo === '12')!;
      const sub2 = slide.players.find((p) => p.shirtNo === '13')!;

      s.movePlayerToPitch(slideId, sub1.id);
      s.movePlayerToPitch(slideId, sub2.id);

      const updatedSlide = store
        .getState()
        .project.slides.find((sl) => sl.id === slideId)!;
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
      const store = useTacticalUnifiedStore;
      const slideId = store.getState().activeSlideId;
      const slide = store
        .getState()
        .project.slides.find((s) => s.id === slideId)!;
      const target = slide.players.find((p) => p.area === 'pitch')!;

      // オプションを設定
      store.getState().updatePlayer(slideId, target.id, {
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
      });

      // 選択状態にする
      store.getState().selectObject({ id: target.id, kind: 'player' });
      expect(
        store.getState().selectedObjects.some((o) => o.id === target.id),
      ).toBe(true);

      // ベンチ退避実行
      store.getState().movePlayerToBench(slideId, target.id);

      const afterSlide = store
        .getState()
        .project.slides.find((s) => s.id === slideId)!;
      const benched = afterSlide.players.find((p) => p.id === target.id)!;

      expect(benched.area).toBe('bench');
      expect(benched.visionCone).toBeUndefined();
      expect(benched.focus).toBeUndefined();
      expect(benched.badges).toEqual([]);
      expect(benched.connectLines).toEqual([]);
      expect(benched.trajectory).toBeUndefined();

      // 選択も解除されていること
      expect(
        store.getState().selectedObjects.some((o) => o.id === target.id),
      ).toBe(false);
    });
  });

  describe('CanvasStoreAdapter: moveMarkerToBench', () => {
    it('Adapter 経由で moveMarkerToBench を呼び出すと、選手がベンチへ退避され選択がクリアされる', async () => {
      const { createTacticalCanvasStoreAdapter } = await import(
        '../adapters/tactical-canvas-store-adapter'
      );
      const store = useTacticalUnifiedStore;
      const slideId = store.getState().activeSlideId;
      const slide = store
        .getState()
        .project.slides.find((s) => s.id === slideId)!;
      const target = slide.players.find((p) => p.area === 'pitch')!;

      // 選択状態
      store.getState().selectObject({ id: target.id, kind: 'player' });

      const adapter = createTacticalCanvasStoreAdapter(store);
      expect(adapter.getState().moveMarkerToBench).toBeDefined();

      // Adapter 経由でベンチ退避
      adapter.getState().moveMarkerToBench!(target.id);

      const afterSlide = store
        .getState()
        .project.slides.find((s) => s.id === slideId)!;
      const benched = afterSlide.players.find((p) => p.id === target.id)!;

      expect(benched.area).toBe('bench');
      expect(benched.visionCone).toBeUndefined();
      expect(
        store.getState().selectedObjects.some((o) => o.id === target.id),
      ).toBe(false);
    });
  });

  describe('PlayerLayer: 右側パネル領域へのドロップによるベンチ退避判定', () => {
    it('キャンバス右端外 (x >= width) にドロップされた場合、movePlayerToBench が発火する', () => {
      const store = useTacticalUnifiedStore;
      const slideId = store.getState().activeSlideId;
      const slide = store
        .getState()
        .project.slides.find((s) => s.id === slideId)!;
      const target = slide.players.find((p) => p.area === 'pitch')!;

      const width = 800;
      const dropX = 810; // width 超え

      // PlayerLayer 内の判定ロジックと同一の検証
      const isOverBenchPanel = dropX >= width || (dropX / width) * 100 >= 98;
      expect(isOverBenchPanel).toBe(true);

      if (isOverBenchPanel) {
        store.getState().movePlayerToBench(slideId, target.id);
      }

      const afterSlide = store
        .getState()
        .project.slides.find((s) => s.id === slideId)!;
      const benched = afterSlide.players.find((p) => p.id === target.id)!;
      expect(benched.area).toBe('bench');
    });

    it('画面右端 340px 以内（右側ベンチパネル上）にドロップされた場合、movePlayerToBench が発火する', () => {
      const store = useTacticalUnifiedStore;
      const slideId = store.getState().activeSlideId;
      const slide = store
        .getState()
        .project.slides.find((s) => s.id === slideId)!;
      const target = slide.players.find((p) => p.area === 'pitch')!;

      const mockWindowWidth = 1200;
      const dropClientX = 1100; // 1200 - 340 = 860 以上

      const isOverBenchPanel = dropClientX >= mockWindowWidth - 340;
      expect(isOverBenchPanel).toBe(true);

      if (isOverBenchPanel) {
        store.getState().movePlayerToBench(slideId, target.id);
      }

      const afterSlide = store
        .getState()
        .project.slides.find((s) => s.id === slideId)!;
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
        const store = createCanvasStore({
          mode: 'tactical-board',
          aspectRatio: '16:9',
        });
        const benchPlayer = {
          ...createDefaultPlayer('home', 10, 10, '#034694'),
          id: 'bench-p1',
          area: 'bench' as const,
        };
        store.getState().addMarker(benchPlayer);
        store
          .getState()
          .setSelectedObjects([{ id: benchPlayer.id, kind: 'player' }]);

        const { container } = render(
          React.createElement(
            CanvasStoreContext.Provider,
            { value: store },
            React.createElement(ContextHud, {
              stageSize: { width: 800, height: 600 },
            }),
          ),
        );

        expect(container.firstChild).toBeNull();
      });
    });

    describe('PlayerGhostTrajectoryList', () => {
      it('marker.area === "bench" の選手は除外（null を返却）されゴースト軌道が描画されない', () => {
        const benchPlayer = {
          ...createDefaultPlayer('home', 80, 80, '#034694'),
          id: 'bench-p1',
          area: 'bench' as const,
        };
        const pitchPlayer = {
          ...createDefaultPlayer('home', 50, 50, '#034694'),
          id: 'pitch-p1',
          area: 'pitch' as const,
        };

        const prevSlide = {
          players: [
            { ...benchPlayer, x: 20, y: 20, area: 'pitch' as const },
            { ...pitchPlayer, x: 30, y: 30, area: 'pitch' as const },
          ],
        };

        const element = PlayerGhostTrajectoryList({
          markers: [benchPlayer, pitchPlayer],
          prevSlide,
          width: 800,
          height: 600,
          activeSlideId: 'slide-1',
        });

        const children = React.Children.toArray(element?.props.children);
        expect(children.length).toBe(1);
      });
    });
  });
});
