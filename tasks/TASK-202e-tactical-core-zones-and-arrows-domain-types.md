# TASK-202e: Core Zones & Arrows コンポーネント群の Domain 型直和型化

- **Status**: `DONE`
- **Commit**: `refactor(tactical): migrate core zone and arrow Konva components to DomainZoneAnnotation and DomainArrowAnnotation`
- **Execution Waves**:
  - Wave 1 (parallel): Phase 1, Phase 2, Phase 3
  - Wave 2 (parallel): Phase 4, Phase 5
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/core/components/zones,src/features/tactical-unified/core/components/annotations): \b(ZoneAnnotation|ArrowAnnotation|Player)\b`
  - `rg(src/features/tactical-unified/core/components/zones): isComplete`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. `DomainZoneAnnotation` は `RectZone | EllipseZone | PolygonZone` の `shapeType` 直和型であり、旧型の `isComplete` フィールドを持たない。
  2. `DomainArrowAnnotation` の `points` / `controlPoint` および `PolygonZone` の `points` / `RectZone` の `x, y` は `ScreenNormCoord` / `ScreenNormPoint`（`clampToScreenNorm` / `toScreenNormPoint` 生成）を使用する。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `use-zone-polygon.ts` の `isComplete` 算出は `zone.isComplete !== false` を廃止し、`const isComplete = !isCreatingThis;` とする（作成中プレビュー以外は常に確定ポリゴンとして扱う）。
  2. `computeZoneShapeMetrics` は `zone.shapeType === 'polygon'` で早期リターン（またはバウンディング算出）し、`rect` / `ellipse` 分岐で安全に `zone.x`, `zone.y`, `zone.width`, `zone.height`, `zone.rotation` を参照する。
  3. `computeTransformedZonePatch` は `Partial<RectZone | EllipseZone>` 互換（`x`, `y`, `width`, `height`, `rotation`）を返す。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/core/components/zones/*`
  - `src/features/tactical-unified/core/components/annotations/*`
  - `zone-object-components.test.ts`, `zone-features.test.ts`, `arrow-object-interaction.test.tsx`

## 2. Implementation Phases

### Phase 1: Zone 幾何計算・Hooks・ポリゴンハンドルの直和型移行
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/zones/zone-geometry.ts` (91 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/components/zones/use-zone-shape.ts` (120 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/components/zones/use-zone-polygon.ts` (90 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/components/zones/ZonePolygonHandles.tsx` (142 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/domain-entities.ts` (L98-L133)
  - `src/lib/types/tactical/branded.ts`
- **Contract**:
  ```ts
  export function computeZoneShapeMetrics(
    zone: DomainZoneAnnotation,
    width: number,
    height: number,
  ): ZoneShapeMetrics;
  export function computeTransformedZonePatch(
    node: Konva.Shape,
    pxW: number,
    pxH: number,
    width: number,
    height: number,
  ): Partial<RectZone | EllipseZone>;
  ```
  - 振る舞い仕様・境界条件:
    1. `ZoneAnnotation` をすべて `DomainZoneAnnotation`（または `PolygonZone` / `RectZone | EllipseZone`）へ置換する。
    2. `use-zone-polygon.ts` で `zone.isComplete !== false` を `!isCreatingThis` へ変更し、ドラッグ更新座標に `toScreenNormPoint` / `clampToScreenNorm` を適用する。
- **Concrete Test Cases**:
  - Phase 2 の `zone-object-components.test.ts` で `computeTransformedZonePatch` とハンドル描画を検証する。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/zones/zone-geometry.ts src/features/tactical-unified/core/components/zones/use-zone-shape.ts src/features/tactical-unified/core/components/zones/use-zone-polygon.ts src/features/tactical-unified/core/components/zones/ZonePolygonHandles.tsx`

### Phase 2: `ZonePolygonNode.tsx` & `zone-object-components.test.ts` 移行（大型テスト 1+1 特例）
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/zones/ZonePolygonNode.tsx` (99 lines)
  - `[MODIFY]` `src/features/tactical-unified/__tests__/zone-object-components.test.ts` (371 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/domain-entities.ts`
  - `src/lib/types/tactical/branded.ts`
- **Contract**:
  - `ZonePolygonNode.tsx` の `ZoneNodeProps` を `PolygonZone`（または `DomainZoneAnnotation`）へ移行する。
  - `zone-object-components.test.ts` の `ZoneAnnotation` フィクスチャを `RectZone` / `EllipseZone` / `PolygonZone`（`isComplete` なし、`toScreenNormCoord` / `toScreenNormPoint` 使用）へ更新する。
- **Concrete Test Cases**:
  - `zone-object-components.test.ts`: Rect / Ellipse / Polygon の各 `resolvedZone` 描画・Transform 同期・`computeTransformedZonePatch` が全通過すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/zones/ZonePolygonNode.tsx src/features/tactical-unified/__tests__/zone-object-components.test.ts`

### Phase 3: `zone-features.test.ts` の Domain スキーマ移行
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/__tests__/zone-features.test.ts` (280 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/domain-entities.ts`
- **Contract**:
  - `ZoneAnnotationSchema` を `DomainZoneAnnotationSchema`（および `RectZoneSchema`）へ置換し、必須の `shapeType: 'rect'` / `x` / `y` / `width` / `height` 入力に対するデフォルト値検証（`strokeWidth: 3`, `strokeOpacity: 1`）へ更新する。
- **Concrete Test Cases**:
  - `zone-features.test.ts`: Domain ゾーン作成・更新・補間・コンパイルの全テストが通過すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/__tests__/zone-features.test.ts`

### Phase 4: Arrow 幾何計算・ライン・ハンドル基礎の Domain 型移行
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/annotations/arrow-geometry.ts` (259 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/components/annotations/arrow-line-node.tsx` (136 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/components/annotations/arrow-handles-group.tsx` (61 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/components/annotations/arrow-start-handle.tsx` (96 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/domain-entities.ts`
  - `src/lib/types/tactical/branded.ts`
- **Contract**:
  - `arrow-geometry.ts` の `Player` 参照を `DomainPlayer` へ変更する。
  - `arrow-line-node.tsx`, `arrow-handles-group.tsx`, `arrow-start-handle.tsx` の `ArrowAnnotation` を `DomainArrowAnnotation` へ置換し、座標パッチ生成に `toScreenNormPoint` / `clampToScreenNorm` を使用する。
- **Concrete Test Cases**:
  - Phase 5 の `arrow-object-interaction.test.tsx` でハンドルドラッグ・本体ドラッグを検証する。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/annotations/arrow-geometry.ts src/features/tactical-unified/core/components/annotations/arrow-line-node.tsx src/features/tactical-unified/core/components/annotations/arrow-handles-group.tsx src/features/tactical-unified/core/components/annotations/arrow-start-handle.tsx`

### Phase 5: Arrow 終点・制御点・本体 & `arrow-object-interaction.test.tsx` 移行
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/annotations/arrow-end-handle.tsx` (99 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/components/annotations/arrow-control-points.tsx` (118 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/components/annotations/ArrowObject.tsx` (184 lines)
  - `[MODIFY]` `src/features/tactical-unified/__tests__/arrow-object-interaction.test.tsx` (254 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/domain-entities.ts`
  - `src/lib/types/tactical/branded.ts`
- **Contract**:
  - `ArrowAnnotation` を `DomainArrowAnnotation` へ全面置換し、ドラッグ時の座標パッチは `ScreenNormPoint` として更新する。
- **Concrete Test Cases**:
  - `arrow-object-interaction.test.tsx`: 制御点ドラッグ、波線矢印終点ドラッグ、本体平行移動の4テストケースが全通過すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/annotations/arrow-end-handle.tsx src/features/tactical-unified/core/components/annotations/arrow-control-points.tsx src/features/tactical-unified/core/components/annotations/ArrowObject.tsx src/features/tactical-unified/__tests__/arrow-object-interaction.test.tsx`
