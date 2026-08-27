/**
 * tactical-unified-store.test.ts
 * Unit tests for TacticalUnifiedStore
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { TacticalProject } from '@/lib/types/tactical-unified';
import {
  createDefaultPlayer,
  createDefaultProject,
} from '@/lib/types/tactical-unified';
import { useTacticalUnifiedStore } from '../tactical-unified-store';

describe('tactical-unified-store', () => {
  beforeEach(() => {
    const store = useTacticalUnifiedStore.getState();
    store.resetProject();
  });

  it('初期状態でスライドが1枚存在し、4-4-2の両チーム22名が配置される', () => {
    const { project } = useTacticalUnifiedStore.getState();
    expect(project.slides).toHaveLength(1);
    expect(project.slides[0]?.players).toHaveLength(22);
  });

  it('addSlide でスライドが追加される', () => {
    const store = useTacticalUnifiedStore.getState();
    store.addSlide();
    expect(useTacticalUnifiedStore.getState().project.slides).toHaveLength(2);
  });

  it('deleteSlide で最後の1枚は削除できない', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.project.activeSlideId;
    store.deleteSlide(slideId);
    expect(useTacticalUnifiedStore.getState().project.slides).toHaveLength(1);
  });

  it('addPlayer でアクティブスライドに選手が追加される', () => {
    const store = useTacticalUnifiedStore.getState();
    const initialCount = store.project.slides[0]?.players.length ?? 0;
    const player = createDefaultPlayer('home', 50, 50, '#034694');
    store.addPlayer(player);
    const activeSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find(
        (s) => s.id === useTacticalUnifiedStore.getState().activeSlideId,
      );
    expect(activeSlide?.players).toHaveLength(initialCount + 1);
  });

  it('removePlayer で選手が削除される', () => {
    const store = useTacticalUnifiedStore.getState();
    const player = createDefaultPlayer('home', 50, 50, '#034694');
    store.addPlayer(player);
    const countAfterAdd =
      useTacticalUnifiedStore.getState().project.slides[0]?.players.length ?? 0;
    store.removePlayer(store.activeSlideId, player.id);
    const activeSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find(
        (s) => s.id === useTacticalUnifiedStore.getState().activeSlideId,
      );
    expect(activeSlide?.players).toHaveLength(countAfterAdd - 1);
  });

  it('setAspectRatio で座標が変換される (16:9 → 9:16)', () => {
    const store = useTacticalUnifiedStore.getState();
    const player = createDefaultPlayer('home', 80, 30, '#034694');
    store.addPlayer(player);
    store.setAspectRatio('9:16');

    const slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find(
        (s) => s.id === useTacticalUnifiedStore.getState().activeSlideId,
      );
    const p = slide?.players.find((item) => item.id === player.id);
    // 16:9→9:16: x_v = y_h = 30, y_v = 100 - x_h = 100 - 80 = 20
    expect(p?.x).toBeCloseTo(30);
    expect(p?.y).toBeCloseTo(20);
  });

  it('selectObject で選択状態が更新される', () => {
    const store = useTacticalUnifiedStore.getState();
    const player = createDefaultPlayer('home', 50, 50, '#034694');
    store.addPlayer(player);
    store.selectObject({ id: player.id, kind: 'player' });

    expect(useTacticalUnifiedStore.getState().selectedObjects).toHaveLength(1);
    expect(useTacticalUnifiedStore.getState().selectedObjects[0]?.id).toBe(
      player.id,
    );
  });

  it('clearSelection で選択が解除される', () => {
    const store = useTacticalUnifiedStore.getState();
    const player = createDefaultPlayer('home', 50, 50, '#034694');
    store.addPlayer(player);
    store.selectObject({ id: player.id, kind: 'player' });
    store.clearSelection();
    expect(useTacticalUnifiedStore.getState().selectedObjects).toHaveLength(0);
  });

  it('loadProject でプロジェクトがロードされる', () => {
    const store = useTacticalUnifiedStore.getState();
    const newProject: TacticalProject = createDefaultProject('test-id');
    newProject.title = 'Test Project';
    store.loadProject(newProject);
    expect(useTacticalUnifiedStore.getState().project.title).toBe(
      'Test Project',
    );
    expect(useTacticalUnifiedStore.getState().isDirty).toBe(false);
  });

  it('isDirty が操作後に true になる', () => {
    const store = useTacticalUnifiedStore.getState();
    expect(store.isDirty).toBe(false);
    store.addSlide();
    expect(useTacticalUnifiedStore.getState().isDirty).toBe(true);
  });

  it('applyFormationPreset で同チームのみ置き換わる', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideBefore = store.project.slides.find(
      (s) => s.id === store.activeSlideId,
    );
    const initialAwayCount =
      slideBefore?.players.filter((p) => p.team === 'away').length ?? 0;

    store.applyFormationPreset(
      {
        name: '4-3-3',
        team: 'home',
        players: [
          { shirtNo: '9', position: 'CF', x: 60, y: 50 },
          { shirtNo: '10', position: 'AM', x: 45, y: 50 },
        ],
      },
      store.activeSlideId,
    );

    const slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find(
        (s) => s.id === useTacticalUnifiedStore.getState().activeSlideId,
      );
    const homePlayers = slide?.players.filter((p) => p.team === 'home') ?? [];
    const awayPlayers = slide?.players.filter((p) => p.team === 'away') ?? [];
    expect(homePlayers).toHaveLength(2);
    expect(awayPlayers).toHaveLength(initialAwayCount);
  });

  it('movePlayer で選手に紐づく矢印・テキスト・ボールが連動追従する', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;
    const player = createDefaultPlayer('home', 50, 50, '#034694');
    store.addPlayer(player);

    // 選手近傍の矢印を追加
    const arrowId = 'test-arrow-1';
    store.addArrow(slideId, {
      id: arrowId,
      annotationType: 'arrow',
      arrowType: 'pass',
      curveType: 'straight',
      sourcePlayerId: player.id,
      points: [
        { x: 50, y: 50 },
        { x: 70, y: 50 },
      ],
      color: '#ffffff',
      strokeWidth: 3,
      dashArray: [],
      arrowHead: true,
    });

    // 選手近傍のテキストを追加
    const textId = 'test-text-1';
    store.addText(slideId, {
      id: textId,
      annotationType: 'text',
      x: 52,
      y: 52,
      content: 'Pressing note',
      fontSize: 14,
      color: '#ffffff',
      bold: false,
      italic: false,
    });

    // 選手位置にボールをセット
    store.setBallPosition(slideId, 50, 50);

    // 選手を +10, +5 移動
    store.movePlayer(slideId, player.id, 60, 55);

    const slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    const movedPlayer = slide?.players.find((p) => p.id === player.id);
    const movedArrow = slide?.arrows.find((a) => a.id === arrowId);
    const movedText = slide?.texts.find((t) => t.id === textId);
    const ball = slide?.ball;

    expect(movedPlayer?.x).toBe(60);
    expect(movedPlayer?.y).toBe(55);

    // 矢印の始点・終点も +10, +5 平行移動
    expect(movedArrow?.points[0]).toEqual({ x: 60, y: 55 });
    expect(movedArrow?.points[1]).toEqual({ x: 80, y: 55 });

    // テキストも +10, +5 平行移動
    expect(movedText?.x).toBe(62);
    expect(movedText?.y).toBe(57);

    // ボールも +10, +5 平行移動
    expect(ball?.x).toBe(60);
    expect(ball?.y).toBe(55);
  });

  it('movePlayer で選手近傍のゾーンも連動追従する', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;
    const player = createDefaultPlayer('home', 40, 40, '#034694');
    store.addPlayer(player);

    const zoneId = 'test-zone-1';
    store.addZone(slideId, {
      id: zoneId,
      annotationType: 'zone',
      zoneType: 'danger',
      shapeType: 'rect',
      rotation: 0,
      points: [
        { x: 38, y: 38 },
        { x: 42, y: 38 },
        { x: 42, y: 42 },
        { x: 38, y: 42 },
      ],
      color: '#ef4444',
      opacity: 0.25,
      strokeWidth: 1,
      isComplete: true,
    });

    store.movePlayer(slideId, player.id, 50, 45);

    const slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    const movedZone = slide?.zones.find((z) => z.id === zoneId);

    expect(movedZone?.points[0]).toEqual({ x: 48, y: 43 });
    expect(movedZone?.points[1]).toEqual({ x: 52, y: 43 });
    expect(movedZone?.points[2]).toEqual({ x: 52, y: 47 });
    expect(movedZone?.points[3]).toEqual({ x: 48, y: 47 });
  });

  it('movePlayer で他選手に繋がるパス矢印は始点のみ追従し終点は相手選手に固定される', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;
    const player1 = createDefaultPlayer('home', 30, 30, '#034694');
    const player2 = createDefaultPlayer('home', 70, 70, '#034694');
    store.addPlayer(player1);
    store.addPlayer(player2);

    const arrowId = 'pass-arrow-1';
    store.addArrow(slideId, {
      id: arrowId,
      annotationType: 'arrow',
      arrowType: 'pass',
      curveType: 'straight',
      sourcePlayerId: player1.id,
      targetPlayerId: player2.id,
      points: [
        { x: 30, y: 30 },
        { x: 70, y: 70 },
      ],
      color: '#38bdf8',
      strokeWidth: 3,
      dashArray: [],
      arrowHead: true,
    });

    // player1 を (30, 30) -> (35, 40) へ移動
    store.movePlayer(slideId, player1.id, 35, 40);

    const slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    const movedArrow = slide?.arrows.find((a) => a.id === arrowId);

    // 始点は player1 に追従 (+5, +10)
    expect(movedArrow?.points[0]).toEqual({ x: 35, y: 40 });
    // 終点は player2 に固定のまま (70, 70)
    expect(movedArrow?.points[1]).toEqual({ x: 70, y: 70 });
  });

  it('movePlayer で sourcePlayerId が未設定のフリー矢印（オブジェクトツールの矢印）は選手近傍でも追従しない', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;
    const player = createDefaultPlayer('home', 50, 50, '#034694');
    store.addPlayer(player);

    const freeArrowId = 'free-arrow-1';
    store.addArrow(slideId, {
      id: freeArrowId,
      annotationType: 'arrow',
      arrowType: 'pass',
      curveType: 'straight',
      // sourcePlayerId は未設定
      points: [
        { x: 50, y: 50 },
        { x: 70, y: 50 },
      ],
      color: '#38bdf8',
      strokeWidth: 3,
      dashArray: [],
      arrowHead: true,
    });

    // 選手を (50, 50) -> (60, 55) へ移動
    store.movePlayer(slideId, player.id, 60, 55);

    const slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    const movedPlayer = slide?.players.find((p) => p.id === player.id);
    const unMovedArrow = slide?.arrows.find((a) => a.id === freeArrowId);

    expect(movedPlayer?.x).toBe(60);
    expect(movedPlayer?.y).toBe(55);

    // フリー矢印は位置が変わらないこと
    expect(unMovedArrow?.points[0]).toEqual({ x: 50, y: 50 });
    expect(unMovedArrow?.points[1]).toEqual({ x: 70, y: 50 });
    expect(unMovedArrow?.sourcePlayerId).toBeUndefined();
  });
});
