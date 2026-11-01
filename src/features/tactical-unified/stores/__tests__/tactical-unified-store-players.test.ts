/**
 * tactical-unified-store-players.test.ts
 * Unit tests for TacticalUnifiedStore - Players & Squad operations
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

describe('tactical-unified-store - players & squad', () => {
  beforeEach(() => {
    const store = useTacticalUnifiedStore.getState();
    store.resetProject();
    useTacticalUnifiedStore.setState({
      selectedObjects: [],
      clipboard: null,
    });
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
    // 既存選手の有効ポジション (ST, LM) は破壊されず維持される
    expect(homePitchPlayers.some((p) => p.position === 'ST')).toBe(true);
    expect(homePitchPlayers.some((p) => p.position === 'LM')).toBe(true);

    // 未設定または 'Sub' の選手の場合はフォーメーション枠のポジション (LW) が割り当てられる
    const subPlayers = homePitchPlayers.map((p) => ({ ...p, position: 'Sub' }));
    store.loadProject({
      ...store.project,
      slides: [
        {
          ...slide!,
          players: [
            ...slide!.players.filter((p) => p.team !== 'home'),
            ...subPlayers,
          ],
        },
      ],
    });
    store.applyFormation(slideId, '4-3-3', 'full', 'home');
    const updatedSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    const updatedHomePitch =
      updatedSlide?.players.filter(
        (p) => p.team === 'home' && p.area === 'pitch',
      ) ?? [];
    expect(updatedHomePitch.some((p) => p.position === 'LW')).toBe(true);
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

  it('updatePlayer でピッチ外の余白座標 (x: -15, y: 112) が 0〜100 にクランプされず保持される', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;
    const playerId = store.project.slides[0]?.players[0]?.id;
    expect(playerId).toBeDefined();

    store.updatePlayer(slideId, playerId!, { x: -15, y: 112 });

    const player = useTacticalUnifiedStore
      .getState()
      .project.slides[0]?.players.find((p) => p.id === playerId);
    expect(player?.x).toBe(-15);
    expect(player?.y).toBe(112);
  });

  describe('updatePlayer / updatePlayers arrow endpoint synchronization', () => {
    it('updatePlayer で選手移動時に接続矢印 (sourcePlayerId, targetPlayerId) の端点が更新される', () => {
      const store = useTacticalUnifiedStore.getState();
      const slideId = store.activeSlideId;
      const player1 = createDefaultPlayer('home', 20, 30, '#034694');
      const player2 = createDefaultPlayer('home', 60, 70, '#034694');
      store.addPlayer(player1);
      store.addPlayer(player2);

      const arrowId = 'arrow-sync-test-1';
      store.addArrow(slideId, {
        id: arrowId,
        annotationType: 'arrow',
        arrowType: 'pass',
        curveType: 'straight',
        sourcePlayerId: player1.id,
        targetPlayerId: player2.id,
        points: [
          { x: 20, y: 30 },
          { x: 60, y: 70 },
        ],
        color: '#ffffff',
        strokeWidth: 3,
        dashArray: [],
        arrowHead: true,
      });

      // player1 (source) を (25, 35) へ更新
      store.updatePlayer(slideId, player1.id, { x: 25, y: 35 });

      let slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      let arrow = slide?.arrows.find((a) => a.id === arrowId);
      expect(arrow?.points[0]).toEqual({ x: 25, y: 35 });
      expect(arrow?.points[1]).toEqual({ x: 60, y: 70 });

      // player2 (target) を (65, 75) へ更新
      store.updatePlayer(slideId, player2.id, { x: 65, y: 75 });

      slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      arrow = slide?.arrows.find((a) => a.id === arrowId);
      expect(arrow?.points[0]).toEqual({ x: 25, y: 35 });
      expect(arrow?.points[1]).toEqual({ x: 65, y: 75 });
    });

    it('updatePlayers で複数選手一括移動時に接続矢印の端点が同時に更新される', () => {
      const store = useTacticalUnifiedStore.getState();
      const slideId = store.activeSlideId;
      const player1 = createDefaultPlayer('home', 10, 20, '#034694');
      const player2 = createDefaultPlayer('home', 50, 60, '#034694');
      store.addPlayer(player1);
      store.addPlayer(player2);

      const arrowId = 'arrow-sync-batch-1';
      store.addArrow(slideId, {
        id: arrowId,
        annotationType: 'arrow',
        arrowType: 'pass',
        curveType: 'straight',
        sourcePlayerId: player1.id,
        targetPlayerId: player2.id,
        points: [
          { x: 10, y: 20 },
          { x: 50, y: 60 },
        ],
        color: '#ffffff',
        strokeWidth: 3,
        dashArray: [],
        arrowHead: true,
      });

      // player1 と player2 を一括更新
      store.updatePlayers(slideId, [
        { id: player1.id, patch: { x: 15, y: 25 } },
        { id: player2.id, patch: { x: 55, y: 65 } },
      ]);

      const slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      const arrow = slide?.arrows.find((a) => a.id === arrowId);
      expect(arrow?.points[0]).toEqual({ x: 15, y: 25 });
      expect(arrow?.points[1]).toEqual({ x: 55, y: 65 });
    });
  });
});
