# TASK-211a: Delete Dead Tactical UI Modules, Empty Directories, and Dependent Tests

- **Status**: `DONE`
- **Commit**: `refactor(tactical): remove dead tactical-unified modules, empty dirs, and unused barrels`
- **Execution Waves**:
  - Wave 1: Phase 1, Phase 2, Phase 3, Phase 4, Phase 5 (parallel)
- **Negative Contracts**:
  - `absent: src/features/tactical-unified/hooks/tactical-animation-canvas.ts`
  - `absent: src/features/tactical-unified/hooks/__tests__/tactical-animation-canvas.test.ts`
  - `absent: src/features/tactical-unified/core/components/annotations/arrow-geometry.ts`
  - `absent: src/features/tactical-unified/core/components/annotations/wavy-arrow-math.ts`
  - `absent: src/features/tactical-unified/core/components/player-ghost-trajectory-list.tsx`
  - `absent: src/features/tactical-unified/core/components/toolbar-tools.ts`
  - `absent: src/features/tactical-unified/core/hooks/use-canvas-pointer-drawing.ts`
  - `absent: src/features/tactical-unified/core/utils/boundary-box-drag-helper.ts`
  - `absent: src/features/tactical-unified/panels/toolbar/top-header.tsx`
  - `absent: src/features/tactical-unified/panels/toolbar/drawing-toolbar-icons.tsx`
  - `absent: src/features/tactical-unified/components/export-page-view.tsx`
  - `absent: src/features/tactical-unified/panels/right-panel/bench-player-row.tsx`
  - `absent: src/features/tactical-unified/panels/right-panel/bench-swap-selector.tsx`
  - `absent: src/features/tactical-unified/panels/right-panel/formation-bench-section.tsx`
  - `absent: src/features/tactical-unified/panels/right-panel/formation-bench-item.tsx`
  - `absent: src/features/tactical-unified/panels/right-panel/formation-bench-add-form.tsx`
  - `absent: src/features/tactical-unified/panels/right-panel/formation-batch-display.tsx`
  - `absent: src/lib/tactical/index.ts`
  - `absent: src/features/tactical-unified/utils/__tests__/canvas-frame-renderer.test.ts`
  - `absent: src/features/tactical-unified/utils/__tests__/geometry-and-viewport.test.ts`
  - `rg: tactical-animation-canvas|arrow-geometry|wavy-arrow-math|PlayerGhostTrajectoryList|BenchSwapSelector|FormationBenchAddForm`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. `src/features/tactical-unified/index.ts`, `core/index.ts`, `core/components/hud/index.ts`, `core/components/toolbar/index.ts`, `panels/toolbar/index.ts` のアクティブバレルは削除せず、`tactical-barrel-exports.test.ts` を引き続きパスさせる。
  2. `src/lib/tactical/effect-geometry.ts` および `src/lib/tactical/compiler/geometry-primitives.ts` は現行の稼働コードであり、削除しない。
  3. 移設対象の 2 テスト（`canvas-frame-renderer.test.ts`, `geometry-and-viewport.test.ts`）はテスト内容を削らず本来の対象モジュール配下へ移動する。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. 空ディレクトリ（`core/store/`, `tactical-unified/types/`）およびテスト移設後に空になる `tactical-unified/utils/` は `rmdir` / `rm -rf` でワークスペースからも削除する。
  2. 既存機能（`computeArrowDimensions` や `trimRenderPoints`）のテストは削除された旧ファイルを参照させず、現行正本（`geometry-primitives.ts` とインライン座標配列）へ接続する。
- **Consumers (同期更新対象)**:
  - `src/lib/tactical/__tests__/effect-geometry.test.ts`
  - `src/features/tactical-unified/__tests__/pitch-bench-transition.test.ts`
  - `src/features/tactical-unified/panels/right-panel/__tests__/squad-panel-step5.test.tsx`

## 2. Implementation Phases

### Phase 1: Delete Dead Core/Hook/View Files, Dead Test, and Relocate `utils/__tests__`
- **Target Files**:
  - `[DELETE]` `src/features/tactical-unified/hooks/tactical-animation-canvas.ts`
  - `[DELETE]` `src/features/tactical-unified/hooks/__tests__/tactical-animation-canvas.test.ts`
  - `[DELETE]` `src/features/tactical-unified/core/components/annotations/arrow-geometry.ts`
  - `[DELETE]` `src/features/tactical-unified/core/components/annotations/wavy-arrow-math.ts`
  - `[DELETE]` `src/features/tactical-unified/core/components/player-ghost-trajectory-list.tsx`
  - `[DELETE]` `src/features/tactical-unified/core/components/toolbar-tools.ts`
  - `[DELETE]` `src/features/tactical-unified/core/hooks/use-canvas-pointer-drawing.ts`
  - `[DELETE]` `src/features/tactical-unified/core/utils/boundary-box-drag-helper.ts`
  - `[DELETE]` `src/features/tactical-unified/panels/toolbar/top-header.tsx`
  - `[DELETE]` `src/features/tactical-unified/panels/toolbar/drawing-toolbar-icons.tsx`
  - `[DELETE]` `src/features/tactical-unified/components/export-page-view.tsx`
  - `[ADD]` `src/lib/tactical/export/renderers/__tests__/canvas-frame-renderer.test.ts` (~120 lines)
  - `[ADD]` `src/features/tactical-unified/core/utils/__tests__/geometry-and-viewport.test.ts` (~113 lines)
  - `[DELETE]` `src/features/tactical-unified/utils/__tests__/canvas-frame-renderer.test.ts`
  - `[DELETE]` `src/features/tactical-unified/utils/__tests__/geometry-and-viewport.test.ts`
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/utils/__tests__/canvas-frame-renderer.test.ts`
  - `src/features/tactical-unified/utils/__tests__/geometry-and-viewport.test.ts`
- **Contract**:
  - `canvas-frame-renderer.test.ts` を `src/lib/tactical/export/renderers/__tests__/` へ移設する（`@/` エイリアス使用のため import 修正不要か確認し調整）。
  - `geometry-and-viewport.test.ts` を `src/features/tactical-unified/core/utils/__tests__/` へ移設し、`../../core/utils/...` の相対 import を `../...` に更新する。
  - 空ディレクトリ `src/features/tactical-unified/core/store/`, `src/features/tactical-unified/types/`, `src/features/tactical-unified/utils/` を削除する。
- **Concrete Test Cases**:
  - 移設した 2 テストの全ケース（3 cases in `canvas-frame-renderer.test.ts`、7 cases in `geometry-and-viewport.test.ts`）が新パスでそのまま PASS すること。
- **Verification**:
  - `bun run ai:check src/lib/tactical/export/renderers/__tests__/canvas-frame-renderer.test.ts src/features/tactical-unified/core/utils/__tests__/geometry-and-viewport.test.ts`

### Phase 2: Re-point `effect-geometry.test.ts` Away from Deleted Annotation Math
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/__tests__/effect-geometry.test.ts` (L1-L18, L240-L286)
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/compiler/geometry-primitives.ts`
  - `src/lib/tactical/effect-geometry.ts`
- **Contract**:
  ```ts
  // computeArrowDimensions の正本 import 先
  import { computeArrowDimensions } from '@/lib/tactical/compiler/geometry-primitives';
  ```
  1. 削除された `annotations/arrow-geometry` からの `computeArrowDimensions` import を `@/lib/tactical/compiler/geometry-primitives` に差し替える。
  2. 削除された `annotations/wavy-arrow-math` からの `getWavyPoints` import を削除する。
  3. `trimRenderPoints` の `isWavy: true` テスト（L242-L262）では `getWavyPoints(0, 0, 100, 0)` の代わりに、始点 `(0, 0)`・終点 `(100, 0)` の決定論的なジグザグ `NormalizedPoint[]` フィクスチャ（例: 8〜10点の `{ x, y }` 配列）を直接定義して `trimRenderPoints(rawWavy, 0.5, true)` を検証する。
- **Concrete Test Cases**:
  - `src/lib/tactical/__tests__/effect-geometry.test.ts`:
    - `computeArrowDimensions`: 1200px / 600px ステージでの寸法算出が `geometry-primitives.ts` 経由で PASS。
    - `trimRenderPoints`: `isWavy: true` で先端角度平滑化・終端2点の主方向整列が PASS。
- **Verification**:
  - `bun run ai:check src/lib/tactical/__tests__/effect-geometry.test.ts`

### Phase 3: Remove Dead `PlayerGhostTrajectoryList` Block from `pitch-bench-transition.test.ts`
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/__tests__/pitch-bench-transition.test.ts` (L1-L25, L415-L480)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/components/pitch-ground-ghosts.tsx`
- **Contract**:
  1. 削除された `../core/components/player-ghost-trajectory-list` の import を削除する。
  2. `describe('PlayerGhostTrajectoryList', ...)` ブロック（L418-L476）を削除する（直後の `PitchGroundLayer` テスト L477-L602 および上位の `resolveHudTarget` / `ContextHud` / store テストはすべて維持する）。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/__tests__/pitch-bench-transition.test.ts`:
    - 残存の全ケース（`findSafePitchPosition`, `movePlayerToPitch`, `movePlayerToBench`, `PlayerLayer`, `resolveHudTarget`, `ContextHud`, `PitchGroundLayer`）がすべて PASS。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/__tests__/pitch-bench-transition.test.ts`

### Phase 4: Delete Superseded Right-Panel DOM Bench Components & Update `squad-panel-step5.test.tsx`
- **Target Files**:
  - `[DELETE]` `src/features/tactical-unified/panels/right-panel/bench-player-row.tsx`
  - `[DELETE]` `src/features/tactical-unified/panels/right-panel/bench-swap-selector.tsx`
  - `[DELETE]` `src/features/tactical-unified/panels/right-panel/formation-bench-section.tsx`
  - `[DELETE]` `src/features/tactical-unified/panels/right-panel/formation-bench-item.tsx`
  - `[DELETE]` `src/features/tactical-unified/panels/right-panel/formation-bench-add-form.tsx`
  - `[DELETE]` `src/features/tactical-unified/panels/right-panel/formation-batch-display.tsx`
  - `[MODIFY]` `src/features/tactical-unified/panels/right-panel/__tests__/squad-panel-step5.test.tsx` (L28-L40, L390-L465)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/panels/right-panel/squad-sub-panel.tsx`
  - `src/features/tactical-unified/panels/right-panel/squad-sub-form.tsx`
- **Contract**:
  1. `squad-panel-step5.test.tsx` から削除対象 `BenchSwapSelector` と `FormationBenchAddForm` の import（L31-L32）および該当の `it(...)` 2ケース（L392-L421, L445-L462）を削除する。
  2. `SquadSubPanel` の 8 テストおよび `SquadSubForm` のテスト（L423-L443）はすべて維持する（注: `squad-panel-step5.test.tsx` 内の `vi.mock` 除去は後続 `TASK-211c` で実施）。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/panels/right-panel/__tests__/squad-panel-step5.test.tsx`:
    - `SquadSubPanel` 8ケース + `SquadSubForm` 1ケースが PASS。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/right-panel/__tests__/squad-panel-step5.test.tsx`

### Phase 5: Delete Unused Barrel `index.ts` Files
- **Target Files**:
  - `[DELETE]` `src/lib/tactical/index.ts`
  - `[DELETE]` `src/features/tactical-unified/panels/timeline/index.ts`
  - `[DELETE]` `src/features/tactical-unified/panels/export/index.ts`
  - `[DELETE]` `src/features/tactical-unified/panels/dialogs/index.ts`
  - `[DELETE]` `src/features/tactical-unified/objects/player/index.ts`
  - `[DELETE]` `src/features/tactical-unified/objects/player/components/index.ts`
  - `[DELETE]` `src/features/tactical-unified/objects/ball/index.ts`
  - `[DELETE]` `src/features/tactical-unified/objects/ball/hooks/index.ts`
  - `[DELETE]` `src/features/tactical-unified/objects/ball/components/index.ts`
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/__tests__/tactical-barrel-exports.test.ts`
- **Contract**:
  - 本番コード・テストの双方から未参照の 9 バレル `index.ts` のみを削除し、アクティブバレル（`tactical-unified/index.ts`, `core/index.ts`, `panels/toolbar/index.ts` 等）は変更しない。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/__tests__/tactical-barrel-exports.test.ts`: 全4ケースが引き続き PASS。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/__tests__/tactical-barrel-exports.test.ts`
