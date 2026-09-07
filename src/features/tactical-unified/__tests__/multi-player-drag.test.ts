import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { createDefaultPlayer } from '@/lib/types/tactical-unified';

describe('AAWU 5-5-A: Stabilized Multi-Player Drag & Selection UX', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
  });

  describe('moveMultiplePlayersByDelta Store Action', () => {
    it('複数選手を同一 Delta 分だけ同時に移動させることができる', () => {
      const store = useTacticalUnifiedStore.getState();
      const slideId = store.activeSlideId;

      const player1 = createDefaultPlayer('home', 20, 30, '#034694');
      const player2 = createDefaultPlayer('home', 40, 50, '#034694');
      const player3 = createDefaultPlayer('away', 60, 70, '#ef4444');
      store.addPlayer(player1);
      store.addPlayer(player2);
      store.addPlayer(player3);

      // player1 と player2 を +10, +15 移動 (player3 は移動対象外)
      store.moveMultiplePlayersByDelta(
        slideId,
        [player1.id, player2.id],
        10,
        15,
      );

      const slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      const movedP1 = slide?.players.find((p) => p.id === player1.id);
      const movedP2 = slide?.players.find((p) => p.id === player2.id);
      const unmovedP3 = slide?.players.find((p) => p.id === player3.id);

      expect(movedP1?.x).toBe(30);
      expect(movedP1?.y).toBe(45);

      expect(movedP2?.x).toBe(50);
      expect(movedP2?.y).toBe(65);

      expect(unmovedP3?.x).toBe(60);
      expect(unmovedP3?.y).toBe(70);
    });

    it('画面端 (ピッチ外) への移動が許容され、セーフティリミット (-100%〜200%) が適用される', () => {
      const store = useTacticalUnifiedStore.getState();
      const slideId = store.activeSlideId;

      const pLeftTop = createDefaultPlayer('home', 5, 5, '#034694');
      const pRightBottom = createDefaultPlayer('home', 95, 95, '#034694');
      store.addPlayer(pLeftTop);
      store.addPlayer(pRightBottom);

      // -20, -20 移動 ➔ pLeftTop は (-15, -15) （ピッチ外へ移動）、pRightBottom は (75, 75)
      store.moveMultiplePlayersByDelta(
        slideId,
        [pLeftTop.id, pRightBottom.id],
        -20,
        -20,
      );

      let slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      let resLeftTop = slide?.players.find((p) => p.id === pLeftTop.id);
      let resRightBottom = slide?.players.find((p) => p.id === pRightBottom.id);

      expect(resLeftTop?.x).toBe(-15);
      expect(resLeftTop?.y).toBe(-15);
      expect(resRightBottom?.x).toBe(75);
      expect(resRightBottom?.y).toBe(75);

      // +50, +50 移動 ➔ pRightBottom は (125, 125) （ピッチ外へ移動）、pLeftTop は (35, 35)
      store.moveMultiplePlayersByDelta(
        slideId,
        [pLeftTop.id, pRightBottom.id],
        50,
        50,
      );

      slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      resLeftTop = slide?.players.find((p) => p.id === pLeftTop.id);
      resRightBottom = slide?.players.find((p) => p.id === pRightBottom.id);

      expect(resLeftTop?.x).toBe(35);
      expect(resLeftTop?.y).toBe(35);
      expect(resRightBottom?.x).toBe(125);
      expect(resRightBottom?.y).toBe(125);
    });

    it('選択中の2選手間に架かるパス矢印は、両端とも同一 Delta 分だけ平行移動する', () => {
      const store = useTacticalUnifiedStore.getState();
      const slideId = store.activeSlideId;

      const player1 = createDefaultPlayer('home', 30, 40, '#034694');
      const player2 = createDefaultPlayer('home', 50, 60, '#034694');
      store.addPlayer(player1);
      store.addPlayer(player2);

      const arrowId = 'connected-arrow-1';
      store.addArrow(slideId, {
        id: arrowId,
        annotationType: 'arrow',
        arrowType: 'pass',
        curveType: 'curved',
        sourcePlayerId: player1.id,
        targetPlayerId: player2.id,
        points: [
          { x: 30, y: 40 },
          { x: 50, y: 60 },
        ],
        controlPoint: { x: 40, y: 45 },
        color: '#38bdf8',
        strokeWidth: 3,
        dashArray: [],
        arrowHead: true,
      });

      // 両選手を +15, -10 移動
      store.moveMultiplePlayersByDelta(
        slideId,
        [player1.id, player2.id],
        15,
        -10,
      );

      const slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      const movedArrow = slide?.arrows.find((a) => a.id === arrowId);

      // 始点・終点・制御点すべてが +15, -10 平行移動
      expect(movedArrow?.points[0]).toEqual({ x: 45, y: 30 });
      expect(movedArrow?.points[1]).toEqual({ x: 65, y: 50 });
      expect(movedArrow?.controlPoint).toEqual({ x: 55, y: 35 });
    });

    it('片方のみ選択移動された場合、選択された側の端点のみ追従し相手端点は固定される', () => {
      const store = useTacticalUnifiedStore.getState();
      const slideId = store.activeSlideId;

      const player1 = createDefaultPlayer('home', 30, 40, '#034694');
      const player2 = createDefaultPlayer('home', 50, 60, '#034694');
      store.addPlayer(player1);
      store.addPlayer(player2);

      const arrowId = 'connected-arrow-2';
      store.addArrow(slideId, {
        id: arrowId,
        annotationType: 'arrow',
        arrowType: 'pass',
        curveType: 'straight',
        sourcePlayerId: player1.id,
        targetPlayerId: player2.id,
        points: [
          { x: 30, y: 40 },
          { x: 50, y: 60 },
        ],
        color: '#38bdf8',
        strokeWidth: 3,
        dashArray: [],
        arrowHead: true,
      });

      // player1 のみ +10, +5 移動
      store.moveMultiplePlayersByDelta(slideId, [player1.id], 10, 5);

      let slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      let movedArrow = slide?.arrows.find((a) => a.id === arrowId);

      expect(movedArrow?.points[0]).toEqual({ x: 40, y: 45 });
      expect(movedArrow?.points[1]).toEqual({ x: 50, y: 60 });

      // player2 のみ -5, -10 移動
      store.moveMultiplePlayersByDelta(slideId, [player2.id], -5, -10);

      slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      movedArrow = slide?.arrows.find((a) => a.id === arrowId);

      expect(movedArrow?.points[0]).toEqual({ x: 40, y: 45 });
      expect(movedArrow?.points[1]).toEqual({ x: 45, y: 50 });
    });

    it('選手移動時に独立したテキスト・ボール・ゾーンは連動せず位置を維持する', () => {
      const store = useTacticalUnifiedStore.getState();
      const slideId = store.activeSlideId;

      const player1 = createDefaultPlayer('home', 30, 30, '#034694');
      const player2 = createDefaultPlayer('home', 70, 70, '#034694');
      store.addPlayer(player1);
      store.addPlayer(player2);

      // player1 にボールを配置
      store.setBallPosition(slideId, 30, 30);

      // player2 近傍にテキストを配置
      const textId = 'text-near-p2';
      store.addText(slideId, {
        id: textId,
        annotationType: 'text',
        x: 72,
        y: 72,
        content: 'Press here',
        fontSize: 12,
        color: '#ffffff',
        bold: false,
        italic: false,
      });

      // 両選手を +10, +10 移動
      store.moveMultiplePlayersByDelta(
        slideId,
        [player1.id, player2.id],
        10,
        10,
      );

      const slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      const movedBall = slide?.ball;
      const movedText = slide?.texts.find((t) => t.id === textId);

      // ボール・テキストは独立オブジェクトのため選手移動で勝手に追従せず元の位置を維持
      expect(movedBall?.x).toBe(30);
      expect(movedBall?.y).toBe(30);

      expect(movedText?.x).toBe(72);
      expect(movedText?.y).toBe(72);
    });

    it('movePlayer は moveMultiplePlayersByDelta へ移譲され後方互換性が保たれる', () => {
      const store = useTacticalUnifiedStore.getState();
      const slideId = store.activeSlideId;

      const player = createDefaultPlayer('home', 50, 50, '#034694');
      store.addPlayer(player);

      // movePlayer で (50, 50) -> (65, 80) へ移動
      store.movePlayer(slideId, player.id, 65, 80);

      const slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      const movedP = slide?.players.find((p) => p.id === player.id);

      expect(movedP?.x).toBe(65);
      expect(movedP?.y).toBe(80);
    });

    it('空配列または Delta=0 の呼び出しは安全に無視されスライド状態を保持する', () => {
      const store = useTacticalUnifiedStore.getState();
      const slideId = store.activeSlideId;

      const player = createDefaultPlayer('home', 50, 50, '#034694');
      store.addPlayer(player);

      store.moveMultiplePlayersByDelta(slideId, [], 10, 10);
      store.moveMultiplePlayersByDelta(slideId, [player.id], 0, 0);

      const slide = useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId);
      const p = slide?.players.find((item) => item.id === player.id);

      expect(p?.x).toBe(50);
      expect(p?.y).toBe(50);
    });
  });

  describe('Selection UX & Multi-Player State Integration', () => {
    it('複数選択 (selectObject multi=true) で選択された選手リストを保持できる', () => {
      const store = useTacticalUnifiedStore.getState();
      const p1 = createDefaultPlayer('home', 20, 20, '#034694');
      const p2 = createDefaultPlayer('home', 40, 40, '#034694');
      store.addPlayer(p1);
      store.addPlayer(p2);

      store.selectObject({ id: p1.id, kind: 'player' }, false);
      expect(useTacticalUnifiedStore.getState().selectedObjects).toEqual([
        { id: p1.id, kind: 'player' },
      ]);

      // Shift+Click で p2 を追加選択
      store.selectObject({ id: p2.id, kind: 'player' }, true);
      expect(useTacticalUnifiedStore.getState().selectedObjects).toEqual([
        { id: p1.id, kind: 'player' },
        { id: p2.id, kind: 'player' },
      ]);

      // p1 を再トグルして選択解除
      store.selectObject({ id: p1.id, kind: 'player' }, true);
      expect(useTacticalUnifiedStore.getState().selectedObjects).toEqual([
        { id: p2.id, kind: 'player' },
      ]);
    });

    it('範囲選択 (selectObjects multi=false) で囲まれた複数オブジェクトを一括選択できる', () => {
      const store = useTacticalUnifiedStore.getState();
      const p1 = createDefaultPlayer('home', 20, 20, '#034694');
      const p2 = createDefaultPlayer('home', 35, 35, '#034694');
      const p3 = createDefaultPlayer('away', 80, 80, '#ef4444');
      store.addPlayer(p1);
      store.addPlayer(p2);
      store.addPlayer(p3);

      // 範囲 (10, 10) 〜 (50, 50) に含まれる p1 と p2 を一括選択
      store.selectObjects([
        { id: p1.id, kind: 'player' },
        { id: p2.id, kind: 'player' },
      ]);

      expect(useTacticalUnifiedStore.getState().selectedObjects).toEqual([
        { id: p1.id, kind: 'player' },
        { id: p2.id, kind: 'player' },
      ]);

      // 空配列を渡すと選択解除
      store.selectObjects([]);
      expect(useTacticalUnifiedStore.getState().selectedObjects).toEqual([]);
    });

    it('Shift キーを押しながらの範囲選択 (selectObjects multi=true) で既存選択に追加できる', () => {
      const store = useTacticalUnifiedStore.getState();
      const p1 = createDefaultPlayer('home', 20, 20, '#034694');
      const p2 = createDefaultPlayer('home', 40, 40, '#034694');
      const p3 = createDefaultPlayer('away', 60, 60, '#ef4444');
      store.addPlayer(p1);
      store.addPlayer(p2);
      store.addPlayer(p3);

      // 初期選択: p1
      store.selectObject({ id: p1.id, kind: 'player' }, false);

      // Shift+範囲選択で p2, p3 を追加
      store.selectObjects(
        [
          { id: p2.id, kind: 'player' },
          { id: p3.id, kind: 'player' },
        ],
        true,
      );

      expect(useTacticalUnifiedStore.getState().selectedObjects).toEqual([
        { id: p1.id, kind: 'player' },
        { id: p2.id, kind: 'player' },
        { id: p3.id, kind: 'player' },
      ]);
    });
  });
});
