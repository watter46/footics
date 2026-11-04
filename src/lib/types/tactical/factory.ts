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
  DEFAULT_BOUNDARY_BOX_16_9,
  DEFAULT_PITCH_APPEARANCE,
  DEFAULT_SCREEN_BACKGROUND,
  type Slide,
} from './slide';

export const DEFAULT_INITIAL_PROJECT_ID =
  '00000000-0000-4000-8000-000000000001';
export const DEFAULT_INITIAL_PHASE_ID = '00000000-0000-4000-8000-000000000002';
export const DEFAULT_INITIAL_SLIDE_ID = '00000000-0000-4000-8000-000000000003';
export const DEFAULT_INITIAL_CREATED_AT = '2026-01-01T00:00:00.000Z';

const BENCH_POSITION_RANK: Record<string, number> = Object.fromEntries([
  ...['FW', 'CF', 'ST', 'LW', 'RW', 'SS', 'AML', 'AMR'].map(
    (p) => [p, 1] as const,
  ),
  ...['MF', 'DM', 'CM', 'AM', 'LM', 'RM', 'DMC', 'MC', 'AMC'].map(
    (p) => [p, 2] as const,
  ),
  ...['DF', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'DC', 'DL', 'DR'].map(
    (p) => [p, 3] as const,
  ),
  ['GK', 4] as const,
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

import {
  DEFAULT_442_AWAY,
  DEFAULT_442_HOME,
  DEFAULT_4231_HOME,
} from './formations';

export {
  DEFAULT_442_AWAY,
  DEFAULT_442_HOME,
  DEFAULT_4231_HOME,
  type DefaultFormationPlayer,
} from './formations';

export function createDefaultInitialPlayers(
  homeColor = '#034694',
  awayColor = '#ef4444',
  aspectRatio: AspectRatio = '16:9',
  deterministic?: boolean,
): Player[] {
  const isVertical = isVerticalAspectRatio(aspectRatio);
  const homePlayers: Player[] = DEFAULT_4231_HOME.map((p) => {
    const rawPos = { x: p.x, y: p.y };
    const pos = isVertical
      ? transformCoord(rawPos, '16:9', aspectRatio)
      : rawPos;
    const playerId = deterministic ? `player-home-${p.shirtNo}` : undefined;
    const pl = createDefaultPlayer('home', pos.x, pos.y, homeColor, playerId);
    pl.shirtNo = p.shirtNo;
    pl.position = p.position;
    return pl;
  });

  const awayPlayers: Player[] = DEFAULT_442_AWAY.map((p) => {
    const rawPos = { x: p.x, y: p.y };
    const pos = isVertical
      ? transformCoord(rawPos, '16:9', aspectRatio)
      : rawPos;
    const playerId = deterministic ? `player-away-${p.shirtNo}` : undefined;
    const pl = createDefaultPlayer('away', pos.x, pos.y, awayColor, playerId);
    pl.shirtNo = p.shirtNo;
    pl.position = p.position;
    return pl;
  });

  return [...homePlayers, ...awayPlayers];
}

export function createDefault442Players(
  homeColor = '#034694',
  awayColor = '#ef4444',
  aspectRatio: AspectRatio = '16:9',
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
  slideId?: string,
  deterministic?: boolean,
  aspectRatio: AspectRatio = '16:9',
  boundaryBox: BoundaryBox = DEFAULT_BOUNDARY_BOX_16_9,
): TacticalPhase {
  const phaseId = id ?? crypto.randomUUID();
  const resolvedSlideId = slideId ?? crypto.randomUUID();
  return {
    id: phaseId,
    name,
    aspectRatio,
    boundaryBox: { ...boundaryBox },
    slides: [
      createDefaultSlide(
        0,
        resolvedSlideId,
        homeColor,
        awayColor,
        boundaryBox,
        aspectRatio,
        deterministic,
      ),
    ],
  };
}

export function createDefaultProject(
  id: string,
  options?: {
    phaseId?: string;
    slideId?: string;
    deterministic?: boolean;
    createdAt?: string;
  },
): TacticalProject {
  const now = options?.createdAt ?? new Date().toISOString();
  const initialPhase = createDefaultPhase(
    options?.phaseId,
    'Phase 1',
    '#034694',
    '#ef4444',
    options?.slideId,
    options?.deterministic,
    '16:9',
    DEFAULT_BOUNDARY_BOX_16_9,
  );

  const project = {
    id,
    version: '2.0.0' as const,
    title: 'Untitled Project',
    createdAt: now,
    updatedAt: now,
    aspectRatio: '16:9' as const,
    backgroundType: 'pitch' as const,
    pitchAppearance: { ...DEFAULT_PITCH_APPEARANCE },
    screenBackground: { ...DEFAULT_SCREEN_BACKGROUND },
    homeColor: { primary: '#034694' },
    awayColor: { primary: '#ef4444' },
    phases: [initialPhase],
    activePhaseId: initialPhase.id,
    activeSlideId: initialPhase.slides[0].id,
    boundaryBox: { ...DEFAULT_BOUNDARY_BOX_16_9 },
    tags: [],
  };

  return attachProjectSlidesGetter(project);
}

export function createInitialProject(): TacticalProject {
  return createDefaultProject(DEFAULT_INITIAL_PROJECT_ID, {
    phaseId: DEFAULT_INITIAL_PHASE_ID,
    slideId: DEFAULT_INITIAL_SLIDE_ID,
    deterministic: true,
    createdAt: DEFAULT_INITIAL_CREATED_AT,
  });
}

export function createDefaultSlide(
  index: number,
  id?: string,
  homeColor?: string,
  awayColor?: string,
  boundaryBox: BoundaryBox = DEFAULT_BOUNDARY_BOX_16_9,
  aspectRatio: AspectRatio = '16:9',
  deterministic?: boolean,
): Slide {
  return {
    id: id ?? crypto.randomUUID(),
    index,
    label: `Scene ${index + 1}`,
    aspectRatio,
    players: createDefaultInitialPlayers(
      homeColor,
      awayColor,
      aspectRatio,
      deterministic,
    ),
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
  id?: string,
): Player {
  return {
    id: id ?? crypto.randomUUID(),
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
