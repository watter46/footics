# TASK-211d: Eliminate Internal `vi.mock` from Tactical Export Tests

- **Status**: `TODO`
- **Commit**: `test(tactical): replace internal vi.mock in export tests with real canvas and renderer integration`
- **Execution Waves**:
  - Wave 1: Phase 1, Phase 2, Phase 3 (parallel)
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/panels/export/__tests__/export-modal-body.test.tsx): vi\.mock\(`
  - `rg(src/features/tactical-unified/panels/export/__tests__/export-modal.test.tsx): vi\.mock\(`
  - `rg(src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts): vi\.mock\(`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. プロダクションコード（`export-modal-body.tsx`, `export-modal.tsx`, `use-export-preview-animation.ts`, `tactical-phase-frame-renderer.ts`）へのテスト用分岐や optional 引数の追加は禁止する。
  2. jsdom で未実装のブラウザ API 境界（`HTMLCanvasElement.prototype.getContext`, `HTMLCanvasElement.prototype.toBlob`, `URL.createObjectURL` / `revokeObjectURL`, `ResizeObserver`）のみスパイ/スタブし、内部モジュール（`ExportPreviewPlayer`, `konva-export-helpers`, `tactical-phase-frame-renderer`）の `vi.mock` を完全除去する。
  3. 既存の全アサーション対象（cinematic 背景伝播、全画面スタイル・境界クロップ・ZIP 4x エクスポート、Cinematic マスク・クロップ・再生/シーク動作）を維持する。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. Canvas 2D コンテキストスタブは `renderTacticalPhaseFrameToCanvas` が呼び出す主要 2D API（`save`, `restore`, `fillRect`, `strokeRect`, `clearRect`, `beginPath`, `closePath`, `moveTo`, `lineTo`, `bezierCurveTo`, `quadraticCurveTo`, `arc`, `ellipse`, `rect`, `clip`, `fill`, `stroke`, `fillText`, `strokeText`, `measureText`, `translate`, `scale`, `rotate`, `setTransform`, `resetTransform`, `drawImage`, `createLinearGradient`, `createRadialGradient`, `setLineDash`, `getLineDash`）を備え、`fillStyle` や呼び出し引数をスパイ可能にする。
  2. `export-modal.test.tsx` の ZIP エクスポート検証は、`konva-export-helpers` をモックする代わりに実 `exportAllSlidesZip`（`fflate.zipSync` + `renderSlideToPngBlob` + `downloadBlob`）を実行させ、生成キャンバスの解像度（`4x`）や `URL.createObjectURL` / `HTMLAnchorElement.prototype.click` 呼び出し（`.zip` ダウンロード）で検証する。
- **Consumers (同期更新対象)**:
  - テストファイルのみの変更のためプロダクション Consumer 変更なし

## 2. Implementation Phases

### Phase 1: De-mock `export-modal-body.test.tsx`
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/export/__tests__/export-modal-body.test.tsx` (L1-L108)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/panels/export/export-modal-body.tsx`
  - `src/features/tactical-unified/panels/export/export-preview-player.tsx`
- **Contract**:
  1. `vi.mock('../export-preview-player', ...)` を完全削除する。
  2. `HTMLCanvasElement.prototype.getContext` に 2D コンテキストスタブを `vi.spyOn` で注入して本物の `ExportPreviewPlayer` を描画させる。
  3. `screenBackground: { type: 'cinematic' }` が `ExportPreviewPlayer` 内の `renderTacticalPhaseFrameToCanvas` まで伝播した証拠を、実 `<canvas>` 要素の存在および 2D コンテキストのグラデーション/背景描画（例: `createRadialGradient` または `fillRect` の呼び出し）で確認する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/panels/export/__tests__/export-modal-body.test.tsx`:
    - `passes project.screenBackground to ExportPreviewPlayer`: 本物の `ExportPreviewPlayer` が `<canvas>` を描画し、cinematic 背景描画が実行されること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/export/__tests__/export-modal-body.test.tsx`

### Phase 2: De-mock `export-modal.test.tsx`
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/export/__tests__/export-modal.test.tsx` (L1-L206)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/panels/export/export-modal.tsx`
  - `src/features/tactical-unified/panels/export/use-export-modal-state.ts`
  - `src/features/tactical-unified/hooks/konva-slide-export.ts`
- **Contract**:
  1. `vi.mock('@/features/tactical-unified/hooks/konva-export-helpers', ...)` を完全削除する。
  2. ブラウザ境界のみスタブする:
     - `HTMLCanvasElement.prototype.getContext`: `createMock2DContext()`（`createLinearGradient`, `createRadialGradient`, `quadraticCurveTo`, `bezierCurveTo`, `rect` 等も網羅）
     - `HTMLCanvasElement.prototype.toBlob`: コールバックへ `new Blob(['png'], { type: 'image/png' })` を渡す
     - `URL.createObjectURL` / `URL.revokeObjectURL` および `HTMLAnchorElement.prototype.click` を `vi.spyOn` でスパイ（jsdom navigation 警告回避）
  3. 4x ZIP 出力テストでは、実 `exportAllSlidesZip` 経由で生成された `<canvas>` の幅・高さ（1x 基準の4倍、`7680x4320` 等）または `createObjectURL` へ渡された ZIP `Blob`・anchor `download` 属性（`.zip`）を検証する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/panels/export/__tests__/export-modal.test.tsx`:
    - 全画面スタイル、Boundary Cropped バッジ＋アスペクト比連動、下部バーから ZIP + 4x 選択して実エクスポート実行が PASS。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/export/__tests__/export-modal.test.tsx`

### Phase 3: De-mock `use-export-preview-animation.test.ts`
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts` (L1-L650)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts`
  - `src/lib/tactical/export/tactical-phase-frame-renderer.ts`
  - `src/lib/tactical/export/renderers/offscreen-canvas-pool.ts`
- **Contract**:
  1. `vi.mock('@/lib/tactical/export/tactical-phase-frame-renderer', ...)` を完全削除する。
  2. `mockContext`（およびオフスクリーン用途で呼ばれる場合は `HTMLCanvasElement.prototype.getContext`）に `renderTacticalPhaseFrameToCanvas` が利用する 2D 描画メソッド一式を備えさせ、実レンダラを動作させる。
  3. これまで `vi.mocked(renderTacticalPhaseFrameToCanvas).mock.calls` を検証していたアサーションを、以下の実挙動検証へ置き換える:
     - **描画呼び出し有無 / 回数**: `mockContext.save` / `mockContext.drawImage` / `mockContext.fillRect` の呼び出し変化（例: スライド変化・シーク・再生フレーム更新時の再描画カウント増加）
     - **Cinematic マスク**: `fillStyle` へ `CINEMATIC_MASK_FILL` が設定されて `fillRect` が呼ばれたこと、またはマスク境界矩形の `fillRect` 呼び出し
     - **アスペクト比 / クロップ寸法**: `mockCanvas.width` / `mockCanvas.height`・`resolveExportPreviewCropInfo`・`ctx.drawImage` の転送元/先矩形・`timeLabelRef` / `sliderRef` の値更新
- **Concrete Test Cases**:
  - `src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts`:
    - 全アスペクト比クロップ、Cinematic マスク描画、シーク/時刻クランプ、再生トグルの全既存シナリオが実 `renderTacticalPhaseFrameToCanvas` 接続で PASS。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts`
