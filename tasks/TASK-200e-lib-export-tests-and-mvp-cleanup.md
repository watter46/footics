# TASK-200e: 描画テスト統合・`tactical-frame-renderer` & 未使用 2D レンダラ群削除・`buildExportMVPMatrix` 二重経路撤去

- **Status**: `DONE`
- **Assign**: `worker`
- **Commit**: `refactor(tactical-export): complete Wave E single-pipeline migration and remove legacy tactical-frame-renderer`
- **Execution Waves**:
  - Wave 1 (並列): Phase 1 (`scene-graph-rasterizer.test.ts` 1+1), Phase 2 (`pitch-renderer-cinematic.test.ts` 1+1), Phase 3 (`pitch-renderer-marble.test.ts` + `pitch-tilt-store.test.ts`)
  - Wave 2 (直列, Wave 1 後): Phase 4 (`canvas-pitch-transform-helper.ts` + `core/index.ts` + `tactical-frame-renderer` / 未使用 `renderers/*` / 旧レンダラテスト全削除)
- **Negative Contracts**:
  - `absent: src/lib/tactical/export/tactical-frame-renderer.ts`
  - `absent: src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts`
  - `rg(src/lib/tactical/export/,src/features/tactical-unified/panels/export/): \bprecomputedFrame\b|\bgetInterpolatedUnifiedSlideFrame\b|\brenderTacticalFrameToCanvas\b`
  - `rg(src/lib/tactical/export/video-mediabunny-export.ts,src/lib/tactical/export/video-media-recorder-export.ts,src/features/tactical-unified/panels/export/): \bbuildExportMVPMatrix\b`

---

## 1. Architectural Invariants & Design Decisions

- **Invariants (壊してはいけない前提条件)**:
  1. `src/lib/tactical/export/` と `panels/export/` から旧描画エントリポイント `renderTacticalFrameToCanvas` およびその専用レガシーサブレンダラ（`arrow-renderer`, `connect-line-renderer`, `player-cone-renderer`, `player-focus-renderer`, `player-renderer`, `player-trajectory-renderer`, `text-renderer`, `zone-renderer`）を完全撤去する。
  2. `renderer-context.ts`, `offscreen-canvas-pool.ts`, `pitch-renderer.ts`, `pitch-markings-2d.ts`, `pitch-markings-3d.ts`, `ball-renderer.ts`, `player-ring-renderer.ts` は新パイプライン（`renderTacticalPhaseFrameToCanvas` / `scene-graph-canvas2d-rasterizer`）が使用するため必ず保持する。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `scene-graph-rasterizer.test.ts` に `renderTacticalPhaseFrameToCanvas` 直接呼び出しによる `boundaryBox` クロップ・`directorCamera`・`yaw`/`tilt` テストを集約し、レガシー `tactical-frame-renderer.test.ts` / `zone-renderer.test.ts` / `player-renderer.test.ts` は `tactical-frame-renderer.ts` と同時に物理削除する（注: `zone-renderer.test.ts` がカバーしていたパルス・フロー・ゴースト軌跡ロジックで `scene-graph-rasterizer.test.ts` に未収録のケースがあれば Phase 1 へ取り込む）。
  2. Phase 4 で `canvas-pitch-transform-helper.ts` および `core/index.ts` から `buildExportMVPMatrix` と `REFERENCE_STAGE_HEIGHT` 再輸出を除去する。
- **Consumers (同期更新対象)**:
  - `canvas-pitch-transform-helper.ts`, `core/index.ts`
  - `scene-graph-rasterizer.test.ts`, `pitch-renderer-cinematic.test.ts`, `pitch-renderer-marble.test.ts`, `pitch-tilt-store.test.ts`

---

## 2. Implementation Phases

### Phase 1: `scene-graph-rasterizer.test.ts` の `renderTacticalPhaseFrameToCanvas` 一本化 (1+1)

- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/export/__tests__/scene-graph-rasterizer.test.ts` (768 lines)
- **Contract & Concrete Test Cases**:
  1. `tactical-frame-renderer` からのインポートを `@/lib/tactical/export/tactical-phase-frame-renderer`（`_resetSharedOffscreenCanvas`, `renderTacticalPhaseFrameToCanvas`）へ切り替える。
  2. 「passes when boundaryBox is provided」等のテストで旧 `renderTacticalFrameToCanvas` を呼んでいた箇所を `renderTacticalPhaseFrameToCanvas` 直接呼び出しへ置き換える。
  3. 3D `tilt` + `yaw` 投影・パルス/フロー/プレイヤーゴースト軌跡エフェクトが `renderTacticalPhaseFrameToCanvas` 経由で正しく描画されるテストケースを含める。
- **Verification**:
  - `bun run ai:check src/lib/tactical/export/__tests__/scene-graph-rasterizer.test.ts`

---

### Phase 2: `pitch-renderer-cinematic.test.ts` の移行 (1+1)

- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/export/__tests__/pitch-renderer-cinematic.test.ts` (421 lines)
- **Contract & Concrete Test Cases**:
  1. `buildExportMVPMatrix` のインポート元を `@/lib/tactical/engine/projection-3d` へ変更する。
  2. `renderTacticalFrameToCanvas` インポートを `renderTacticalPhaseFrameToCanvas`（`tactical-phase-frame-renderer.ts`）へ変更し、`forwards screenBackground` テストを `normalizePhases` 経由の `renderTacticalPhaseFrameToCanvas` 呼び出しへ更新する。
- **Verification**:
  - `bun run ai:check src/lib/tactical/export/__tests__/pitch-renderer-cinematic.test.ts`

---

### Phase 3: `pitch-renderer-marble.test.ts` と `pitch-tilt-store.test.ts` の参照切り替え

- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/export/__tests__/pitch-renderer-marble.test.ts` (190 lines)
  - `[MODIFY]` `src/features/tactical-unified/__tests__/pitch-tilt-store.test.ts` (151 lines)
- **Contract & Concrete Test Cases**:
  1. `pitch-renderer-marble.test.ts`: `renderTacticalFrameToCanvas` を `renderTacticalPhaseFrameToCanvas`（`normalizePhases` で構築した `phase` 付き）へ更新し、marble テクスチャ転送テストを維持する。
  2. `pitch-tilt-store.test.ts`: `buildExportMVPMatrix` のインポート元を `canvas-pitch-transform-helper` から `@/lib/tactical/engine/projection-3d` へ変更する（`useTacticalUnifiedStore` の撤去は Wave F で実施）。
- **Verification**:
  - `bun run ai:check src/lib/tactical/export/__tests__/pitch-renderer-marble.test.ts src/features/tactical-unified/__tests__/pitch-tilt-store.test.ts`

---

### Phase 4: `buildExportMVPMatrix` 二重定義撤去 & 旧フレームレンダラ群の物理削除

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/utils/canvas-pitch-transform-helper.ts` (213 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/index.ts` (185 lines)
  - `[DELETE]` `src/lib/tactical/export/tactical-frame-renderer.ts`
  - `[DELETE]` `src/lib/tactical/export/renderers/arrow-renderer.ts`
  - `[DELETE]` `src/lib/tactical/export/renderers/connect-line-renderer.ts`
  - `[DELETE]` `src/lib/tactical/export/renderers/player-cone-renderer.ts`
  - `[DELETE]` `src/lib/tactical/export/renderers/player-focus-renderer.ts`
  - `[DELETE]` `src/lib/tactical/export/renderers/player-renderer.ts`
  - `[DELETE]` `src/lib/tactical/export/renderers/player-trajectory-renderer.ts`
  - `[DELETE]` `src/lib/tactical/export/renderers/text-renderer.ts`
  - `[DELETE]` `src/lib/tactical/export/renderers/zone-renderer.ts`
  - `[DELETE]` `src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts`
  - `[DELETE]` `src/lib/tactical/export/__tests__/zone-renderer.test.ts`
  - `[DELETE]` `src/lib/tactical/export/renderers/__tests__/player-renderer.test.ts`
- **Contract**:
  1. `canvas-pitch-transform-helper.ts` および `core/index.ts` から `buildExportMVPMatrix` と `REFERENCE_STAGE_HEIGHT` エクスポートを削除する。
  2. 上記 `[DELETE]` 対象 12 ファイルをすべて物理削除する。
- **Concrete Test Cases**:
  - `bun run ai:check src/features/tactical-unified/core/utils/canvas-pitch-transform-helper.ts src/features/tactical-unified/core/index.ts` で型・ガードレールを通過し、Wave E Negative Contracts が満たされることを確認する。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/utils/canvas-pitch-transform-helper.ts src/features/tactical-unified/core/index.ts`
