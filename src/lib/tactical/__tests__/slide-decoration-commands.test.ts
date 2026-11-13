import { describe, expect, it } from 'vitest';
import {
  clampToScreenNorm,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import type {
  BenchPlayer,
  PitchPlayer,
} from '@/lib/types/tactical/domain-entities';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import { applySlideCommand } from '../domain/slide-reducer';

const style = {
  markerType: 'circle',
  insideContent: 'number',
  bottomLabel: 'name',
  color: '#ff0000',
  strokeColor: '#ffffff',
  strokeWidth: 2,
  sizeScale: 1.0,
  numberSizeScale: 1.0,
  labelSizeScale: 1.0,
} as const;

const pitchPlayer = (
  id: string,
  overrides?: Partial<PitchPlayer>,
): PitchPlayer => ({
  id,
  area: 'pitch',
  team: 'home',
  x: clampToScreenNorm(20),
  y: clampToScreenNorm(30),
  style,
  connectLines: [],
  badges: [],
  ...overrides,
});

const benchPlayer = (id: string): BenchPlayer => ({
  id,
  area: 'bench',
  team: 'home',
  x: clampToScreenNorm(5),
  y: clampToScreenNorm(90),
  style,
});

const slide = (overrides?: Partial<DomainSlide>): DomainSlide => ({
  id: 's1',
  index: 0,
  players: [],
  arrows: [],
  zones: [],
  texts: [],
  ball: { x: clampToScreenNorm(50), y: clampToScreenNorm(50), visible: true },
  transitionDurationMs: 1000,
  pauseMs: 500,
  easing: 'linear',
  ...overrides,
});

const pitchOf = (s: DomainSlide, id: string): PitchPlayer => {
  const p = s.players.find((x) => x.id === id);
  if (!p || p.area !== 'pitch') throw new Error('pitch player not found');
  return p;
};

const cone = {
  id: 'vc1',
  angleRad: 1,
  spreadRad: 0.5,
  radius: 13,
  color: '#38bdf8',
  opacity: 0.3,
  visible: true,
};

describe('選手装飾命令: 軌道・視野コーン・フォーカス', () => {
  it('SET_PLAYER_TRAJECTORY で軌道を設定・解除できる', () => {
    const base = slide({ players: [pitchPlayer('a')] });
    const set = applySlideCommand(base, {
      type: 'SET_PLAYER_TRAJECTORY',
      playerId: 'a',
      trajectory: { type: 'arc_left', curveOffset: 10 },
    });
    expect(pitchOf(set, 'a').trajectory?.type).toBe('arc_left');
    const cleared = applySlideCommand(set, {
      type: 'SET_PLAYER_TRAJECTORY',
      playerId: 'a',
      trajectory: undefined,
    });
    expect(pitchOf(cleared, 'a').trajectory).toBeUndefined();
  });

  it('SET_PLAYER_VISION_CONE / SET_PLAYER_FOCUS で設定できる', () => {
    const base = slide({ players: [pitchPlayer('a')] });
    const withCone = applySlideCommand(base, {
      type: 'SET_PLAYER_VISION_CONE',
      playerId: 'a',
      cone,
    });
    expect(pitchOf(withCone, 'a').visionCone?.id).toBe('vc1');
    const withFocus = applySlideCommand(withCone, {
      type: 'SET_PLAYER_FOCUS',
      playerId: 'a',
      focus: {
        enabled: true,
        color: '#ffffff',
        radius: 3,
        opacity: 0.35,
        style: 'ring',
      },
    });
    expect(pitchOf(withFocus, 'a').focus?.style).toBe('ring');
  });

  it('ベンチ選手・不在 ID・ロック中の選手には視野コーンが付かない', () => {
    const base = slide({
      players: [benchPlayer('bench'), pitchPlayer('locked', { locked: true })],
    });
    for (const playerId of ['bench', 'ghost', 'locked']) {
      const next = applySlideCommand(base, {
        type: 'SET_PLAYER_VISION_CONE',
        playerId,
        cone,
      });
      expect(next.players).toEqual(base.players);
    }
  });
});

describe('選手装飾命令: コネクトライン・バッジ', () => {
  it('コネクトライン追加・更新・削除', () => {
    const base = slide({ players: [pitchPlayer('a'), pitchPlayer('b')] });
    const added = applySlideCommand(base, {
      type: 'ADD_CONNECT_LINE',
      playerId: 'a',
      line: {
        id: 'cl1',
        toPlayerId: 'b',
        lineStyle: 'solid',
        color: '#ffffff',
        strokeWidth: 3.5,
        visible: true,
      },
    });
    expect(pitchOf(added, 'a').connectLines).toHaveLength(1);
    const updated = applySlideCommand(added, {
      type: 'UPDATE_CONNECT_LINE',
      playerId: 'a',
      lineId: 'cl1',
      patch: { lineStyle: 'dashed' },
    });
    expect(pitchOf(updated, 'a').connectLines[0].lineStyle).toBe('dashed');
    const removed = applySlideCommand(updated, {
      type: 'REMOVE_CONNECT_LINE',
      playerId: 'a',
      lineId: 'cl1',
    });
    expect(pitchOf(removed, 'a').connectLines).toHaveLength(0);
  });

  it('バッジ追加・削除', () => {
    const base = slide({ players: [pitchPlayer('a')] });
    const added = applySlideCommand(base, {
      type: 'ADD_PLAYER_BADGE',
      playerId: 'a',
      badge: {
        id: 'b1',
        label: 'CB',
        color: '#f59e0b',
        textColor: '#000000',
        offsetX: 0,
        offsetY: -12,
        visible: true,
      },
    });
    expect(pitchOf(added, 'a').badges.map((b) => b.id)).toEqual(['b1']);
    const removed = applySlideCommand(added, {
      type: 'REMOVE_PLAYER_BADGE',
      playerId: 'a',
      badgeId: 'b1',
    });
    expect(pitchOf(removed, 'a').badges).toHaveLength(0);
  });

  it('軌道を設定した選手をベンチへ移すと軌道が剥離される', () => {
    const withTraj = applySlideCommand(slide({ players: [pitchPlayer('a')] }), {
      type: 'SET_PLAYER_TRAJECTORY',
      playerId: 'a',
      trajectory: { type: 'custom', controlPoint: toScreenNormPoint(40, 40) },
    });
    const benched = applySlideCommand(withTraj, {
      type: 'MOVE_PLAYER_TO_BENCH',
      id: 'a',
    });
    expect(benched.players[0].area).toBe('bench');
    expect('trajectory' in benched.players[0]).toBe(false);
  });
});

describe('ボール命令', () => {
  it('UPDATE_BALL で表示・サイズ倍率・軌道を変更できる', () => {
    const next = applySlideCommand(slide(), {
      type: 'UPDATE_BALL',
      patch: {
        visible: false,
        sizeScale: 1.5,
        trajectory: { type: 'arc_right' },
      },
    });
    expect(next.ball.visible).toBe(false);
    expect(next.ball.sizeScale).toBe(1.5);
    expect(next.ball.trajectory?.type).toBe('arc_right');
  });

  it('TOGGLE_BALL_LOCK 中は位置のみ固定され、解除後は動く', () => {
    const locked = applySlideCommand(slide(), { type: 'TOGGLE_BALL_LOCK' });
    expect(locked.ball.locked).toBe(true);

    const moved = applySlideCommand(locked, {
      type: 'UPDATE_BALL',
      patch: { x: clampToScreenNorm(80), y: clampToScreenNorm(10) },
    });
    expect(moved.ball.x).toBe(50);
    expect(moved.ball.y).toBe(50);

    const resized = applySlideCommand(locked, {
      type: 'UPDATE_BALL',
      patch: { sizeScale: 0.8 },
    });
    expect(resized.ball.sizeScale).toBe(0.8);

    const unlocked = applySlideCommand(locked, { type: 'TOGGLE_BALL_LOCK' });
    expect(unlocked.ball.locked).toBe(false);
    const movedAfter = applySlideCommand(unlocked, {
      type: 'UPDATE_BALL',
      patch: { x: clampToScreenNorm(80) },
    });
    expect(movedAfter.ball.x).toBe(80);
  });
});
