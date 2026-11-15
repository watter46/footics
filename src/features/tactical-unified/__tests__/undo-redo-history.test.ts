import { beforeEach, describe, expect, it } from 'vitest';
import {
  createDocumentStore,
  type DocumentStore,
} from '@/features/tactical-unified/stores/document-store';
import { createDefaultTacticalProject } from '@/features/tactical-unified/stores/tactical-store-provider';
import { toScreenNormCoord } from '@/lib/types/tactical/branded';
import type {
  DomainArrowAnnotation,
  DomainPlayer,
  DomainTextAnnotation,
  DomainZoneAnnotation,
} from '@/lib/types/tactical/domain-entities';
import { createDefaultPlayer } from '@/lib/types/tactical-unified';

describe('Tactical Document Store - Undo / Redo History Stack', () => {
  const makePitchPlayer = (
    team: 'home' | 'away',
    x: number,
    y: number,
    color: string,
  ): DomainPlayer => ({
    ...createDefaultPlayer(team, x, y, color),
    area: 'pitch' as const,
    x: toScreenNormCoord(x),
    y: toScreenNormCoord(y),
    trajectory: undefined,
  });

  let docStore: DocumentStore;
  let phaseId: string;
  let slideId: string;

  beforeEach(() => {
    const project = createDefaultTacticalProject();
    docStore = createDocumentStore(project);
    phaseId = project.phases[0]?.id ?? '';
    slideId = project.phases[0]?.slides[0]?.id ?? '';
  });

  const getActiveSlide = () =>
    docStore
      .getState()
      .project.phases.find((p) => p.id === phaseId)
      ?.slides.find((s) => s.id === slideId);

  it('初期状態では past, future は空で canUndo/canRedo は false', () => {
    const state = docStore.getState();
    expect(state.past).toHaveLength(0);
    expect(state.future).toHaveLength(0);
    expect(state.canUndo()).toBe(false);
    expect(state.canRedo()).toBe(false);
  });

  it('選手の追加・移動・削除で履歴が記録され、undo/redo できる', () => {
    const initialCount = getActiveSlide()?.players.length ?? 0;

    // 1. 選手追加
    const player = makePitchPlayer('home', 20, 30, '#034694');
    docStore
      .getState()
      .dispatchSlide(phaseId, slideId, { type: 'ADD_PLAYER', player });

    let state = docStore.getState();
    expect(state.past).toHaveLength(1);
    expect(state.canUndo()).toBe(true);
    expect(state.canRedo()).toBe(false);
    expect(getActiveSlide()?.players).toHaveLength(initialCount + 1);

    // 2. 選手移動 (確定操作)
    docStore.getState().dispatchSlide(phaseId, slideId, {
      type: 'MOVE_PLAYERS',
      moves: [
        { id: player.id, x: toScreenNormCoord(50), y: toScreenNormCoord(60) },
      ],
    });

    state = docStore.getState();
    expect(state.past).toHaveLength(2);
    const movedPlayer = getActiveSlide()?.players.find(
      (p) => p.id === player.id,
    );
    expect(movedPlayer?.x).toBeCloseTo(50);
    expect(movedPlayer?.y).toBeCloseTo(60);

    // 3. Undo (移動前の (20, 30) に戻る)
    docStore.getState().undo();
    state = docStore.getState();
    expect(state.past).toHaveLength(1);
    expect(state.future).toHaveLength(1);
    expect(state.canUndo()).toBe(true);
    expect(state.canRedo()).toBe(true);
    const undonePlayer = getActiveSlide()?.players.find(
      (p) => p.id === player.id,
    );
    expect(undonePlayer?.x).toBeCloseTo(20);
    expect(undonePlayer?.y).toBeCloseTo(30);

    // 4. Undo (追加前に戻る)
    docStore.getState().undo();
    state = docStore.getState();
    expect(state.past).toHaveLength(0);
    expect(state.future).toHaveLength(2);
    expect(state.canUndo()).toBe(false);
    expect(state.canRedo()).toBe(true);
    expect(getActiveSlide()?.players).toHaveLength(initialCount);

    // 5. Redo (選手追加状態に復元)
    docStore.getState().redo();
    state = docStore.getState();
    expect(state.past).toHaveLength(1);
    expect(state.future).toHaveLength(1);
    expect(getActiveSlide()?.players).toHaveLength(initialCount + 1);
    const restoredPlayer = getActiveSlide()?.players.find(
      (p) => p.id === player.id,
    );
    expect(restoredPlayer?.x).toBeCloseTo(20);

    // 6. Redo (移動状態に復元)
    docStore.getState().redo();
    state = docStore.getState();
    expect(state.past).toHaveLength(2);
    expect(state.future).toHaveLength(0);
    const reMovedPlayer = getActiveSlide()?.players.find(
      (p) => p.id === player.id,
    );
    expect(reMovedPlayer?.x).toBeCloseTo(50);
    expect(reMovedPlayer?.y).toBeCloseTo(60);

    // 7. 選手削除
    docStore.getState().dispatchSlide(phaseId, slideId, {
      type: 'REMOVE_PLAYER',
      id: player.id,
    });
    state = docStore.getState();
    expect(state.past).toHaveLength(3);
    expect(getActiveSlide()?.players).toHaveLength(initialCount);

    // 8. Undo で選手が復活
    docStore.getState().undo();
    expect(getActiveSlide()?.players).toHaveLength(initialCount + 1);
  });

  it('アノテーション（矢印・ゾーン・テキスト）の追加・更新・削除の Undo / Redo', () => {
    const arrow: DomainArrowAnnotation = {
      id: 'arrow-1',
      annotationType: 'arrow',
      arrowType: 'pass',
      curveType: 'straight',
      points: [
        { x: toScreenNormCoord(10), y: toScreenNormCoord(10) },
        { x: toScreenNormCoord(20), y: toScreenNormCoord(20) },
      ],
      color: '#ffffff',
      strokeWidth: 3,
      dashArray: [],
      startMarker: 'none',
      endMarker: 'arrow',
    };

    const zone: DomainZoneAnnotation = {
      id: 'zone-1',
      annotationType: 'zone',
      zoneType: 'space',
      shapeType: 'polygon',
      points: [
        { x: toScreenNormCoord(30), y: toScreenNormCoord(30) },
        { x: toScreenNormCoord(40), y: toScreenNormCoord(30) },
        { x: toScreenNormCoord(40), y: toScreenNormCoord(40) },
        { x: toScreenNormCoord(30), y: toScreenNormCoord(40) },
      ],
      color: '#f59e0b',
      opacity: 0.3,
      strokeWidth: 0,
    };

    const text: DomainTextAnnotation = {
      id: 'text-1',
      annotationType: 'text',
      x: toScreenNormCoord(50),
      y: toScreenNormCoord(50),
      content: 'Press here',
      fontSize: 16,
      color: '#ffffff',
      bold: true,
      italic: false,
    };

    docStore
      .getState()
      .dispatchSlide(phaseId, slideId, { type: 'ADD_ARROW', arrow });
    docStore
      .getState()
      .dispatchSlide(phaseId, slideId, { type: 'ADD_ZONE', zone });
    docStore
      .getState()
      .dispatchSlide(phaseId, slideId, { type: 'ADD_TEXT', text });

    const state = docStore.getState();
    expect(state.past).toHaveLength(3);
    expect(getActiveSlide()?.arrows).toHaveLength(1);
    expect(getActiveSlide()?.zones).toHaveLength(1);
    expect(getActiveSlide()?.texts).toHaveLength(1);

    // テキスト編集
    docStore.getState().dispatchSlide(phaseId, slideId, {
      type: 'UPDATE_TEXT',
      id: 'text-1',
      patch: { content: 'Updated Press' },
    });
    expect(getActiveSlide()?.texts[0]?.content).toBe('Updated Press');

    // Undo text edit
    docStore.getState().undo();
    expect(getActiveSlide()?.texts[0]?.content).toBe('Press here');

    // Undo addText
    docStore.getState().undo();
    expect(getActiveSlide()?.texts).toHaveLength(0);

    // Undo addZone
    docStore.getState().undo();
    expect(getActiveSlide()?.zones).toHaveLength(0);

    // Undo addArrow
    docStore.getState().undo();
    expect(getActiveSlide()?.arrows).toHaveLength(0);
  });

  it('フォーメーション適用とピッチ左右入れ替えの Undo / Redo', () => {
    const initialSlide = getActiveSlide();
    const initialHomePlayers =
      initialSlide?.players.filter((p) => p.team === 'home') ?? [];
    const awayPlayers =
      initialSlide?.players.filter((p) => p.team === 'away') ?? [];

    const formationHomePlayers = Array.from({ length: 11 }, (_, i) =>
      makePitchPlayer('home', 10 + i * 3, 20 + (i % 4) * 15, '#034694'),
    );
    docStore.getState().dispatchSlide(phaseId, slideId, {
      type: 'REPLACE_PLAYERS',
      players: [...formationHomePlayers, ...awayPlayers],
    });
    expect(
      getActiveSlide()?.players.filter(
        (p) => p.team === 'home' && p.area === 'pitch',
      ),
    ).toHaveLength(11);

    // ピッチ反転 (Swap Team Sides)
    const initialP0 = getActiveSlide()?.players[0]?.x ?? 0;
    docStore
      .getState()
      .dispatchSlide(phaseId, slideId, { type: 'SWAP_TEAM_SIDES' });
    const flippedP0 = getActiveSlide()?.players[0]?.x ?? 0;
    expect(flippedP0).toBeCloseTo(100 - initialP0);

    // Undo swap sides
    docStore.getState().undo();
    expect(getActiveSlide()?.players[0]?.x).toBeCloseTo(initialP0);

    // Undo formation
    docStore.getState().undo();
    const revertedHomePlayers = getActiveSlide()?.players.filter(
      (p) => p.team === 'home',
    );
    expect(revertedHomePlayers).toHaveLength(initialHomePlayers.length);
  });

  it('スライド追加・削除の Undo / Redo', () => {
    expect(docStore.getState().project.phases[0]?.slides).toHaveLength(1);

    const newSlideId = 'slide-blank-1';
    docStore.getState().dispatch({
      type: 'ADD_SLIDE',
      phaseId,
      mode: 'blank',
      newSlideId,
    });
    expect(docStore.getState().project.phases[0]?.slides).toHaveLength(2);

    // Undo slide addition
    docStore.getState().undo();
    expect(docStore.getState().project.phases[0]?.slides).toHaveLength(1);

    // Redo slide addition
    docStore.getState().redo();
    const slides = docStore.getState().project.phases[0]?.slides ?? [];
    expect(slides).toHaveLength(2);
    expect(slides.some((s) => s.id === newSlideId)).toBe(true);
  });

  it('履歴スタックは最大50件に制限され、51件目以降は古いものが切り詰められる', () => {
    // 55 回の確定操作を実行
    for (let i = 0; i < 55; i++) {
      const p = makePitchPlayer('home', i % 100, (i * 2) % 100, '#034694');
      docStore
        .getState()
        .dispatchSlide(phaseId, slideId, { type: 'ADD_PLAYER', player: p });
    }

    expect(docStore.getState().past).toHaveLength(50);
  });

  it('Undo 後に新しい確定操作を行うと future はクリアされる', () => {
    const p1 = makePitchPlayer('home', 10, 10, '#034694');
    const p2 = makePitchPlayer('home', 20, 20, '#034694');

    docStore
      .getState()
      .dispatchSlide(phaseId, slideId, { type: 'ADD_PLAYER', player: p1 });
    docStore
      .getState()
      .dispatchSlide(phaseId, slideId, { type: 'ADD_PLAYER', player: p2 });

    docStore.getState().undo();
    expect(docStore.getState().future).toHaveLength(1);

    // 新しい操作を実行
    const p3 = makePitchPlayer('away', 30, 30, '#ef4444');
    docStore
      .getState()
      .dispatchSlide(phaseId, slideId, { type: 'ADD_PLAYER', player: p3 });

    const state = docStore.getState();
    expect(state.future).toHaveLength(0);
    expect(state.canRedo()).toBe(false);
  });
});
