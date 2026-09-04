/**
 * tactical-unified-store.test.ts
 * Unit tests for TacticalUnifiedStore
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type {
  AspectRatio,
  TacticalProject,
} from '@/lib/types/tactical-unified';
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
    store.setAspectRatio('16:9');
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

  it('movePlayer で選手に紐づく矢印（sourcePlayerId）のみ追従し、テキスト・ボールは連動せず独立性を保つ', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;
    const player = createDefaultPlayer('home', 50, 50, '#034694');
    store.addPlayer(player);

    // 選手を sourcePlayerId とする矢印を追加
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

    // 選手近傍のテキストを追加（独立フリーテキスト）
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

    // 矢印の始点は +10, +5 移動し、終点（矢印の先）は動かす前と同じ位置 (70, 50) にとどまる
    expect(movedArrow?.points[0]).toEqual({ x: 60, y: 55 });
    expect(movedArrow?.points[1]).toEqual({ x: 70, y: 50 });

    // テキストは独立オブジェクトのため勝手に追従せず元の位置 (52, 52) を保つ
    expect(movedText?.x).toBe(52);
    expect(movedText?.y).toBe(52);

    // ボールも独立オブジェクトのため選手移動で勝手に追従せず元の位置 (50, 50) を保つ
    expect(ball?.x).toBe(50);
    expect(ball?.y).toBe(50);
  });

  it('movePlayer で選手近傍のゾーンは連動追従せず独立した位置を保つ', () => {
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

    // ゾーンは独立オブジェクトのため選手移動で勝手に追従せず元の points を保つ
    expect(movedZone?.points[0]).toEqual({ x: 38, y: 38 });
    expect(movedZone?.points[1]).toEqual({ x: 42, y: 38 });
    expect(movedZone?.points[2]).toEqual({ x: 42, y: 42 });
    expect(movedZone?.points[3]).toEqual({ x: 38, y: 42 });
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

  it('swapTeamSides でスライド内の選手・ボール・矢印・ゾーン・テキストのX座標が反転する', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;

    const player = createDefaultPlayer('home', 20, 40, '#034694');
    store.addPlayer(player);
    store.setBallPosition(slideId, 30, 50);
    store.addArrow(slideId, {
      id: 'arrow-swap-1',
      annotationType: 'arrow',
      arrowType: 'pass',
      curveType: 'straight',
      points: [
        { x: 20, y: 40 },
        { x: 40, y: 60 },
      ],
      color: '#ffffff',
      strokeWidth: 2,
      dashArray: [],
      arrowHead: true,
    });
    store.addText(slideId, {
      id: 'text-swap-1',
      annotationType: 'text',
      x: 25,
      y: 35,
      content: 'Tactics',
      fontSize: 14,
      color: '#fff',
      bold: false,
      italic: false,
    });

    store.swapTeamSides(slideId);

    const slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    const swappedPlayer = slide?.players.find((p) => p.id === player.id);
    const swappedArrow = slide?.arrows.find((a) => a.id === 'arrow-swap-1');
    const swappedText = slide?.texts.find((t) => t.id === 'text-swap-1');

    expect(swappedPlayer?.x).toBe(80); // 100 - 20
    expect(swappedPlayer?.y).toBe(40);
    expect(slide?.ball.x).toBe(70); // 100 - 30
    expect(swappedArrow?.points[0]?.x).toBe(80);
    expect(swappedArrow?.points[1]?.x).toBe(60);
    expect(swappedText?.x).toBe(75);
  });

  it('swapTeamSides で縦画面 (9:16) の場合は Y 座標が反転する', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;
    store.setAspectRatio('9:16');

    const player = createDefaultPlayer('home', 20, 30, '#034694');
    store.addPlayer(player);
    store.setBallPosition(slideId, 50, 20);

    store.swapTeamSides(slideId);

    const slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    const swappedPlayer = slide?.players.find((p) => p.id === player.id);

    expect(swappedPlayer?.x).toBe(20); // X は変わらない
    expect(swappedPlayer?.y).toBe(70); // 100 - 30
    expect(slide?.ball.y).toBe(80); // 100 - 20
  });

  it('movePlayerToBench で選手がベンチに移動し、マーカーオプションおよび接続矢印がクリーンアップされる', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;

    const player1 = createDefaultPlayer('home', 20, 20, '#034694');
    const player2 = createDefaultPlayer('home', 30, 30, '#034694');
    store.addPlayer(player1);
    store.addPlayer(player2);

    // player1 に visionCone, badge, connectLine を付与
    store.setVisionCone(slideId, player1.id, {
      id: 'cone-1',
      angleRad: 0,
      spreadRad: 1,
      radius: 20,
      color: '#3b82f6',
      opacity: 0.3,
      visible: true,
    });
    store.addPlayerBadge(slideId, player1.id, {
      id: 'badge-1',
      label: 'C',
      color: '#f59e0b',
      textColor: '#000',
      offsetX: 0,
      offsetY: -10,
      visible: true,
    });
    store.addConnectLine(slideId, player1.id, {
      id: 'conn-1',
      toPlayerId: player2.id,
      lineStyle: 'solid',
      color: '#fff',
      strokeWidth: 2,
      visible: true,
    });

    // player1 に紐づく矢印を追加
    store.addArrow(slideId, {
      id: 'arrow-attached-1',
      annotationType: 'arrow',
      arrowType: 'pass',
      curveType: 'straight',
      points: [
        { x: 20, y: 20 },
        { x: 50, y: 50 },
      ],
      sourcePlayerId: player1.id,
      color: '#fff',
      strokeWidth: 2,
      dashArray: [],
      arrowHead: true,
    });

    store.movePlayerToBench(slideId, player1.id);

    const slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    const p1 = slide?.players.find((p) => p.id === player1.id);
    const attachedArrow = slide?.arrows.find(
      (a) => a.id === 'arrow-attached-1',
    );

    expect(p1?.area).toBe('bench');
    expect(p1?.visionCone).toBeUndefined();
    expect(p1?.badges).toHaveLength(0);
    expect(p1?.connectLines).toHaveLength(0);
    expect(attachedArrow).toBeUndefined(); // 矢印がクリーンアップされていること
  });

  it('eraseAtPoint で矢印・テキスト・マーカーオプションが消去されるが、選手本体は消去されない', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;

    const player = createDefaultPlayer('home', 50, 50, '#034694');
    store.addPlayer(player);

    const arrowId = 'arrow-erase-1';
    store.addArrow(slideId, {
      id: arrowId,
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
    });

    // 矢印の近傍 (15, 15) を消しゴムで消す
    store.eraseAtPoint(slideId, { x: 15, y: 15 }, 4);

    let slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    expect(slide?.arrows.find((a) => a.id === arrowId)).toBeUndefined();

    // 選手の座標 (50, 50) を消しゴムでなぞっても選手は削除されない
    store.eraseAtPoint(slideId, { x: 50, y: 50 }, 4);
    slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    expect(slide?.players.find((p) => p.id === player.id)).toBeDefined();
  });

  it('restoreDefaultPitch と setImageBackground で背景が正しく切り替わり、選手が白紙クリアされ、境界線が全面フィットする', () => {
    const store = useTacticalUnifiedStore.getState();
    expect(
      store.project.slides[0]?.players.filter((p) => p.area === 'pitch'),
    ).toHaveLength(22);

    store.setImageBackground('data:image/png;base64,sample');
    const imageState = useTacticalUnifiedStore.getState();
    expect(imageState.project.backgroundType).toBe('image');
    expect(imageState.project.backgroundImageUrl).toBe(
      'data:image/png;base64,sample',
    );
    expect(
      imageState.project.slides[0]?.players.filter((p) => p.area === 'pitch'),
    ).toHaveLength(0);
    expect(
      imageState.project.slides[0]?.players.filter((p) => p.area === 'bench'),
    ).toHaveLength(22);
    expect(imageState.project.slides[0]?.boundaryBox).toEqual({
      x: 2.0,
      y: 2.0,
      width: 96.0,
      height: 96.0,
      enabled: true,
    });

    store.restoreDefaultPitch();
    expect(useTacticalUnifiedStore.getState().project.backgroundType).toBe(
      'pitch',
    );
    expect(
      useTacticalUnifiedStore.getState().project.backgroundImageUrl,
    ).toBeUndefined();
  });

  it('すでに編集中または画像背景のスライドがある状態で setImageBackground すると、既存スライドを破壊せず新規スライドが追加される', () => {
    const store = useTacticalUnifiedStore.getState();
    // 1枚目キャプチャ適用
    store.setImageBackground('data:image/png;base64,capture1');
    expect(useTacticalUnifiedStore.getState().project.slides).toHaveLength(1);
    const firstSlideId = useTacticalUnifiedStore.getState().activeSlideId;

    // 1枚目のピッチ上にリングマーカーまたは選手を配置して編集
    store.addPlayerFromPalette('home', 40, 50, 'ring');

    // 2枚目のキャプチャを実行
    store.setImageBackground('data:image/png;base64,capture2');

    const state = useTacticalUnifiedStore.getState();
    // スライドが2枚に増加していること
    expect(state.project.slides).toHaveLength(2);
    // 1枚目のスライドは capture1 のまま保持され、リングマーカーも残っていること
    const firstSlide = state.project.slides.find((s) => s.id === firstSlideId);
    expect(firstSlide?.backgroundImageUrl).toBe(
      'data:image/png;base64,capture1',
    );
    expect(firstSlide?.players.some((p) => p.style.markerType === 'ring')).toBe(
      true,
    );

    // 新規アクティブスライドは capture2 で初期化されていること
    expect(state.activeSlideId).not.toBe(firstSlideId);
    const activeSlide = state.project.slides.find(
      (s) => s.id === state.activeSlideId,
    );
    expect(activeSlide?.backgroundImageUrl).toBe(
      'data:image/png;base64,capture2',
    );
  });

  it('clearPitchPlayers でピッチ上の選手が全員ベンチに退避され、ピッチが白紙クリアされる', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;
    expect(
      store.project.slides[0]?.players.filter((p) => p.area === 'pitch'),
    ).toHaveLength(22);

    store.clearPitchPlayers(slideId);
    const slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    expect(slide?.players.filter((p) => p.area === 'pitch')).toHaveLength(0);
    expect(slide?.players.filter((p) => p.area === 'bench')).toHaveLength(22);
  });

  it('applyFormation で 4-3-3 が 11 選手に正しく適用される', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;

    store.applyFormation(slideId, '4-3-3', 'full', 'home');

    const slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    const homePitchPlayers =
      slide?.players.filter((p) => p.team === 'home' && p.area === 'pitch') ??
      [];

    expect(homePitchPlayers).toHaveLength(11);
    expect(homePitchPlayers.some((p) => p.position === 'GK')).toBe(true);
    expect(homePitchPlayers.some((p) => p.position === 'LW')).toBe(true);
  });

  it('continuousDrawing のトグルと設定が正しく動作する', () => {
    const store = useTacticalUnifiedStore.getState();
    expect(store.continuousDrawing).toBe(false);

    store.toggleContinuousDrawing();
    expect(useTacticalUnifiedStore.getState().continuousDrawing).toBe(true);

    store.setContinuousDrawing(false);
    expect(useTacticalUnifiedStore.getState().continuousDrawing).toBe(false);
  });

  it('初期スライドおよび addSlide 時にピッチ白線フィット境界線がデフォルトで設定される', () => {
    const store = useTacticalUnifiedStore.getState();
    const initialSlide = store.project.slides[0];
    expect(initialSlide?.boundaryBox).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      enabled: true,
    });

    const newSlideId = store.addSlide(undefined, 'blank');
    const newSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === newSlideId);
    expect(newSlide?.boundaryBox).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      enabled: true,
    });
  });

  it('autoFitBoundaryBox でピッチの白線の外側に均等な余白を持たせてフィットする (横向き・縦向き)', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;
    store.setBoundaryBox(slideId, {
      x: 10,
      y: 10,
      width: 50,
      height: 50,
      enabled: true,
    });

    store.autoFitBoundaryBox(slideId);
    let slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    expect(slide?.boundaryBox).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      enabled: true,
    });

    // 横向き (16:9)
    store.setAspectRatio('16:9');
    store.setBoundaryBox(slideId, {
      x: 10,
      y: 10,
      width: 50,
      height: 50,
      enabled: true,
    });
    store.autoFitBoundaryBox(slideId);
    slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    expect(slide?.boundaryBox).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      enabled: true,
    });

    // 縦向き (9:16)
    store.setAspectRatio('9:16');
    store.setBoundaryBox(slideId, {
      x: 10,
      y: 10,
      width: 50,
      height: 50,
      enabled: true,
    });
    store.autoFitBoundaryBox(slideId);
    slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    expect(slide?.boundaryBox).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      enabled: true,
    });

    // スクリーンショット / 画像背景モードのときは画像境界（2%余白内）にフィットする
    store.setImageBackground('data:image/png;base64,sample');
    const imageSlideId = useTacticalUnifiedStore.getState().activeSlideId;
    slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === imageSlideId);
    expect(slide?.boundaryBox).toEqual({
      x: 2.0,
      y: 2.0,
      width: 96.0,
      height: 96.0,
      enabled: true,
    });

    // 境界線を変更した後に autoFitBoundaryBox を実行しても画像境界にフィットする
    store.setBoundaryBox(imageSlideId, {
      x: 10,
      y: 10,
      width: 50,
      height: 50,
      enabled: true,
    });
    store.autoFitBoundaryBox(imageSlideId);
    slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === imageSlideId);
    expect(slide?.boundaryBox).toEqual({
      x: 2.0,
      y: 2.0,
      width: 96.0,
      height: 96.0,
      enabled: true,
    });
  });

  it('addPlayerFromPalette で markerType: ring を指定して立体足元リング選手（デフォルト1.5倍）を追加でき、Eraser / Reset で削除できる', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;
    const playerId = store.addPlayerFromPalette('home', 45, 55, 'ring');

    let slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    const player = slide?.players.find((p) => p.id === playerId);
    expect(player).toBeDefined();
    expect(player?.style.markerType).toBe('ring');
    expect(player?.style.sizeScale).toBe(1.5);
    expect(player?.x).toBe(45);
    expect(player?.y).toBe(55);

    // 消しゴム (eraseAtPoint) でリングマーカーが削除される
    store.eraseAtPoint(slideId, { x: 45, y: 55 }, 5.0);
    slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    expect(slide?.players.find((p) => p.id === playerId)).toBeUndefined();

    // 再度追加して resetSlideObjects で削除されることを検証
    const newRingId = store.addPlayerFromPalette('home', 40, 60, 'ring');
    expect(
      useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId)
        ?.players.find((p) => p.id === newRingId),
    ).toBeDefined();

    store.resetSlideObjects(slideId);
    slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    expect(slide?.players.find((p) => p.id === newRingId)).toBeUndefined();
  });

  it('setPlayerFocus で選手のフォーカス（スポットライト）が正しく設定される', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;
    const player = createDefaultPlayer('home', 50, 50, '#034694');
    store.addPlayer(player);

    store.setPlayerFocus(slideId, player.id, {
      enabled: true,
      color: '#fbbf24',
      radius: 3,
      opacity: 0.4,
      style: 'spotlight',
    });

    const slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    const targetPlayer = slide?.players.find((p) => p.id === player.id);
    expect(targetPlayer?.focus?.enabled).toBe(true);
    expect(targetPlayer?.focus?.color).toBe('#fbbf24');
    expect(targetPlayer?.focus?.radius).toBe(3);
  });

  it('resetSlideObjects でスライド内のアノテーションと選手オプションが一括リセットされる', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;
    const player = createDefaultPlayer('home', 30, 30, '#034694');
    store.addPlayer(player);

    store.addArrow(slideId, {
      id: 'arrow-reset-test',
      annotationType: 'arrow',
      arrowType: 'pass',
      curveType: 'straight',
      points: [
        { x: 30, y: 30 },
        { x: 50, y: 30 },
      ],
      color: '#38bdf8',
      strokeWidth: 3,
      dashArray: [],
      arrowHead: true,
    });

    store.setPlayerFocus(slideId, player.id, {
      enabled: true,
      color: '#fbbf24',
      radius: 20,
      opacity: 0.35,
      style: 'spotlight',
    });

    store.resetSlideObjects(slideId);

    const slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    expect(slide?.arrows).toHaveLength(0);
    expect(slide?.zones).toHaveLength(0);
    expect(slide?.texts).toHaveLength(0);
    const resetPlayer = slide?.players.find((p) => p.id === player.id);
    expect(resetPlayer?.focus).toBeUndefined();
    expect(resetPlayer?.visionCone).toBeUndefined();
    expect(resetPlayer?.badges).toEqual([]);
    expect(resetPlayer?.connectLines).toEqual([]);
  });

  describe('クリップボード (copySelectedObjects & pasteObjects)', () => {
    it('選択中の選手・矢印・ゾーン・テキストをコピーし、オフセット位置に新しいIDでペーストできる', () => {
      const store = useTacticalUnifiedStore.getState();
      const slideId = store.activeSlideId;

      const player = createDefaultPlayer('home', 40, 50, '#034694');
      store.addPlayer(player);

      const arrow = {
        id: 'arrow-copy-1',
        annotationType: 'arrow' as const,
        arrowType: 'pass' as const,
        curveType: 'straight' as const,
        points: [
          { x: 40, y: 50 },
          { x: 60, y: 70 },
        ],
        color: '#ffffff',
        strokeWidth: 3,
        dashArray: [],
        arrowHead: true,
        sourcePlayerId: player.id,
      };
      store.addArrow(slideId, arrow);

      const zone = {
        id: 'zone-copy-1',
        annotationType: 'zone' as const,
        zoneType: 'space' as const,
        shapeType: 'rect' as const,
        x: 20,
        y: 20,
        width: 15,
        height: 15,
        points: [
          { x: 20, y: 20 },
          { x: 35, y: 20 },
          { x: 35, y: 35 },
          { x: 20, y: 35 },
        ],
        color: '#f59e0b',
        opacity: 0.3,
        strokeWidth: 0,
      };
      store.addZone(slideId, zone);

      const text = {
        id: 'text-copy-1',
        annotationType: 'text' as const,
        x: 10,
        y: 15,
        content: 'Tactical Note',
        fontSize: 16,
        color: '#ffffff',
        bold: true,
        italic: false,
      };
      store.addText(slideId, text);

      // 4つのオブジェクトを選択
      store.selectObject({ id: player.id, kind: 'player' }, false);
      store.selectObject({ id: arrow.id, kind: 'arrow' }, true);
      store.selectObject({ id: zone.id, kind: 'zone' }, true);
      store.selectObject({ id: text.id, kind: 'text' }, true);

      expect(useTacticalUnifiedStore.getState().selectedObjects).toHaveLength(
        4,
      );

      // コピー実行
      store.copySelectedObjects(slideId);
      const clipboard = useTacticalUnifiedStore.getState().clipboard;
      expect(clipboard).not.toBeNull();
      expect(clipboard?.players).toHaveLength(1);
      expect(clipboard?.arrows).toHaveLength(1);
      expect(clipboard?.zones).toHaveLength(1);
      expect(clipboard?.texts).toHaveLength(1);

      // ペースト実行
      store.pasteObjects(slideId);

      const updatedSlide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      const selectedObjects =
        useTacticalUnifiedStore.getState().selectedObjects;

      // 新規オブジェクトが選択状態になっていること
      expect(selectedObjects).toHaveLength(4);
      const newPlayerSelect = selectedObjects.find((o) => o.kind === 'player');
      const newArrowSelect = selectedObjects.find((o) => o.kind === 'arrow');
      const newZoneSelect = selectedObjects.find((o) => o.kind === 'zone');
      const newTextSelect = selectedObjects.find((o) => o.kind === 'text');

      expect(newPlayerSelect?.id).not.toBe(player.id);
      expect(newArrowSelect?.id).not.toBe(arrow.id);
      expect(newZoneSelect?.id).not.toBe(zone.id);
      expect(newTextSelect?.id).not.toBe(text.id);

      // 座標が +3% オフセットされていること
      const newPlayer = updatedSlide?.players.find(
        (p) => p.id === newPlayerSelect?.id,
      );
      expect(newPlayer?.x).toBeCloseTo(43);
      expect(newPlayer?.y).toBeCloseTo(53);

      const newArrow = updatedSlide?.arrows.find(
        (a) => a.id === newArrowSelect?.id,
      );
      expect(newArrow?.points[0]?.x).toBeCloseTo(43);
      expect(newArrow?.points[0]?.y).toBeCloseTo(53);
      expect(newArrow?.points[1]?.x).toBeCloseTo(63);
      expect(newArrow?.points[1]?.y).toBeCloseTo(73);
      // 一緒にコピーされた選手への sourcePlayerId が新選手IDにリマップされていること
      expect(newArrow?.sourcePlayerId).toBe(newPlayer?.id);

      const newZone = updatedSlide?.zones.find(
        (z) => z.id === newZoneSelect?.id,
      );
      expect(newZone?.x).toBeCloseTo(23);
      expect(newZone?.y).toBeCloseTo(23);
      expect(newZone?.points[0]?.x).toBeCloseTo(23);

      const newText = updatedSlide?.texts.find(
        (t) => t.id === newTextSelect?.id,
      );
      expect(newText?.x).toBeCloseTo(13);
      expect(newText?.y).toBeCloseTo(18);
      expect(newText?.content).toBe('Tactical Note');
    });

    it('選択がない状態で copySelectedObjects を呼んでも clipboard は更新されない', () => {
      const store = useTacticalUnifiedStore.getState();
      store.clearSelection();
      store.copySelectedObjects();
      expect(useTacticalUnifiedStore.getState().clipboard).toBeNull();
    });

    it('clipboard が空の状態で pasteObjects を呼んでも何も追加されない', () => {
      const store = useTacticalUnifiedStore.getState();
      const initialPlayerCount = store.project.slides[0]?.players.length ?? 0;
      store.pasteObjects();
      expect(
        useTacticalUnifiedStore.getState().project.slides[0]?.players,
      ).toHaveLength(initialPlayerCount);
    });

    it('duplicateSelectedObjects で選択中のオブジェクトを1ステップ即時複製し、新オブジェクトを選択状態にできる', () => {
      const store = useTacticalUnifiedStore.getState();
      const slideId = store.activeSlideId;

      const player = createDefaultPlayer('away', 50, 50, '#e11d48');
      store.addPlayer(player);

      const arrow = {
        id: 'arrow-dup-1',
        annotationType: 'arrow' as const,
        arrowType: 'run' as const,
        curveType: 'straight' as const,
        points: [
          { x: 50, y: 50 },
          { x: 70, y: 70 },
        ],
        color: '#38bdf8',
        strokeWidth: 3,
        dashArray: [5, 5],
        arrowHead: true,
        sourcePlayerId: player.id,
      };
      store.addArrow(slideId, arrow);

      // 選手と矢印を選択
      store.selectObject({ id: player.id, kind: 'player' }, false);
      store.selectObject({ id: arrow.id, kind: 'arrow' }, true);
      expect(useTacticalUnifiedStore.getState().selectedObjects).toHaveLength(
        2,
      );

      const pastLengthBefore = useTacticalUnifiedStore.getState().past.length;

      // 即時複製 (Ctrl+D 相当)
      store.duplicateSelectedObjects(slideId);

      const stateAfter = useTacticalUnifiedStore.getState();
      const updatedSlide = stateAfter.project.slides.find(
        (s) => s.id === slideId,
      );
      const selectedObjects = stateAfter.selectedObjects;

      // 1. 新規オブジェクトが選択されていること
      expect(selectedObjects).toHaveLength(2);
      const newPlayerSelect = selectedObjects.find((o) => o.kind === 'player');
      const newArrowSelect = selectedObjects.find((o) => o.kind === 'arrow');

      expect(newPlayerSelect?.id).toBeDefined();
      expect(newPlayerSelect?.id).not.toBe(player.id);
      expect(newArrowSelect?.id).toBeDefined();
      expect(newArrowSelect?.id).not.toBe(arrow.id);

      // 2. オフセット配置されていること
      const newPlayer = updatedSlide?.players.find(
        (p) => p.id === newPlayerSelect?.id,
      );
      expect(newPlayer?.x).toBeCloseTo(53);
      expect(newPlayer?.y).toBeCloseTo(53);

      const newArrow = updatedSlide?.arrows.find(
        (a) => a.id === newArrowSelect?.id,
      );
      expect(newArrow?.points[0]?.x).toBeCloseTo(53);
      expect(newArrow?.points[0]?.y).toBeCloseTo(53);
      expect(newArrow?.points[1]?.x).toBeCloseTo(73);
      expect(newArrow?.points[1]?.y).toBeCloseTo(73);
      expect(newArrow?.sourcePlayerId).toBe(newPlayer?.id);

      // 3. 1トランザクション（Undo 1回で複製前に戻る）
      expect(stateAfter.past.length).toBe(pastLengthBefore + 1);
      store.undo();

      const stateAfterUndo = useTacticalUnifiedStore.getState();
      const slideAfterUndo = stateAfterUndo.project.slides.find(
        (s) => s.id === slideId,
      );
      expect(
        slideAfterUndo?.players.find((p) => p.id === newPlayerSelect?.id),
      ).toBeUndefined();
      expect(
        slideAfterUndo?.arrows.find((a) => a.id === newArrowSelect?.id),
      ).toBeUndefined();
    });

    it('選択がない状態で duplicateSelectedObjects を呼んでも何も追加されない', () => {
      const store = useTacticalUnifiedStore.getState();
      store.clearSelection();
      const initialPlayerCount = store.project.slides[0]?.players.length ?? 0;
      store.duplicateSelectedObjects();
      expect(
        useTacticalUnifiedStore.getState().project.slides[0]?.players,
      ).toHaveLength(initialPlayerCount);
    });
  });

  describe('teamVisibility & single team placement (AAWU 5-4)', () => {
    it('setTeamVisibility で teamVisibility を切り替えられる', () => {
      const store = useTacticalUnifiedStore.getState();
      expect(store.teamVisibility).toBe('both');

      store.setTeamVisibility('home');
      expect(useTacticalUnifiedStore.getState().teamVisibility).toBe('home');

      store.setTeamVisibility('away');
      expect(useTacticalUnifiedStore.getState().teamVisibility).toBe('away');

      store.setTeamVisibility('both');
      expect(useTacticalUnifiedStore.getState().teamVisibility).toBe('both');
    });

    it('applySingleTeamFormation (home) で Home のみがピッチに配置され、Away は全てベンチに退避される', () => {
      const store = useTacticalUnifiedStore.getState();
      const slideId = store.activeSlideId;

      store.applySingleTeamFormation(slideId, '4-3-3', 'half', 'home');

      const slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);

      const homePitch = slide?.players.filter(
        (p) => p.team === 'home' && p.area === 'pitch',
      );
      const awayPitch = slide?.players.filter(
        (p) => p.team === 'away' && p.area === 'pitch',
      );
      const awayBench = slide?.players.filter(
        (p) => p.team === 'away' && p.area === 'bench',
      );

      expect(homePitch).toHaveLength(11);
      expect(awayPitch).toHaveLength(0);
      expect(awayBench?.length).toBeGreaterThanOrEqual(11);
    });

    it('applySingleTeamFormation (away) で Away のみがピッチに配置され、Home は全てベンチに退避される', () => {
      const store = useTacticalUnifiedStore.getState();
      const slideId = store.activeSlideId;

      store.applySingleTeamFormation(slideId, '4-4-2', 'half', 'away');

      const slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);

      const homePitch = slide?.players.filter(
        (p) => p.team === 'home' && p.area === 'pitch',
      );
      const awayPitch = slide?.players.filter(
        (p) => p.team === 'away' && p.area === 'pitch',
      );
      const homeBench = slide?.players.filter(
        (p) => p.team === 'home' && p.area === 'bench',
      );

      expect(awayPitch).toHaveLength(11);
      expect(homePitch).toHaveLength(0);
      expect(homeBench?.length).toBeGreaterThanOrEqual(11);
    });
  });

  describe('swapPlayers', () => {
    it('ピッチ選手とベンチ選手を入れ替えた際、座標を引き継ぎ、エリアが交換される', () => {
      const store = useTacticalUnifiedStore.getState();
      const slideId = store.activeSlideId;

      const slideBefore = store.project.slides.find((s) => s.id === slideId);
      const pitchPlayer = slideBefore?.players.find((p) => p.area === 'pitch');
      expect(pitchPlayer).toBeDefined();

      const origX = pitchPlayer?.x ?? 0;
      const origY = pitchPlayer?.y ?? 0;

      // ベンチ選手を追加
      store.addCustomPlayer(slideId, 'home', 'Bench Hero', '20', 'ST', 'bench');
      const slideWithBench = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      const benchPlayer = slideWithBench?.players.find(
        (p) => p.name === 'Bench Hero',
      );
      expect(benchPlayer).toBeDefined();

      // スワップ実行
      if (!pitchPlayer || !benchPlayer) {
        throw new Error('Players must be defined');
      }
      store.swapPlayers(slideId, pitchPlayer.id, benchPlayer.id);

      const slideAfter = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      const swappedPitch = slideAfter?.players.find(
        (p) => p.id === pitchPlayer.id,
      );
      const swappedBench = slideAfter?.players.find(
        (p) => p.id === benchPlayer.id,
      );

      expect(swappedPitch?.area).toBe('bench');
      expect(swappedBench?.area).toBe('pitch');
      expect(swappedBench?.x).toBe(origX);
      expect(swappedBench?.y).toBe(origY);
    });

    it('ピッチ選手同士の座標をスワップする', () => {
      const store = useTacticalUnifiedStore.getState();
      const slideId = store.activeSlideId;

      const slideBefore = store.project.slides.find((s) => s.id === slideId);
      const pitchPlayers =
        slideBefore?.players.filter((p) => p.area === 'pitch') || [];
      expect(pitchPlayers.length).toBeGreaterThanOrEqual(2);

      const p1 = pitchPlayers[0];
      const p2 = pitchPlayers[1];
      const p1Pos = { x: p1.x, y: p1.y };
      const p2Pos = { x: p2.x, y: p2.y };

      store.swapPlayers(slideId, p1.id, p2.id);

      const slideAfter = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      const updatedP1 = slideAfter?.players.find((p) => p.id === p1.id);
      const updatedP2 = slideAfter?.players.find((p) => p.id === p2.id);

      expect(updatedP1?.x).toBe(p2Pos.x);
      expect(updatedP1?.y).toBe(p2Pos.y);
      expect(updatedP2?.x).toBe(p1Pos.x);
      expect(updatedP2?.y).toBe(p1Pos.y);
    });
  });

  describe('saveStatus & auto-save state', () => {
    it('初期状態は saveStatus: idle, lastSavedAt: null', () => {
      const store = useTacticalUnifiedStore.getState();
      expect(store.saveStatus).toBe('idle');
      expect(store.lastSavedAt).toBeNull();
    });

    it('setSaveStatus と setLastSavedAt で保存状態とタイムスタンプが更新される', () => {
      const store = useTacticalUnifiedStore.getState();
      store.setSaveStatus('saving');
      expect(useTacticalUnifiedStore.getState().saveStatus).toBe('saving');

      const now = Date.now();
      store.setLastSavedAt(now);
      expect(useTacticalUnifiedStore.getState().lastSavedAt).toBe(now);

      store.setSaveStatus('saved');
      expect(useTacticalUnifiedStore.getState().saveStatus).toBe('saved');
    });

    it('resetProject で初期プロジェクトが生成され選択状態がリセットされる', () => {
      const store = useTacticalUnifiedStore.getState();
      store.addSlide();
      expect(useTacticalUnifiedStore.getState().project.slides).toHaveLength(2);

      store.resetProject();
      expect(useTacticalUnifiedStore.getState().project.slides).toHaveLength(1);
      expect(useTacticalUnifiedStore.getState().isDirty).toBe(false);
    });
  });

  describe('applyXMediaPreset', () => {
    it('横画面(16:9)で single_image_4_5 (4:5) を適用した際に中央配置された BoundaryBox が計算される', () => {
      const store = useTacticalUnifiedStore.getState();
      store.setAspectRatio('16:9');
      store.applyXMediaPreset('single_image_4_5');

      const slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find(
          (s) => s.id === useTacticalUnifiedStore.getState().activeSlideId,
        );
      expect(slide?.boundaryBox).toBeDefined();
      expect(slide?.boundaryBox?.enabled).toBe(true);
      // 16:9キャンバスで4:5(0.8)はキャンバスより縦長なので高さ100%
      expect(slide?.boundaryBox?.height).toBe(100);
      expect(slide?.boundaryBox?.y).toBe(0);
      // width = 100 * 0.8 / (16/9) = 45
      expect(slide?.boundaryBox?.width).toBe(45);
      expect(slide?.boundaryBox?.x).toBe(27.5);
    });

    it('横画面(16:9)で pitch_overview_16_9 (16:9) を適用した際に全画面(100x100)の BoundaryBox になる', () => {
      const store = useTacticalUnifiedStore.getState();
      store.setAspectRatio('16:9');
      store.applyXMediaPreset('pitch_overview_16_9');

      const slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find(
          (s) => s.id === useTacticalUnifiedStore.getState().activeSlideId,
        );
      expect(slide?.boundaryBox).toEqual({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        enabled: true,
      });
    });

    it('縦画面(9:16)で feed_video_9_16 (9:16) を適用した際に全画面(100x100)の BoundaryBox になる', () => {
      const store = useTacticalUnifiedStore.getState();
      store.setAspectRatio('9:16');
      store.applyXMediaPreset('feed_video_9_16');

      const slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find(
          (s) => s.id === useTacticalUnifiedStore.getState().activeSlideId,
        );
      expect(slide?.boundaryBox).toEqual({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        enabled: true,
      });
    });

    it('pitch_fit を適用した際にピッチ外枠線に合わせた BoundaryBox が設定される', () => {
      const store = useTacticalUnifiedStore.getState();
      store.setAspectRatio('16:9');
      store.applyXMediaPreset('pitch_fit');

      const slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find(
          (s) => s.id === useTacticalUnifiedStore.getState().activeSlideId,
        );
      expect(slide?.boundaryBox).toEqual({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        enabled: true,
      });
    });

    it('特定のスライドIDを指定してプリセットを適用できる', () => {
      const store = useTacticalUnifiedStore.getState();
      store.setAspectRatio('16:9');
      store.addSlide();
      const slides = useTacticalUnifiedStore.getState().project.slides;
      const targetSlide = slides[1];

      store.applyXMediaPreset('single_image_4_5', targetSlide.id);

      const updatedSlide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === targetSlide.id);
      expect(updatedSlide?.boundaryBox?.width).toBe(45);
      expect(updatedSlide?.boundaryBox?.height).toBe(100);
    });
  });

  describe('L2-Tactical-021: アスペクト比即時変更と可変境界線ハイブリッド連動', () => {
    it('4種のアスペクト比変更 (16:9, 9:16, 4:5, 1:1) で project.aspectRatio が正しく更新される', () => {
      const store = useTacticalUnifiedStore.getState();
      const ratios: AspectRatio[] = ['9:16', '4:5', '1:1', '16:9'];

      for (const ratio of ratios) {
        store.setAspectRatio(ratio);
        const state = useTacticalUnifiedStore.getState();
        expect(state.project.aspectRatio).toBe(ratio);
        const activeSlide = state.project.slides.find(
          (s) => s.id === state.activeSlideId,
        );
        expect(activeSlide?.aspectRatio).toBe(ratio);
      }
    });

    it('アスペクト比切り替え時に境界線が即座に全体フィット(100x100)にリセット初期化される', () => {
      const store = useTacticalUnifiedStore.getState();
      const slideId = store.activeSlideId;

      // 事前に境界線をカスタム値に変更
      store.setBoundaryBox(slideId, {
        x: 15,
        y: 15,
        width: 60,
        height: 60,
        enabled: true,
      });

      let slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      expect(slide?.boundaryBox).toEqual({
        x: 15,
        y: 15,
        width: 60,
        height: 60,
        enabled: true,
      });

      // 16:9 にアスペクト比変更 (4:5 → 16:9)
      store.setAspectRatio('16:9');

      slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      expect(slide?.boundaryBox).toEqual({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        enabled: true,
      });
      expect(useTacticalUnifiedStore.getState().project.boundaryBox).toEqual({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        enabled: true,
      });
    });

    it('アスペクト比切り替え後も、四方ポインタによる境界線の可変リサイズ・移動が通常通り動作する', () => {
      const store = useTacticalUnifiedStore.getState();
      const slideId = store.activeSlideId;

      // 1:1 に切り替え
      store.setAspectRatio('1:1');
      let slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      expect(slide?.boundaryBox).toEqual({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        enabled: true,
      });

      // ユーザーによる四方ハンドルの個別リサイズ操作
      store.setBoundaryBox(slideId, {
        x: 5,
        y: 10,
        width: 80,
        height: 75,
        enabled: true,
      });

      slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      expect(slide?.boundaryBox).toEqual({
        x: 5,
        y: 10,
        width: 80,
        height: 75,
        enabled: true,
      });
    });

    it('addSlide 時に現在の project.aspectRatio の比率と境界線が継承される', () => {
      const store = useTacticalUnifiedStore.getState();
      // 16:9に変更して全体フィット(100x100)になる状態を作る
      store.setAspectRatio('16:9');

      const newSlideId = store.addSlide(undefined, 'blank');
      const newSlide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === newSlideId);

      expect(newSlide?.aspectRatio).toBe('16:9');
      expect(newSlide?.boundaryBox).toEqual({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        enabled: true,
      });
    });
  });

  describe('L1-Tactical-025: 全オブジェクトおよびピッチの汎用ロック機能', () => {
    it('togglePitchLock でピッチの isLocked がトグルされる', () => {
      const store = useTacticalUnifiedStore.getState();
      const slideId = store.activeSlideId;

      expect(store.project.slides[0]?.pitchTransform?.isLocked ?? false).toBe(
        false,
      );

      store.togglePitchLock(slideId);
      expect(
        useTacticalUnifiedStore.getState().project.slides[0]?.pitchTransform
          ?.isLocked,
      ).toBe(true);

      store.togglePitchLock(slideId);
      expect(
        useTacticalUnifiedStore.getState().project.slides[0]?.pitchTransform
          ?.isLocked,
      ).toBe(false);
    });

    it('updatePitchTransform でピッチの panX, panY, zoom が更新される', () => {
      const store = useTacticalUnifiedStore.getState();
      const slideId = store.activeSlideId;

      store.updatePitchTransform(slideId, {
        panX: 25,
        panY: -40,
        zoom: 1.5,
      });
      const transform =
        useTacticalUnifiedStore.getState().project.slides[0]?.pitchTransform;
      expect(transform?.panX).toBe(25);
      expect(transform?.panY).toBe(-40);
      expect(transform?.zoom).toBe(1.5);
      expect(transform?.isLocked).toBe(false);
    });

    it('addSlide / duplicateSlide で pitchTransform が引き継がれる', () => {
      const store = useTacticalUnifiedStore.getState();
      const slideId = store.activeSlideId;

      store.updatePitchTransform(slideId, { panX: 50, panY: 30, zoom: 2 });
      const newSlideId = store.duplicateSlide(slideId);
      const newSlide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((sl) => sl.id === newSlideId);
      expect(newSlide?.pitchTransform?.panX).toBe(50);
      expect(newSlide?.pitchTransform?.panY).toBe(30);
      expect(newSlide?.pitchTransform?.zoom).toBe(2);
    });

    it('setPitchPosition で pitchPosition と pitchTransform が更新され、autoFitBoundaryBox に反映される', () => {
      const store = useTacticalUnifiedStore.getState();
      const slideId = store.activeSlideId;

      store.setPitchPosition(slideId, { x: 10, y: -5 });
      const slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((sl) => sl.id === slideId);
      expect(slide?.pitchPosition?.x).toBe(10);
      expect(slide?.pitchPosition?.y).toBe(-5);
      expect(slide?.pitchTransform?.panX).toBe(10);
      expect(slide?.pitchTransform?.panY).toBe(-5);

      // autoFitBoundaryBox がピッチ移動オフセットに追従することを確認 (デフォルトは base.x = 0, base.y = 0)
      store.autoFitBoundaryBox(slideId);
      const updatedSlide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((sl) => sl.id === slideId);
      expect(updatedSlide?.boundaryBox?.x).toBeCloseTo(10, 2);
      expect(updatedSlide?.boundaryBox?.y).toBeCloseTo(-5, 2);
    });

    it('toggleObjectLock で各オブジェクトの locked 状態がトグルされる', () => {
      const store = useTacticalUnifiedStore.getState();
      const slideId = store.activeSlideId;

      // 1. Player
      const player = createDefaultPlayer('home', 40, 40, '#ff0000');
      store.addPlayer(player);
      expect(
        useTacticalUnifiedStore
          .getState()
          .project.slides[0]?.players.find((p) => p.id === player.id)?.locked,
      ).toBeFalsy();

      store.toggleObjectLock(player.id, 'player');
      expect(
        useTacticalUnifiedStore
          .getState()
          .project.slides[0]?.players.find((p) => p.id === player.id)?.locked,
      ).toBe(true);

      store.toggleObjectLock(player.id, 'player');
      expect(
        useTacticalUnifiedStore
          .getState()
          .project.slides[0]?.players.find((p) => p.id === player.id)?.locked,
      ).toBe(false);

      // 2. Ball
      expect(
        useTacticalUnifiedStore.getState().project.slides[0]?.ball.locked,
      ).toBeFalsy();
      store.toggleObjectLock('ball', 'ball');
      expect(
        useTacticalUnifiedStore.getState().project.slides[0]?.ball.locked,
      ).toBe(true);
      store.toggleObjectLock('ball', 'ball');
      expect(
        useTacticalUnifiedStore.getState().project.slides[0]?.ball.locked,
      ).toBe(false);

      // 3. Arrow
      const arrow = {
        id: 'arrow-1',
        annotationType: 'arrow' as const,
        arrowType: 'pass' as const,
        curveType: 'straight' as const,
        points: [
          { x: 10, y: 10 },
          { x: 20, y: 20 },
        ],
        color: '#ffffff',
        strokeWidth: 3,
        dashArray: [],
        arrowHead: true,
      };
      store.addArrow(slideId, arrow);
      store.toggleObjectLock(arrow.id, 'arrow');
      expect(
        useTacticalUnifiedStore
          .getState()
          .project.slides[0]?.arrows.find((a) => a.id === arrow.id)?.locked,
      ).toBe(true);

      // 4. Zone
      const zone = {
        id: 'zone-1',
        annotationType: 'zone' as const,
        zoneType: 'generic' as const,
        color: '#f59e0b',
        opacity: 0.25,
        strokeWidth: 0,
        points: [],
      };
      store.addZone(slideId, zone);
      store.toggleObjectLock(zone.id, 'zone');
      expect(
        useTacticalUnifiedStore
          .getState()
          .project.slides[0]?.zones.find((z) => z.id === zone.id)?.locked,
      ).toBe(true);

      // 5. Text
      const text = {
        id: 'text-1',
        annotationType: 'text' as const,
        x: 30,
        y: 30,
        content: 'Tactics',
        fontSize: 16,
        color: '#ffffff',
        bold: false,
        italic: false,
      };
      store.addText(slideId, text);
      store.toggleObjectLock(text.id, 'text');
      expect(
        useTacticalUnifiedStore
          .getState()
          .project.slides[0]?.texts.find((t) => t.id === text.id)?.locked,
      ).toBe(true);
    });

    it('locked なオブジェクトは削除 (remove) されない', () => {
      const store = useTacticalUnifiedStore.getState();
      const slideId = store.activeSlideId;

      const player = createDefaultPlayer('home', 40, 40, '#ff0000');
      store.addPlayer(player);
      store.toggleObjectLock(player.id, 'player');

      store.removePlayer(slideId, player.id);
      expect(
        useTacticalUnifiedStore
          .getState()
          .project.slides[0]?.players.some((p) => p.id === player.id),
      ).toBe(true);

      // ロック解除後は削除できる
      store.toggleObjectLock(player.id, 'player');
      store.removePlayer(slideId, player.id);
      expect(
        useTacticalUnifiedStore
          .getState()
          .project.slides[0]?.players.some((p) => p.id === player.id),
      ).toBe(false);
    });

    it('locked なオブジェクトは移動・更新されない', () => {
      const store = useTacticalUnifiedStore.getState();
      const slideId = store.activeSlideId;

      const player = createDefaultPlayer('home', 40, 40, '#ff0000');
      store.addPlayer(player);
      store.toggleObjectLock(player.id, 'player');

      // movePlayer
      store.movePlayer(slideId, player.id, 60, 60);
      let p = useTacticalUnifiedStore
        .getState()
        .project.slides[0]?.players.find((pl) => pl.id === player.id);
      expect(p?.x).toBe(40);
      expect(p?.y).toBe(40);

      // updatePlayer (patch with non-lock property)
      store.updatePlayer(slideId, player.id, { x: 70, y: 70 });
      p = useTacticalUnifiedStore
        .getState()
        .project.slides[0]?.players.find((pl) => pl.id === player.id);
      expect(p?.x).toBe(40);

      // setBallPosition
      const initialBallX = store.project.slides[0]?.ball.x ?? 50;
      store.toggleObjectLock('ball', 'ball');
      store.setBallPosition(slideId, 80, 80);
      expect(useTacticalUnifiedStore.getState().project.slides[0]?.ball.x).toBe(
        initialBallX,
      );
    });

    it('resetSlideObjects で locked な要素は削除されず保持される', () => {
      const store = useTacticalUnifiedStore.getState();
      const slideId = store.activeSlideId;

      const lockedPlayer = createDefaultPlayer('home', 30, 30, '#00ff00');
      const normalPlayer = createDefaultPlayer('home', 40, 40, '#ff0000');
      store.addPlayer(lockedPlayer);
      store.addPlayer(normalPlayer);
      store.toggleObjectLock(lockedPlayer.id, 'player');

      const lockedArrow = {
        id: 'locked-arrow',
        annotationType: 'arrow' as const,
        arrowType: 'pass' as const,
        curveType: 'straight' as const,
        points: [
          { x: 10, y: 10 },
          { x: 20, y: 20 },
        ],
        color: '#ffffff',
        strokeWidth: 3,
        dashArray: [],
        arrowHead: true,
      };
      const normalArrow = { ...lockedArrow, id: 'normal-arrow' };
      store.addArrow(slideId, lockedArrow);
      store.addArrow(slideId, normalArrow);
      store.toggleObjectLock(lockedArrow.id, 'arrow');

      store.resetSlideObjects(slideId);

      const slide = useTacticalUnifiedStore.getState().project.slides[0];
      expect(slide?.arrows.some((a) => a.id === 'locked-arrow')).toBe(true);
      expect(slide?.arrows.some((a) => a.id === 'normal-arrow')).toBe(false);
      expect(slide?.players.some((p) => p.id === lockedPlayer.id)).toBe(true);
    });
  });
});
