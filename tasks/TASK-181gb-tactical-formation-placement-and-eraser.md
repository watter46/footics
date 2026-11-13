# TASK-181gb: フォーメーション配置の ACL 化と消しゴム当たり判定（旧ストア完全廃止シリーズ）

## 1. Metadata & Goal
- **Status**: `DONE`
- **Commit**: `feat(tactical): add formation placement ACL and eraser hit test`
- **Series**: 旧ストア完全廃止シリーズ。181ga（入れ替え・クリア・選手置換・遷移一括）→ 181gb（本タスク）→ 181h → 181i → 181j〜。181ga の `REPLACE_PLAYERS` 命令を前提とする（本タスクのコードは Reducer を直接呼ばず ACL/純粋関数のみ）。
- **Goal**: 旧 `slide-formation-slice.ts` / `slide-formation-helpers.ts`（フォーメーション適用）と `canvas-store-eraser.ts`（消しゴム）の計算を、新ドメイン側の純粋関数へ移す。旧ファイルの削除は 181l。
- **Negative Contracts (完了時に0件であるべき条件)**:
  - `rg -n "FormationSlotPreset|projectFormationSlotsToScreenNorm|applyFormationPresetToSlide|Date\.now" src/lib/tactical/acl/formation-translator.ts src/lib/tactical/__tests__/acl-presets.test.ts` ➔ 0 matches（旧プロジェクション方式と非決定的 ID の撤去）
  - Deleted files: なし
- **旧操作 ➔ 新機能 対応表（Worker は参照のみ）**:
  - `applyFormation`（両チーム）➔ `buildFormationPlacements` ＋ `applyFormationPlacementsToSlide` を各チームに適用し、結果の選手リストを `REPLACE_PLAYERS` へ渡す
  - `applySingleTeamFormation` ➔ `applySingleTeamFormationToSlide`
  - `applyFormationPreset`（保存済みプリセット）➔ `buildPlacementsFromPreset` ＋ `applyFormationPlacementsToSlide`
  - `eraseAnnotationsAtPoint` ➔ `findEraseTargetIds`（削除は既存 `DELETE_ENTITIES`）

## 2. Architectural Invariants & Consumers
- **Invariants (壊してはいけない前提条件)**:
  1. 座標計算は ACL（`formation-placements.ts`）に置き、Domain 層（Reducer）は `lib/data/formations` へ依存しない。
  2. フォーメーション適用は「既存選手プール（ピッチ→ベンチ順）を再利用し、不足は新規作成、余剰はベンチへ」に統一する。旧 `applyFormationPreset`（保存済みプリセット）は選手を毎回新規作成していたが、旧 `applyFormation` と同じ再利用方式へ揃える（意図的な仕様統一。名前・背番号・スタイルが保たれる）。
  3. 新規選手の ID は呼び出し側が注入する（`createId`）。純粋関数内で `Date.now` / 乱数を使わない。
  4. 消しゴム対象はロック中でない矢印・ゾーン・テキストのみ。旧 `markers`（`AnnotationsData.markers`）は新ドメインに存在しないため対象外。座標は ScreenNorm（0〜100）、既定半径 4.0。
  5. `engine/eraser-hit-test.ts` は `features/` を import しない（旧 `geometry.ts` をコピーせず自己完結）。
- **Consumers (同期更新対象の全ファイルリスト)**:
  - `formation-translator.ts` の旧 API（`FormationSlotPreset` / `projectFormationSlotsToScreenNorm` / `applyFormationPresetToSlide`）の参照は `__tests__/acl-presets.test.ts` のみ（`rg` 確認済み）。同 Phase で更新する。
  - 旧ストア利用側（`formation-*` パネル / ツールバー消しゴム）の移行は 181j〜181k。

## 3. Implementation Phases (タスクファイル > フェーズ > タスク)

### Phase 1: 配置 ACL・Translator 置換・消しゴム当たり判定
- **Worker Model**: `flash`
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/acl/formation-translator.ts`
  - `[ADD]` `src/lib/tactical/acl/formation-placements.ts`
  - `[ADD]` `src/lib/tactical/engine/eraser-hit-test.ts`
  - `[MODIFY]` `src/lib/tactical/__tests__/acl-presets.test.ts`
  - `[ADD]` `src/lib/tactical/__tests__/eraser-hit-test.test.ts`

#### Task 1.1: `[MODIFY]` `src/lib/tactical/acl/formation-translator.ts`
**Before (L1-L18)**
```ts
import { toBenchPlayer } from '@/lib/tactical/domain/invariants';
import { pitchNormToScreenNorm } from '@/lib/tactical/engine/coordinates';
import {
  type ScreenNormPoint,
  toPitchNormPoint,
} from '@/lib/types/tactical/branded';
import type {
  DomainPlayer,
  PitchPlayer,
} from '@/lib/types/tactical/domain-entities';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';

export interface FormationSlotPreset {
  readonly shirtNo: string;
  readonly position: string;
  readonly x: number;
  readonly y: number;
}
```
**After**
```ts
import { toBenchPlayer } from '@/lib/tactical/domain/invariants';
import type { ScreenNormCoord } from '@/lib/types/tactical/branded';
import type {
  DomainPlayer,
  PitchPlayer,
} from '@/lib/types/tactical/domain-entities';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';

/** フォーメーション 1 スロットの配置結果（ScreenNorm 座標・計算済み）。 */
export interface FormationPlacement {
  readonly shirtNo: string;
  readonly position: string;
  readonly x: ScreenNormCoord;
  readonly y: ScreenNormCoord;
}

export type FormationTeam = 'home' | 'away';
export type FormationIdFactory = (team: FormationTeam, index: number) => string;
```

**Before (L20-L69: 投影関数全体 ＋ 適用関数の先頭。Worker は L20 の `export function projectFormationSlotsToScreenNorm(` から L69 の `const projectedSlots = ...;` 行までを以下の After に置換する)**
```ts
export function projectFormationSlotsToScreenNorm(
  slots: readonly FormationSlotPreset[],
  team: 'home' | 'away',
  mode?: 'full' | 'half',
): readonly {
  readonly shirtNo: string;
  readonly position: string;
  readonly point: ScreenNormPoint;
}[] {
  const isHalfMode = mode === 'half';
  return slots.map((slot) => {
    let pitchX: number;
    let pitchY: number;

    if (isHalfMode) {
      if (team === 'home') {
        pitchX = slot.x;
        pitchY = slot.y;
      } else {
        pitchX = 100 - slot.x;
        pitchY = 100 - slot.y;
      }
    } else {
      // mode === 'full': home occupies 0..50%, away occupies 50..100%
      if (team === 'home') {
        pitchX = slot.x * 0.5;
        pitchY = slot.y;
      } else {
        pitchX = 100 - slot.x * 0.5;
        pitchY = 100 - slot.y;
      }
    }

    const point = pitchNormToScreenNorm(toPitchNormPoint(pitchX, pitchY));
    return {
      shirtNo: slot.shirtNo,
      position: slot.position,
      point,
    };
  });
}

export function applyFormationPresetToSlide(
  slide: DomainSlide,
  slots: readonly FormationSlotPreset[],
  team: 'home' | 'away',
  mode?: 'full' | 'half',
): DomainSlide {
  const projectedSlots = projectFormationSlotsToScreenNorm(slots, team, mode);
```
**After**
```ts
/**
 * 指定チームの選手プール（ピッチ → ベンチの順）へ配置を適用する純粋関数。
 * 不足分は createId で新規選手を作成し、余剰はベンチへ戻す。相手チームは無変更。
 */
export function applyFormationPlacementsToSlide(
  slide: DomainSlide,
  placements: readonly FormationPlacement[],
  team: FormationTeam,
  createId: FormationIdFactory,
): DomainSlide {
```

**Before (ループ先頭)**
```ts
  for (let i = 0; i < projectedSlots.length; i++) {
    const slot = projectedSlots[i];
```
**After**
```ts
  for (let i = 0; i < placements.length; i++) {
    const slot = placements[i];
```

**Before (既存選手の座標)**
```ts
        x: slot.point.x,
        y: slot.point.y,
        style: existing.style,
```
**After**
```ts
        x: slot.x,
        y: slot.y,
        style: existing.style,
```

**Before (新規選手の ID と座標)**
```ts
        id: `player-${team}-${i + 1}-${Date.now()}`,
        shirtNo: slot.shirtNo,
        position: slot.position,
        team,
        area: 'pitch',
        x: slot.point.x,
        y: slot.point.y,
```
**After**
```ts
        id: createId(team, i),
        shirtNo: slot.shirtNo,
        position: slot.position,
        team,
        area: 'pitch',
        x: slot.x,
        y: slot.y,
```

**Before (余剰のベンチ化 ＋ ファイル末尾)**
```ts
  for (let i = projectedSlots.length; i < teamPool.length; i++) {
    updatedTeamPlayers.push(toBenchPlayer(teamPool[i]));
  }

  return {
    ...slide,
    players: [...otherPlayers, ...updatedTeamPlayers],
  };
}
```
**After**
```ts
  for (let i = placements.length; i < teamPool.length; i++) {
    updatedTeamPlayers.push(toBenchPlayer(teamPool[i]));
  }

  return {
    ...slide,
    players: [...otherPlayers, ...updatedTeamPlayers],
  };
}

/**
 * 単一チームのフォーメーション適用。相手チームの選手は全員ベンチへ退避し、
 * 中立（neutral）選手は無変更で残す。
 */
export function applySingleTeamFormationToSlide(
  slide: DomainSlide,
  placements: readonly FormationPlacement[],
  team: FormationTeam,
  createId: FormationIdFactory,
): DomainSlide {
  const otherTeam: FormationTeam = team === 'home' ? 'away' : 'home';
  const benched: DomainSlide = {
    ...slide,
    players: slide.players.map((p) =>
      p.team === otherTeam ? toBenchPlayer(p) : p,
    ),
  };
  return applyFormationPlacementsToSlide(benched, placements, team, createId);
}
```

#### Task 1.2: `[ADD]` `src/lib/tactical/acl/formation-placements.ts`
```ts
import {
  type FormationMode,
  type FormationType,
  getFormationActualPos,
} from '@/lib/data/formations';
import { FORMATION_POSITIONS } from '@/lib/data/formations-data';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import {
  type AspectRatio,
  isVerticalAspectRatio,
  transformCoord,
} from '@/lib/types/tactical/primitives';
import type { FormationPlacement, FormationTeam } from './formation-translator';

export interface FormationBuildOptions {
  readonly aspectRatio: AspectRatio;
  readonly isSidesSwapped?: boolean;
}

interface Point {
  readonly x: number;
  readonly y: number;
}

/** ピッチ白線枠内 (3..97) へ収容し、サイド入れ替え時は 180 度反転する。 */
function toPlacementPoint(raw: Point, isSidesSwapped?: boolean) {
  const x = Math.max(3, Math.min(97, raw.x));
  const y = Math.max(3, Math.min(97, raw.y));
  return {
    x: clampToScreenNorm(isSidesSwapped ? 100 - x : x),
    y: clampToScreenNorm(isSidesSwapped ? 100 - y : y),
  };
}

/** 登録済みフォーメーション名から 11 人分の配置を計算する。未登録名は空配列。 */
export function buildFormationPlacements(
  formationName: FormationType,
  team: FormationTeam,
  mode: FormationMode,
  options: FormationBuildOptions,
): readonly FormationPlacement[] {
  const positions = FORMATION_POSITIONS[formationName];
  if (!positions) return [];
  const isVertical = isVerticalAspectRatio(options.aspectRatio);

  return positions.map((pos) => {
    let target: Point = getFormationActualPos(
      pos,
      team,
      mode,
      options.aspectRatio,
    );
    // GK はゴールライン直前・中央へ固定する
    if (pos.position === 'GK') {
      const gk = { x: team === 'home' ? 7 : 93, y: 50 };
      target = isVertical
        ? transformCoord(gk, '16:9', options.aspectRatio)
        : gk;
    }
    const point = toPlacementPoint(target, options.isSidesSwapped);
    return {
      shirtNo: String(pos.id),
      position: pos.position,
      x: point.x,
      y: point.y,
    };
  });
}

export interface PresetPlayerInput {
  readonly shirtNo: string;
  readonly position: string;
  readonly x: number;
  readonly y: number;
}

/** 保存済みプリセット（16:9 基準の画面座標）を現在のアスペクト比の配置へ変換する。 */
export function buildPlacementsFromPreset(
  players: readonly PresetPlayerInput[],
  aspectRatio: AspectRatio,
): readonly FormationPlacement[] {
  const isVertical = isVerticalAspectRatio(aspectRatio);
  return players.map((pp) => {
    const raw = { x: pp.x, y: pp.y };
    const pos = isVertical ? transformCoord(raw, '16:9', aspectRatio) : raw;
    return {
      shirtNo: pp.shirtNo,
      position: pp.position,
      x: clampToScreenNorm(pos.x),
      y: clampToScreenNorm(pos.y),
    };
  });
}
```

#### Task 1.3: `[ADD]` `src/lib/tactical/engine/eraser-hit-test.ts`
```ts
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';

interface Point {
  readonly x: number;
  readonly y: number;
}

export const DEFAULT_ERASER_RADIUS = 4.0;

function distToSegment(p: Point, v: Point, w: Point): number {
  const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  const t = Math.max(
    0,
    Math.min(1, ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2),
  );
  return Math.hypot(
    p.x - (v.x + t * (w.x - v.x)),
    p.y - (v.y + t * (w.y - v.y)),
  );
}

function isInsidePolygon(p: Point, vs: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const { x: xi, y: yi } = vs[i];
    const { x: xj, y: yj } = vs[j];
    const crosses =
      yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

function isNearPolyline(
  pts: readonly Point[],
  p: Point,
  r: number,
  closed: boolean,
): boolean {
  if (pts.some((pt) => Math.hypot(pt.x - p.x, pt.y - p.y) <= r)) return true;
  const count = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < count; i++) {
    if (distToSegment(p, pts[i], pts[(i + 1) % pts.length]) <= r) return true;
  }
  return false;
}

/**
 * 指点（ScreenNorm 0〜100）と半径に当たる矢印・ゾーン・テキストの ID を返す純粋関数。
 * ロック中のエンティティは対象外。削除は DELETE_ENTITIES 命令で行う。
 */
export function findEraseTargetIds(
  slide: DomainSlide,
  point: Point,
  radius: number = DEFAULT_ERASER_RADIUS,
): readonly string[] {
  const ids: string[] = [];

  for (const a of slide.arrows) {
    if (!a.locked && isNearPolyline(a.points, point, radius, false)) {
      ids.push(a.id);
    }
  }

  for (const z of slide.zones) {
    if (z.locked) continue;
    if (z.shapeType === 'polygon') {
      if (
        isNearPolyline(z.points, point, radius, true) ||
        isInsidePolygon(point, z.points)
      ) {
        ids.push(z.id);
      }
      continue;
    }
    const inBox =
      point.x >= z.x - radius &&
      point.x <= z.x + z.width + radius &&
      point.y >= z.y - radius &&
      point.y <= z.y + z.height + radius;
    if (inBox) ids.push(z.id);
  }

  for (const t of slide.texts) {
    if (!t.locked && Math.hypot(t.x - point.x, t.y - point.y) <= radius) {
      ids.push(t.id);
    }
  }

  return ids;
}
```

#### Task 1.4: `[MODIFY]` `src/lib/tactical/__tests__/acl-presets.test.ts`
**Before (import 部 L2-L6)**
```ts
import {
  applyFormationPresetToSlide,
  type FormationSlotPreset,
  projectFormationSlotsToScreenNorm,
} from '@/lib/tactical/acl/formation-translator';
```
**After**
```ts
import {
  buildFormationPlacements,
  buildPlacementsFromPreset,
} from '@/lib/tactical/acl/formation-placements';
import {
  applyFormationPlacementsToSlide,
  applySingleTeamFormationToSlide,
  type FormationPlacement,
} from '@/lib/tactical/acl/formation-translator';
```
**Before (投影テスト 2 件の先頭 3 行。ここから `it('applyFormationPresetToSlide:` の直前までの 2 件の `it` をまとめて削除する)**
```ts
  it('projectFormationSlotsToScreenNorm: projects slots for home team in full pitch mode correctly', () => {
  it('projectFormationSlotsToScreenNorm: projects slots for away team in full pitch mode correctly', () => {
```
**After**
```ts
// (上記 2 件の `it` ブロックをそれぞれ閉じ括弧 `});` まで完全に削除する。置換後のコメント行は残さない)
```
**Before (it 名)**
```ts
  it('applyFormationPresetToSlide: applies formation to slide players and sends excess to bench', () => {
```
**After**
```ts
  it('applyFormationPlacementsToSlide: applies placements to team players and sends excess to bench', () => {
```
**Before (呼び出し)**
```ts
    // Apply preset with only 1 slot
    const slots: FormationSlotPreset[] = [
      { shirtNo: '1', position: 'GK', x: 10, y: 50 },
    ];

    const nextSlide = applyFormationPresetToSlide(
      initialSlide,
      slots,
      'home',
      'full',
    );
```
**After**
```ts
    // Apply placements with only 1 slot
    const slots: FormationPlacement[] = [
      {
        shirtNo: '1',
        position: 'GK',
        x: toScreenNormPoint(10, 50).x,
        y: toScreenNormPoint(10, 50).y,
      },
    ];

    const nextSlide = applyFormationPlacementsToSlide(
      initialSlide,
      slots,
      'home',
      (team, i) => `new-${team}-${i}`,
    );
```
**Before (期待座標)**
```ts
    expect(homePitch[0].x).toBeCloseTo(10.4);
```
**After**
```ts
    expect(homePitch[0].x).toBeCloseTo(10);
```
**末尾追記（ファイル末尾の最後の `});` の後ろに 2 つの `describe` を追加。既存 `describe` は変更しない）**
```ts
describe('Formation Placements ACL', () => {
  it('buildFormationPlacements: 4-3-3 は 11 人分・GK は自陣ゴール前に固定される', () => {
    const home = buildFormationPlacements('4-3-3', 'home', 'full', {
      aspectRatio: '16:9',
    });
    expect(home).toHaveLength(11);
    expect(home[0].position).toBe('GK');
    expect(home[0].x).toBeCloseTo(7);
    const away = buildFormationPlacements('4-3-3', 'away', 'full', {
      aspectRatio: '16:9',
    });
    expect(away[0].x).toBeCloseTo(93);
  });

  it('buildFormationPlacements: サイド入れ替え時は座標が反転する', () => {
    const swapped = buildFormationPlacements('4-3-3', 'home', 'full', {
      aspectRatio: '16:9',
      isSidesSwapped: true,
    });
    expect(swapped[0].x).toBeCloseTo(93);
    expect(swapped[0].y).toBeCloseTo(50);
  });

  it('buildPlacementsFromPreset: 横画面ではそのまま、範囲外は丸められる', () => {
    const placed = buildPlacementsFromPreset(
      [{ shirtNo: '9', position: 'ST', x: 120, y: 40 }],
      '16:9',
    );
    expect(placed[0].x).toBe(100);
    expect(placed[0].y).toBe(40);
  });
});

describe('applySingleTeamFormationToSlide', () => {
  it('相手チームは全員ベンチへ、自チームは配置どおりピッチへ', () => {
    const awayPlayer: PitchPlayer = {
      id: 'away-1',
      team: 'away',
      area: 'pitch',
      x: toScreenNormPoint(70, 50).x,
      y: toScreenNormPoint(70, 50).y,
      style: {
        markerType: 'circle',
        insideContent: 'number',
        bottomLabel: 'name',
        color: '#ef4444',
        strokeColor: '#ffffff',
        strokeWidth: 2,
        sizeScale: 1,
        numberSizeScale: 1,
        labelSizeScale: 1,
      },
      connectLines: [],
      badges: [],
    };
    const slide: DomainSlide = {
      id: 's',
      index: 0,
      players: [awayPlayer],
      arrows: [],
      zones: [],
      texts: [],
      ball: {
        x: toScreenNormPoint(50, 50).x,
        y: toScreenNormPoint(50, 50).y,
        visible: true,
      },
      transitionDurationMs: 1000,
      pauseMs: 500,
      easing: 'linear',
    };
    const placements = buildFormationPlacements('4-4-2', 'home', 'full', {
      aspectRatio: '16:9',
    });
    const next = applySingleTeamFormationToSlide(
      slide,
      placements,
      'home',
      (team, i) => `new-${team}-${i}`,
    );
    expect(next.players.find((p) => p.id === 'away-1')?.area).toBe('bench');
    expect(
      next.players.filter((p) => p.team === 'home' && p.area === 'pitch'),
    ).toHaveLength(11);
  });
});
```

#### Task 1.5: `[ADD]` `src/lib/tactical/__tests__/eraser-hit-test.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import {
  clampToScreenNorm,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import { findEraseTargetIds } from '../engine/eraser-hit-test';

const arrow = (id: string, locked?: boolean) => ({
  id,
  annotationType: 'arrow' as const,
  arrowType: 'pass' as const,
  curveType: 'straight' as const,
  points: [toScreenNormPoint(10, 10), toScreenNormPoint(50, 10)],
  color: '#ffffff',
  strokeWidth: 3,
  dashArray: [],
  startMarker: 'none' as const,
  endMarker: 'arrow' as const,
  locked,
});

const rectZone = (id: string) => ({
  id,
  annotationType: 'zone' as const,
  zoneType: 'generic' as const,
  shapeType: 'rect' as const,
  x: clampToScreenNorm(20),
  y: clampToScreenNorm(60),
  width: 10,
  height: 10,
  color: '#f59e0b',
  opacity: 0.25,
  strokeWidth: 3,
});

const text = (id: string) => ({
  id,
  annotationType: 'text' as const,
  x: clampToScreenNorm(80),
  y: clampToScreenNorm(80),
  content: 't',
  fontSize: 16,
  color: '#ffffff',
  bold: false,
  italic: false,
});

const slide: DomainSlide = {
  id: 's',
  index: 0,
  players: [],
  arrows: [arrow('ar1'), arrow('ar-locked', true)],
  zones: [rectZone('z1')],
  texts: [text('t1')],
  ball: { x: clampToScreenNorm(50), y: clampToScreenNorm(50), visible: true },
  transitionDurationMs: 1000,
  pauseMs: 500,
  easing: 'linear',
};

describe('findEraseTargetIds', () => {
  it('矢印の線分上（半径内）の矢印だけを返す。ロック中は除外', () => {
    expect(findEraseTargetIds(slide, { x: 30, y: 12 })).toEqual(['ar1']);
  });

  it('ゾーンの内側・テキスト近傍を返す', () => {
    expect(findEraseTargetIds(slide, { x: 25, y: 65 })).toEqual(['z1']);
    expect(findEraseTargetIds(slide, { x: 81, y: 81 })).toEqual(['t1']);
  });

  it('何にも当たらない点・半径 0 では空配列', () => {
    expect(findEraseTargetIds(slide, { x: 50, y: 95 })).toEqual([]);
    expect(findEraseTargetIds(slide, { x: 30, y: 12 }, 0)).toEqual([]);
  });
});
```
- **Phase 1 検証**: `bun run ai:check src/lib/tactical/acl/formation-translator.ts src/lib/tactical/acl/formation-placements.ts src/lib/tactical/engine/eraser-hit-test.ts src/lib/tactical/__tests__/acl-presets.test.ts src/lib/tactical/__tests__/eraser-hit-test.test.ts`

## 4. 全 Phase 完了後（Planner）
- `rg -n "FormationSlotPreset|projectFormationSlotsToScreenNorm|applyFormationPresetToSlide|Date\.now" src/lib/tactical/acl/formation-translator.ts src/lib/tactical/__tests__/acl-presets.test.ts` ➔ 0 matches
- `GIT_EXTERNAL_DIFF=difft rtk git diff` で Before ➔ After 通りか確認 ➔ Status を `DONE` ➔ `bun run ai:commit -m "feat(tactical): add formation placement ACL and eraser hit test"`
