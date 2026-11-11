# TASK-178a: 戦術ボードDDD移行(1/7): Branded座標空間と単一所有権・直和型ドメインスキーマの新設

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-12
- **Target Files**:
  - `src/lib/types/tactical/branded.ts` (CREATE)
  - `src/lib/tactical/engine/coordinates.ts` (CREATE)
  - `src/lib/types/tactical/domain-entities.ts` (CREATE)
  - `src/lib/types/tactical/domain-hierarchy.ts` (CREATE)
  - `src/lib/tactical/__tests__/branded-coordinates.test.ts` (CREATE)
  - `src/lib/tactical/__tests__/domain-schemas.test.ts` (CREATE)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. `src/lib/types/tactical/branded.ts` に Branded Types (`ScreenNormCoord`, `PitchNormCoord`, `StagePixel`, `Milliseconds`, `ScreenNormPoint`, `PitchNormPoint`, `StagePixelPoint`) と Smart Constructors (`clampToScreenNorm`, `toScreenNormCoord`, `toScreenNormPoint`, `toPitchNormPoint`, `toStagePixelPoint`, `toMilliseconds`) が定義されていること
- [x] 2. `src/lib/tactical/engine/coordinates.ts` に空間変換純粋関数 (`pitchNormToScreenNorm`, `screenNormToPitchNorm`, `screenNormToStagePixel`, `stagePixelToScreenNorm`) が実装され、React / Konva / Zustand への依存がゼロであること
- [x] 3. `src/lib/types/tactical/domain-entities.ts` に判別可能な直和型 `DomainPlayer = PitchPlayer | BenchPlayer`（`BenchPlayer` は `visionCone`, `connectLines`, `badges`, `focus`, `trajectory`, `trajectoryEffect`, `markerEffect` を型・スキーマともに保持不可）、`DomainZoneAnnotation = RectZone | EllipseZone | PolygonZone`（`shapeType` 判別・`isComplete` 排除）、および `startMarker` / `endMarker` に統一した `DomainArrowAnnotation`（`arrowHead` 排除）が Zod スキーマから導出されていること
- [x] 4. `src/lib/types/tactical/domain-hierarchy.ts` に単一所有権階層 `DomainTacticalProject > DomainTacticalPhase > DomainSlide` が定義され、`DomainTacticalProject` に `activePhaseId`, `activeSlideId`, `aspectRatio`, `boundaryBox`, `backgroundType`, `backgroundImageUrl`, `slides` ゲッターが存在せず、`DomainSlide` に `aspectRatio`, `boundaryBox`, `backgroundType`, `backgroundImageUrl`, `pitchAppearance` が存在しないこと

## 2.5 Architectural Invariants & Why (破壊禁止の前提と設計理由)
<!-- ちゃぶ台返し防止の前提条件と、影響を受ける呼び出し元（Consumers）の同期確認リストを明記する -->
- **Invariants (破壊禁止の不変条件と理由)**:
  1. **6コンテキスト配置（Context 1: Document & Roster / Context 2: Slide Entities / Context 4: Spatial Engine）**: 本タスクのすべてのファイルは Functional Core に属し、React / Konva / DOM / Zustand / Canvas2D を一切 import してはならない。すべてのドメイン型は `readonly` プレーンデータかつ JSON シリアライズ可能であること。
  2. **座標空間の Branded Type 化**: 素の `{ x: number, y: number }` の混同による座標ズレをコンパイルレベルで防止するため、`ScreenNormPoint`, `PitchNormPoint`, `StagePixelPoint` を Branded Types で厳格に区別する。
  3. **Parallel Core 無破壊原則**: 後続の `TASK-178b`〜`TASK-178g` で段階的に載せ替えるため、本タスクでは既存の `src/lib/types/tactical/{player,annotations,slide,project}.ts` の公開型を破壊せず、新設モジュールとして独立構築して `bun run ai:check` を 100% GREEN に保つこと。
- **Consumers (呼び出し元・別画面の同期確認リスト)**:
  - `src/lib/types/tactical/primitives.ts` — `AspectRatioSchema`, `ASPECT_RATIOS` 等の基本列挙型を参照元として利用
  - `src/lib/types/tactical/slide.ts` — `BoundaryBoxSchema`, `PitchTransformSchema`, `PitchAppearanceConfigSchema`, `ScreenBackgroundConfigSchema`, `EasingSchema`, `CameraTransitionModeSchema` を参照元として利用

## 3. Context Snippets (参照コード・型定義・import)
<!-- Workerが自律探索（Read/Grep）を行わずに実装できるよう、必要な文脈を過不足なく事前注入する -->

### 3.1 Import Specs
```ts
import { z } from 'zod';
import { FORMATION_LIST } from '@/lib/data/formations';
import {
  type AspectRatio,
  AspectRatioSchema,
} from '@/lib/types/tactical/primitives';
import {
  ArrowEffectConfigSchema,
  ZoneEffectConfigSchema,
} from '@/lib/types/tactical/annotations';
import {
  ConnectLineSchema,
  MarkerEffectConfigSchema,
  MarkerStyleSchema,
  PlayerBadgeSchema,
  PlayerFocusSchema,
  PlayerTrajectoryEffectConfigSchema,
  VisionConeSchema,
} from '@/lib/types/tactical/player';
import {
  BoundaryBoxSchema,
  CameraTransitionModeSchema,
  DEFAULT_PITCH_APPEARANCE,
  DEFAULT_SCREEN_BACKGROUND,
  EasingSchema,
  PitchAppearanceConfigSchema,
  PitchTransformSchema,
  ScreenBackgroundConfigSchema,
} from '@/lib/types/tactical/slide';
import {
  DirectorCameraTrackSchema,
  TeamColorSchema,
} from '@/lib/types/tactical/project';
```

### 3.2 Key Interfaces & Types
```ts
// src/lib/tactical/pitch-geometry.ts のピッチ枠計算仕様との整合
export interface StageViewport {
  readonly width: number;
  readonly height: number;
  readonly offsetX?: number;
  readonly offsetY?: number;
}
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```ts
// Zod + Branded Type の標準パターン
export type ScreenNormCoord = number & { readonly __brand: 'ScreenNormCoord' };
export const ScreenNormCoordSchema = z
  .number()
  .transform((v) => clampToScreenNorm(v));
```

## 4. Implementation Phases (Worker 実装手順)
<!-- 1〜4ファイルは1 Phase一括、5ファイル以上は1 Phase最大4ファイル（テスト含め6ファイル）以下に分割、15ファイル超は連番タスク（TASK-XXXa, TASK-XXXb）に分割 -->

### Phase 1: Branded Coordinates と空間座標変換エンジン (Context 1 & 4)
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/types/tactical/branded.ts`, `src/lib/tactical/engine/coordinates.ts`, `src/lib/tactical/__tests__/branded-coordinates.test.ts`
- **契約 (Exact Contract & Formula)**:
  ```ts
  // 1. src/lib/types/tactical/branded.ts
  export type ScreenNormCoord = number & { readonly __brand: 'ScreenNormCoord' };
  export type PitchNormCoord = number & { readonly __brand: 'PitchNormCoord' };
  export type StagePixel = number & { readonly __brand: 'StagePixel' };
  export type Milliseconds = number & { readonly __brand: 'Milliseconds' };

  export interface ScreenNormPoint {
    readonly x: ScreenNormCoord;
    readonly y: ScreenNormCoord;
  }
  export interface PitchNormPoint {
    readonly x: PitchNormCoord;
    readonly y: PitchNormCoord;
  }
  export interface StagePixelPoint {
    readonly x: StagePixel;
    readonly y: StagePixel;
  }

  export const SCREEN_NORM_MIN = -15;
  export const SCREEN_NORM_MAX = 115;

  export function clampToScreenNorm(
    val: number,
    min: number = SCREEN_NORM_MIN,
    max: number = SCREEN_NORM_MAX,
  ): ScreenNormCoord {
    const safe = Number.isFinite(val) ? val : 50;
    return Math.max(min, Math.min(max, safe)) as ScreenNormCoord;
  }

  export function toScreenNormCoord(val: number): ScreenNormCoord {
    return (Number.isFinite(val) ? val : 0) as ScreenNormCoord;
  }
  export function toPitchNormCoord(val: number): PitchNormCoord {
    const safe = Number.isFinite(val) ? val : 50;
    return Math.max(0, Math.min(100, safe)) as PitchNormCoord;
  }
  export function toStagePixel(val: number): StagePixel {
    return (Number.isFinite(val) ? val : 0) as StagePixel;
  }
  export function toMilliseconds(val: number): Milliseconds {
    return Math.max(0, Number.isFinite(val) ? val : 0) as Milliseconds;
  }

  export function toScreenNormPoint(x: number, y: number, clamp = true): ScreenNormPoint {
    return {
      x: clamp ? clampToScreenNorm(x) : toScreenNormCoord(x),
      y: clamp ? clampToScreenNorm(y) : toScreenNormCoord(y),
    };
  }
  export function toPitchNormPoint(x: number, y: number): PitchNormPoint {
    return { x: toPitchNormCoord(x), y: toPitchNormCoord(y) };
  }
  export function toStagePixelPoint(x: number, y: number): StagePixelPoint {
    return { x: toStagePixel(x), y: toStagePixel(y) };
  }

  export const ScreenNormCoordSchema = z.number().transform((v) => clampToScreenNorm(v));
  export const UnclampedScreenNormCoordSchema = z.number().transform((v) => toScreenNormCoord(v));
  export const ScreenNormPointSchema = z.object({
    x: ScreenNormCoordSchema,
    y: ScreenNormCoordSchema,
  });

  // 2. src/lib/tactical/engine/coordinates.ts
  // ピッチ枠（16:9スクリーン内のピッチ論理矩形）とステージピクセル間の双方向純粋変換
  export interface PitchFrameBoundsNorm {
    readonly left: number;   // default 6
    readonly top: number;    // default 6
    readonly width: number;  // default 88
    readonly height: number; // default 88
  }
  export const DEFAULT_PITCH_FRAME_BOUNDS: PitchFrameBoundsNorm = {
    left: 6,
    top: 6,
    width: 88,
    height: 88,
  };

  export function pitchNormToScreenNorm(
    pt: PitchNormPoint,
    bounds: PitchFrameBoundsNorm = DEFAULT_PITCH_FRAME_BOUNDS,
  ): ScreenNormPoint {
    return toScreenNormPoint(
      bounds.left + (pt.x / 100) * bounds.width,
      bounds.top + (pt.y / 100) * bounds.height,
    );
  }

  export function screenNormToPitchNorm(
    pt: ScreenNormPoint,
    bounds: PitchFrameBoundsNorm = DEFAULT_PITCH_FRAME_BOUNDS,
  ): PitchNormPoint {
    const rawX = bounds.width > 0 ? ((pt.x - bounds.left) / bounds.width) * 100 : 50;
    const rawY = bounds.height > 0 ? ((pt.y - bounds.top) / bounds.height) * 100 : 50;
    return toPitchNormPoint(rawX, rawY);
  }

  export function screenNormToStagePixel(
    pt: ScreenNormPoint,
    viewport: StageViewport,
  ): StagePixelPoint {
    const ox = viewport.offsetX ?? 0;
    const oy = viewport.offsetY ?? 0;
    return toStagePixelPoint(
      ox + (pt.x / 100) * viewport.width,
      oy + (pt.y / 100) * viewport.height,
    );
  }

  export function stagePixelToScreenNorm(
    pt: StagePixelPoint,
    viewport: StageViewport,
    clamp = true,
  ): ScreenNormPoint {
    const ox = viewport.offsetX ?? 0;
    const oy = viewport.offsetY ?? 0;
    const rawX = viewport.width > 0 ? ((pt.x - ox) / viewport.width) * 100 : 50;
    const rawY = viewport.height > 0 ? ((pt.y - oy) / viewport.height) * 100 : 50;
    return toScreenNormPoint(rawX, rawY, clamp);
  }
  ```
- **Testing Strategy (Concrete Test Values)**:
  - `src/lib/tactical/__tests__/branded-coordinates.test.ts`:
    - `clampToScreenNorm(150)` ➔ `115`, `clampToScreenNorm(-30)` ➔ `-15`, `clampToScreenNorm(Number.NaN)` ➔ `50`
    - `pitchNormToScreenNorm(toPitchNormPoint(50, 50))` ➔ `{ x: 50, y: 50 }` (`left:6, width:88` の中央)
    - `screenNormToStagePixel(toScreenNormPoint(50, 25), { width: 1000, height: 800, offsetX: 100, offsetY: 50 })` ➔ `{ x: 600, y: 250 }`
    - `stagePixelToScreenNorm(toStagePixelPoint(600, 250), { width: 1000, height: 800, offsetX: 100, offsetY: 50 })` ➔ `{ x: 50, y: 25 }`
- **Tasks**:
  - [x] 1. TDD実装: `rtk vitest run src/lib/tactical/__tests__/branded-coordinates.test.ts` (RED) ➔ `branded.ts` & `coordinates.ts` 実装 ➔ `bun run ai:check src/lib/types/tactical/branded.ts src/lib/tactical/engine/coordinates.ts src/lib/tactical/__tests__/branded-coordinates.test.ts` PASS
- **Worker Handoff Log**:
  - `ScreenNormCoord`, `PitchNormCoord`, `StagePixel`, `Milliseconds` と対応する Smart Constructors / Zod スキーマ、および双方向空間変換関数（`pitchNormToScreenNorm`, `screenNormToPitchNorm`, `screenNormToStagePixel`, `stagePixelToScreenNorm`）を外部依存ゼロで確定 export。


---

### Phase 2: 直和型エンティティと単一所有権階層スキーマ (Context 1 & 2)
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/types/tactical/domain-entities.ts`, `src/lib/types/tactical/domain-hierarchy.ts`, `src/lib/tactical/__tests__/domain-schemas.test.ts`
- **契約 (Exact Contract & Formula)**:
  ```ts
  // 1. src/lib/types/tactical/domain-entities.ts
  // (a) Player 直和型: PitchPlayer | BenchPlayer
  const BasePlayerFields = {
    id: z.string(),
    playerId: z.string().optional(),
    name: z.string().optional(),
    shirtNo: z.string().optional(),
    position: z.string().optional(),
    team: z.enum(['home', 'away', 'neutral']),
    x: ScreenNormCoordSchema,
    y: ScreenNormCoordSchema,
    style: MarkerStyleSchema,
    locked: z.boolean().optional(),
    isCustom: z.boolean().optional(),
  };

  export const DomainPlayerTrajectorySchema = z.object({
    type: z.enum(['straight', 'arc_left', 'arc_right', 'custom']).default('straight'),
    curveOffset: z.number().optional(),
    controlPoint: ScreenNormPointSchema.optional(),
  });

  export const PitchPlayerSchema = z
    .object({
      ...BasePlayerFields,
      area: z.literal('pitch'),
      visionCone: VisionConeSchema.optional(),
      connectLines: z.array(ConnectLineSchema).default([]),
      badges: z.array(PlayerBadgeSchema).default([]),
      focus: PlayerFocusSchema.optional(),
      trajectory: DomainPlayerTrajectorySchema.optional(),
      trajectoryEffect: PlayerTrajectoryEffectConfigSchema.optional(),
      markerEffect: MarkerEffectConfigSchema.optional(),
    })
    .strict();

  export const BenchPlayerSchema = z
    .object({
      ...BasePlayerFields,
      area: z.literal('bench'),
    })
    .strict();

  export const DomainPlayerSchema = z.discriminatedUnion('area', [
    PitchPlayerSchema,
    BenchPlayerSchema,
  ]);
  export type PitchPlayer = Readonly<z.infer<typeof PitchPlayerSchema>>;
  export type BenchPlayer = Readonly<z.infer<typeof BenchPlayerSchema>>;
  export type DomainPlayer = PitchPlayer | BenchPlayer;

  // (b) ZoneAnnotation 直和型: RectZone | EllipseZone | PolygonZone (isComplete 排除)
  const BaseZoneFields = {
    id: z.string(),
    annotationType: z.literal('zone').default('zone'),
    zoneType: z
      .enum(['highlight', 'space', 'danger', 'pressing', 'buildup', 'generic'])
      .default('generic'),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#f59e0b'),
    opacity: z.number().min(0).max(1).default(0.25),
    strokeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    strokeOpacity: z.number().min(0).max(1).default(1).optional(),
    strokeWidth: z.number().min(0).max(8).default(3),
    label: z.string().max(200).optional(),
    locked: z.boolean().optional(),
    effect: ZoneEffectConfigSchema.optional(),
  };

  export const RectZoneSchema = z.object({
    ...BaseZoneFields,
    shapeType: z.literal('rect'),
    x: ScreenNormCoordSchema,
    y: ScreenNormCoordSchema,
    width: z.number().positive(),
    height: z.number().positive(),
    rotation: z.number().optional(),
  });

  export const EllipseZoneSchema = z.object({
    ...BaseZoneFields,
    shapeType: z.literal('ellipse'),
    x: ScreenNormCoordSchema,
    y: ScreenNormCoordSchema,
    width: z.number().positive(),
    height: z.number().positive(),
    rotation: z.number().optional(),
  });

  export const PolygonZoneSchema = z.object({
    ...BaseZoneFields,
    shapeType: z.literal('polygon'),
    points: z.array(ScreenNormPointSchema).min(3),
  });

  export const DomainZoneAnnotationSchema = z.discriminatedUnion('shapeType', [
    RectZoneSchema,
    EllipseZoneSchema,
  ]).or(PolygonZoneSchema);
  // ※ z.discriminatedUnion('shapeType', [RectZoneSchema, EllipseZoneSchema, PolygonZoneSchema]) で定義すること

  export type RectZone = Readonly<z.infer<typeof RectZoneSchema>>;
  export type EllipseZone = Readonly<z.infer<typeof EllipseZoneSchema>>;
  export type PolygonZone = Readonly<z.infer<typeof PolygonZoneSchema>>;
  export type DomainZoneAnnotation = RectZone | EllipseZone | PolygonZone;

  // (c) ArrowAnnotation (arrowHead 廃止、startMarker / endMarker 統一)
  export const ArrowMarkerTypeSchema = z.enum(['none', 'arrow', 'dot']);
  export const DomainArrowAnnotationSchema = z
    .object({
      id: z.string(),
      annotationType: z.literal('arrow').default('arrow'),
      arrowType: z
        .enum(['pass', 'move', 'dribble', 'defend', 'run', 'line', 'route_line', 'generic'])
        .default('pass'),
      curveType: z.enum(['straight', 'curved', 'arc']).default('straight'),
      points: z.array(ScreenNormPointSchema).min(2),
      controlPoint: ScreenNormPointSchema.optional(),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#ffffff'),
      strokeWidth: z.number().min(1).max(10).default(3),
      dashArray: z.array(z.number()).default([]),
      startMarker: ArrowMarkerTypeSchema.default('none'),
      endMarker: ArrowMarkerTypeSchema.default('arrow'),
      label: z.string().max(200).optional(),
      sourcePlayerId: z.string().optional(),
      targetPlayerId: z.string().optional(),
      locked: z.boolean().optional(),
      effect: ArrowEffectConfigSchema.optional(),
    })
    .strict();
  export type DomainArrowAnnotation = Readonly<z.infer<typeof DomainArrowAnnotationSchema>>;

  // (d) Ball & Text (Branded ScreenNormCoord 適用)
  export const DomainBallStateSchema = z.object({
    x: ScreenNormCoordSchema,
    y: ScreenNormCoordSchema,
    visible: z.boolean().default(true),
    color: z.string().optional(),
    trajectory: DomainPlayerTrajectorySchema.optional(),
  });
  export type DomainBallState = Readonly<z.infer<typeof DomainBallStateSchema>>;

  export const DomainTextAnnotationSchema = z.object({
    id: z.string(),
    annotationType: z.literal('text').default('text'),
    x: ScreenNormCoordSchema,
    y: ScreenNormCoordSchema,
    content: z.string().max(10000),
    fontSize: z.number().min(8).max(72).default(16),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#ffffff'),
    bold: z.boolean().default(false),
    italic: z.boolean().default(false),
    locked: z.boolean().optional(),
  });
  export type DomainTextAnnotation = Readonly<z.infer<typeof DomainTextAnnotationSchema>>;

  // 2. src/lib/types/tactical/domain-hierarchy.ts
  // 単一所有権階層: DomainTacticalProject > DomainTacticalPhase > DomainSlide
  export const DomainSlideSchema = z
    .object({
      id: z.string(),
      index: z.number().int().min(0),
      label: z.string().max(200).optional(),
      players: z.array(DomainPlayerSchema).default([]),
      arrows: z.array(DomainArrowAnnotationSchema).default([]),
      zones: z.array(DomainZoneAnnotationSchema).default([]),
      texts: z.array(DomainTextAnnotationSchema).default([]),
      ball: DomainBallStateSchema.default({
        x: clampToScreenNorm(50),
        y: clampToScreenNorm(50),
        visible: true,
      }),
      transitionDurationMs: z.number().min(100).max(30000).default(1000),
      pauseMs: z.number().min(0).max(10000).default(500),
      easing: EasingSchema.default('ease-in-out'),
      cameraTransitionMode: CameraTransitionModeSchema.default('sync').optional(),
      cameraDurationMs: z.number().min(500).max(60000).default(10000).optional(),
      pitchTransform: PitchTransformSchema.optional(),
      isSidesSwapped: z.boolean().optional(),
    })
    .strict();
  export type DomainSlide = Readonly<z.infer<typeof DomainSlideSchema>>;

  export const DomainTacticalPhaseSchema = z
    .object({
      id: z.string(),
      name: z.string().min(1).max(200),
      aspectRatio: AspectRatioSchema.default('4:5'),
      boundaryBox: BoundaryBoxSchema,
      backgroundType: z.enum(['pitch', 'image', 'blank']).default('pitch'),
      backgroundImageUrl: z.string().optional(),
      directorCamera: DirectorCameraTrackSchema.optional(),
      slides: z.array(DomainSlideSchema).min(1),
    })
    .strict();
  export type DomainTacticalPhase = Readonly<z.infer<typeof DomainTacticalPhaseSchema>>;

  export const DomainTacticalProjectSchema = z
    .object({
      id: z.string(),
      version: z.literal('3.0.0').default('3.0.0'),
      title: z.string().max(500).optional(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
      homeColor: TeamColorSchema.default({ primary: '#034694' }),
      awayColor: TeamColorSchema.default({ primary: '#ef4444' }),
      pitchAppearance: PitchAppearanceConfigSchema.default(DEFAULT_PITCH_APPEARANCE),
      screenBackground: ScreenBackgroundConfigSchema.default(DEFAULT_SCREEN_BACKGROUND),
      phases: z.array(DomainTacticalPhaseSchema).min(1),
      matchId: z.string().optional(),
      matchFormations: z
        .object({
          home: z.enum(FORMATION_LIST),
          away: z.enum(FORMATION_LIST),
        })
        .optional(),
      tags: z.array(z.string()).default([]),
      thumbnail: z.string().optional(),
      screenshotSourceUrl: z.string().optional(),
    })
    .strict();
  export type DomainTacticalProject = Readonly<z.infer<typeof DomainTacticalProjectSchema>>;
  ```
- **Testing Strategy (Concrete Test Values)**:
  - `src/lib/tactical/__tests__/domain-schemas.test.ts`:
    - `BenchPlayerSchema.safeParse({ ...basePlayer, area: 'bench', connectLines: [] })` ➔ `success: false` (`strict()` によりベンチ選手のピッチ専用属性混入を拒否)
    - `DomainZoneAnnotationSchema.safeParse({ id: 'z1', shapeType: 'polygon', points: [{x:10,y:10},{x:20,y:20}] })` ➔ `success: false` (3頂点未満のポリゴンを拒否)
    - `DomainArrowAnnotationSchema.safeParse({ ...arrow, arrowHead: true })` ➔ `success: false` (`arrowHead` 重複属性を拒否)
    - `DomainSlideSchema.safeParse({ ...slide, aspectRatio: '16:9' })` ➔ `success: false` (`Slide` への階層重複属性混入を拒否)
    - `DomainTacticalProjectSchema.safeParse({ ...project, activeSlideId: 's1' })` ➔ `success: false` (`Project` への UI セッション状態混入を拒否)
- **Tasks**:
  - [x] 1. TDD実装: `rtk vitest run src/lib/tactical/__tests__/domain-schemas.test.ts` (RED) ➔ `domain-entities.ts` & `domain-hierarchy.ts` 実装 ➔ `bun run ai:check src/lib/types/tactical/domain-entities.ts src/lib/types/tactical/domain-hierarchy.ts src/lib/tactical/__tests__/domain-schemas.test.ts` PASS
- **Worker Handoff Log**:
  - `DomainPlayer` (`PitchPlayer` / `BenchPlayer`), `DomainZoneAnnotation` (`RectZone` / `EllipseZone` / `PolygonZone`), `DomainArrowAnnotation`, `DomainBallState`, `DomainTextAnnotation`, `DomainSlide`, `DomainTacticalPhase`, `DomainTacticalProject` スキーマおよび型を確定 export。UI状態や重複属性を完全排除。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-12 01:35
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. ドメイン論理 & 要件網羅性 & テスタビリティ: 数式/座標/状態遷移の整合性、受入要件の全網羅、Concrete Test Values検証、ハック排除
  - [x] 2. Invariants保護 & Consumer同期: Section 2.5 の不変条件（ちゃぶ台返し防止）遵守、別画面・呼び出し元（Consumers）の更新漏れゼロ
  - [x] 3. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 4. 設計負債 & サイレント破壊防止: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、公開シグネチャ保護、指示外変更の排除
- **Summary**:
  Branded Types、空間変換純粋関数、直和型エンティティ、単一所有権階層の厳格なZodスキーマが外部副作用ゼロで構築されており、受入要件・不変条件（Invariants）を完全充足。既存コードへの破壊的影響も一切なし。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
