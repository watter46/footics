import { describe, expect, it } from 'vitest';
import {
  clampToScreenNorm,
  toScreenNormCoord,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import type {
  DomainArrowAnnotation,
  DomainBallState,
  DomainTextAnnotation,
  PitchPlayer,
  RectZone,
} from '@/lib/types/tactical/domain-entities';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import type { SlideCommand } from '../domain/commands';
import { enforceSlideInvariants, toBenchPlayer } from '../domain/invariants';

const dummyPitchPlayer = (
  id: string,
  x = 20,
  y = 30,
  overrides?: Partial<PitchPlayer>,
): PitchPlayer => ({
  id,
  area: 'pitch',
  team: 'home',
  x: clampToScreenNorm(x),
  y: clampToScreenNorm(y),
  style: {
    markerType: 'circle',
    insideContent: 'number',
    bottomLabel: 'name',
    color: '#ff0000',
    strokeColor: '#ffffff',
    strokeWidth: 2,
    sizeScale: 1.0,
    numberSizeScale: 1.0,
    labelSizeScale: 1.0,
  },
  connectLines: [],
  badges: [],
  ...overrides,
});

const dummyArrow = (
  id: string,
  overrides?: Partial<DomainArrowAnnotation>,
): DomainArrowAnnotation => ({
  id,
  annotationType: 'arrow',
  arrowType: 'pass',
  curveType: 'straight',
  points: [toScreenNormPoint(20, 30), toScreenNormPoint(50, 50)],
  color: '#ffffff',
  strokeWidth: 3,
  dashArray: [],
  startMarker: 'none',
  endMarker: 'arrow',
  ...overrides,
});

const dummyZone = (id: string, overrides?: Partial<RectZone>): RectZone => ({
  id,
  annotationType: 'zone',
  shapeType: 'rect',
  zoneType: 'generic',
  x: clampToScreenNorm(10),
  y: clampToScreenNorm(10),
  width: 20,
  height: 20,
  color: '#f59e0b',
  opacity: 0.25,
  strokeWidth: 3,
  ...overrides,
});

const dummyText = (
  id: string,
  overrides?: Partial<DomainTextAnnotation>,
): DomainTextAnnotation => ({
  id,
  annotationType: 'text',
  x: clampToScreenNorm(10),
  y: clampToScreenNorm(10),
  content: 'sample',
  fontSize: 16,
  color: '#ffffff',
  bold: false,
  italic: false,
  ...overrides,
});

const dummySlide = (overrides?: Partial<DomainSlide>): DomainSlide => ({
  id: 'slide-1',
  index: 0,
  players: [],
  arrows: [],
  zones: [],
  texts: [],
  ball: {
    x: clampToScreenNorm(50),
    y: clampToScreenNorm(50),
    visible: true,
  },
  transitionDurationMs: 1000,
  pauseMs: 500,
  easing: 'ease-in-out',
  ...overrides,
});

describe('toBenchPlayer', () => {
  it('strips pitch-specific attributes and sets area to bench', () => {
    const pitchP = dummyPitchPlayer('p1', 20, 30, {
      connectLines: [
        {
          id: 'cl-1',
          toPlayerId: 'p2',
          lineStyle: 'solid',
          color: '#ffffff',
          strokeWidth: 3.5,
          visible: true,
        },
      ],
      visionCone: {
        id: 'vc-1',
        angleRad: 0.5,
        spreadRad: 0.8,
        radius: 13,
        color: '#38bdf8',
        opacity: 0.3,
        visible: true,
      },
      badges: [
        {
          id: 'b1',
          label: 'C',
          color: '#f59e0b',
          textColor: '#000000',
          offsetX: 0,
          offsetY: -12,
          visible: true,
        },
      ],
    });

    const benchP = toBenchPlayer(
      pitchP,
      toScreenNormCoord(5),
      toScreenNormCoord(95),
    );
    expect(benchP.id).toBe('p1');
    expect(benchP.area).toBe('bench');
    expect(benchP.x).toBe(toScreenNormCoord(5));
    expect(benchP.y).toBe(toScreenNormCoord(95));
    expect((benchP as unknown as PitchPlayer).connectLines).toBeUndefined();
    expect((benchP as unknown as PitchPlayer).visionCone).toBeUndefined();
    expect((benchP as unknown as PitchPlayer).badges).toBeUndefined();
  });
});

describe('enforceSlideInvariants', () => {
  it('Lock Guard: restores locked entities if candidate changed or deleted them unless TOGGLE_ENTITY_LOCK', () => {
    const lockedP1 = dummyPitchPlayer('p1', 20, 30, { locked: true });
    const lockedArrow = dummyArrow('a1', { locked: true });
    const lockedZone = dummyZone('z1', { locked: true });
    const lockedText = dummyText('t1', { locked: true });

    const prev = dummySlide({
      players: [lockedP1],
      arrows: [lockedArrow],
      zones: [lockedZone],
      texts: [lockedText],
    });

    // candidate tries to move p1 to (80, 90) and delete arrow/zone/text
    const candidate = dummySlide({
      players: [
        {
          ...lockedP1,
          x: clampToScreenNorm(80),
          y: clampToScreenNorm(90),
        },
      ],
      arrows: [],
      zones: [],
      texts: [],
    });

    const moveCommand: SlideCommand = {
      type: 'MOVE_PLAYERS',
      moves: [{ id: 'p1', x: clampToScreenNorm(80), y: clampToScreenNorm(90) }],
    };

    const enforced = enforceSlideInvariants(prev, candidate, moveCommand);

    expect(enforced.players.find((p) => p.id === 'p1')?.x).toBe(
      clampToScreenNorm(20),
    );
    expect(enforced.arrows.find((a) => a.id === 'a1')).toBeDefined();
    expect(enforced.zones.find((z) => z.id === 'z1')).toBeDefined();
    expect(enforced.texts.find((t) => t.id === 't1')).toBeDefined();
  });

  it('Lock Guard: allows toggle lock for locked entities', () => {
    const lockedP1 = dummyPitchPlayer('p1', 20, 30, { locked: true });
    const prev = dummySlide({ players: [lockedP1] });
    const candidate = dummySlide({
      players: [{ ...lockedP1, locked: false }],
    });
    const cmd: SlideCommand = {
      type: 'TOGGLE_ENTITY_LOCK',
      id: 'p1',
      kind: 'player',
    };

    const enforced = enforceSlideInvariants(prev, candidate, cmd);
    expect(enforced.players.find((p) => p.id === 'p1')?.locked).toBe(false);
  });

  it('Coordinate Clamp: clamps out-of-bound coords for players and ball', () => {
    const p1 = dummyPitchPlayer('p1', 200, -50);
    const candidate = dummySlide({
      players: [p1],
      ball: {
        x: 999 as unknown as DomainBallState['x'],
        y: -100 as unknown as DomainBallState['y'],
        visible: true,
      },
    });

    const enforced = enforceSlideInvariants(dummySlide(), candidate, {
      type: 'MOVE_PLAYERS',
      moves: [{ id: 'p1', x: p1.x, y: p1.y }],
    });

    expect(enforced.players[0].x).toBe(115);
    expect(enforced.players[0].y).toBe(-15);
    expect(enforced.ball.x).toBe(115);
    expect(enforced.ball.y).toBe(-15);
  });

  it('Cascade Clean: cascades deletion of connectLines and following arrows when player is moved to bench or removed', () => {
    const p1Pitch = dummyPitchPlayer('p1', 20, 30);
    const p2Pitch = dummyPitchPlayer('p2', 40, 50, {
      connectLines: [
        {
          id: 'cl-1',
          toPlayerId: 'p1',
          lineStyle: 'solid',
          color: '#ffffff',
          strokeWidth: 3.5,
          visible: true,
        },
      ],
    });
    const arrow1 = dummyArrow('a1', {
      sourcePlayerId: 'p1',
      points: [toScreenNormPoint(20, 30), toScreenNormPoint(50, 50)],
    });
    const arrow2 = dummyArrow('a2', {
      targetPlayerId: 'p1',
      points: [toScreenNormPoint(10, 10), toScreenNormPoint(20, 30)],
    });
    const arrow3 = dummyArrow('a3', {
      sourcePlayerId: 'p2',
      points: [toScreenNormPoint(40, 50), toScreenNormPoint(60, 60)],
    });

    const prev = dummySlide({
      players: [p1Pitch, p2Pitch],
      arrows: [arrow1, arrow2, arrow3],
    });

    // candidate moves p1 to bench
    const p1Bench = toBenchPlayer(
      p1Pitch,
      toScreenNormCoord(5),
      toScreenNormCoord(95),
    );
    const candidate = dummySlide({
      players: [p1Bench, p2Pitch],
      arrows: [arrow1, arrow2, arrow3],
    });

    const enforced = enforceSlideInvariants(prev, candidate, {
      type: 'MOVE_PLAYER_TO_BENCH',
      id: 'p1',
    });

    const enforcedP2 = enforced.players.find(
      (p) => p.id === 'p2',
    ) as PitchPlayer;
    expect(enforcedP2.connectLines).toHaveLength(0);

    // a1 and a2 referenced p1 which is no longer on pitch -> deleted
    expect(enforced.arrows.find((a) => a.id === 'a1')).toBeUndefined();
    expect(enforced.arrows.find((a) => a.id === 'a2')).toBeUndefined();
    // a3 references p2 which is still on pitch -> preserved
    expect(enforced.arrows.find((a) => a.id === 'a3')).toBeDefined();
  });

  it('Endpoint Sync: synchronizes arrow points with bound pitch player coords', () => {
    const p1 = dummyPitchPlayer('p1', 45, 55);
    const p2 = dummyPitchPlayer('p2', 80, 85);
    const arrow = dummyArrow('a1', {
      sourcePlayerId: 'p1',
      targetPlayerId: 'p2',
      points: [
        toScreenNormPoint(10, 10),
        toScreenNormPoint(30, 40),
        toScreenNormPoint(90, 90),
      ],
    });

    const candidate = dummySlide({
      players: [p1, p2],
      arrows: [arrow],
    });

    const enforced = enforceSlideInvariants(dummySlide(), candidate, {
      type: 'MOVE_PLAYERS',
      moves: [
        { id: 'p1', x: p1.x, y: p1.y },
        { id: 'p2', x: p2.x, y: p2.y },
      ],
    });

    const synchedArrow = enforced.arrows[0];
    expect(synchedArrow.points[0]).toEqual({ x: 45, y: 55 });
    expect(synchedArrow.points[1]).toEqual({ x: 30, y: 40 }); // control/middle point preserved
    expect(synchedArrow.points[2]).toEqual({ x: 80, y: 85 });
  });
});
