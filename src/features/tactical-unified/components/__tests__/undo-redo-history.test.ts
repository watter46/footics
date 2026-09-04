import { beforeEach, describe, expect, it } from 'vitest';
import {
  selectCanRedo,
  selectCanUndo,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import {
  type ArrowAnnotation,
  createDefaultPlayer,
  type TextAnnotation,
  type ZoneAnnotation,
} from '@/lib/types/tactical-unified';

describe('Tactical Unified Store - Undo / Redo History Stack', () => {
  beforeEach(() => {
    const store = useTacticalUnifiedStore.getState();
    store.resetProject();
    store.clearSelection();
  });

  it('初期状態では past, future は空で canUndo/canRedo は false', () => {
    const state = useTacticalUnifiedStore.getState();
    expect(state.past).toHaveLength(0);
    expect(state.future).toHaveLength(0);
    expect(selectCanUndo(state)).toBe(false);
    expect(selectCanRedo(state)).toBe(false);
  });

  it('選手の追加・移動・削除で履歴が記録され、undo/redo できる', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;
    const initialCount =
      store.project.slides.find((s) => s.id === slideId)?.players.length ?? 0;

    // 1. 選手追加
    const player = createDefaultPlayer('home', 20, 30, '#034694');
    store.addPlayer(player);

    let state = useTacticalUnifiedStore.getState();
    expect(state.past).toHaveLength(1);
    expect(selectCanUndo(state)).toBe(true);
    expect(selectCanRedo(state)).toBe(false);
    expect(state.project.slides[0]?.players).toHaveLength(initialCount + 1);

    // 2. 選手移動 (確定操作)
    store.movePlayer(slideId, player.id, 50, 60);

    state = useTacticalUnifiedStore.getState();
    expect(state.past).toHaveLength(2);
    const movedPlayer = state.project.slides[0]?.players.find(
      (p) => p.id === player.id,
    );
    expect(movedPlayer?.x).toBeCloseTo(50);
    expect(movedPlayer?.y).toBeCloseTo(60);

    // 3. Undo (移動前の (20, 30) に戻る)
    store.undo();
    state = useTacticalUnifiedStore.getState();
    expect(state.past).toHaveLength(1);
    expect(state.future).toHaveLength(1);
    expect(selectCanUndo(state)).toBe(true);
    expect(selectCanRedo(state)).toBe(true);
    const undonePlayer = state.project.slides[0]?.players.find(
      (p) => p.id === player.id,
    );
    expect(undonePlayer?.x).toBeCloseTo(20);
    expect(undonePlayer?.y).toBeCloseTo(30);

    // 4. Undo (追加前に戻る)
    store.undo();
    state = useTacticalUnifiedStore.getState();
    expect(state.past).toHaveLength(0);
    expect(state.future).toHaveLength(2);
    expect(selectCanUndo(state)).toBe(false);
    expect(selectCanRedo(state)).toBe(true);
    expect(state.project.slides[0]?.players).toHaveLength(initialCount);

    // 5. Redo (選手追加状態に復元)
    store.redo();
    state = useTacticalUnifiedStore.getState();
    expect(state.past).toHaveLength(1);
    expect(state.future).toHaveLength(1);
    expect(state.project.slides[0]?.players).toHaveLength(initialCount + 1);
    const restoredPlayer = state.project.slides[0]?.players.find(
      (p) => p.id === player.id,
    );
    expect(restoredPlayer?.x).toBeCloseTo(20);

    // 6. Redo (移動状態に復元)
    store.redo();
    state = useTacticalUnifiedStore.getState();
    expect(state.past).toHaveLength(2);
    expect(state.future).toHaveLength(0);
    const reMovedPlayer = state.project.slides[0]?.players.find(
      (p) => p.id === player.id,
    );
    expect(reMovedPlayer?.x).toBeCloseTo(50);
    expect(reMovedPlayer?.y).toBeCloseTo(60);

    // 7. 選手削除
    store.removePlayer(slideId, player.id);
    state = useTacticalUnifiedStore.getState();
    expect(state.past).toHaveLength(3);
    expect(state.project.slides[0]?.players).toHaveLength(initialCount);

    // 8. Undo で選手が復活
    store.undo();
    state = useTacticalUnifiedStore.getState();
    expect(state.project.slides[0]?.players).toHaveLength(initialCount + 1);
  });

  it('アノテーション（矢印・ゾーン・テキスト）の追加・更新・削除の Undo / Redo', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;

    const arrow: ArrowAnnotation = {
      id: 'arrow-1',
      annotationType: 'arrow',
      arrowType: 'pass',
      curveType: 'straight',
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
      color: '#ffffff',
      strokeWidth: 3,
      dashArray: [],
      arrowHead: true,
    };

    const zone: ZoneAnnotation = {
      id: 'zone-1',
      annotationType: 'zone',
      zoneType: 'space',
      points: [
        { x: 30, y: 30 },
        { x: 40, y: 30 },
        { x: 40, y: 40 },
        { x: 30, y: 40 },
      ],
      color: '#f59e0b',
      opacity: 0.3,
      strokeWidth: 0,
    };

    const text: TextAnnotation = {
      id: 'text-1',
      annotationType: 'text',
      x: 50,
      y: 50,
      content: 'Press here',
      fontSize: 16,
      color: '#ffffff',
      bold: true,
      italic: false,
    };

    store.addArrow(slideId, arrow);
    store.addZone(slideId, zone);
    store.addText(slideId, text);

    let state = useTacticalUnifiedStore.getState();
    expect(state.past).toHaveLength(3);
    expect(state.project.slides[0]?.arrows).toHaveLength(1);
    expect(state.project.slides[0]?.zones).toHaveLength(1);
    expect(state.project.slides[0]?.texts).toHaveLength(1);

    // テキスト編集
    store.updateText(slideId, 'text-1', { content: 'Updated Press' });
    state = useTacticalUnifiedStore.getState();
    expect(state.project.slides[0]?.texts[0]?.content).toBe('Updated Press');

    // Undo text edit
    store.undo();
    state = useTacticalUnifiedStore.getState();
    expect(state.project.slides[0]?.texts[0]?.content).toBe('Press here');

    // Undo addText
    store.undo();
    state = useTacticalUnifiedStore.getState();
    expect(state.project.slides[0]?.texts).toHaveLength(0);

    // Undo addZone
    store.undo();
    state = useTacticalUnifiedStore.getState();
    expect(state.project.slides[0]?.zones).toHaveLength(0);

    // Undo addArrow
    store.undo();
    state = useTacticalUnifiedStore.getState();
    expect(state.project.slides[0]?.arrows).toHaveLength(0);
  });

  it('フォーメーション適用とピッチ左右入れ替えの Undo / Redo', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;
    const initialSlide = store.project.slides[0];
    const initialHomePlayers =
      initialSlide?.players.filter((p) => p.team === 'home') ?? [];

    store.applyFormation(slideId, '4-3-3', 'full', 'home');
    let state = useTacticalUnifiedStore.getState();
    expect(
      state.project.slides[0]?.players.filter(
        (p) => p.team === 'home' && p.area === 'pitch',
      ),
    ).toHaveLength(11);

    // ピッチ反転 (Swap Team Sides)
    const initialP0 = state.project.slides[0]?.players[0]?.x ?? 0;
    store.swapTeamSides(slideId);
    state = useTacticalUnifiedStore.getState();
    const flippedP0 = state.project.slides[0]?.players[0]?.x ?? 0;
    expect(flippedP0).toBeCloseTo(100 - initialP0);

    // Undo swap sides
    store.undo();
    state = useTacticalUnifiedStore.getState();
    expect(state.project.slides[0]?.players[0]?.x).toBeCloseTo(initialP0);

    // Undo formation
    store.undo();
    state = useTacticalUnifiedStore.getState();
    const revertedHomePlayers = state.project.slides[0]?.players.filter(
      (p) => p.team === 'home',
    );
    expect(revertedHomePlayers).toHaveLength(initialHomePlayers.length);
  });

  it('スライド追加・削除の Undo / Redo', () => {
    const store = useTacticalUnifiedStore.getState();
    expect(store.project.slides).toHaveLength(1);

    const newSlideId = store.addSlide(undefined, 'blank');
    let state = useTacticalUnifiedStore.getState();
    expect(state.project.slides).toHaveLength(2);
    expect(state.activeSlideId).toBe(newSlideId);

    // Undo slide addition
    store.undo();
    state = useTacticalUnifiedStore.getState();
    expect(state.project.slides).toHaveLength(1);

    // Redo slide addition
    store.redo();
    state = useTacticalUnifiedStore.getState();
    expect(state.project.slides).toHaveLength(2);
    expect(state.project.slides.some((s) => s.id === newSlideId)).toBe(true);
  });

  it('履歴スタックは最大50件に制限され、51件目以降は古いものが切り詰められる', () => {
    const store = useTacticalUnifiedStore.getState();

    // 55 回の確定操作を実行
    for (let i = 0; i < 55; i++) {
      const p = createDefaultPlayer('home', i % 100, (i * 2) % 100, '#034694');
      store.addPlayer(p);
    }

    const state = useTacticalUnifiedStore.getState();
    expect(state.past).toHaveLength(50);
  });

  it('Undo 後に新しい確定操作を行うと future はクリアされる', () => {
    const store = useTacticalUnifiedStore.getState();
    const p1 = createDefaultPlayer('home', 10, 10, '#034694');
    const p2 = createDefaultPlayer('home', 20, 20, '#034694');

    store.addPlayer(p1);
    store.addPlayer(p2);

    store.undo();
    let state = useTacticalUnifiedStore.getState();
    expect(state.future).toHaveLength(1);

    // 新しい操作を実行
    const p3 = createDefaultPlayer('away', 30, 30, '#ef4444');
    store.addPlayer(p3);

    state = useTacticalUnifiedStore.getState();
    expect(state.future).toHaveLength(0);
    expect(selectCanRedo(state)).toBe(false);
  });
});
