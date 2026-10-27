import { beforeEach, describe, expect, it } from 'vitest';
import { createTacticalCanvasStoreAdapter } from '@/features/tactical-unified/adapters/tactical-canvas-store-adapter';
import { createCanvasStore } from '@/features/tactical-unified/core/store/canvas-store';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { createDefaultPlayer } from '@/lib/types/tactical-unified';

describe('Multi-Marker Drag & Bulk Bench Actions', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.setState((state) => ({
      ...state,
      selectedObjects: [],
      activeTool: 'select',
    }));
  });

  describe('updatePlayers in slide-player-crud-slice', () => {
    it('1回の履歴記録で複数プレイヤーの座標を一括アトミック更新し、1回のundoで元に戻る', () => {
      const store = useTacticalUnifiedStore.getState();
      const slideId = store.activeSlideId;

      const p1 = createDefaultPlayer('home', 20, 30, '#ff0000');
      const p2 = createDefaultPlayer('home', 40, 50, '#ff0000');
      store.addPlayer(p1);
      store.addPlayer(p2);

      const pastCountBefore = useTacticalUnifiedStore.getState().past.length;

      store.updatePlayers(slideId, [
        { id: p1.id, patch: { x: 25, y: 35 } },
        { id: p2.id, patch: { x: 45, y: 55 } },
      ]);

      const slideAfter = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      const updatedP1 = slideAfter?.players.find((p) => p.id === p1.id);
      const updatedP2 = slideAfter?.players.find((p) => p.id === p2.id);

      expect(updatedP1?.x).toBe(25);
      expect(updatedP1?.y).toBe(35);
      expect(updatedP2?.x).toBe(45);
      expect(updatedP2?.y).toBe(55);

      // 履歴は1件のみ増加していること
      const pastCountAfter = useTacticalUnifiedStore.getState().past.length;
      expect(pastCountAfter).toBe(pastCountBefore + 1);

      // undo 1回で両方のプレイヤーの座標が元に戻ること
      useTacticalUnifiedStore.getState().undo();
      const slideUndone = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      const undoneP1 = slideUndone?.players.find((p) => p.id === p1.id);
      const undoneP2 = slideUndone?.players.find((p) => p.id === p2.id);

      expect(undoneP1?.x).toBe(20);
      expect(undoneP1?.y).toBe(30);
      expect(undoneP2?.x).toBe(40);
      expect(undoneP2?.y).toBe(50);
    });

    it('ロックされたプレイヤーは locked 変更なしの更新をスキップする', () => {
      const store = useTacticalUnifiedStore.getState();
      const slideId = store.activeSlideId;

      const lockedPlayer = {
        ...createDefaultPlayer('home', 10, 10, '#ff0000'),
        locked: true,
      };
      const normalPlayer = createDefaultPlayer('away', 20, 20, '#0000ff');
      store.addPlayer(lockedPlayer);
      store.addPlayer(normalPlayer);

      store.updatePlayers(slideId, [
        { id: lockedPlayer.id, patch: { x: 99, y: 99 } },
        { id: normalPlayer.id, patch: { x: 88, y: 88 } },
      ]);

      const slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      const p1 = slide?.players.find((p) => p.id === lockedPlayer.id);
      const p2 = slide?.players.find((p) => p.id === normalPlayer.id);

      expect(p1?.x).toBe(10); // 変更されない
      expect(p2?.x).toBe(88); // 正常に更新される
    });
  });

  describe('updateMarkers in canvas-store & adapter', () => {
    it('createCanvasStore で updateMarkers を呼び出すと複数マーカーが1回のUndoで更新される', () => {
      const p1 = createDefaultPlayer('home', 10, 10, '#ff0000');
      const p2 = createDefaultPlayer('away', 20, 20, '#0000ff');
      const canvasStore = createCanvasStore({
        mode: 'tactical-board',
        initialAnnotations: JSON.stringify({
          markers: [p1, p2],
        }),
      });

      canvasStore.getState().updateMarkers([
        { id: p1.id, patch: { x: 30, y: 30 } },
        { id: p2.id, patch: { x: 40, y: 40 } },
      ]);

      const state = canvasStore.getState();
      const m1 = state.annotations.markers.find((m) => m.id === p1.id);
      const m2 = state.annotations.markers.find((m) => m.id === p2.id);
      expect(m1?.x).toBe(30);
      expect(m2?.x).toBe(40);

      // 履歴テスト
      expect(canvasStore.getState().history.past.length).toBe(1);
      canvasStore.getState().undo();

      const undoneState = canvasStore.getState();
      const u1 = undoneState.annotations.markers.find((m) => m.id === p1.id);
      const u2 = undoneState.annotations.markers.find((m) => m.id === p2.id);
      expect(u1?.x).toBe(10);
      expect(u2?.x).toBe(20);
    });

    it('tactical-canvas-store-adapter 経由で updateMarkers を呼ぶと unifiedStore の slide players が更新される', () => {
      const adapter = createTacticalCanvasStoreAdapter(useTacticalUnifiedStore);
      const slideId = useTacticalUnifiedStore.getState().activeSlideId;

      const p1 = createDefaultPlayer('home', 15, 25, '#ff0000');
      const p2 = createDefaultPlayer('away', 35, 45, '#0000ff');
      useTacticalUnifiedStore.getState().addPlayer(p1);
      useTacticalUnifiedStore.getState().addPlayer(p2);

      adapter.getState().updateMarkers([
        { id: p1.id, patch: { x: 50, y: 60 } },
        { id: p2.id, patch: { x: 70, y: 80 } },
      ]);

      const slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      const m1 = slide?.players.find((m) => m.id === p1.id);
      const m2 = slide?.players.find((m) => m.id === p2.id);
      expect(m1?.x).toBe(50);
      expect(m1?.y).toBe(60);
      expect(m2?.x).toBe(70);
      expect(m2?.y).toBe(80);
    });
  });

  describe('Bulk bench drop logic', () => {
    it('複数マーカー選択状態でベンチドロップ時、全マーカーがベンチに移動する', () => {
      const store = useTacticalUnifiedStore.getState();
      const slideId = store.activeSlideId;

      const p1 = createDefaultPlayer('home', 10, 10, '#ff0000');
      const p2 = createDefaultPlayer('home', 20, 20, '#ff0000');
      store.addPlayer(p1);
      store.addPlayer(p2);

      // 複数マーカーをベンチ移動
      const selectedIds = [p1.id, p2.id];
      for (const id of selectedIds) {
        store.movePlayerToBench(slideId, id);
      }

      const slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      const m1 = slide?.players.find((m) => m.id === p1.id);
      const m2 = slide?.players.find((m) => m.id === p2.id);

      expect(m1?.area).toBe('bench');
      expect(m2?.area).toBe('bench');
    });
  });
});
