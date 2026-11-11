import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { createDefaultPlayer } from '@/lib/types/tactical-unified';

describe('step5: bench and custom player store logic', () => {
  const store = useTacticalUnifiedStore;

  beforeEach(() => {
    store.getState().resetProject();
  });

  describe('slide-player-crud-slice: isCustom flag', () => {
    it('addPlayerFromPalette で手動追加した選手には isCustom: true が設定される', () => {
      const activeSlideId = store.getState().activeSlideId;
      const playerId = store.getState().addPlayerFromPalette('home', 50, 50);

      const slide = store
        .getState()
        .project.slides.find((s) => s.id === activeSlideId);
      const player = slide?.players.find((p) => p.id === playerId);

      expect(player).toBeDefined();
      expect(player?.isCustom).toBe(true);
    });

    it('addCustomPlayer で追加した選手には isCustom: true が設定される', () => {
      const activeSlideId = store.getState().activeSlideId;
      const playerId = store
        .getState()
        .addCustomPlayer(activeSlideId, 'home', 'Custom Player', '99', 'FW');

      const slide = store
        .getState()
        .project.slides.find((s) => s.id === activeSlideId);
      const player = slide?.players.find((p) => p.id === playerId);

      expect(player).toBeDefined();
      expect(player?.isCustom).toBe(true);
    });

    it('addPlayer で手動追加した選手には isCustom: true が付与される', () => {
      const activeSlideId = store.getState().activeSlideId;
      const newPlayer = createDefaultPlayer('home', 30, 30, '#001489');
      store.getState().addPlayer(newPlayer);

      const slide = store
        .getState()
        .project.slides.find((s) => s.id === activeSlideId);
      const player = slide?.players.find((p) => p.id === newPlayer.id);

      expect(player).toBeDefined();
      expect(player?.isCustom).toBe(true);
    });
  });

  describe('slide-player-move-slice: movePlayerToBench', () => {
    it('座標未指定時は既存ベンチ選手一覧と合わせて computeBenchGridPositions でグリッド座標が付与される', () => {
      const activeSlideId = store.getState().activeSlideId;
      const slide = store
        .getState()
        .project.slides.find((s) => s.id === activeSlideId)!;
      const pitchPlayer = slide.players.find((p) => p.area === 'pitch')!;

      store.getState().movePlayerToBench(activeSlideId, pitchPlayer.id);

      const updatedSlide = store
        .getState()
        .project.slides.find((s) => s.id === activeSlideId)!;
      const updatedPlayer = updatedSlide.players.find(
        (p) => p.id === pitchPlayer.id,
      )!;

      expect(updatedPlayer.area).toBe('bench');
      // 3列グリッドの x 座標 [20, 50, 80] のいずれかであること
      expect([20, 50, 80]).toContain(updatedPlayer.x);
    });

    it('座標 (x, y) 指定時は指定された座標にベンチ選手として配置される', () => {
      const activeSlideId = store.getState().activeSlideId;
      const slide = store
        .getState()
        .project.slides.find((s) => s.id === activeSlideId)!;
      const pitchPlayer = slide.players.find((p) => p.area === 'pitch')!;

      store.getState().movePlayerToBench(activeSlideId, pitchPlayer.id, 65, 45);

      const updatedSlide = store
        .getState()
        .project.slides.find((s) => s.id === activeSlideId)!;
      const updatedPlayer = updatedSlide.players.find(
        (p) => p.id === pitchPlayer.id,
      )!;

      expect(updatedPlayer.area).toBe('bench');
      expect(updatedPlayer.x).toBe(65);
      expect(updatedPlayer.y).toBe(45);
    });
  });
});
