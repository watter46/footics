import { describe, expect, it } from 'vitest';
import {
  clampToScreenNorm,
  toScreenNormCoord,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import type {
  BenchPlayer,
  DomainArrowAnnotation,
  DomainBallState,
  DomainTextAnnotation,
  PitchPlayer,
  RectZone,
} from '@/lib/types/tactical/domain-entities';
import type {
  DomainSlide,
  DomainTacticalPhase,
  DomainTacticalProject,
} from '@/lib/types/tactical/domain-hierarchy';
import { applyTacticalCommand } from '../domain/project-reducer';
import { applySlideCommand } from '../domain/slide-reducer';

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

const dummyBenchPlayer = (
  id: string,
  x = 5,
  y = 90,
  overrides?: Partial<BenchPlayer>,
): BenchPlayer => ({
  id,
  area: 'bench',
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
  label: 'Scene 1',
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

const dummyPhase = (
  id = 'phase-1',
  slides: DomainSlide[] = [dummySlide()],
  overrides?: Partial<DomainTacticalPhase>,
): DomainTacticalPhase => ({
  id,
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
  slides,
  ...overrides,
});

const dummyProject = (
  phases: DomainTacticalPhase[] = [dummyPhase()],
  overrides?: Partial<DomainTacticalProject>,
): DomainTacticalProject => ({
  id: 'proj-1',
  version: '3.0.0',
  title: 'Test Project',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  homeColor: { primary: '#034694' },
  awayColor: { primary: '#ef4444' },
  pitchAppearance: {
    pitchBackgroundType: 'solid',
    overlayColor: '#0B303E',
    overlayOpacity: 1.0,
    lineColor: '#ffffff',
    lineWidth: 2.5,
    lineOpacity: 1.0,
  },
  screenBackground: { type: 'cinematic' },
  phases,
  tags: [],
  ...overrides,
});

describe('applySlideCommand', () => {
  it('ADD_PLAYER: adds player to slide', () => {
    const slide = dummySlide();
    const p1 = dummyPitchPlayer('p1');
    const result = applySlideCommand(slide, { type: 'ADD_PLAYER', player: p1 });

    expect(result.players).toHaveLength(1);
    expect(result.players[0].id).toBe('p1');
  });

  it('MOVE_PLAYERS: moves players and updates coords', () => {
    const p1 = dummyPitchPlayer('p1', 10, 10);
    const p2 = dummyPitchPlayer('p2', 20, 20);
    const slide = dummySlide({ players: [p1, p2] });

    const result = applySlideCommand(slide, {
      type: 'MOVE_PLAYERS',
      moves: [
        { id: 'p1', x: toScreenNormCoord(15), y: toScreenNormCoord(25) },
        { id: 'p2', x: toScreenNormCoord(35), y: toScreenNormCoord(45) },
      ],
    });

    expect(result.players.find((p) => p.id === 'p1')?.x).toBe(15);
    expect(result.players.find((p) => p.id === 'p1')?.y).toBe(25);
    expect(result.players.find((p) => p.id === 'p2')?.x).toBe(35);
    expect(result.players.find((p) => p.id === 'p2')?.y).toBe(45);
  });

  it('UPDATE_PLAYER: patches player attributes', () => {
    const p1 = dummyPitchPlayer('p1', 10, 10);
    const slide = dummySlide({ players: [p1] });

    const result = applySlideCommand(slide, {
      type: 'UPDATE_PLAYER',
      id: 'p1',
      patch: { name: 'Player One', shirtNo: '9' },
    });

    const updated = result.players[0];
    expect(updated.name).toBe('Player One');
    expect(updated.shirtNo).toBe('9');
  });

  it('MOVE_PLAYER_TO_BENCH & MOVE_PLAYER_TO_PITCH: transforms area and enforces invariants', () => {
    const p1 = dummyPitchPlayer('p1', 20, 30);
    const slide = dummySlide({ players: [p1] });

    const benched = applySlideCommand(slide, {
      type: 'MOVE_PLAYER_TO_BENCH',
      id: 'p1',
      benchX: toScreenNormCoord(5),
      benchY: toScreenNormCoord(90),
    });

    expect(benched.players[0].area).toBe('bench');
    expect(benched.players[0].x).toBe(5);
    expect(benched.players[0].y).toBe(90);

    const backToPitch = applySlideCommand(benched, {
      type: 'MOVE_PLAYER_TO_PITCH',
      id: 'p1',
      x: toScreenNormCoord(40),
      y: toScreenNormCoord(50),
    });

    expect(backToPitch.players[0].area).toBe('pitch');
    expect(backToPitch.players[0].x).toBe(40);
    expect(backToPitch.players[0].y).toBe(50);
  });

  it('REMOVE_PLAYER: removes player and cascades deletion', () => {
    const p1 = dummyPitchPlayer('p1');
    const arrow = dummyArrow('a1', { sourcePlayerId: 'p1' });
    const slide = dummySlide({ players: [p1], arrows: [arrow] });

    const result = applySlideCommand(slide, {
      type: 'REMOVE_PLAYER',
      id: 'p1',
    });

    expect(result.players).toHaveLength(0);
    expect(result.arrows).toHaveLength(0);
  });

  it('Annotations CRUD: ADD, UPDATE, REMOVE for arrows, zones, texts', () => {
    let slide = dummySlide();
    const arrow = dummyArrow('a1');
    const zone = dummyZone('z1');
    const text = dummyText('t1');

    slide = applySlideCommand(slide, { type: 'ADD_ARROW', arrow });
    slide = applySlideCommand(slide, { type: 'ADD_ZONE', zone });
    slide = applySlideCommand(slide, { type: 'ADD_TEXT', text });

    expect(slide.arrows).toHaveLength(1);
    expect(slide.zones).toHaveLength(1);
    expect(slide.texts).toHaveLength(1);

    slide = applySlideCommand(slide, {
      type: 'UPDATE_ARROW',
      id: 'a1',
      patch: { color: '#ffff00' },
    });
    slide = applySlideCommand(slide, {
      type: 'UPDATE_ZONE',
      id: 'z1',
      patch: { color: '#00ff00' },
    });
    slide = applySlideCommand(slide, {
      type: 'UPDATE_TEXT',
      id: 't1',
      patch: { content: 'updated' },
    });

    expect(slide.arrows[0].color).toBe('#ffff00');
    expect(slide.zones[0].color).toBe('#00ff00');
    expect(slide.texts[0].content).toBe('updated');

    slide = applySlideCommand(slide, { type: 'REMOVE_ARROW', id: 'a1' });
    slide = applySlideCommand(slide, { type: 'REMOVE_ZONE', id: 'z1' });
    slide = applySlideCommand(slide, { type: 'REMOVE_TEXT', id: 't1' });

    expect(slide.arrows).toHaveLength(0);
    expect(slide.zones).toHaveLength(0);
    expect(slide.texts).toHaveLength(0);
  });

  it('UPDATE_BALL: updates ball coords and properties', () => {
    const slide = dummySlide();
    const result = applySlideCommand(slide, {
      type: 'UPDATE_BALL',
      patch: { x: clampToScreenNorm(70), y: clampToScreenNorm(80) },
    });

    expect(result.ball.x).toBe(70);
    expect(result.ball.y).toBe(80);
  });

  it('TOGGLE_ENTITY_LOCK: toggles locked state for all entity kinds', () => {
    const p1 = dummyPitchPlayer('p1');
    const a1 = dummyArrow('a1');
    const z1 = dummyZone('z1');
    const t1 = dummyText('t1');
    let slide = dummySlide({
      players: [p1],
      arrows: [a1],
      zones: [z1],
      texts: [t1],
    });

    slide = applySlideCommand(slide, {
      type: 'TOGGLE_ENTITY_LOCK',
      id: 'p1',
      kind: 'player',
    });
    slide = applySlideCommand(slide, {
      type: 'TOGGLE_ENTITY_LOCK',
      id: 'a1',
      kind: 'arrow',
    });
    slide = applySlideCommand(slide, {
      type: 'TOGGLE_ENTITY_LOCK',
      id: 'z1',
      kind: 'zone',
    });
    slide = applySlideCommand(slide, {
      type: 'TOGGLE_ENTITY_LOCK',
      id: 't1',
      kind: 'text',
    });

    expect(slide.players[0].locked).toBe(true);
    expect(slide.arrows[0].locked).toBe(true);
    expect(slide.zones[0].locked).toBe(true);
    expect(slide.texts[0].locked).toBe(true);
  });

  it('DELETE_ENTITIES: deletes multiple entities in one command', () => {
    const p1 = dummyPitchPlayer('p1');
    const a1 = dummyArrow('a1');
    const z1 = dummyZone('z1');
    const slide = dummySlide({
      players: [p1],
      arrows: [a1],
      zones: [z1],
    });

    const result = applySlideCommand(slide, {
      type: 'DELETE_ENTITIES',
      ids: ['p1', 'a1'],
    });

    expect(result.players).toHaveLength(0);
    expect(result.arrows).toHaveLength(0);
    expect(result.zones).toHaveLength(1);
  });

  it('SWAP_TEAM_SIDES: swaps pitch players (100 - x, 100 - y), preserves bench players, sets isSidesSwapped: true', () => {
    const p1 = dummyPitchPlayer('p1', 20, 30);
    const b1 = dummyBenchPlayer('b1', 5, 90);
    const arrow = dummyArrow('a1', {
      points: [toScreenNormPoint(20, 30), toScreenNormPoint(50, 50)],
    });
    const slide = dummySlide({
      players: [p1, b1],
      arrows: [arrow],
      ball: {
        x: clampToScreenNorm(30),
        y: clampToScreenNorm(40),
        visible: true,
      },
      isSidesSwapped: false,
    });

    const swapped = applySlideCommand(slide, { type: 'SWAP_TEAM_SIDES' });

    // p1 (area:'pitch', x:20, y:30) -> (80, 70)
    const swappedP1 = swapped.players.find((p) => p.id === 'p1');
    expect(swappedP1?.x).toBe(80);
    expect(swappedP1?.y).toBe(70);

    // b1 (area:'bench', x:5, y:90) -> (5, 90) preserved
    const swappedB1 = swapped.players.find((p) => p.id === 'b1');
    expect(swappedB1?.x).toBe(5);
    expect(swappedB1?.y).toBe(90);

    // isSidesSwapped flipped to true
    expect(swapped.isSidesSwapped).toBe(true);

    // ball coords flipped: (30, 40) -> (70, 60)
    expect(swapped.ball.x).toBe(70);
    expect(swapped.ball.y).toBe(60);

    // arrow points flipped: (20, 30) -> (80, 70), (50, 50) -> (50, 50)
    expect(swapped.arrows[0].points[0]).toEqual({ x: 80, y: 70 });
    expect(swapped.arrows[0].points[1]).toEqual({ x: 50, y: 50 });
  });

  it('RESET_SLIDE_OBJECTS: keeps circle/locked players with cleared decorations, removes unlocked ring players and annotations', () => {
    const lockedRing = dummyPitchPlayer('p-locked-ring', 15, 25, {
      locked: true,
      style: { ...dummyPitchPlayer('tmp').style, markerType: 'ring' },
    });
    const unlockedRing = dummyPitchPlayer('p-ring', 30, 35, {
      style: { ...dummyPitchPlayer('tmp').style, markerType: 'ring' },
    });
    const circleP = dummyPitchPlayer('p-circle', 40, 50, {
      badges: [
        {
          id: 'b1',
          label: 'C',
          color: '#000',
          textColor: '#fff',
          offsetX: 0,
          offsetY: 0,
          visible: true,
        },
      ],
    });
    const lockedA = dummyArrow('a1', { locked: true });
    const normalA = dummyArrow('a2');
    const slide = dummySlide({
      players: [lockedRing, unlockedRing, circleP],
      arrows: [lockedA, normalA],
    });

    const reset = applySlideCommand(slide, { type: 'RESET_SLIDE_OBJECTS' });
    expect(reset.players.some((p) => p.id === 'p-locked-ring')).toBe(true);
    expect(reset.players.some((p) => p.id === 'p-ring')).toBe(false);
    const resetCircle = reset.players.find(
      (p) => p.id === 'p-circle',
    ) as PitchPlayer;
    expect(resetCircle.badges).toHaveLength(0);
    expect(reset.arrows.some((a) => a.id === 'a1')).toBe(true);
    expect(reset.arrows.some((a) => a.id === 'a2')).toBe(false);
  });

  it('UPDATE_SLIDE_META: updates slide metadata', () => {
    const slide = dummySlide({ label: 'Old' });
    const result = applySlideCommand(slide, {
      type: 'UPDATE_SLIDE_META',
      patch: { label: 'New Label', transitionDurationMs: 2500 },
    });

    expect(result.label).toBe('New Label');
    expect(result.transitionDurationMs).toBe(2500);
  });
});

describe('applyTacticalCommand', () => {
  it('APPLY_SLIDE_COMMAND: applies slide command to specified phase and slide', () => {
    const s1 = dummySlide({ id: 's1' });
    const ph1 = dummyPhase('ph1', [s1]);
    const project = dummyProject([ph1]);

    const result = applyTacticalCommand(project, {
      type: 'APPLY_SLIDE_COMMAND',
      phaseId: 'ph1',
      slideId: 's1',
      command: {
        type: 'UPDATE_SLIDE_META',
        patch: { label: 'Updated via Project' },
      },
    });

    expect(result.phases[0].slides[0].label).toBe('Updated via Project');
  });

  it('ADD_SLIDE & DUPLICATE_SLIDE: adds new slide and duplicates existing slide with re-indexing', () => {
    const s1 = dummySlide({ id: 's1', label: 'Scene 1' });
    const ph1 = dummyPhase('ph1', [s1]);
    const project = dummyProject([ph1]);

    const afterAdd = applyTacticalCommand(project, {
      type: 'ADD_SLIDE',
      phaseId: 'ph1',
      afterSlideId: 's1',
    });

    expect(afterAdd.phases[0].slides).toHaveLength(2);
    expect(afterAdd.phases[0].slides[0].index).toBe(0);
    expect(afterAdd.phases[0].slides[1].index).toBe(1);

    const duplicated = applyTacticalCommand(afterAdd, {
      type: 'DUPLICATE_SLIDE',
      phaseId: 'ph1',
      slideId: 's1',
    });

    expect(duplicated.phases[0].slides).toHaveLength(3);
    expect(duplicated.phases[0].slides.map((s) => s.index)).toEqual([0, 1, 2]);
  });

  it('DELETE_SLIDE: deletes slide when multiple exist, but preserves 1 slide if last', () => {
    const s1 = dummySlide({ id: 's1' });
    const s2 = dummySlide({ id: 's2' });
    const ph1 = dummyPhase('ph1', [s1, s2]);
    const project = dummyProject([ph1]);

    // Multiple slides -> deletes s1
    const afterDelete = applyTacticalCommand(project, {
      type: 'DELETE_SLIDE',
      phaseId: 'ph1',
      slideId: 's1',
    });

    expect(afterDelete.phases[0].slides).toHaveLength(1);
    expect(afterDelete.phases[0].slides[0].id).toBe('s2');
    expect(afterDelete.phases[0].slides[0].index).toBe(0);

    // Last 1 slide -> cannot delete, retains 1 slide
    const cantDeleteLast = applyTacticalCommand(afterDelete, {
      type: 'DELETE_SLIDE',
      phaseId: 'ph1',
      slideId: 's2',
    });

    expect(cantDeleteLast.phases[0].slides).toHaveLength(1);
    expect(cantDeleteLast.phases[0].slides[0].id).toBe('s2');
  });

  it('REORDER_SLIDES: reorders slides according to ordered IDs and updates index', () => {
    const s1 = dummySlide({ id: 's1' });
    const s2 = dummySlide({ id: 's2' });
    const s3 = dummySlide({ id: 's3' });
    const ph1 = dummyPhase('ph1', [s1, s2, s3]);
    const project = dummyProject([ph1]);

    const reordered = applyTacticalCommand(project, {
      type: 'REORDER_SLIDES',
      phaseId: 'ph1',
      orderedSlideIds: ['s3', 's1', 's2'],
    });

    expect(reordered.phases[0].slides.map((s) => s.id)).toEqual([
      's3',
      's1',
      's2',
    ]);
    expect(reordered.phases[0].slides.map((s) => s.index)).toEqual([0, 1, 2]);
  });

  it('ADD_PHASE & UPDATE_PHASE: adds a new phase with default slide, updates phase', () => {
    const project = dummyProject();
    const withPhase = applyTacticalCommand(project, {
      type: 'ADD_PHASE',
      name: 'Phase 2',
    });

    expect(withPhase.phases).toHaveLength(2);
    expect(withPhase.phases[1].name).toBe('Phase 2');
    expect(withPhase.phases[1].slides).toHaveLength(1);

    const updatedPhase = applyTacticalCommand(withPhase, {
      type: 'UPDATE_PHASE',
      phaseId: withPhase.phases[1].id,
      patch: { backgroundType: 'blank' },
    });

    expect(updatedPhase.phases[1].backgroundType).toBe('blank');
  });

  it('DELETE_PHASE: deletes phase when multiple exist, but preserves 1 phase if last', () => {
    const ph1 = dummyPhase('ph1');
    const ph2 = dummyPhase('ph2');
    const project = dummyProject([ph1, ph2]);

    const afterDelete = applyTacticalCommand(project, {
      type: 'DELETE_PHASE',
      phaseId: 'ph1',
    });

    expect(afterDelete.phases).toHaveLength(1);
    expect(afterDelete.phases[0].id).toBe('ph2');

    // Last 1 phase -> cannot delete, retains 1 phase
    const cantDeleteLast = applyTacticalCommand(afterDelete, {
      type: 'DELETE_PHASE',
      phaseId: 'ph2',
    });

    expect(cantDeleteLast.phases).toHaveLength(1);
    expect(cantDeleteLast.phases[0].id).toBe('ph2');
  });

  it('UPDATE_PROJECT_META: updates project title and colors', () => {
    const project = dummyProject();
    const updated = applyTacticalCommand(project, {
      type: 'UPDATE_PROJECT_META',
      patch: {
        title: 'New Title',
        homeColor: { primary: '#112233' },
      },
    });

    expect(updated.title).toBe('New Title');
    expect(updated.homeColor.primary).toBe('#112233');
    expect(updated.updatedAt).not.toBe(project.updatedAt);
  });
});
