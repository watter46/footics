# TASK-181ga: 選手入れ替え・ピッチ上の選手クリア・選手置換・遷移時間一括更新の命令追加（旧ストア完全廃止シリーズ）

## 1. Metadata & Goal
- **Status**: `DONE`
- **Commit**: `feat(tactical): add swap, clear-pitch, replace-players and bulk transition commands`
- **Series**: 旧ストア完全廃止シリーズ。181f（装飾・ボール）→ 181ga（本タスク）→ 181gb（フォーメーション ACL・消しゴム）→ 181h → 181i → 181j〜。
- **Goal**: 旧 `slide-player-move-slice.ts` の `swapPlayers` / `clearPitchPlayers`、`slide-transition-slice.ts` の `updateAllSlideTransitions` を新ドメインの命令へ移す。フォーメーション適用（181gb）が使う「選手リスト置換」命令もここで追加する。旧スライスの削除は 181l（本タスクでは触らない）。
- **Negative Contracts (完了時に0件であるべき条件)**:
  - Deleted files: なし（追加のみ。旧スライスと二重持ちにならないよう、Consumer 移行と旧削除は 181j〜181l で完了させる）
- **旧操作 ➔ 新命令 対応表（Worker は参照のみ）**:
  - `swapPlayers` ➔ `SWAP_PLAYERS` / `clearPitchPlayers` ➔ `CLEAR_PITCH_PLAYERS`
  - `applyFormation*`（181gb で配置計算）➔ `REPLACE_PLAYERS`（計算済み選手リストで置換）
  - `updateAllSlideTransitions` ➔ プロジェクト命令 `UPDATE_ALL_SLIDE_TRANSITIONS`

## 2. Architectural Invariants & Consumers
- **Invariants (壊してはいけない前提条件)**:
  1. 全スライド命令は `applySlideCommand` 経由で `enforceSlideInvariants` を通る。入れ替えでベンチに下がった選手のコネクトライン・追従矢印は既存の連鎖クリーンが除去する（入れ替え関数側で重複処理しない）。
  2. 入れ替え対象のどちらかがロック中なら入れ替え全体を無視する（片方だけ動いて重なる事故の防止。旧ストアはロック無視。意図的な仕様統一）。
  3. 入れ替えは常に「位置と所属エリアの交換」。ピッチ↔ベンチではベンチ側の座標がベンチへ下がる選手に引き継がれる（旧実装は古いピッチ座標が残っていた）。
  4. `CLEAR_PITCH_PLAYERS` はロック中の選手を残す（既存ロックガード）。矢印は全削除（ロック中の矢印は既存ガードで残る）。
  5. `UPDATE_ALL_SLIDE_TRANSITIONS` は全フェーズ・全スライドへ同一パッチを適用し `updatedAt` を更新する。
- **Consumers (同期更新対象の全ファイルリスト)**:
  - `SlideCommand` を `switch` で網羅する箇所は `slide-reducer.ts` のみ。`TacticalCommand` は `project-reducer.ts` のみ（`rg "case 'DELETE_PHASE'"` で確認済み）。

## 3. Implementation Phases (タスクファイル > フェーズ > タスク)

### Phase 1: 命令型・Reducer・入れ替え関数
- **Worker Model**: `flash`
- **Target Files**:
  - `[ADD]` `src/lib/tactical/domain/player-swap.ts`
  - `[MODIFY]` `src/lib/tactical/domain/commands.ts`
  - `[MODIFY]` `src/lib/tactical/domain/slide-reducer.ts`
  - `[MODIFY]` `src/lib/tactical/domain/project-reducer.ts`
  - `[ADD]` `src/lib/tactical/__tests__/slide-bulk-commands.test.ts`

#### Task 1.1: `[ADD]` `src/lib/tactical/domain/player-swap.ts`
```ts
import type {
  BenchPlayer,
  DomainPlayer,
  PitchPlayer,
} from '@/lib/types/tactical/domain-entities';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import { toBenchPlayer } from './invariants';

function toPitchPlayerAt(
  player: BenchPlayer,
  x: DomainPlayer['x'],
  y: DomainPlayer['y'],
): PitchPlayer {
  return {
    ...player,
    area: 'pitch',
    x,
    y,
    connectLines: [],
    badges: [],
  };
}

/** self が other の位置・エリアへ移った後の選手を返す。 */
function placeAt(self: DomainPlayer, other: DomainPlayer): DomainPlayer {
  if (self.area === 'pitch' && other.area === 'pitch') {
    return { ...self, x: other.x, y: other.y };
  }
  if (self.area === 'bench' && other.area === 'pitch') {
    return toPitchPlayerAt(self, other.x, other.y);
  }
  return toBenchPlayer(self, other.x, other.y);
}

/**
 * 2 選手の位置とエリア（ピッチ/ベンチ）を交換する純粋関数。
 * どちらかが不在・同一 ID・ロック中の場合はスライドを無変更で返す。
 */
export function swapPlayers(
  slide: DomainSlide,
  playerAId: string,
  playerBId: string,
): DomainSlide {
  if (playerAId === playerBId) return slide;
  const a = slide.players.find((p) => p.id === playerAId);
  const b = slide.players.find((p) => p.id === playerBId);
  if (!a || !b || a.locked || b.locked) return slide;

  return {
    ...slide,
    players: slide.players.map((p) => {
      if (p.id === playerAId) return placeAt(a, b);
      if (p.id === playerBId) return placeAt(b, a);
      return p;
    }),
  };
}
```

#### Task 1.2: `[MODIFY]` `src/lib/tactical/domain/commands.ts`
**Before (SlideCommand)**
```ts
  | { readonly type: 'SWAP_TEAM_SIDES' }
  | { readonly type: 'RESET_SLIDE_OBJECTS'; readonly keepSquad: boolean }
  | {
      readonly type: 'UPDATE_SLIDE_META';
```
**After**
```ts
  | { readonly type: 'SWAP_TEAM_SIDES' }
  | { readonly type: 'RESET_SLIDE_OBJECTS'; readonly keepSquad: boolean }
  | {
      readonly type: 'SWAP_PLAYERS';
      readonly playerAId: string;
      readonly playerBId: string;
    }
  | { readonly type: 'CLEAR_PITCH_PLAYERS' }
  | {
      readonly type: 'REPLACE_PLAYERS';
      readonly players: readonly DomainPlayer[];
    }
  | {
      readonly type: 'UPDATE_SLIDE_META';
```
**Before (TacticalCommand)**
```ts
  | { readonly type: 'DELETE_PHASE'; readonly phaseId: string }
  | {
      readonly type: 'UPDATE_PROJECT_META';
```
**After**
```ts
  | { readonly type: 'DELETE_PHASE'; readonly phaseId: string }
  | {
      readonly type: 'UPDATE_ALL_SLIDE_TRANSITIONS';
      readonly patch: Partial<
        Pick<
          DomainSlide,
          | 'transitionDurationMs'
          | 'pauseMs'
          | 'easing'
          | 'cameraTransitionMode'
          | 'cameraDurationMs'
        >
      >;
    }
  | {
      readonly type: 'UPDATE_PROJECT_META';
```

#### Task 1.3: `[MODIFY]` `src/lib/tactical/domain/slide-reducer.ts`
**Before (import 部)**
```ts
import { enforceSlideInvariants, toBenchPlayer } from './invariants';
import { flipSlideCandidate } from './slide-flip';
```
**After**
```ts
import { enforceSlideInvariants, toBenchPlayer } from './invariants';
import { swapPlayers } from './player-swap';
import { flipSlideCandidate } from './slide-flip';
```
**Before (case 追加位置)**
```ts
    case 'UPDATE_SLIDE_META':
      return { ...prevSlide, ...command.patch };
  }
}
```
**After**
```ts
    case 'SWAP_PLAYERS':
      return swapPlayers(prevSlide, command.playerAId, command.playerBId);

    case 'CLEAR_PITCH_PLAYERS':
      return {
        ...prevSlide,
        players: prevSlide.players.map((p) =>
          p.area === 'pitch' ? toBenchPlayer(p) : p,
        ),
        arrows: [],
      };

    case 'REPLACE_PLAYERS':
      return { ...prevSlide, players: [...command.players] };

    case 'UPDATE_SLIDE_META':
      return { ...prevSlide, ...command.patch };
  }
}
```

#### Task 1.4: `[MODIFY]` `src/lib/tactical/domain/project-reducer.ts`
**Before**
```ts
    case 'UPDATE_PROJECT_META':
      return {
        ...project,
        ...command.patch,
        updatedAt: now,
      };
```
**After**
```ts
    case 'UPDATE_ALL_SLIDE_TRANSITIONS':
      return {
        ...project,
        phases: project.phases.map((p) => ({
          ...p,
          slides: p.slides.map((s) => ({ ...s, ...command.patch })),
        })),
        updatedAt: now,
      };

    case 'UPDATE_PROJECT_META':
      return {
        ...project,
        ...command.patch,
        updatedAt: now,
      };
```

#### Task 1.5: `[ADD]` `src/lib/tactical/__tests__/slide-bulk-commands.test.ts`
モック不使用。純粋関数 I/O テスト。以下 1.5a〜1.5c の 3 ブロックを上から順に 1 ファイルへ連結して作成する（import は 1.5a に集約）。

**1.5a ヘルパー**
```ts
import { describe, expect, it } from 'vitest';
import {
  clampToScreenNorm,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import type {
  BenchPlayer,
  PitchPlayer,
} from '@/lib/types/tactical/domain-entities';
import type {
  DomainSlide,
  DomainTacticalProject,
} from '@/lib/types/tactical/domain-hierarchy';
import { applyTacticalCommand } from '../domain/project-reducer';
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

const pitch = (
  id: string,
  x: number,
  y: number,
  overrides?: Partial<PitchPlayer>,
): PitchPlayer => ({
  id,
  area: 'pitch',
  team: 'home',
  x: clampToScreenNorm(x),
  y: clampToScreenNorm(y),
  style,
  connectLines: [],
  badges: [],
  ...overrides,
});

const bench = (id: string, x: number, y: number): BenchPlayer => ({
  id,
  area: 'bench',
  team: 'home',
  x: clampToScreenNorm(x),
  y: clampToScreenNorm(y),
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

const arrowFrom = (id: string, sourcePlayerId: string) => ({
  id,
  annotationType: 'arrow' as const,
  arrowType: 'pass' as const,
  curveType: 'straight' as const,
  points: [toScreenNormPoint(20, 30), toScreenNormPoint(80, 80)],
  color: '#ffffff',
  strokeWidth: 3,
  dashArray: [],
  startMarker: 'none' as const,
  endMarker: 'arrow' as const,
  sourcePlayerId,
});
```

**1.5b 入れ替え・クリア**
```ts
describe('SWAP_PLAYERS', () => {
  it('ピッチ上の 2 選手は位置を交換する', () => {
    const base = slide({ players: [pitch('a', 20, 30), pitch('b', 60, 40)] });
    const next = applySlideCommand(base, {
      type: 'SWAP_PLAYERS',
      playerAId: 'a',
      playerBId: 'b',
    });
    expect(next.players.find((p) => p.id === 'a')?.x).toBe(60);
    expect(next.players.find((p) => p.id === 'b')?.x).toBe(20);
    expect(next.players.find((p) => p.id === 'b')?.y).toBe(30);
  });

  it('ピッチ↔ベンチは所属が入れ替わり、ベンチ側の座標が引き継がれる', () => {
    const base = slide({
      players: [
        pitch('a', 20, 30, {
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
        }),
        bench('b', 5, 90),
      ],
      arrows: [arrowFrom('ar1', 'a')],
    });
    const next = applySlideCommand(base, {
      type: 'SWAP_PLAYERS',
      playerAId: 'a',
      playerBId: 'b',
    });
    const a = next.players.find((p) => p.id === 'a');
    const b = next.players.find((p) => p.id === 'b');
    expect(a?.area).toBe('bench');
    expect(a?.x).toBe(5);
    expect(a?.y).toBe(90);
    expect('badges' in (a ?? {})).toBe(false);
    expect(b?.area).toBe('pitch');
    expect(b?.x).toBe(20);
    expect(b?.y).toBe(30);
    expect(next.arrows).toHaveLength(0);
  });

  it('ロック中・不在・同一 ID の入れ替えは無視される', () => {
    const base = slide({
      players: [pitch('a', 20, 30, { locked: true }), pitch('b', 60, 40)],
    });
    for (const [x, y] of [
      ['a', 'b'],
      ['b', 'ghost'],
      ['b', 'b'],
    ]) {
      const next = applySlideCommand(base, {
        type: 'SWAP_PLAYERS',
        playerAId: x,
        playerBId: y,
      });
      expect(next.players).toEqual(base.players);
    }
  });
});

describe('CLEAR_PITCH_PLAYERS', () => {
  it('ピッチ上の選手を全員ベンチへ戻し、矢印を消す（ロック中の選手は残る）', () => {
    const base = slide({
      players: [
        pitch('a', 20, 30),
        pitch('locked', 40, 40, { locked: true }),
        bench('c', 5, 90),
      ],
      arrows: [arrowFrom('ar1', 'a')],
    });
    const next = applySlideCommand(base, { type: 'CLEAR_PITCH_PLAYERS' });
    expect(next.players.find((p) => p.id === 'a')?.area).toBe('bench');
    expect(next.players.find((p) => p.id === 'locked')?.area).toBe('pitch');
    expect(next.players.find((p) => p.id === 'c')?.area).toBe('bench');
    expect(next.arrows).toHaveLength(0);
  });
});
```

**1.5c 選手置換・遷移時間一括更新**
```ts
describe('REPLACE_PLAYERS', () => {
  it('選手リストを置換する（ロック中の選手は元の状態で残る）', () => {
    const base = slide({
      players: [pitch('old', 20, 30), pitch('keep', 50, 50, { locked: true })],
    });
    const next = applySlideCommand(base, {
      type: 'REPLACE_PLAYERS',
      players: [pitch('new', 70, 70)],
    });
    expect(next.players.map((p) => p.id).sort()).toEqual(['keep', 'new']);
  });
});

const projectWith = (slides: DomainSlide[][]): DomainTacticalProject => ({
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
  tags: [],
  phases: slides.map((list, i) => ({
    id: `ph${i}`,
    name: `Phase ${i}`,
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
    slides: list,
  })),
});

describe('UPDATE_ALL_SLIDE_TRANSITIONS', () => {
  it('全フェーズ・全スライドへ同じ遷移設定を適用する', () => {
    const project = projectWith([
      [slide({ id: 'a' }), slide({ id: 'b', index: 1 })],
      [slide({ id: 'c' })],
    ]);
    const next = applyTacticalCommand(project, {
      type: 'UPDATE_ALL_SLIDE_TRANSITIONS',
      patch: { transitionDurationMs: 2500, easing: 'ease-in-out' },
    });
    const all = next.phases.flatMap((p) => p.slides);
    expect(all).toHaveLength(3);
    for (const s of all) {
      expect(s.transitionDurationMs).toBe(2500);
      expect(s.easing).toBe('ease-in-out');
      expect(s.pauseMs).toBe(500);
    }
    expect(next.updatedAt).not.toBe(project.updatedAt);
  });
});
```
- **Phase 1 検証**: `bun run ai:check src/lib/tactical/domain/player-swap.ts src/lib/tactical/domain/commands.ts src/lib/tactical/domain/slide-reducer.ts src/lib/tactical/domain/project-reducer.ts src/lib/tactical/__tests__/slide-bulk-commands.test.ts`

## 4. 全 Phase 完了後（Planner）
- `GIT_EXTERNAL_DIFF=difft rtk git diff` で Before ➔ After 通りか確認 ➔ Status を `DONE` ➔ `bun run ai:commit -m "feat(tactical): add swap, clear-pitch, replace-players and bulk transition commands"`
