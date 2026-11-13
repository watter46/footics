# TASK-181ie: Match Project ACL (`buildMatchToDomainProject`) の独立実装（旧ストア完全廃止シリーズ）

## 1. Metadata & Goal
- **Status**: `DONE`
- **Commit**: `feat(tactical): add standalone match-to-domain project translator ACL`
- **Series**: 旧ストア完全廃止シリーズ。181id（スライドモード＆Phase初期化）➔ **181ie（本タスク）** ➔ 181j〜（UI Consumer 移行）➔ 181l（旧削除）。181id の完了を前提とする。
- **Goal**: 旧 `match-to-tactical-bridge.ts` / `squad-to-tactical-bridge.ts` の `defaultTacticalUnifiedStore` 依存から完全に切り離された、純粋な試合データ ➔ `DomainTacticalProject` 変換 ACL（`buildMatchToDomainProject`）を実装する（`181j–181k` での `use-tactical-match-init.ts` / `tactical-client-page.tsx` 直接切り替えを可能にする）。
- **Negative Contracts (完了時に0件であるべき条件)**:
  - `src/lib/tactical/acl/match-project-translator.ts` が `@/features/tactical-unified/`・`match-to-tactical-bridge`・`squad-to-tactical-bridge` を一切 import しないこと。

## 2. Architectural Invariants & Consumers
- **Invariants (壊してはいけない前提条件)**:
  1. `buildMatchToDomainProject(match, options?)` は常に `DomainTacticalProjectSchema.parse(...)` を通過する純粋な V3 プロジェクトバンドル `{ project, activePhaseId, activeSlideId }` を返す。
  2. スタメンは `matchPlayersToFormationPositions` によりフォーメーション座標（GK は `'16:9'` 基準 `{7, 50}` / `{93, 50}` + 縦比率変換）へ配置し、`area: 'pitch'` として生成する。控え選手はポジション（FW→MF→DF→GK→OTHER）＋背番号昇順の3列ベンチグリッド座標（`x: [20, 50, 80]`, `y: 14 + row * 22`）で `area: 'bench'` として生成し、ベンチ選手へピッチ専用属性を混入させない。
  3. 本タスク単体で旧 `use-tactical-match-init.ts` 等はまだ書き換えない（Consumer 移行は 181j〜181k で実施）。
- **Consumers (同期更新対象の全ファイルリスト)**:
  - 新規追加のみ（181j〜181k で `use-tactical-match-init.ts` / `tactical-client-page.tsx` から参照予定）。

## 3. Implementation Phases (タスクファイル > フェーズ > タスク)

### Phase 1: `buildMatchToDomainProject` ACL 実装と単体テスト
- **Worker Model**: `flash`
- **Target Files**:
  - `[ADD]` `src/lib/tactical/acl/match-project-translator.ts`
  - `[ADD]` `src/lib/tactical/acl/__tests__/match-project-translator.test.ts`

#### Task 1.1: `[ADD]` `src/lib/tactical/acl/match-project-translator.ts`
① import 群・ベンチソート順ヘルパー・ピッチ選手生成部:
```ts
import { getTeamFormationAtMinute } from '@/lib/data/formation-utils';
import {
  type FormationType,
  getFormationActualPos,
  getFormationActualPosVertical,
} from '@/lib/data/formations';
import { FORMATION_POSITIONS } from '@/lib/data/formations-data';
import { parseWhoScoredFormationName } from '@/lib/tactical/formations';
import { matchPlayersToFormationPositions } from '@/lib/tactical/player-formatting';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type {
  BenchPlayer,
  DomainPlayer,
  PitchPlayer,
} from '@/lib/types/tactical/domain-entities';
import {
  type DomainTacticalProject,
  DomainTacticalProjectSchema,
} from '@/lib/types/tactical/domain-hierarchy';
import type { MarkerStyle } from '@/lib/types/tactical/player';
import {
  type AspectRatio,
  isVerticalAspectRatio,
  transformCoord,
} from '@/lib/types/tactical/primitives';
import {
  DEFAULT_PITCH_APPEARANCE,
  DEFAULT_SCREEN_BACKGROUND,
  getDefaultBoundaryBoxForAspect,
} from '@/lib/types/tactical/slide';
import type { Match, Player, Team } from '@/types';

interface MatchSquadItem extends Omit<Partial<Player>, 'position'> {
  playerId: number;
  name: string;
  shirtNo?: number;
  position?: string;
  slotVertical?: number;
  slotHorizontal?: number;
}

function getBenchRank(position?: string): number {
  if (!position) return 5;
  const p = position.toUpperCase().trim();
  if ('FW,CF,ST,LW,RW,SS,AML,AMR'.includes(p)) return 1;
  if ('MF,DM,CM,AM,LM,RM,DMC,MC,AMC'.includes(p)) return 2;
  if ('DF,CB,LB,RB,LWB,RWB,DC,DL,DR'.includes(p)) return 3;
  return p === 'GK' ? 4 : 5;
}

function buildTeamDomainPlayers(
  teamObj: Team | undefined,
  teamSide: 'home' | 'away',
  minute: number,
  primaryColor: string,
  aspectRatio: AspectRatio,
): { players: DomainPlayer[]; formation: FormationType } {
  const result = getTeamFormationAtMinute(teamObj, minute);
  const formation = parseWhoScoredFormationName(
    result.formationName || '4-4-2',
  );
  const positions =
    FORMATION_POSITIONS[formation] || FORMATION_POSITIONS['4-2-3-1'] || [];
  const isVertical = isVerticalAspectRatio(aspectRatio);

  const starters: MatchSquadItem[] = result.players.map((p) => {
    const slot = result.slotPositions[p.playerId];
    return {
      ...p,
      slotVertical: slot?.vertical,
      slotHorizontal: slot?.horizontal,
    };
  });
  const baseStyle: MarkerStyle = {
    markerType: 'circle',
    insideContent: 'photo',
    bottomLabel: 'name',
    color: primaryColor,
    strokeColor: '#ffffff',
    strokeWidth: 2,
    sizeScale: 1.0,
    numberSizeScale: 1.0,
    labelSizeScale: 1.0,
  };

  const matched = matchPlayersToFormationPositions(starters, positions);
  const pitchPlayers: PitchPlayer[] = matched.map(({ player: sp, templatePos }, idx) => {
    const gkBasePos = { x: teamSide === 'home' ? 7 : 93, y: 50 };
    const coord =
      templatePos.position === 'GK'
        ? isVertical
          ? transformCoord(gkBasePos, '16:9', aspectRatio)
          : gkBasePos
        : isVertical
          ? getFormationActualPosVertical(templatePos, teamSide, 'full')
          : getFormationActualPos(templatePos, teamSide, 'full');
    return {
      id: crypto.randomUUID(),
      playerId: String(sp.playerId),
      name: sp.name,
      shirtNo: String(sp.shirtNo ?? idx + 1),
      position:
        sp.position && sp.position !== 'Sub'
          ? sp.position
          : (templatePos.position ?? sp.position),
      team: teamSide,
      area: 'pitch',
      x: clampToScreenNorm(coord.x),
      y: clampToScreenNorm(coord.y),
      style: { ...baseStyle, photoUrl: sp.photoUrl },
      connectLines: [],
      badges: [],
    };
  });
```

② `buildTeamDomainPlayers` のベンチ選手生成部・戻り値（`}` で関数を閉じる）:
```ts
  const sortedBench = [...result.benchPlayers].sort((a, b) => {
    const rankDiff = getBenchRank(a.position) - getBenchRank(b.position);
    if (rankDiff !== 0) return rankDiff;
    const noA = Number.parseInt(String(a.shirtNo ?? ''), 10);
    const noB = Number.parseInt(String(b.shirtNo ?? ''), 10);
    return (Number.isNaN(noA) ? 9999 : noA) - (Number.isNaN(noB) ? 9999 : noB);
  });
  const xCols = [20, 50, 80];
  const benchPlayers: BenchPlayer[] = sortedBench.map((sub, idx) => ({
    id: crypto.randomUUID(),
    playerId: String(sub.playerId),
    name: sub.name,
    shirtNo: String(sub.shirtNo ?? 99),
    position: sub.position,
    team: teamSide,
    area: 'bench',
    x: clampToScreenNorm(xCols[idx % 3]),
    y: clampToScreenNorm(14 + Math.floor(idx / 3) * 22),
    style: { ...baseStyle, photoUrl: sub.photoUrl },
  }));

  return { players: [...pitchPlayers, ...benchPlayers], formation };
}
```

③ `buildMatchToDomainProject` エクスポート（同ファイル末尾へ追記）:
```ts
export interface BuildMatchToDomainProjectOptions {
  readonly minute?: number;
  readonly aspectRatio?: AspectRatio;
  readonly homeColor?: string;
  readonly awayColor?: string;
  readonly projectId?: string;
  readonly phaseId?: string;
  readonly slideId?: string;
  readonly now?: string;
}

export interface MatchDomainProjectBundle {
  readonly project: DomainTacticalProject;
  readonly activePhaseId: string;
  readonly activeSlideId: string;
}

export function buildMatchToDomainProject(
  match: Match,
  options: BuildMatchToDomainProjectOptions = {},
): MatchDomainProjectBundle {
  const minute = options.minute ?? 0;
  const aspectRatio = options.aspectRatio ?? '4:5';
  const homeColor = options.homeColor ?? '#034694';
  const awayColor = options.awayColor ?? '#ef4444';
  const now = options.now ?? new Date().toISOString();
  const projectId = options.projectId ?? crypto.randomUUID();
  const phaseId = options.phaseId ?? crypto.randomUUID();
  const slideId = options.slideId ?? crypto.randomUUID();

  const home = buildTeamDomainPlayers(
    match.teams?.home as Team | undefined,
    'home',
    minute,
    homeColor,
    aspectRatio,
  );
  const away = buildTeamDomainPlayers(
    match.teams?.away as Team | undefined,
    'away',
    minute,
    awayColor,
    aspectRatio,
  );

  const title =
    match.homeTeam?.name && match.awayTeam?.name
      ? `${match.homeTeam.name} vs ${match.awayTeam.name} (${minute}')`
      : 'Untitled Project';

  const project = DomainTacticalProjectSchema.parse({
    id: projectId,
    version: '3.0.0',
    title,
    createdAt: now,
    updatedAt: now,
    homeColor: { primary: homeColor },
    awayColor: { primary: awayColor },
    pitchAppearance: { ...DEFAULT_PITCH_APPEARANCE },
    screenBackground: { ...DEFAULT_SCREEN_BACKGROUND },
    matchId: String(match.id),
    matchFormations: {
      home: home.formation,
      away: away.formation,
    },
    tags: [],
    phases: [
      {
        id: phaseId,
        name: 'Phase 1',
        aspectRatio,
        boundaryBox: getDefaultBoundaryBoxForAspect(aspectRatio),
        backgroundType: 'pitch',
        slides: [
          {
            id: slideId,
            index: 0,
            label: 'Scene 1',
            players: [...home.players, ...away.players],
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
          },
        ],
      },
    ],
  });

  return { project, activePhaseId: phaseId, activeSlideId: slideId };
}
```

#### Task 1.2: `[ADD]` `src/lib/tactical/acl/__tests__/match-project-translator.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { DomainTacticalProjectSchema } from '@/lib/types/tactical/domain-hierarchy';
import type { Match } from '@/types';
import { buildMatchToDomainProject } from '../match-project-translator';

function createSampleMatch(): Match {
  return {
    id: 999,
    homeTeam: { id: 1, name: 'Arsenal', shortName: 'ARS' },
    awayTeam: { id: 2, name: 'Chelsea', shortName: 'CHE' },
    teams: {
      home: {
        name: 'Arsenal',
        formations: [
          {
            formationName: '4-3-3',
            startMinuteExpanded: 0,
            endMinuteExpanded: 90,
            formationSlots: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
            playerIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
          },
        ],
        players: Array.from({ length: 12 }, (_, i) => ({
          playerId: i + 1,
          name: `Home ${i + 1}`,
          shirtNo: i + 1,
          position: i === 0 ? 'GK' : i === 11 ? 'FW' : 'MC',
          isFirstEleven: i < 11,
        })),
      },
      away: {
        name: 'Chelsea',
        formations: [
          {
            formationName: '4-2-3-1',
            startMinuteExpanded: 0,
            endMinuteExpanded: 90,
            formationSlots: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
            playerIds: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31],
          },
        ],
        players: Array.from({ length: 12 }, (_, i) => ({
          playerId: 21 + i,
          name: `Away ${i + 1}`,
          shirtNo: i + 1,
          position: i === 0 ? 'GK' : 'MC',
          isFirstEleven: i < 11,
        })),
      },
    },
  } as unknown as Match;
}

describe('buildMatchToDomainProject', () => {
  it('translates match formations and bench squad into a DomainTacticalProjectSchema-valid bundle', () => {
    const match = createSampleMatch();
    const bundle = buildMatchToDomainProject(match, {
      minute: 15,
      projectId: 'proj-m999',
      phaseId: 'ph-1',
      slideId: 'sl-1',
      now: '2026-01-01T00:00:00.000Z',
    });

    expect(bundle.activePhaseId).toBe('ph-1');
    expect(bundle.activeSlideId).toBe('sl-1');
    expect(bundle.project.matchId).toBe('999');
    expect(bundle.project.title).toBe("Arsenal vs Chelsea (15')");
    expect(bundle.project.matchFormations).toEqual({
      home: '4-3-3',
      away: '4-2-3-1',
    });

    const players = bundle.project.phases[0].slides[0].players;
    expect(players).toHaveLength(24);
    expect(players.filter((p) => p.area === 'pitch')).toHaveLength(22);
    expect(players.filter((p) => p.area === 'bench')).toHaveLength(2);
    expect(() => DomainTacticalProjectSchema.parse(bundle.project)).not.toThrow();
  });
});
```
