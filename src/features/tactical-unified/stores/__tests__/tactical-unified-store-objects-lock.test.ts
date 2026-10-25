/**
 * tactical-unified-store-objects-lock.test.ts
 * Unit tests for TacticalUnifiedStore - Objects & Lock operations
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

describe('tactical-unified-store - objects & lock', () => {
  beforeEach(() => {
    const store = useTacticalUnifiedStore.getState();
    store.resetProject();
    useTacticalUnifiedStore.setState({
      selectedObjects: [],
      clipboard: null,
    });
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

  it('swapTeamSides でスライド内の選手・ボール・矢印・ゾーン・テキストが180度点対称反転する (横画面 16:9)', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;
    store.setAspectRatio('16:9');

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
    expect(swappedPlayer?.y).toBe(60); // 100 - 40
    expect(slide?.ball.x).toBe(70); // 100 - 30
    expect(slide?.ball.y).toBe(50); // 100 - 50
    expect(swappedArrow?.points[0]).toEqual({ x: 80, y: 60 });
    expect(swappedArrow?.points[1]).toEqual({ x: 60, y: 40 });
    expect(swappedText?.x).toBe(75); // 100 - 25
    expect(swappedText?.y).toBe(65); // 100 - 35
    expect(slide?.isSidesSwapped).toBe(true);
  });

  it('swapTeamSides で縦画面 (9:16) の場合も 180度点対称反転する', () => {
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

    expect(swappedPlayer?.x).toBe(80); // 100 - 20
    expect(swappedPlayer?.y).toBe(70); // 100 - 30
    expect(slide?.ball.x).toBe(50); // 100 - 50
    expect(slide?.ball.y).toBe(80); // 100 - 20
    expect(slide?.isSidesSwapped).toBe(true);
  });

  it('swapTeamSides で縦画面 (4:5) および正方形 (1:1) の場合も 180度点対称反転する', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;

    // 4:5
    store.setAspectRatio('4:5');
    const p1 = createDefaultPlayer('home', 25, 40, '#034694');
    store.addPlayer(p1);
    store.swapTeamSides(slideId);

    let slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    let swappedP1 = slide?.players.find((p) => p.id === p1.id);
    expect(swappedP1?.x).toBe(75); // 100 - 25
    expect(swappedP1?.y).toBe(60); // 100 - 40
    expect(slide?.isSidesSwapped).toBe(true);

    // 1:1 (もう一度 swap すると元に戻る)
    store.setAspectRatio('1:1');
    store.swapTeamSides(slideId);
    slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    swappedP1 = slide?.players.find((p) => p.id === p1.id);
    expect(swappedP1?.x).toBe(25);
    expect(swappedP1?.y).toBe(40);
    expect(slide?.isSidesSwapped).toBe(false);
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

  it('resetSlideObjects でロックされていないアノテーションがリセットされる', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;

    // アノテーションを追加
    store.addArrow(slideId, {
      id: 'reset-test-arrow',
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
    });

    // resetSlideObjects 実行
    store.resetSlideObjects(slideId);

    const slide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((sl) => sl.id === slideId);

    // アノテーションは削除される
    expect(slide?.arrows.length).toBe(0);
    expect(slide?.zones.length).toBe(0);
    expect(slide?.texts.length).toBe(0);
  });
});
