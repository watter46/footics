import type { Player } from './player';
import {
  type AspectRatio,
  isVerticalAspectRatio,
  transformCoord,
} from './primitives';
import {
  attachProjectSlidesGetter,
  type TacticalPhase,
  type TacticalProject,
} from './project';
import {
  type BoundaryBox,
  DEFAULT_BOUNDARY_BOX_4_5,
  DEFAULT_PITCH_APPEARANCE,
  type Slide,
} from './slide';

const BENCH_POSITION_RANK: Record<string, number> = Object.fromEntries([
  ...['FW', 'CF', 'ST', 'LW', 'RW', 'SS', 'AML', 'AMR'].map((p) => [p, 1]),
  ...['MF', 'DM', 'CM', 'AM', 'LM', 'RM', 'DMC', 'MC', 'AMC'].map((p) => [
    p,
    2,
  ]),
  ...['DF', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'DC', 'DL', 'DR'].map((p) => [
    p,
    3,
  ]),
  ['GK', 4],
]);

function getBenchPositionRank(position?: string): number {
  if (!position) return 5;
  const upper = position.toUpperCase().trim();
  return BENCH_POSITION_RANK[upper] ?? 5;
}

function getBenchShirtNumberValue(shirtNo?: string): number {
  if (!shirtNo) return Number.POSITIVE_INFINITY;
  const parsed = Number.parseInt(shirtNo, 10);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

/** ベンチ選手をポジションと背番号順にソートし、3列グリッド座標を付与した新しい配列を返す */
export function computeBenchGridPositions(players: Player[]): Player[] {
  const sorted = [...players].sort((a, b) => {
    const rankA = getBenchPositionRank(a.position);
    const rankB = getBenchPositionRank(b.position);
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    const noA = getBenchShirtNumberValue(a.shirtNo);
    const noB = getBenchShirtNumberValue(b.shirtNo);
    return noA - noB;
  });

  const xPositions = [20, 50, 80];
  return sorted.map((player, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    return {
      ...player,
      x: xPositions[col],
      y: 14 + row * 22,
    };
  });
}

type DefaultFormationPlayer = {
  shirtNo: string;
  position: string;
  x: number;
  y: number;
};

export const DEFAULT_4231_HOME: DefaultFormationPlayer[] = [
  { shirtNo: '1', position: 'GK', x: 7, y: 50 },
  { shirtNo: '2', position: 'RB', x: 20, y: 18 },
  { shirtNo: '5', position: 'CB', x: 18, y: 38 },
  { shirtNo: '6', position: 'CB', x: 18, y: 62 },
  { shirtNo: '3', position: 'LB', x: 20, y: 82 },
  { shirtNo: '4', position: 'DM', x: 30, y: 36 },
  { shirtNo: '8', position: 'DM', x: 30, y: 64 },
  { shirtNo: '7', position: 'RM', x: 42, y: 18 },
  { shirtNo: '10', position: 'AM', x: 40, y: 50 },
  { shirtNo: '11', position: 'LM', x: 42, y: 82 },
  { shirtNo: '9', position: 'ST', x: 46, y: 50 },
];

export const DEFAULT_442_AWAY: DefaultFormationPlayer[] = [
  { shirtNo: '1', position: 'GK', x: 93, y: 50 },
  { shirtNo: '3', position: 'LB', x: 80, y: 18 },
  { shirtNo: '6', position: 'CB', x: 82, y: 38 },
  { shirtNo: '5', position: 'CB', x: 82, y: 62 },
  { shirtNo: '2', position: 'RB', x: 80, y: 82 },
  { shirtNo: '11', position: 'LM', x: 68, y: 18 },
  { shirtNo: '4', position: 'CM', x: 70, y: 38 },
  { shirtNo: '8', position: 'CM', x: 70, y: 62 },
  { shirtNo: '7', position: 'RM', x: 68, y: 82 },
  { shirtNo: '10', position: 'CF', x: 54, y: 40 },
  { shirtNo: '9', position: 'CF', x: 54, y: 60 },
];

export const DEFAULT_442_HOME: DefaultFormationPlayer[] = [
  { shirtNo: '1', position: 'GK', x: 10, y: 50 },
  { shirtNo: '2', position: 'RB', x: 25, y: 20 },
  { shirtNo: '5', position: 'CB', x: 25, y: 37 },
  { shirtNo: '6', position: 'CB', x: 25, y: 63 },
  { shirtNo: '3', position: 'LB', x: 25, y: 80 },
  { shirtNo: '7', position: 'RM', x: 45, y: 20 },
  { shirtNo: '8', position: 'CM', x: 45, y: 37 },
  { shirtNo: '4', position: 'CM', x: 45, y: 63 },
  { shirtNo: '11', position: 'LM', x: 45, y: 80 },
  { shirtNo: '9', position: 'CF', x: 63, y: 37 },
  { shirtNo: '10', position: 'CF', x: 63, y: 63 },
];

export function createDefaultInitialPlayers(
  homeColor = '#034694',
  awayColor = '#ef4444',
  aspectRatio: AspectRatio = '4:5',
): Player[] {
  const isVertical = isVerticalAspectRatio(aspectRatio);
  const homePlayers: Player[] = DEFAULT_4231_HOME.map((p) => {
    const rawPos = { x: p.x, y: p.y };
    const pos = isVertical
      ? transformCoord(rawPos, '16:9', aspectRatio)
      : rawPos;
    const pl = createDefaultPlayer('home', pos.x, pos.y, homeColor);
    pl.shirtNo = p.shirtNo;
    pl.position = p.position;
    return pl;
  });

  const awayPlayers: Player[] = DEFAULT_442_AWAY.map((p) => {
    const rawPos = { x: p.x, y: p.y };
    const pos = isVertical
      ? transformCoord(rawPos, '16:9', aspectRatio)
      : rawPos;
    const pl = createDefaultPlayer('away', pos.x, pos.y, awayColor);
    pl.shirtNo = p.shirtNo;
    pl.position = p.position;
    return pl;
  });

  return [...homePlayers, ...awayPlayers];
}

export function createDefault442Players(
  homeColor = '#034694',
  awayColor = '#ef4444',
  aspectRatio: AspectRatio = '4:5',
): Player[] {
  const isVertical = isVerticalAspectRatio(aspectRatio);
  const homePlayers: Player[] = DEFAULT_442_HOME.map((p) => {
    const rawPos = { x: p.x, y: p.y };
    const pos = isVertical
      ? transformCoord(rawPos, '16:9', aspectRatio)
      : rawPos;
    const pl = createDefaultPlayer('home', pos.x, pos.y, homeColor);
    pl.shirtNo = p.shirtNo;
    pl.position = p.position;
    return pl;
  });

  const awayPlayers: Player[] = DEFAULT_442_HOME.map((p) => {
    const rawPos = { x: 100 - p.x, y: p.y };
    const pos = isVertical
      ? transformCoord(rawPos, '16:9', aspectRatio)
      : rawPos;
    const pl = createDefaultPlayer('away', pos.x, pos.y, awayColor);
    pl.shirtNo = p.shirtNo;
    pl.position = p.position;
    return pl;
  });

  return [...homePlayers, ...awayPlayers];
}

export function createDefaultPhase(
  id?: string,
  name = 'Phase 1',
  homeColor?: string,
  awayColor?: string,
): TacticalPhase {
  const phaseId = id ?? crypto.randomUUID();
  const slideId = crypto.randomUUID();
  return {
    id: phaseId,
    name,
    slides: [
      createDefaultSlide(
        0,
        slideId,
        homeColor,
        awayColor,
        DEFAULT_BOUNDARY_BOX_4_5,
        '4:5',
      ),
    ],
  };
}

export function createDefaultProject(id: string): TacticalProject {
  const now = new Date().toISOString();
  const homeColor = { primary: '#034694' };
  const awayColor = { primary: '#ef4444' };
  const initialPhase = createDefaultPhase(
    undefined,
    'Phase 1',
    homeColor.primary,
    awayColor.primary,
  );

  const project = {
    id,
    version: '2.0.0' as const,
    title: 'Untitled Project',
    createdAt: now,
    updatedAt: now,
    aspectRatio: '4:5' as const,
    backgroundType: 'pitch' as const,
    pitchAppearance: { ...DEFAULT_PITCH_APPEARANCE },
    homeColor,
    awayColor,
    phases: [initialPhase],
    activePhaseId: initialPhase.id,
    activeSlideId: initialPhase.slides[0].id,
    boundaryBox: { ...DEFAULT_BOUNDARY_BOX_4_5 },
    tags: [],
  };

  return attachProjectSlidesGetter(project);
}

export function createDefaultSlide(
  index: number,
  id?: string,
  homeColor?: string,
  awayColor?: string,
  boundaryBox: BoundaryBox = DEFAULT_BOUNDARY_BOX_4_5,
  aspectRatio: AspectRatio = '4:5',
): Slide {
  return {
    id: id ?? crypto.randomUUID(),
    index,
    label: `Scene ${index + 1}`,
    aspectRatio,
    players: createDefaultInitialPlayers(homeColor, awayColor, aspectRatio),
    arrows: [],
    zones: [],
    texts: [],
    ball: { x: 50, y: 50, visible: true },
    boundaryBox: { ...boundaryBox },
    backgroundType: 'pitch',
    transitionDurationMs: 1000,
    pauseMs: 500,
    easing: 'ease-in-out',
    isSidesSwapped: false,
  };
}

export function createDefaultPlayer(
  team: 'home' | 'away' | 'neutral',
  x: number,
  y: number,
  primaryColor: string,
): Player {
  return {
    id: crypto.randomUUID(),
    team,
    area: 'pitch',
    x,
    y,
    style: {
      markerType: 'circle',
      insideContent: 'number',
      bottomLabel: 'name',
      color: primaryColor,
      strokeColor: '#ffffff',
      strokeWidth: 2,
      sizeScale: 1.0,
      numberSizeScale: 1.0,
      labelSizeScale: 1.0,
    },
    connectLines: [],
    badges: [],
  };
}
