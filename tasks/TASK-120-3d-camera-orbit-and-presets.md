# TASK-120: 3Dカメラ操作の刷新（オービット操作・Yaw対応・6大プリセットUI）

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-31
- **Target Files**:
  - `src/lib/types/tactical/slide.ts` (MODIFY)
  - `src/features/tactical-unified/stores/pitch-slice.ts` (MODIFY)
  - `src/lib/tactical/unified-interpolation.ts` (MODIFY)
  - `src/features/tactical-unified/core/utils/canvas-pitch-transform-helper.ts` (MODIFY)
  - `src/lib/tactical/export/tactical-frame-renderer.ts` (MODIFY)
  - `src/features/tactical-unified/panels/split-preview/split-preview-camera-bar.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/__tests__/pitch-tilt-store.test.ts` (MODIFY)
  - `src/lib/tactical/__tests__/unified-interpolation.test.ts` (MODIFY)
  - `src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. `PitchTransformSchema`（`src/lib/types/tactical/slide.ts`）およびストア（`pitch-slice.ts`）、補間処理（`unified-interpolation.ts`）に `yaw`（number, default `90`）が追加され、初期・リセット状態で `yaw: 90` が保持・補間されること。
- [x] 2. `buildExportMVPMatrix`（`canvas-pitch-transform-helper.ts`）で `yaw = 90` を正面（回転オフセット `0°`、4:5縦長ピッチが正面を向く状態）として `relativeYaw = 90 - (pitchTransform.yaw ?? 90)` を `CameraParams.yaw` に連携し、`tactical-frame-renderer.ts` でも `yaw !== 90` 時に3D投影行列が適用されること。
- [x] 3. `TacticalSplitPreviewPanel` の左ボタンドラッグ（Shiftなし）でオービット操作が行え、上下ドラッグで Tilt 操作（上ドラッグ `dy < 0` で Tilt 増加、下ドラッグ `dy > 0` で Tilt 減少、範囲 `0°〜70°`）、左右ドラッグで Yaw 操作（範囲 `0°〜360°` 自由回転）が動作すること。
- [x] 4. `Shift + 左ボタンドラッグ` でパン（平行移動 `panX, panY`）、マウスホイールでズーム（`0.5x 〜 2.5x`）、リセットボタンで `Tilt=0°, Yaw=90°, Zoom=1x, Pan=(0,0)` に復帰すること。
- [x] 5. `SplitPreviewCameraBar` にピッチアイコン付きの6種カメラプリセットボタン（1: `0°/90°`, 2: `15°/90°`, 3: `15°/75°`, 4: `15°/105°`, 5: `50°/80°`, 6: `50°/100°`）が配置され、ワンクリックで該当の `tilt` と `yaw` に切り替わること。

## 3. Context Snippets (参照コード・型定義・import)
<!-- Workerが自律探索（Read/Grep）を行わずに実装できるよう、必要な文脈を過不足なく事前注入する -->

### 3.1 Import Specs
```ts
// src/lib/types/tactical/slide.ts
import { z } from 'zod';

// src/features/tactical-unified/core/utils/canvas-pitch-transform-helper.ts
import { buildMVPMatrix, type CameraParams } from './matrix-mvp-engine';
import type { AspectRatio, PitchTransform } from '@/lib/types/tactical-unified';

// src/features/tactical-unified/panels/split-preview/split-preview-camera-bar.tsx
import { RotateCcw } from 'lucide-react';
```

### 3.2 Key Interfaces & Types
```ts
// src/lib/types/tactical/slide.ts
export const PitchTransformSchema = z.object({
  panX: z.number().default(0),
  panY: z.number().default(0),
  zoom: z.number().default(1),
  tilt: z.number().default(0),
  yaw: z.number().default(90).optional(),
  isLocked: z.boolean().default(true),
});
export type PitchTransform = z.infer<typeof PitchTransformSchema>;

// src/lib/tactical/unified-interpolation.ts
export interface InterpolatedPitchTransformState {
  panX: number;
  panY: number;
  zoom: number;
  tilt: number;
  yaw: number;
  isLocked: boolean;
}

// src/features/tactical-unified/panels/split-preview/split-preview-camera-bar.tsx
export interface CameraPreset {
  id: string;
  label: string;
  tilt: number;
  yaw: number;
}
export const SPLIT_CAMERA_PRESETS: readonly CameraPreset[] = [
  { id: 'top-down', label: 'トップダウン（完全平面・縦向き）', tilt: 0, yaw: 90 },
  { id: 'shallow-front', label: '浅い俯瞰（正面）', tilt: 15, yaw: 90 },
  { id: 'shallow-right', label: '浅い斜め（右向き）', tilt: 15, yaw: 75 },
  { id: 'shallow-left', label: '浅い斜め（左向き）', tilt: 15, yaw: 105 },
  { id: 'dynamic-right', label: 'ダイナミック斜め（右向き）', tilt: 50, yaw: 80 },
  { id: 'dynamic-left', label: 'ダイナミック斜め（左向き）', tilt: 50, yaw: 100 },
] as const;

export interface SplitPreviewCameraBarProps {
  tilt: number;
  yaw: number;
  zoom: number;
  panX: number;
  panY: number;
  onSelectPreset: (preset: { tilt: number; yaw: number }) => void;
  onResetCamera: () => void;
}
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```ts
// 1. PitchTransformSchema の yaw は z.number().default(90).optional() とすることで、
//    スキーマ parse 時は default(90) を保証しつつ、既存テストの PitchTransform リテラル（yaw省略）の型互換性を維持する。
// 2. buildExportMVPMatrix (canvas-pitch-transform-helper.ts) では:
//    const relativeYaw = 90 - (pitchTransform.yaw ?? 90);
//    を CameraParams.yaw に渡す（yaw=90 のとき relativeYaw=0 で4:5縦長ピッチが正面、yaw=75 で +15 -> 時計回り15°、yaw=105 で -15 -> 反時計回り15°）。
// 3. tactical-split-preview-panel.tsx の左ドラッグ ( !e.shiftKey ):
//    - 上ドラッグ (dy < 0) で Tilt 増加、下ドラッグ (dy > 0) で Tilt 減少:
//      clampTilt(currentTilt - dy * 0.25) -> [0, 70] にクランプ
//    - 左右ドラッグ (dx) で Yaw 旋回:
//      normalizeYaw(currentYaw + dx * 0.4) -> (((val % 360) + 360) % 360) で [0, 360) に正規化
//    - Shift + 左ドラッグ ( e.shiftKey ) のときのみ panX: currentPanX + dx, panY: currentPanY + dy を更新。
// 4. Level 3 パネルコンポーネントとして useTacticalUnifiedStoreContext 経由で状態を取得し、'use client' を維持すること。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: PitchTransform スキーマ・ストア・補間・MVP行列の Yaw 連携
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/types/tactical/slide.ts`, `src/features/tactical-unified/stores/pitch-slice.ts`, `src/lib/tactical/unified-interpolation.ts`, `src/features/tactical-unified/core/utils/canvas-pitch-transform-helper.ts`, `src/features/tactical-unified/__tests__/pitch-tilt-store.test.ts`, `src/lib/tactical/__tests__/unified-interpolation.test.ts`
- **契約 (Interface)**:
  ```ts
  // buildExportMVPMatrix 内で cameraParams に yaw: 90 - (pitchTransform.yaw ?? 90) を設定
  export function buildExportMVPMatrix(
    pitchTransform: PitchTransform,
    exportWidth: number,
    exportHeight: number,
    aspectRatio?: AspectRatio,
    referenceHeight?: number,
  ): mat4;
  ```
- **Testing Strategy**:
  - `src/features/tactical-unified/__tests__/pitch-tilt-store.test.ts`: `updatePitchTransform` で `yaw` が更新・保持され、`centerPitchAndBoundary` で `yaw: 90` にリセットされること、`buildExportMVPMatrix` で `yaw: 90` と `yaw: 75` / `105` の行列変化を検証。
  - `src/lib/tactical/__tests__/unified-interpolation.test.ts`: `interpolatePitchTransform` で `yaw` が線形補間（未指定時はデフォルト `90`）されることを検証。
- **Tasks**:
  - [x] 1. TDD実装: テスト追加 ➔ `slide.ts`, `pitch-slice.ts`, `unified-interpolation.ts`, `canvas-pitch-transform-helper.ts` 実装 ➔ `bun run ai:check src/lib/types/tactical/slide.ts src/features/tactical-unified/stores/pitch-slice.ts src/lib/tactical/unified-interpolation.ts src/features/tactical-unified/core/utils/canvas-pitch-transform-helper.ts src/features/tactical-unified/__tests__/pitch-tilt-store.test.ts src/lib/tactical/__tests__/unified-interpolation.test.ts` PASS
- **Worker Handoff Log**:
  - `PitchTransformSchema` に `yaw: z.number().default(90).optional()` を追加、`buildExportMVPMatrix` に `relativeYaw = 90 - (pitchTransform.yaw ?? 90)` を連携し `InterpolatedPitchTransformState.yaw` の線形補間を完全担保。

### Phase 2: 3Dカメラオービット操作・6大プリセットUI・レンダラーYaw有効化
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/tactical/export/tactical-frame-renderer.ts`, `src/features/tactical-unified/panels/split-preview/split-preview-camera-bar.tsx`, `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx`, `src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx`
- **契約 (Interface)**:
  ```ts
  export function SplitPreviewCameraBar(props: SplitPreviewCameraBarProps): React.JSX.Element;
  export function TacticalSplitPreviewPanel(): React.JSX.Element;
  ```
- **Testing Strategy**:
  - `src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx`:
    - 6種のプリセットボタンクリックで対応する `{ tilt, yaw }` が更新されること。
    - キャンバス上の通常左ドラッグ（上ドラッグ `dy < 0` で Tilt 増加、下ドラッグ `dy > 0` で Tilt 減少 `0〜70`、左右ドラッグ `dx` で Yaw `0〜360` 変化）が動作すること。
    - `Shift + 左ドラッグ` で `panX, panY` が更新されること。
    - ホイールで `zoom` (`0.5〜2.5`)、リセットボタンで `{ tilt: 0, yaw: 90, zoom: 1, panX: 0, panY: 0 }` に復帰すること。
- **Tasks**:
  - [x] 1. TDD実装: `tactical-split-preview-panel.test.tsx` 更新 ➔ `tactical-frame-renderer.ts`, `split-preview-camera-bar.tsx`, `tactical-split-preview-panel.tsx` 実装 ➔ `bun run ai:check src/lib/tactical/export/tactical-frame-renderer.ts src/features/tactical-unified/panels/split-preview/split-preview-camera-bar.tsx src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx` PASS
- **Worker Handoff Log**:
  - `SPLIT_CAMERA_PRESETS`（6大プリセット）とピッチアイコン付きバーを新設し、キャンバスドラッグ（Shiftなし: 0〜70° Tilt / 0〜360° Yaw オービット、Shiftあり: Pan）およびレンダラーの `yaw !== 90` 3D投影を完全適用。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-31 01:43
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  3Dオービット操作（上下Tilt・左右Yaw）・6大カメラプリセットUI（ピッチアイコン付き）・MVP行列/レンダラーのYaw連携（90°正面規約）・スライド補間が要件通り実装され、StoreProvider規律・ホスト境界・テスタビリティを完全に満たしていることを確認。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
