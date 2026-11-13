# TASK-181f: 選手の装飾・ボール操作の命令追加（旧ストア完全廃止シリーズ）

## 1. Metadata & Goal
- **Status**: `DONE`
- **Commit**: `feat(tactical): add player decoration and ball commands to domain reducer`
- **Series**: 旧ストア完全廃止シリーズ。181ea/181eb（画面状態）→ 181f（本タスク）→ 181g〜（スワップ/整列/フェーズ命令/Consumer 移行/旧ストア削除）。
- **Goal**: 旧 `slide-attachment-slice.ts`（軌道・視野コーン・コネクトライン・バッジ・フォーカス）と `slide-ball-slice.ts`（ボール位置・表示・サイズ・軌道・ロック）が担っていた操作を、新ドメインの `SlideCommand` と純粋 Reducer に追加する。ボールのサイズ倍率とロックを新ドメインのボール状態に追加し、シーン描画（Scene Compiler）へサイズ倍率を反映する。旧スライスの削除は 181l で行う（本タスクでは触らない）。
- **Negative Contracts (完了時に0件であるべき条件)**:
  - `rg -n "computeBallRadiusPx\(viewport\)" src/lib/tactical/compiler/compile-billboards.ts` ➔ 0 matches（サイズ倍率を渡す形へ置換）
  - Deleted files: なし
- **旧操作 ➔ 新命令 対応表（Worker は参照のみ）**:
  - `updatePlayerTrajectory` ➔ `SET_PLAYER_TRAJECTORY` / `setVisionCone` ➔ `SET_PLAYER_VISION_CONE`
  - `addConnectLine` / `updateConnectLine` / `removeConnectLine` ➔ `ADD_CONNECT_LINE` / `UPDATE_CONNECT_LINE` / `REMOVE_CONNECT_LINE`
  - `addPlayerBadge` / `removePlayerBadge` ➔ `ADD_PLAYER_BADGE` / `REMOVE_PLAYER_BADGE` / `setPlayerFocus` ➔ `SET_PLAYER_FOCUS`
  - `setBallPosition` / `setBallVisible` / `setBallSizeScale` / `updateBallTrajectory` ➔ 既存 `UPDATE_BALL`（`x,y` / `visible` / `sizeScale` / `trajectory` パッチ）
  - ボールロック切替（旧 `slide-lock-helpers`）➔ `TOGGLE_BALL_LOCK`
  - `setPitchPosition` ➔ 既存 `UPDATE_SLIDE_META` の `pitchTransform`（追加作業なし）

## 2. Architectural Invariants & Consumers
- **Invariants (壊してはいけない前提条件)**:
  1. 全命令は `applySlideCommand` 経由で `enforceSlideInvariants` を通る。装飾命令の対象はピッチ上の選手のみ（ベンチ選手・存在しない ID は無変更）。
  2. ロック中の選手には既存のロックガードにより装飾命令も反映されない（旧ストアはロック無視だったが、新ドメインの統一仕様に従う。意図的な仕様統一）。
  3. ボールのロックは「位置の固定」のみ（旧 `setBallPosition` と同じ）。表示・サイズ・軌道の変更はロック中でも反映される。`TOGGLE_BALL_LOCK` 自体はガードを素通りする。
  4. `DomainBallState` への `sizeScale` / `locked` 追加はともに optional。既存データ・既存テストは壊れない。
- **Consumers (同期更新対象の全ファイルリスト)**:
  - `SlideCommand` を `switch` で網羅する箇所は `slide-reducer.ts` のみ（`rg "case 'UPDATE_BALL'"` で確認済み）。
  - `DomainBallState` 参照: `acl/annotation-normalizers.ts`（Phase 2 で更新）、`engine/slide-interpolator.ts`（Phase 2 で更新）。
  - ボール半径の計算呼び出し: `compiler/compile-billboards.ts` のみ（Phase 2 で更新）。

## 3. Implementation Phases (タスクファイル > フェーズ > タスク)

### Phase 1: 命令型・Reducer・不変条件・ボール型の追加
- **Worker Model**: `flash`
- **Target Files**:
  - `[MODIFY]` `src/lib/types/tactical/domain-entities.ts`
  - `[MODIFY]` `src/lib/tactical/domain/commands.ts`
  - `[MODIFY]` `src/lib/tactical/domain/slide-reducer.ts`
  - `[MODIFY]` `src/lib/tactical/domain/invariants.ts`
  - `[ADD]` `src/lib/tactical/__tests__/slide-decoration-commands.test.ts`

#### Task 1.1: `[MODIFY]` `src/lib/types/tactical/domain-entities.ts`
**Before**
```ts
export const DomainBallStateSchema = z.object({
  x: ScreenNormCoordSchema,
  y: ScreenNormCoordSchema,
  visible: z.boolean().default(true),
  color: z.string().optional(),
  trajectory: DomainPlayerTrajectorySchema.optional(),
});
```
**After**
```ts
export const DomainBallStateSchema = z.object({
  x: ScreenNormCoordSchema,
  y: ScreenNormCoordSchema,
  visible: z.boolean().default(true),
  color: z.string().optional(),
  sizeScale: z.number().min(0.4).max(2.0).optional(),
  trajectory: DomainPlayerTrajectorySchema.optional(),
  locked: z.boolean().optional(),
});
```

#### Task 1.2: `[MODIFY]` `src/lib/tactical/domain/commands.ts`
**Before (import 部)**
```ts
import type { ScreenNormCoord } from '@/lib/types/tactical/branded';
import type {
  DomainArrowAnnotation,
  DomainBallState,
  DomainPlayer,
  DomainTextAnnotation,
  DomainZoneAnnotation,
  PitchPlayer,
} from '@/lib/types/tactical/domain-entities';
```
**After**
```ts
import type { ScreenNormCoord } from '@/lib/types/tactical/branded';
import type {
  DomainArrowAnnotation,
  DomainBallState,
  DomainPlayer,
  DomainPlayerTrajectory,
  DomainTextAnnotation,
  DomainZoneAnnotation,
  PitchPlayer,
} from '@/lib/types/tactical/domain-entities';
import type {
  ConnectLine,
  PlayerBadge,
  PlayerFocus,
  VisionCone,
} from '@/lib/types/tactical/player';
```
**Before (UPDATE_BALL 行)**
```ts
  | { readonly type: 'UPDATE_BALL'; readonly patch: Partial<DomainBallState> }
  | {
      readonly type: 'TOGGLE_ENTITY_LOCK';
```
**After**
```ts
  | { readonly type: 'UPDATE_BALL'; readonly patch: Partial<DomainBallState> }
  | { readonly type: 'TOGGLE_BALL_LOCK' }
  | {
      readonly type: 'SET_PLAYER_TRAJECTORY';
      readonly playerId: string;
      readonly trajectory: DomainPlayerTrajectory | undefined;
    }
  | {
      readonly type: 'SET_PLAYER_VISION_CONE';
      readonly playerId: string;
      readonly cone: VisionCone | undefined;
    }
  | {
      readonly type: 'ADD_CONNECT_LINE';
      readonly playerId: string;
      readonly line: ConnectLine;
    }
  | {
      readonly type: 'UPDATE_CONNECT_LINE';
      readonly playerId: string;
      readonly lineId: string;
      readonly patch: Partial<ConnectLine>;
    }
  | {
      readonly type: 'REMOVE_CONNECT_LINE';
      readonly playerId: string;
      readonly lineId: string;
    }
  | {
      readonly type: 'ADD_PLAYER_BADGE';
      readonly playerId: string;
      readonly badge: PlayerBadge;
    }
  | {
      readonly type: 'REMOVE_PLAYER_BADGE';
      readonly playerId: string;
      readonly badgeId: string;
    }
  | {
      readonly type: 'SET_PLAYER_FOCUS';
      readonly playerId: string;
      readonly focus: PlayerFocus | undefined;
    }
  | {
      readonly type: 'TOGGLE_ENTITY_LOCK';
```

#### Task 1.3: `[MODIFY]` `src/lib/tactical/domain/slide-reducer.ts`
**Before (toggleLock 直後〜reduceSlideCandidate 冒頭)**
```ts
const toggleLock = <T extends { id: string; locked?: boolean }>(
  list: readonly T[],
  id: string,
): T[] =>
  list.map((item) =>
    item.id === id ? { ...item, locked: !item.locked } : item,
  );

function reduceSlideCandidate(
```
**After**
```ts
const toggleLock = <T extends { id: string; locked?: boolean }>(
  list: readonly T[],
  id: string,
): T[] =>
  list.map((item) =>
    item.id === id ? { ...item, locked: !item.locked } : item,
  );

/** ピッチ上の選手 1 名だけに updater を適用する（ベンチ・不在 ID は無変更）。 */
function updatePitchPlayer(
  slide: DomainSlide,
  playerId: string,
  updater: (p: PitchPlayer) => PitchPlayer,
): DomainSlide {
  return {
    ...slide,
    players: slide.players.map((p) =>
      p.id === playerId && p.area === 'pitch' ? updater(p) : p,
    ),
  };
}

function reduceSlideCandidate(
```
**Before (UPDATE_BALL case)**
```ts
    case 'UPDATE_BALL':
      return { ...prevSlide, ball: { ...prevSlide.ball, ...command.patch } };

    case 'TOGGLE_ENTITY_LOCK': {
```
**After**
```ts
    case 'UPDATE_BALL':
      return { ...prevSlide, ball: { ...prevSlide.ball, ...command.patch } };

    case 'TOGGLE_BALL_LOCK':
      return {
        ...prevSlide,
        ball: { ...prevSlide.ball, locked: !prevSlide.ball.locked },
      };

    case 'SET_PLAYER_TRAJECTORY':
      return updatePitchPlayer(prevSlide, command.playerId, (p) => ({
        ...p,
        trajectory: command.trajectory,
      }));

    case 'SET_PLAYER_VISION_CONE':
      return updatePitchPlayer(prevSlide, command.playerId, (p) => ({
        ...p,
        visionCone: command.cone,
      }));

    case 'ADD_CONNECT_LINE':
      return updatePitchPlayer(prevSlide, command.playerId, (p) => ({
        ...p,
        connectLines: [...p.connectLines, command.line],
      }));

    case 'UPDATE_CONNECT_LINE':
      return updatePitchPlayer(prevSlide, command.playerId, (p) => ({
        ...p,
        connectLines: p.connectLines.map((l) =>
          l.id === command.lineId ? { ...l, ...command.patch } : l,
        ),
      }));

    case 'REMOVE_CONNECT_LINE':
      return updatePitchPlayer(prevSlide, command.playerId, (p) => ({
        ...p,
        connectLines: p.connectLines.filter((l) => l.id !== command.lineId),
      }));

    case 'ADD_PLAYER_BADGE':
      return updatePitchPlayer(prevSlide, command.playerId, (p) => ({
        ...p,
        badges: [...p.badges, command.badge],
      }));

    case 'REMOVE_PLAYER_BADGE':
      return updatePitchPlayer(prevSlide, command.playerId, (p) => ({
        ...p,
        badges: p.badges.filter((b) => b.id !== command.badgeId),
      }));

    case 'SET_PLAYER_FOCUS':
      return updatePitchPlayer(prevSlide, command.playerId, (p) => ({
        ...p,
        focus: command.focus,
      }));

    case 'TOGGLE_ENTITY_LOCK': {
```

#### Task 1.4: `[MODIFY]` `src/lib/tactical/domain/invariants.ts`
**Before**
```ts
  const normalizedBall = {
    ...candidateSlide.ball,
    x: clampToScreenNorm(candidateSlide.ball.x),
    y: clampToScreenNorm(candidateSlide.ball.y),
  };
```
**After**
```ts
  // ボールロックは「位置固定」のみ。TOGGLE_BALL_LOCK 自体は素通りさせる。
  const isBallPositionLocked =
    prevSlide.ball.locked === true && command.type !== 'TOGGLE_BALL_LOCK';
  const baseBall = isBallPositionLocked
    ? { ...candidateSlide.ball, x: prevSlide.ball.x, y: prevSlide.ball.y }
    : candidateSlide.ball;
  const normalizedBall = {
    ...baseBall,
    x: clampToScreenNorm(baseBall.x),
    y: clampToScreenNorm(baseBall.y),
  };
```

#### Task 1.5: `[ADD]` `src/lib/tactical/__tests__/slide-decoration-commands.test.ts`
モック不使用。`applySlideCommand` の純粋関数 I/O テスト。以下 1.5a〜1.5d の 4 ブロックを上から順に 1 ファイルへ連結して作成する（import は 1.5a に集約）。

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
```

**1.5b 軌道・視野コーン・フォーカス・ベンチ/ロック**
```ts
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
```

**1.5c コネクトライン・バッジ・ベンチ剥離**
```ts
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
```

**1.5d ボール命令**
```ts
describe('ボール命令', () => {
  it('UPDATE_BALL で表示・サイズ倍率・軌道を変更できる', () => {
    const next = applySlideCommand(slide(), {
      type: 'UPDATE_BALL',
      patch: { visible: false, sizeScale: 1.5, trajectory: { type: 'arc_right' } },
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
```
- **Phase 1 検証**: `bun run ai:check src/lib/types/tactical/domain-entities.ts src/lib/tactical/domain/commands.ts src/lib/tactical/domain/slide-reducer.ts src/lib/tactical/domain/invariants.ts src/lib/tactical/__tests__/slide-decoration-commands.test.ts`

### Phase 2: ボールのサイズ倍率を正規化・補間・描画へ反映（Phase 1 完了後に実行）
- **Worker Model**: `flash`
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/acl/annotation-normalizers.ts`
  - `[MODIFY]` `src/lib/tactical/engine/slide-interpolator.ts`
  - `[MODIFY]` `src/lib/tactical/compiler/compile-billboards.ts`
  - `[ADD]` `src/lib/tactical/__tests__/ball-size-scale-pipeline.test.ts`

#### Task 2.1: `[MODIFY]` `src/lib/tactical/acl/annotation-normalizers.ts`
**Before**
```ts
    visible: typeof b.visible === 'boolean' ? b.visible : true,
    color: typeof b.color === 'string' ? b.color : undefined,
    trajectory:
```
**After**
```ts
    visible: typeof b.visible === 'boolean' ? b.visible : true,
    color: typeof b.color === 'string' ? b.color : undefined,
    sizeScale:
      typeof b.sizeScale === 'number'
        ? Math.max(0.4, Math.min(2.0, b.sizeScale))
        : undefined,
    locked: typeof b.locked === 'boolean' ? b.locked : undefined,
    trajectory:
```

#### Task 2.2: `[MODIFY]` `src/lib/tactical/engine/slide-interpolator.ts`
**Before**
```ts
  return {
    ...ballB,
    x,
    y,
    visible: ease < 0.5 ? ballA.visible : ballB.visible,
    color: ballB.color ?? ballA.color,
  };
}
```
**After**
```ts
  const hasSizeScale =
    ballA.sizeScale !== undefined || ballB.sizeScale !== undefined;

  return {
    ...ballB,
    x,
    y,
    visible: ease < 0.5 ? ballA.visible : ballB.visible,
    color: ballB.color ?? ballA.color,
    sizeScale: hasSizeScale
      ? lerp(ballA.sizeScale ?? 1, ballB.sizeScale ?? 1, ease)
      : undefined,
  };
}
```

#### Task 2.3: `[MODIFY]` `src/lib/tactical/compiler/compile-billboards.ts`
**Before**
```ts
  const ballRadiusPx = computeBallRadiusPx(viewport);
```
**After**
```ts
  const ballRadiusPx = computeBallRadiusPx(
    viewport,
    frame.slide.ball.sizeScale,
  );
```

#### Task 2.4: `[ADD]` `src/lib/tactical/__tests__/ball-size-scale-pipeline.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import { normalizeBall } from '../acl/annotation-normalizers';
import { compileBillboardItems } from '../compiler/compile-billboards';
import { interpolateSlide } from '../engine/slide-interpolator';
import { evaluateStaticSlideFrame } from '../engine/timeline-evaluator';

const slideWith = (sizeScale?: number): DomainSlide => ({
  id: 's',
  index: 0,
  players: [],
  arrows: [],
  zones: [],
  texts: [],
  ball: {
    x: clampToScreenNorm(50),
    y: clampToScreenNorm(50),
    visible: true,
    sizeScale,
  },
  transitionDurationMs: 1000,
  pauseMs: 500,
  easing: 'linear',
});

const viewport = { width: 1000, height: 1000 };

const ballRadius = (slide: DomainSlide): number => {
  const { billboardItems } = compileBillboardItems(
    evaluateStaticSlideFrame(slide),
    null,
    viewport,
  );
  const ball = billboardItems.find((i) => i.kind === 'ball');
  if (!ball || ball.kind !== 'ball') throw new Error('ball not found');
  return ball.radiusPx;
};

describe('normalizeBall', () => {
  it('sizeScale を 0.4〜2.0 に丸め、locked を保持する', () => {
    expect(normalizeBall({ x: 1, y: 2, sizeScale: 9 }).sizeScale).toBe(2.0);
    expect(normalizeBall({ x: 1, y: 2, sizeScale: 0 }).sizeScale).toBe(0.4);
    expect(normalizeBall({ x: 1, y: 2, locked: true }).locked).toBe(true);
    expect(normalizeBall({ x: 1, y: 2 }).sizeScale).toBeUndefined();
  });
});

describe('ボール半径のサイズ倍率反映', () => {
  it('倍率 2.0 は未指定の 2 倍の半径になる', () => {
    expect(ballRadius(slideWith(2.0))).toBeCloseTo(ballRadius(slideWith()) * 2);
  });
});

describe('interpolateSlide のボール倍率補間', () => {
  it('中間で倍率が線形補間され、両方未指定なら未指定のまま', () => {
    const mid = interpolateSlide(slideWith(1), slideWith(2), 0.5).slide.ball;
    expect(mid.sizeScale).toBeCloseTo(1.5);
    const none = interpolateSlide(slideWith(), slideWith(), 0.5).slide.ball;
    expect(none.sizeScale).toBeUndefined();
  });
});
```
- **Phase 2 検証**: `bun run ai:check src/lib/tactical/acl/annotation-normalizers.ts src/lib/tactical/engine/slide-interpolator.ts src/lib/tactical/compiler/compile-billboards.ts src/lib/tactical/__tests__/ball-size-scale-pipeline.test.ts`

## 4. 全 Phase 完了後（Planner）
- `rg -n "computeBallRadiusPx\(viewport\)" src/lib/tactical/compiler/compile-billboards.ts` ➔ 0 matches
- `GIT_EXTERNAL_DIFF=difft rtk git diff` で Before ➔ After 通りか確認 ➔ Status を `DONE` ➔ `bun run ai:commit -m "feat(tactical): add player decoration and ball commands to domain reducer"`
