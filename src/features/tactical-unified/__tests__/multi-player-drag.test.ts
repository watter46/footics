import { beforeEach, describe, expect, it } from 'vitest';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  toMilliseconds,
  toScreenNormCoord,
} from '@/lib/types/tactical/branded';
import type {
  DomainTacticalPhase,
  DomainTacticalProject,
} from '@/lib/types/tactical/domain-hierarchy';
import { createDefaultPlayer } from '@/lib/types/tactical-unified';

function createTestProject(): DomainTacticalProject {
  const phase: DomainTacticalPhase = {
    id: 'phase-1',
    name: 'Phase 1',
    aspectRatio: '4:5',
    boundaryBox: {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      enabled: true,
      visible: false,
      fitTarget: 'pitch',
    },
    backgroundType: 'pitch',
    slides: [
      {
        id: 'slide-1',
        index: 0,
        label: 'Scene 1',
        players: [],
        ball: {
          x: toScreenNormCoord(50),
          y: toScreenNormCoord(50),
          visible: false,
        },
        arrows: [],
        zones: [],
        texts: [],
        transitionDurationMs: toMilliseconds(500),
        pauseMs: toMilliseconds(0),
        easing: 'ease-in-out',
      },
    ],
  };

  return {
    id: 'proj-1',
    version: '3.0.0',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    homeColor: { primary: '#034694' },
    awayColor: { primary: '#ef4444' },
    pitchAppearance: {
      pitchBackgroundType: 'solid',
      overlayColor: '#2e7d32',
      overlayOpacity: 1,
      lineColor: '#ffffff',
      lineWidth: 1,
      lineOpacity: 1,
    },
    screenBackground: { type: 'dark' },
    tags: [],
    phases: [phase],
  };
}

function createPitchPlayer(
  team: 'home' | 'away',
  x: number,
  y: number,
  color: string,
) {
  return {
    ...createDefaultPlayer(team, x, y, color),
    area: 'pitch' as const,
    x: toScreenNormCoord(x),
    y: toScreenNormCoord(y),
    trajectory: undefined,
  };
}

function getSlide(
  docStore: ReturnType<typeof createDocumentStore>,
  phaseId: string,
  slideId: string,
) {
  return docStore
    .getState()
    .project.phases.find((p) => p.id === phaseId)
    ?.slides.find((s) => s.id === slideId);
}

function movePlayersByDelta(
  docStore: ReturnType<typeof createDocumentStore>,
  phaseId: string,
  slideId: string,
  playerIds: readonly string[],
  deltaX: number,
  deltaY: number,
) {
  if (playerIds.length === 0 || (deltaX === 0 && deltaY === 0)) return;
  const slide = getSlide(docStore, phaseId, slideId);
  if (!slide) return;
  const idSet = new Set(playerIds);
  const moves = slide.players
    .filter((p) => idSet.has(p.id))
    .map((p) => ({
      id: p.id,
      x: toScreenNormCoord(p.x + deltaX),
      y: toScreenNormCoord(p.y + deltaY),
    }));
  if (moves.length === 0) return;
  docStore.getState().dispatchSlide(phaseId, slideId, {
    type: 'MOVE_PLAYERS',
    moves,
  });
}

describe('AAWU 5-5-A: Stabilized Multi-Player Drag & Selection UX', () => {
  let docStore: ReturnType<typeof createDocumentStore>;
  let sessionStore: ReturnType<typeof createSessionStore>;
  const phaseId = 'phase-1';
  const slideId = 'slide-1';

  beforeEach(() => {
    docStore = createDocumentStore(createTestProject());
    sessionStore = createSessionStore();
  });

  describe('MOVE_PLAYERS Domain Command', () => {
    it('複数選手を同一 Delta 分だけ同時に移動させることができる', () => {
      const player1 = createPitchPlayer('home', 20, 30, '#034694');
      const player2 = createPitchPlayer('home', 40, 50, '#034694');
      const player3 = createPitchPlayer('away', 60, 70, '#ef4444');
      docStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'ADD_PLAYER',
        player: player1,
      });
      docStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'ADD_PLAYER',
        player: player2,
      });
      docStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'ADD_PLAYER',
        player: player3,
      });

      // player1 と player2 を +10, +15 移動 (player3 は移動対象外)
      movePlayersByDelta(
        docStore,
        phaseId,
        slideId,
        [player1.id, player2.id],
        10,
        15,
      );

      const slide = getSlide(docStore, phaseId, slideId);
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
      const pLeftTop = createPitchPlayer('home', 5, 5, '#034694');
      const pRightBottom = createPitchPlayer('home', 95, 95, '#034694');
      docStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'ADD_PLAYER',
        player: pLeftTop,
      });
      docStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'ADD_PLAYER',
        player: pRightBottom,
      });

      // -20, -20 移動 ➔ pLeftTop は (-15, -15) （ピッチ外へ移動）、pRightBottom は (75, 75)
      movePlayersByDelta(
        docStore,
        phaseId,
        slideId,
        [pLeftTop.id, pRightBottom.id],
        -20,
        -20,
      );

      let slide = getSlide(docStore, phaseId, slideId);
      let resLeftTop = slide?.players.find((p) => p.id === pLeftTop.id);
      let resRightBottom = slide?.players.find((p) => p.id === pRightBottom.id);

      expect(resLeftTop?.x).toBe(-15);
      expect(resLeftTop?.y).toBe(-15);
      expect(resRightBottom?.x).toBe(75);
      expect(resRightBottom?.y).toBe(75);

      // +50, +50 移動 ➔ pRightBottom は (125, 125) （ピッチ外へ移動）、pLeftTop は (35, 35)
      movePlayersByDelta(
        docStore,
        phaseId,
        slideId,
        [pLeftTop.id, pRightBottom.id],
        50,
        50,
      );

      slide = getSlide(docStore, phaseId, slideId);
      resLeftTop = slide?.players.find((p) => p.id === pLeftTop.id);
      resRightBottom = slide?.players.find((p) => p.id === pRightBottom.id);

      expect(resLeftTop?.x).toBe(35);
      expect(resLeftTop?.y).toBe(35);
      expect(resRightBottom?.x).toBe(115);
      expect(resRightBottom?.y).toBe(115);
    });

    it('選択中の2選手間に架かるパス矢印は、両端とも同一 Delta 分だけ平行移動する', () => {
      const player1 = createPitchPlayer('home', 30, 40, '#034694');
      const player2 = createPitchPlayer('home', 50, 60, '#034694');
      docStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'ADD_PLAYER',
        player: player1,
      });
      docStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'ADD_PLAYER',
        player: player2,
      });

      const arrowId = 'connected-arrow-1';
      docStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'ADD_ARROW',
        arrow: {
          id: arrowId,
          annotationType: 'arrow',
          arrowType: 'pass',
          curveType: 'curved',
          sourcePlayerId: player1.id,
          targetPlayerId: player2.id,
          points: [
            { x: toScreenNormCoord(30), y: toScreenNormCoord(40) },
            { x: toScreenNormCoord(50), y: toScreenNormCoord(60) },
          ],
          controlPoint: { x: toScreenNormCoord(40), y: toScreenNormCoord(45) },
          color: '#38bdf8',
          strokeWidth: 3,
          dashArray: [],
          startMarker: 'none',
          endMarker: 'arrow',
        },
      });

      // 両選手を +15, -10 移動
      movePlayersByDelta(
        docStore,
        phaseId,
        slideId,
        [player1.id, player2.id],
        15,
        -10,
      );

      const slide = getSlide(docStore, phaseId, slideId);
      const movedArrow = slide?.arrows.find((a) => a.id === arrowId);

      // 始点・終点が +15, -10 平行移動し、制御点は維持される
      expect(movedArrow?.points[0]).toEqual({ x: 45, y: 30 });
      expect(movedArrow?.points[1]).toEqual({ x: 65, y: 50 });
      expect(movedArrow?.controlPoint).toEqual({ x: 40, y: 45 });
    });

    it('片方のみ選択移動された場合、選択された側の端点のみ追従し相手端点は固定される', () => {
      const player1 = createPitchPlayer('home', 30, 40, '#034694');
      const player2 = createPitchPlayer('home', 50, 60, '#034694');
      docStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'ADD_PLAYER',
        player: player1,
      });
      docStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'ADD_PLAYER',
        player: player2,
      });

      const arrowId = 'connected-arrow-2';
      docStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'ADD_ARROW',
        arrow: {
          id: arrowId,
          annotationType: 'arrow',
          arrowType: 'pass',
          curveType: 'straight',
          sourcePlayerId: player1.id,
          targetPlayerId: player2.id,
          points: [
            { x: toScreenNormCoord(30), y: toScreenNormCoord(40) },
            { x: toScreenNormCoord(50), y: toScreenNormCoord(60) },
          ],
          color: '#38bdf8',
          strokeWidth: 3,
          dashArray: [],
          startMarker: 'none',
          endMarker: 'arrow',
        },
      });

      // player1 のみ +10, +5 移動
      movePlayersByDelta(docStore, phaseId, slideId, [player1.id], 10, 5);

      let slide = getSlide(docStore, phaseId, slideId);
      let movedArrow = slide?.arrows.find((a) => a.id === arrowId);

      expect(movedArrow?.points[0]).toEqual({ x: 40, y: 45 });
      expect(movedArrow?.points[1]).toEqual({ x: 50, y: 60 });

      // player2 のみ -5, -10 移動
      movePlayersByDelta(docStore, phaseId, slideId, [player2.id], -5, -10);

      slide = getSlide(docStore, phaseId, slideId);
      movedArrow = slide?.arrows.find((a) => a.id === arrowId);

      expect(movedArrow?.points[0]).toEqual({ x: 40, y: 45 });
      expect(movedArrow?.points[1]).toEqual({ x: 45, y: 50 });
    });

    it('選手移動時に独立したテキスト・ボール・ゾーンは連動せず位置を維持する', () => {
      const player1 = createPitchPlayer('home', 30, 30, '#034694');
      const player2 = createPitchPlayer('home', 70, 70, '#034694');
      docStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'ADD_PLAYER',
        player: player1,
      });
      docStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'ADD_PLAYER',
        player: player2,
      });

      // player1 にボールを配置
      docStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'UPDATE_BALL',
        patch: {
          x: toScreenNormCoord(30),
          y: toScreenNormCoord(30),
        },
      });

      // player2 近傍にテキストを配置
      const textId = 'text-near-p2';
      docStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'ADD_TEXT',
        text: {
          id: textId,
          annotationType: 'text',
          x: toScreenNormCoord(72),
          y: toScreenNormCoord(72),
          content: 'Press here',
          fontSize: 12,
          color: '#ffffff',
          bold: false,
          italic: false,
        },
      });

      // 両選手を +10, +10 移動
      movePlayersByDelta(
        docStore,
        phaseId,
        slideId,
        [player1.id, player2.id],
        10,
        10,
      );

      const slide = getSlide(docStore, phaseId, slideId);
      const movedBall = slide?.ball;
      const movedText = slide?.texts.find((t) => t.id === textId);

      // ボール・テキストは独立オブジェクトのため選手移動で勝手に追従せず元の位置を維持
      expect(movedBall?.x).toBe(30);
      expect(movedBall?.y).toBe(30);

      expect(movedText?.x).toBe(72);
      expect(movedText?.y).toBe(72);
    });

    it('単一選手の MOVE_PLAYERS で指定座標へ移動できる', () => {
      const player = createPitchPlayer('home', 50, 50, '#034694');
      docStore
        .getState()
        .dispatchSlide(phaseId, slideId, { type: 'ADD_PLAYER', player });

      // MOVE_PLAYERS で (50, 50) -> (65, 80) へ移動
      docStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'MOVE_PLAYERS',
        moves: [
          {
            id: player.id,
            x: toScreenNormCoord(65),
            y: toScreenNormCoord(80),
          },
        ],
      });

      const slide = getSlide(docStore, phaseId, slideId);
      const movedP = slide?.players.find((p) => p.id === player.id);

      expect(movedP?.x).toBe(65);
      expect(movedP?.y).toBe(80);
    });

    it('空配列または Delta=0 の呼び出しは安全に無視されスライド状態を保持する', () => {
      const player = createPitchPlayer('home', 50, 50, '#034694');
      docStore
        .getState()
        .dispatchSlide(phaseId, slideId, { type: 'ADD_PLAYER', player });

      movePlayersByDelta(docStore, phaseId, slideId, [], 10, 10);
      movePlayersByDelta(docStore, phaseId, slideId, [player.id], 0, 0);

      const slide = getSlide(docStore, phaseId, slideId);
      const p = slide?.players.find((item) => item.id === player.id);

      expect(p?.x).toBe(50);
      expect(p?.y).toBe(50);
    });
  });

  describe('Selection UX & Multi-Player State Integration', () => {
    it('複数選択 (selectObject multi=true) で選択された選手リストを保持できる', () => {
      const p1 = createPitchPlayer('home', 20, 20, '#034694');
      const p2 = createPitchPlayer('home', 40, 40, '#034694');
      docStore
        .getState()
        .dispatchSlide(phaseId, slideId, { type: 'ADD_PLAYER', player: p1 });
      docStore
        .getState()
        .dispatchSlide(phaseId, slideId, { type: 'ADD_PLAYER', player: p2 });

      sessionStore
        .getState()
        .selectObject({ id: p1.id, kind: 'player' }, false);
      expect(sessionStore.getState().selectedObjects).toEqual([
        { id: p1.id, kind: 'player' },
      ]);

      // Shift+Click で p2 を追加選択
      sessionStore.getState().selectObject({ id: p2.id, kind: 'player' }, true);
      expect(sessionStore.getState().selectedObjects).toEqual([
        { id: p1.id, kind: 'player' },
        { id: p2.id, kind: 'player' },
      ]);

      // p1 を再トグルして選択解除
      sessionStore.getState().selectObject({ id: p1.id, kind: 'player' }, true);
      expect(sessionStore.getState().selectedObjects).toEqual([
        { id: p2.id, kind: 'player' },
      ]);
    });

    it('範囲選択 (selectObjects multi=false) で囲まれた複数オブジェクトを一括選択できる', () => {
      const p1 = createPitchPlayer('home', 20, 20, '#034694');
      const p2 = createPitchPlayer('home', 35, 35, '#034694');
      const p3 = createPitchPlayer('away', 80, 80, '#ef4444');
      docStore
        .getState()
        .dispatchSlide(phaseId, slideId, { type: 'ADD_PLAYER', player: p1 });
      docStore
        .getState()
        .dispatchSlide(phaseId, slideId, { type: 'ADD_PLAYER', player: p2 });
      docStore
        .getState()
        .dispatchSlide(phaseId, slideId, { type: 'ADD_PLAYER', player: p3 });

      // 範囲 (10, 10) 〜 (50, 50) に含まれる p1 と p2 を一括選択
      sessionStore.getState().selectObjects([
        { id: p1.id, kind: 'player' },
        { id: p2.id, kind: 'player' },
      ]);

      expect(sessionStore.getState().selectedObjects).toEqual([
        { id: p1.id, kind: 'player' },
        { id: p2.id, kind: 'player' },
      ]);

      // 空配列を渡すと選択解除
      sessionStore.getState().selectObjects([]);
      expect(sessionStore.getState().selectedObjects).toEqual([]);
    });

    it('Shift キーを押しながらの範囲選択 (selectObjects multi=true) で既存選択に追加できる', () => {
      const p1 = createPitchPlayer('home', 20, 20, '#034694');
      const p2 = createPitchPlayer('home', 40, 40, '#034694');
      const p3 = createPitchPlayer('away', 60, 60, '#ef4444');
      docStore
        .getState()
        .dispatchSlide(phaseId, slideId, { type: 'ADD_PLAYER', player: p1 });
      docStore
        .getState()
        .dispatchSlide(phaseId, slideId, { type: 'ADD_PLAYER', player: p2 });
      docStore
        .getState()
        .dispatchSlide(phaseId, slideId, { type: 'ADD_PLAYER', player: p3 });

      // 初期選択: p1
      sessionStore
        .getState()
        .selectObject({ id: p1.id, kind: 'player' }, false);

      // Shift+範囲選択で p2, p3 を追加
      sessionStore.getState().selectObjects(
        [
          { id: p2.id, kind: 'player' },
          { id: p3.id, kind: 'player' },
        ],
        true,
      );

      expect(sessionStore.getState().selectedObjects).toEqual([
        { id: p1.id, kind: 'player' },
        { id: p2.id, kind: 'player' },
        { id: p3.id, kind: 'player' },
      ]);
    });
  });
});
