# TASK-181ic: リセット命令の整理統一と初期選手生成（旧ストア完全廃止シリーズ）

## 1. Metadata & Goal
- **Status**: `TODO`
- **Commit**: `feat(tactical): align reset commands and default domain players helper`
- **Series**: 旧ストア完全廃止シリーズ。181ib（クリップボード）➔ **181ic（本タスク）** ➔ 181id（スライドモード＆Phase初期化）➔ 181ie（Match ACL）➔ 181j〜。181ib の完了を前提とする。
- **Goal**:
  1. 現実の2操作と乖離していた `RESET_SLIDE_OBJECTS { keepSquad: boolean }` を廃止し、旧ストアと仕様一致する **`RESET_SLIDE_OBJECTS`（引数なし `SlideCommand`: 非ロック装飾＆非ロック `ring` 選手除去）** に純化する。
  2. 後続タスク（`181id`）で使う `default-players.ts`（初期22名生成）と `slide-reset.ts`（`resetSlideObjectsData` / `resetSlideKeepSquadPositions`）を追加し、`commands.ts` へ `ADD_SLIDE`（`mode?` / `newSlideId?`）・`DUPLICATE_SLIDE`（`newSlideId?`）・`ADD_PHASE`（`newPhaseId?` / `newSlideId?`）・`RESET_SLIDE_KEEP_SQUAD` 型を追加する。
- **Negative Contracts (完了時に0件であるべき条件)**:
  - `rg -l 'keepSquad' src/lib/tactical/` が **0件** であること。

## 2. Architectural Invariants & Consumers
- **Invariants (壊してはいけない前提条件)**:
  1. `RESET_SLIDE_OBJECTS` は `applySlideCommand` 経由で `enforceSlideInvariants` を通り、`locked: true` エンティティ・ロック済 `ring` 選手・ボールロック位置を保護する。
  2. `resetSlideKeepSquadPositions` は `matchFormations`・`aspectRatio`・`isSidesSwapped` に基づきピッチ上選手の座標をキックオフ位置へ戻し、スカッド属性（`name` / `shirtNo` / `style`）とベンチ選手を維持し、装飾と全アノテーション（`arrows` / `zones` / `texts`）を消去する。
- **Consumers (同期更新対象の全ファイルリスト)**:
  - `SlideCommand`: `src/lib/tactical/domain/commands.ts`, `src/lib/tactical/domain/slide-reducer.ts`, `src/lib/tactical/__tests__/domain-reducers.test.ts`

## 3. Implementation Phases (タスクファイル > フェーズ > タスク)

### Phase 1: デフォルト選手・リセット共通関数・`SlideCommand` の整理
- **Worker Model**: `flash`
- **Target Files**:
  - `[ADD]` `src/lib/tactical/domain/default-players.ts`
  - `[ADD]` `src/lib/tactical/domain/slide-reset.ts`
  - `[MODIFY]` `src/lib/tactical/domain/commands.ts`
  - `[MODIFY]` `src/lib/tactical/domain/slide-reducer.ts`
  - `[MODIFY]` `src/lib/tactical/__tests__/domain-reducers.test.ts`

#### Task 1.1: `[ADD]` `src/lib/tactical/domain/default-players.ts`
```ts
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type { PitchPlayer } from '@/lib/types/tactical/domain-entities';
import {
  DEFAULT_442_AWAY,
  DEFAULT_4231_HOME,
  type DefaultFormationPlayer,
} from '@/lib/types/tactical/formations';
import {
  type AspectRatio,
  isVerticalAspectRatio,
  transformCoord,
} from '@/lib/types/tactical/primitives';

function buildTeamPlayers(
  preset: readonly DefaultFormationPlayer[],
  team: 'home' | 'away',
  primaryColor: string,
  aspectRatio: AspectRatio,
): PitchPlayer[] {
  const isVertical = isVerticalAspectRatio(aspectRatio);
  return preset.map((p) => {
    const rawPos = { x: p.x, y: p.y };
    const pos = isVertical
      ? transformCoord(rawPos, '16:9', aspectRatio)
      : rawPos;
    return {
      id: crypto.randomUUID(),
      team,
      area: 'pitch',
      shirtNo: p.shirtNo,
      position: p.position,
      x: clampToScreenNorm(pos.x),
      y: clampToScreenNorm(pos.y),
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
  });
}

export function createDefaultDomainPlayers(
  homeColor = '#034694',
  awayColor = '#ef4444',
  aspectRatio: AspectRatio = '4:5',
): PitchPlayer[] {
  return [
    ...buildTeamPlayers(DEFAULT_4231_HOME, 'home', homeColor, aspectRatio),
    ...buildTeamPlayers(DEFAULT_442_AWAY, 'away', awayColor, aspectRatio),
  ];
}
```

#### Task 1.2: `[ADD]` `src/lib/tactical/domain/slide-reset.ts`
① フォーメーション初期座標計算と `resetSlideObjectsData`:
```ts
import { type FormationType, getFormationActualPos } from '@/lib/data/formations';
import { FORMATION_POSITIONS } from '@/lib/data/formations-data';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type { DomainPlayer } from '@/lib/types/tactical/domain-entities';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import { DEFAULT_442_AWAY, DEFAULT_4231_HOME } from '@/lib/types/tactical/formations';
import {
  type AspectRatio,
  isVerticalAspectRatio,
  transformCoord,
} from '@/lib/types/tactical/primitives';

function resolveTeamKickoffPositions(
  players: readonly DomainPlayer[],
  team: 'home' | 'away',
  aspectRatio: AspectRatio,
  formation: FormationType | undefined,
  outMap: Map<string, { x: number; y: number }>,
): void {
  const isVertical = isVerticalAspectRatio(aspectRatio);
  if (formation && FORMATION_POSITIONS[formation]) {
    const positions = FORMATION_POSITIONS[formation];
    const gkBasePos = { x: team === 'home' ? 7 : 93, y: 50 };
    players.forEach((p, idx) => {
      const posDef = positions[idx % positions.length];
      const base =
        posDef.position === 'GK'
          ? gkBasePos
          : getFormationActualPos(posDef, team, 'full');
      const targetPos = isVertical
        ? transformCoord(base, '16:9', aspectRatio)
        : base;
      outMap.set(p.id, {
        x: Math.max(3, Math.min(97, targetPos.x)),
        y: Math.max(3, Math.min(97, targetPos.y)),
      });
    });
    return;
  }

  const fallback = team === 'home' ? DEFAULT_4231_HOME : DEFAULT_442_AWAY;
  players.forEach((p, idx) => {
    const preset = fallback[idx % fallback.length];
    const rawPos = { x: preset.x, y: preset.y };
    const pos = isVertical
      ? transformCoord(rawPos, '16:9', aspectRatio)
      : rawPos;
    outMap.set(p.id, pos);
  });
}

export function resetSlideObjectsData(slide: DomainSlide): DomainSlide {
  return {
    ...slide,
    arrows: slide.arrows.filter((a) => a.locked),
    zones: slide.zones.filter((z) => z.locked),
    texts: slide.texts.filter((t) => t.locked),
    players: slide.players
      .filter((p) => p.locked || p.style.markerType !== 'ring')
      .map((p) => {
        if (p.locked || p.area === 'bench') return p;
        return {
          ...p,
          visionCone: undefined,
          connectLines: [],
          badges: [],
          focus: undefined,
          trajectory: undefined,
        };
      }),
    ball: slide.ball.locked
      ? { ...slide.ball }
      : { ...slide.ball, trajectory: undefined },
  };
}
```

② 末尾へ `resetSlideKeepSquadPositions` を追記:
```ts
export function resetSlideKeepSquadPositions(
  slide: DomainSlide,
  aspectRatio: AspectRatio,
  matchFormations?: { readonly home: FormationType; readonly away: FormationType },
): DomainSlide {
  const newPositions = new Map<string, { x: number; y: number }>();
  const homePitch = slide.players.filter(
    (p) => p.team === 'home' && p.area === 'pitch',
  );
  const awayPitch = slide.players.filter(
    (p) => p.team === 'away' && p.area === 'pitch',
  );

  resolveTeamKickoffPositions(
    homePitch,
    'home',
    aspectRatio,
    matchFormations?.home,
    newPositions,
  );
  resolveTeamKickoffPositions(
    awayPitch,
    'away',
    aspectRatio,
    matchFormations?.away,
    newPositions,
  );

  const isSwapped = Boolean(slide.isSidesSwapped);
  const updatedPlayers: DomainPlayer[] = slide.players.map((p) => {
    if (p.area === 'bench') return { ...p };
    const rawPos = newPositions.get(p.id);
    const pos = rawPos
      ? isSwapped
        ? { x: 100 - rawPos.x, y: 100 - rawPos.y }
        : rawPos
      : undefined;
    return {
      ...p,
      ...(pos
        ? { x: clampToScreenNorm(pos.x), y: clampToScreenNorm(pos.y) }
        : {}),
      visionCone: undefined,
      focus: undefined,
      badges: [],
      connectLines: [],
      trajectory: undefined,
    };
  });

  return {
    ...slide,
    players: updatedPlayers,
    ball: {
      ...slide.ball,
      x: clampToScreenNorm(50),
      y: clampToScreenNorm(50),
      visible: true,
      trajectory: undefined,
    },
    arrows: [],
    zones: [],
    texts: [],
  };
}
```

#### Task 1.3: `[MODIFY]` `src/lib/tactical/domain/commands.ts`
※ 注意: `181id` が実装されるまでの過渡コンパイルエラーを防ぐため、本タスクでは `SlideCommand` の `RESET_SLIDE_OBJECTS` 変更と、`TacticalCommand` の既存コマンド（`ADD_SLIDE`, `DUPLICATE_SLIDE`, `ADD_PHASE`）へのオプショナルフィールド追加のみを行う（`RESET_SLIDE_KEEP_SQUAD` は `project-reducer.ts` を同時更新する `181id` で追加する）。

**Before (`RESET_SLIDE_OBJECTS`)**
```ts
  | { readonly type: 'DELETE_ENTITIES'; readonly ids: readonly string[] }
  | { readonly type: 'SWAP_TEAM_SIDES' }
  | { readonly type: 'RESET_SLIDE_OBJECTS'; readonly keepSquad: boolean }
```
**After**
```ts
  | { readonly type: 'DELETE_ENTITIES'; readonly ids: readonly string[] }
  | { readonly type: 'SWAP_TEAM_SIDES' }
  | { readonly type: 'RESET_SLIDE_OBJECTS' }
```

**Before (`ADD_SLIDE` / `DUPLICATE_SLIDE` / `ADD_PHASE`)**
```ts
  | {
      readonly type: 'ADD_SLIDE';
      readonly phaseId: string;
      readonly afterSlideId?: string;
    }
  | {
      readonly type: 'DUPLICATE_SLIDE';
      readonly phaseId: string;
      readonly slideId: string;
    }
  | {
      readonly type: 'DELETE_SLIDE';
      readonly phaseId: string;
      readonly slideId: string;
    }
  | {
      readonly type: 'REORDER_SLIDES';
      readonly phaseId: string;
      readonly orderedSlideIds: readonly string[];
    }
  | { readonly type: 'ADD_PHASE'; readonly name: string }
```
**After**
```ts
  | {
      readonly type: 'ADD_SLIDE';
      readonly phaseId: string;
      readonly afterSlideId?: string;
      readonly mode?: 'object-free' | 'full' | 'blank';
      readonly newSlideId?: string;
    }
  | {
      readonly type: 'DUPLICATE_SLIDE';
      readonly phaseId: string;
      readonly slideId: string;
      readonly newSlideId?: string;
    }
  | {
      readonly type: 'DELETE_SLIDE';
      readonly phaseId: string;
      readonly slideId: string;
    }
  | {
      readonly type: 'REORDER_SLIDES';
      readonly phaseId: string;
      readonly orderedSlideIds: readonly string[];
    }
  | {
      readonly type: 'ADD_PHASE';
      readonly name: string;
      readonly newPhaseId?: string;
      readonly newSlideId?: string;
    }
```

#### Task 1.4: `[MODIFY]` `src/lib/tactical/domain/slide-reducer.ts`
**Before (L7-L11)**
```ts
import type { SlideCommand } from './commands';
import { enforceSlideInvariants, toBenchPlayer } from './invariants';
import { swapPlayers } from './player-swap';
import { flipSlideCandidate } from './slide-flip';
```
**After**
```ts
import type { SlideCommand } from './commands';
import { enforceSlideInvariants, toBenchPlayer } from './invariants';
import { swapPlayers } from './player-swap';
import { flipSlideCandidate } from './slide-flip';
import { resetSlideObjectsData } from './slide-reset';
```

**Before (L241-L268)**
```ts
    case 'SWAP_TEAM_SIDES':
      return flipSlideCandidate(prevSlide);

    case 'RESET_SLIDE_OBJECTS': {
      const players = command.keepSquad
        ? prevSlide.players.map((p) => {
            if (p.area === 'bench') return p;
            return {
              ...p,
              connectLines: [],
              badges: [],
              visionCone: undefined,
              focus: undefined,
              trajectory: undefined,
            };
          })
        : [];

      return {
        ...prevSlide,
        players,
        arrows: [],
        zones: [],
        texts: [],
        ball: { ...prevSlide.ball, trajectory: undefined },
      };
    }
```
**After**
```ts
    case 'SWAP_TEAM_SIDES':
      return flipSlideCandidate(prevSlide);

    case 'RESET_SLIDE_OBJECTS':
      return resetSlideObjectsData(prevSlide);
```

#### Task 1.5: `[MODIFY]` `src/lib/tactical/__tests__/domain-reducers.test.ts`
**Before (L428-L471)**
```ts
  it('RESET_SLIDE_OBJECTS: resets non-locked annotations and options, respects keepSquad', () => {
    const lockedP = dummyPitchPlayer('p1', 20, 30, { locked: true });
    const normalP = dummyPitchPlayer('p2', 40, 50, {
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
      players: [lockedP, normalP],
      arrows: [lockedA, normalA],
    });

    // keepSquad: true -> keeps normal player but clears badges, locked arrow kept, normal arrow removed
    const resetKeep = applySlideCommand(slide, {
      type: 'RESET_SLIDE_OBJECTS',
      keepSquad: true,
    });
    expect(resetKeep.players).toHaveLength(2);
    const resetNormalP = resetKeep.players.find(
      (p) => p.id === 'p2',
    ) as PitchPlayer;
    expect(resetNormalP.badges).toHaveLength(0);
    expect(resetKeep.arrows.some((a) => a.id === 'a1')).toBe(true);
    expect(resetKeep.arrows.some((a) => a.id === 'a2')).toBe(false);

    // keepSquad: false -> normal player removed, locked player kept
    const resetNoKeep = applySlideCommand(slide, {
      type: 'RESET_SLIDE_OBJECTS',
      keepSquad: false,
    });
    expect(resetNoKeep.players.some((p) => p.id === 'p1')).toBe(true);
    expect(resetNoKeep.players.some((p) => p.id === 'p2')).toBe(false);
  });
```
**After**
```ts
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
```
