import { beforeEach, describe, expect, it } from 'vitest';
import { executeRemoveSelected } from '@/features/tactical-unified/adapters/adapter-selection-helpers';
import {
  cloneSlideShallow,
  cloneSlidesShallow,
  recordHistory,
} from '@/features/tactical-unified/stores/store-helpers';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import {
  createDefaultPlayer,
  createDefaultSlide,
  type Slide,
} from '@/lib/types/tactical-unified';

describe('cloneSlideShallow and cloneSlidesShallow', () => {
  it('スライドを正しくシャロークローンし、配列参照を分離する', () => {
    const base = createDefaultSlide(0, 'slide-1');
    const originalSlide: Slide = {
      ...base,
      players: [
        {
          ...createDefaultPlayer('home', 20, 30, '#034694'),
          id: 'p1',
          connectLines: [
            {
              id: 'cl1',
              toPlayerId: 'p2',
              lineStyle: 'dashed',
              color: '#fff',
              strokeWidth: 2,
              visible: true,
            },
          ],
          badges: [
            {
              id: 'b1',
              label: 'C',
              color: '#ff0',
              textColor: '#000',
              offsetX: 0,
              offsetY: -12,
              visible: true,
            },
          ],
        },
      ],
      arrows: [
        {
          id: 'a1',
          annotationType: 'arrow',
          arrowType: 'pass',
          curveType: 'straight',
          points: [
            { x: 10, y: 10 },
            { x: 20, y: 20 },
          ],
          color: '#fff',
          strokeWidth: 2,
          dashArray: [],
          arrowHead: true,
          controlPoint: { x: 15, y: 15 },
        },
      ],
      zones: [
        {
          id: 'z1',
          annotationType: 'zone',
          zoneType: 'generic',
          points: [
            { x: 50, y: 50 },
            { x: 70, y: 50 },
          ],
          color: '#0000ff',
          opacity: 0.5,
          strokeWidth: 1,
        },
      ],
      texts: [
        {
          id: 't1',
          annotationType: 'text',
          content: 'Tactics note',
          x: 100,
          y: 100,
          fontSize: 16,
          color: '#fff',
          bold: false,
          italic: false,
        },
      ],
      pitchTransform: {
        panX: 0,
        panY: 0,
        zoom: 1,
        tilt: 0,
        isLocked: false,
      },
      boundaryBox: {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        enabled: true,
      },
      ball: {
        x: 50,
        y: 50,
        visible: true,
      },
    };

    const cloned = cloneSlideShallow(originalSlide);

    expect(cloned).toEqual(originalSlide);
    expect(cloned).not.toBe(originalSlide);
    expect(cloned.players).not.toBe(originalSlide.players);
    expect(cloned.players[0]).not.toBe(originalSlide.players[0]);
    expect(cloned.players[0]?.connectLines).not.toBe(
      originalSlide.players[0]?.connectLines,
    );
    expect(cloned.players[0]?.style).not.toBe(originalSlide.players[0]?.style);
    expect(cloned.players[0]?.badges).not.toBe(
      originalSlide.players[0]?.badges,
    );
    expect(cloned.arrows).not.toBe(originalSlide.arrows);
    expect(cloned.arrows[0]?.points).not.toBe(originalSlide.arrows[0]?.points);
    expect(cloned.arrows[0]?.controlPoint).not.toBe(
      originalSlide.arrows[0]?.controlPoint,
    );
    expect(cloned.zones).not.toBe(originalSlide.zones);
    expect(cloned.zones[0]?.points).not.toBe(originalSlide.zones[0]?.points);
    expect(cloned.texts).not.toBe(originalSlide.texts);
    expect(cloned.texts[0]).not.toBe(originalSlide.texts[0]);
    expect(cloned.pitchTransform).not.toBe(originalSlide.pitchTransform);
    expect(cloned.boundaryBox).not.toBe(originalSlide.boundaryBox);
    expect(cloned.ball).not.toBe(originalSlide.ball);
  });

  it('cloneSlidesShallow が全スライドを独立して複製する', () => {
    const s1 = createDefaultSlide(0, 's1');
    const s2 = createDefaultSlide(1, 's2');
    const slides: Slide[] = [s1, s2];

    const clonedSlides = cloneSlidesShallow(slides);
    expect(clonedSlides).toHaveLength(2);
    expect(clonedSlides).not.toBe(slides);
    expect(clonedSlides[0]).not.toBe(slides[0]);
    expect(clonedSlides[1]).not.toBe(slides[1]);
  });

  it('recordHistory が浅いクローンで履歴を作成する', () => {
    const s1 = createDefaultSlide(0, 's1');
    const state = {
      project: {
        phases: [{ id: 'p1', name: 'P1', slides: [s1] }],
      },
      past: [],
    };

    const result = recordHistory(state as any);
    expect(result.past).toHaveLength(1);
    expect(result.past[0]).not.toBe(state.project.phases);
    expect(result.past[0]?.[0]).not.toBe(state.project.phases[0]);
    expect(result.future).toEqual([]);
  });
});

describe('deleteSelectedObjects (Batch Delete)', () => {
  beforeEach(() => {
    const store = useTacticalUnifiedStore.getState();
    store.resetProject();
    store.clearSelection();
  });

  it('選択された複数オブジェクト（選手、矢印、ゾーン、テキスト）を単一の履歴記録で一括削除する', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;

    const player1 = {
      ...createDefaultPlayer('home', 10, 10, '#034694'),
      id: 'p1',
    };
    const player2 = {
      ...createDefaultPlayer('away', 20, 20, '#dc2626'),
      id: 'p2',
    };
    store.addPlayer(player1);
    store.addPlayer(player2);

    store.addArrow(slideId, {
      id: 'a1',
      annotationType: 'arrow',
      arrowType: 'pass',
      curveType: 'straight',
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
      color: '#fff',
      strokeWidth: 2,
      dashArray: [],
      arrowHead: true,
      sourcePlayerId: 'p1',
      targetPlayerId: 'p2',
    });

    store.addZone(slideId, {
      id: 'z1',
      annotationType: 'zone',
      zoneType: 'generic',
      points: [
        { x: 30, y: 30 },
        { x: 40, y: 30 },
      ],
      color: '#0000ff',
      opacity: 0.5,
      strokeWidth: 1,
    });

    store.addText(slideId, {
      id: 't1',
      annotationType: 'text',
      content: 'Note 1',
      x: 40,
      y: 40,
      fontSize: 14,
      color: '#fff',
      bold: false,
      italic: false,
    });

    // 選択: p1, z1, t1 を同時に選択
    store.selectObjects([
      { id: 'p1', kind: 'player' },
      { id: 'z1', kind: 'zone' },
      { id: 't1', kind: 'text' },
    ]);

    const pastLengthBefore = useTacticalUnifiedStore.getState().past.length;

    // 一括削除実行
    useTacticalUnifiedStore.getState().deleteSelectedObjects(slideId);

    const updatedSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    const updatedState = useTacticalUnifiedStore.getState();

    // 履歴は1回だけ増える
    expect(updatedState.past.length).toBe(pastLengthBefore + 1);

    // p1 が削除され、p2 は残る
    expect(updatedSlide?.players.some((p) => p.id === 'p1')).toBe(false);
    expect(updatedSlide?.players.some((p) => p.id === 'p2')).toBe(true);

    // p1 に接続されていた矢印 a1 も連鎖削除される
    expect(updatedSlide?.arrows.some((a) => a.id === 'a1')).toBe(false);

    // z1, t1 が削除される
    expect(updatedSlide?.zones.some((z) => z.id === 'z1')).toBe(false);
    expect(updatedSlide?.texts.some((t) => t.id === 't1')).toBe(false);

    // 削除されたオブジェクトは selectedObjects から除外される
    expect(updatedState.selectedObjects).toHaveLength(0);
    expect(updatedState.isDirty).toBe(true);
  });

  it('ロック中のオブジェクトは一括削除から保護され、選択状態も残る', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;

    const lockedPlayer = {
      ...createDefaultPlayer('home', 10, 10, '#034694'),
      id: 'locked-p',
      locked: true,
    };
    const normalPlayer = {
      ...createDefaultPlayer('home', 20, 20, '#034694'),
      id: 'normal-p',
      locked: false,
    };
    store.addPlayer(lockedPlayer);
    store.addPlayer(normalPlayer);

    store.selectObjects([
      { id: 'locked-p', kind: 'player' },
      { id: 'normal-p', kind: 'player' },
    ]);

    useTacticalUnifiedStore.getState().deleteSelectedObjects(slideId);

    const updatedSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    const updatedState = useTacticalUnifiedStore.getState();

    // normal-p は削除されるが、locked-p は残る
    expect(updatedSlide?.players.some((p) => p.id === 'normal-p')).toBe(false);
    expect(updatedSlide?.players.some((p) => p.id === 'locked-p')).toBe(true);

    // ロックされた locked-p は selectedObjects に残る
    expect(updatedState.selectedObjects).toEqual([
      { id: 'locked-p', kind: 'player' },
    ]);
  });

  it('executeRemoveSelected が deleteSelectedObjects を経由して削除する', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;

    const player = {
      ...createDefaultPlayer('home', 10, 10, '#034694'),
      id: 'p1',
    };
    store.addPlayer(player);
    store.selectObject({ id: 'p1', kind: 'player' });

    executeRemoveSelected(useTacticalUnifiedStore.getState());

    const updatedSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    expect(updatedSlide?.players.some((p) => p.id === 'p1')).toBe(false);
  });
});
