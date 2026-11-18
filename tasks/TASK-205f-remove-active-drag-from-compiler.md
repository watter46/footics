# TASK-205f: コンパイラ層からの `activeDragDelta` 完全撤去

- **Status**: `DONE`
- **Commit**: `refactor(tactical): remove EphemeralDragDelta and effective-coordinates from scene compiler`
- **Execution Waves**:
  - Wave 1: Phase 1 (sequential)
  - Wave 2: Phase 2 (sequential after Wave 1)
  - Wave 3: Phase 3, Phase 4 (parallel after Wave 2)
- **Negative Contracts**:
  - `rg: activeDragDelta|setActiveDragDelta|EphemeralDragDelta|resolveEffectiveScreenNormPos`
  - `absent: src/lib/tactical/compiler/effective-coordinates.ts`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. `compileSceneGraph` は常に純粋関数として `EvaluatedTimelineFrame` の座標を基準にゾーン・コネクト線・矢印・軌道・ビルボードアイテムを生成すること。
  2. `pitchTransform`（3D傾き・ズーム・パン）がある環境でも、確定後のスライド座標に対して追従矢印・ベジェ軌道・コントロールハンドルが投影前平面でオフセット生成された後に 3D 投影されること。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `EphemeralDragDelta`、`EphemeralSessionState.activeDragDelta`、`effective-coordinates.ts`（`resolveEffectiveScreenNormPos`）を完全に削除し、新旧併用を残さない。
  2. コンパイラテストで `activeDragDelta` を用いて検証していた「スライド移動後の軌道・追従矢印・制御点計算」は、移動後の `DomainSlide` 座標を用いた検証へ置き換える。
- **Consumers (同期更新対象)**:
  - `src/lib/tactical/compiler/compile-zones.ts`
  - `src/lib/tactical/compiler/compile-billboards.ts`
  - `src/lib/tactical/compiler/compile-arrows.ts`
  - `src/lib/tactical/compiler/compile-scene-graph.ts`

## 2. Implementation Phases

### Phase 1: DTO / `effective-coordinates` 削除と `compileZones` / `compileBillboardItems` 整理
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/compiler/scene-graph-dto.ts` (L1-L30)
  - `[DELETE]` `src/lib/tactical/compiler/effective-coordinates.ts`
  - `[MODIFY]` `src/lib/tactical/compiler/compile-zones.ts` (L17-L114)
  - `[MODIFY]` `src/lib/tactical/compiler/compile-billboards.ts` (L46-L238)
- **Contract**:
  ```ts
  // scene-graph-dto.ts
  export interface EphemeralSessionState {
    readonly activePhaseId: string;
    readonly activeSlideId: string;
    readonly selectedIds: readonly string[];
  }
  ```
  - 振る舞い仕様・境界条件:
    1. `scene-graph-dto.ts` から `EphemeralDragDelta` と `EphemeralSessionState.activeDragDelta` を削除する。
    2. `effective-coordinates.ts` を物理削除する。
    3. `compileZones` と `compileBillboardItems` から `activeDrag` / `dragDx` / `dragDy` および `resolveEffectiveScreenNormPos` 呼び出しを削除し、`toScreenNormPoint(pos.x, pos.y, false)` 相当（スライド基準座標そのまま）を使用する。
- **Concrete Test Cases**:
  - Phase 3, Phase 4 のコンパイラテストで検証。
- **Verification**:
  - `bun run ai:check src/lib/tactical/compiler/scene-graph-dto.ts src/lib/tactical/compiler/compile-zones.ts src/lib/tactical/compiler/compile-billboards.ts`

### Phase 2: `compileArrows` と `compileSceneGraph` からの `activeDragDelta` 削除
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/compiler/compile-arrows.ts` (L69-L145)
  - `[MODIFY]` `src/lib/tactical/compiler/compile-scene-graph.ts` (L15-L215)
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `compileArrows` から `activeDrag` / `draggedIds` / `dragDx` / `dragDy` を削除し、矢印の `points` および `controlPoint` をそのまま `screenNormToStagePixel` へ渡す。
    2. `compileTrajectories`（`compile-scene-graph.ts`）から `effective-coordinates` の import および `resolveEffectiveScreenNormPos` 呼び出しを削除し、`frame.slide.ball` 座標を直接用いる。
- **Concrete Test Cases**:
  - Phase 3, Phase 4 のコンパイラテストで検証。
- **Verification**:
  - `bun run ai:check src/lib/tactical/compiler/compile-arrows.ts src/lib/tactical/compiler/compile-scene-graph.ts`

### Phase 3: コンパイラ単体テスト 3 ファイルの更新
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/__tests__/compile-scene-graph.test.ts` (L145-L178)
  - `[MODIFY]` `src/lib/tactical/compiler/__tests__/compile-arrows-tilt.test.ts` (L177-L235)
  - `[MODIFY]` `src/lib/tactical/compiler/__tests__/compile-trajectories-drag.test.ts` (L66-L105)
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `compile-scene-graph.test.ts`: `applies activeDragDelta without mutating input frame` を、入力 `frame` / `slide` をミューテーションせず純粋に `ResolvedSceneGraphDTO` を出力する検証（または `selectedIds` 反映の非破壊検証）へ更新する。
    2. `compile-arrows-tilt.test.ts`: case 3 は `p1` の座標を `dx=+10, dy=-10` 動かした `DomainSlide` を評価したときに `sourcePlayerId` 矢印の投影始点が追従し固定終点が不変であることを検証する。
    3. `compile-trajectories-drag.test.ts`: case 1 は `currSlide` の `p1` と `ball` の座標を `dx=+10` 動かした状態で `compileSceneGraph` が移動先終点の `trajectories` を生成することを検証する。
- **Concrete Test Cases**:
  - 上記 3 ファイルの更新済みテストケースがすべて PASS すること。
- **Verification**:
  - `bun run ai:check src/lib/tactical/__tests__/compile-scene-graph.test.ts src/lib/tactical/compiler/__tests__/compile-arrows-tilt.test.ts src/lib/tactical/compiler/__tests__/compile-trajectories-drag.test.ts`

### Phase 4: `scene-compiler.test.ts` の更新（300行超テスト単独Phase）
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/compiler/__tests__/scene-compiler.test.ts` (L119-L165, L359-L413)
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. テスト 3（`applies activeDragDelta to ball and text`）を、更新後の座標（移動したボール・テキスト）が `billboardItems` へ反映される検証へ更新（または `activeDragDelta` 削除）。
    2. テスト 8（`keeps controlHandlePx on the curve when activeDragDelta moves the arrow`）を、移動後の矢印（`points` と `controlPoint` を平行移動した矢印）に対して `controlHandlePx` が曲線上 `t=0.5` と一致する検証へ更新する。
- **Concrete Test Cases**:
  - `src/lib/tactical/compiler/__tests__/scene-compiler.test.ts`:
    - `case 1`: テスト 1〜8 すべてが `EphemeralDragDelta` なしで PASS すること。
- **Verification**:
  - `bun run ai:check src/lib/tactical/compiler/__tests__/scene-compiler.test.ts`
