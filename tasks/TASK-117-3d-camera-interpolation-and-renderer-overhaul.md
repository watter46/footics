# TASK-117: 3Dカメラ動的補間・透視投影描画エンジンの抜本改修（大理石台形投影・深度ソート・解像度非依存パン）

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-30
- **Target Files**:
  - `src/lib/tactical/unified-interpolation.ts` (MODIFY)
  - `src/features/tactical-unified/core/utils/canvas-pitch-transform-helper.ts` (MODIFY)
  - `src/lib/tactical/__tests__/unified-interpolation.test.ts` (MODIFY)
  - `src/features/tactical-unified/__tests__/pitch-tilt-export.test.ts` (MODIFY)
  - `src/lib/tactical/export/tactical-frame-renderer.ts` (MODIFY)
  - `src/lib/tactical/export/renderers/pitch-renderer.ts` (MODIFY)
  - `src/lib/tactical/export/renderers/player-renderer.ts` (MODIFY)
  - `src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts` (MODIFY)
  - `src/lib/tactical/export/video-mediabunny-export.ts` (MODIFY)
  - `src/features/tactical-unified/components/use-share-page-export.ts` (MODIFY)
  - `src/features/tactical-unified/__tests__/video-export.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. **スライド間カメラ補間 (`interpolatePitchTransform`)**: `getInterpolatedUnifiedSlideFrame(slides, timeMs)` が前後スライドの `pitchTransform`（`panX`, `panY`, `zoom`, `tilt`, `isLocked`）をイージング係数 `ease` に基づいて線形補間し、`frame.pitchTransform` として返却すること。
- [x] 2. **解像度非依存のカメラパン計算**: `buildExportMVPMatrix(pitchTransform, exportWidth, exportHeight, aspectRatio, referenceHeight = 360)` において、`panX` / `panY` を `exportHeight / referenceHeight` 倍にスケーリングして `buildMVPMatrix` に渡し、プレビュー（高さ360px）とフルHD動画（高さ1080px）でカメラのパン位置が完全一致すること。
- [x] 3. **毎フレーム動的 MVP 行列生成**: `renderTacticalFrameToCanvas` が `options.pitchTransformOverride ?? frame.pitchTransform` を評価し、`mvpMatrix` が未指定でも `tilt !== 0 || zoom !== 1 || panX !== 0 || panY !== 0` の場合はフレームごとに動的に `buildExportMVPMatrix` で透視投影行列を生成して描画すること。
- [x] 4. **3Dチルト時の大理石ピッチ背景の台形クリッピング**: `pitch-renderer.ts` で `isMarble` かつ 3D投影行列 `m` が存在する場合、ピッチ内枠4頂点を `projectObjToScreen` で投影した3D台形ポリゴンで `ctx.clip()` し、白線と大理石背景がズレずに一致すること。
- [x] 5. **3D投影時の選手深度ソート・遠近スケール・視界コーン投影**: `player-renderer.ts` で選手を投影後のスクリーンY座標昇順（奥から手前）にソートして描画し、`m` 存在時は遠近スケール（`0.88 + (p.y / 100) * 0.24`）および視界コーン頂点の `projectObjToScreen` 3D投影を適用すること。
- [x] 6. **プレビュー・動画出力での動的カメラ連携**: 再生・複数スライド動画出力時に固定の `mvpMatrix` で全フレームを上書きせず、各時刻 `timeMs` の補間済み `frame.pitchTransform` による動的カメラワークが機能すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import type { PitchTransform, Slide } from '@/lib/types/tactical-unified';
import { buildExportMVPMatrix } from '@/features/tactical-unified/core/utils/canvas-pitch-transform-helper';
import { getInterpolatedUnifiedSlideFrame } from '@/lib/tactical/unified-interpolation';
```

### 3.2 Key Interfaces & Types
```ts
// src/lib/tactical/unified-interpolation.ts
export interface InterpolatedPitchTransformState {
  panX: number;
  panY: number;
  zoom: number;
  tilt: number;
  isLocked: boolean;
}

export interface InterpolatedUnifiedFrame {
  players: Record<string, InterpolatedPlayerState>;
  ball: InterpolatedBallState;
  zones: Record<string, InterpolatedZoneState>;
  arrows: Record<string, InterpolatedArrowState>;
  texts: Record<string, InterpolatedTextState>;
  pitchTransform: InterpolatedPitchTransformState;
  currentSlideIndex: number;
  nextSlideIndex: number;
  progress: number;
  isPaused: boolean;
}

// src/lib/tactical/export/tactical-frame-renderer.ts
export interface RenderTacticalFrameOptions {
  slides: Slide[];
  timeMs: number;
  width: number;
  height: number;
  aspectRatio: AspectRatio;
  boundaryBox?: BoundaryBox | null;
  transparent?: boolean;
  mvpMatrix?: Float32Array | null;
  pitchTransformOverride?: PitchTransform | null;
  playerPhotos?: Record<string, CanvasImageSource | null | undefined>;
  pitchAppearance?: PitchAppearanceConfig;
  marbleTexture?: CanvasImageSource | null;
}
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```ts
// - buildExportMVPMatrix の循環依存を避けるため、tactical-frame-renderer.ts からは '@/features/tactical-unified/core/utils/canvas-pitch-transform-helper' (または buildMVPMatrix + calculatePitchRect) を直接インポートすること。
// - renderTacticalFrameToCanvas では、getInterpolatedUnifiedSlideFrame(slides, timeMs) を project3D / renderPitch の前に呼び出し、effectiveTransform = options.pitchTransformOverride ?? frame.pitchTransform から動的 mvpMatrix を解決すること。
// - pitch-renderer.ts の isMarble かつ m 非null時は、p0=projectObjToScreen(normLeft, normTop), p1=projectObjToScreen(normRight, normTop), p2=projectObjToScreen(normRight, normBottom), p3=projectObjToScreen(normLeft, normBottom) の4点で ctx.beginPath() -> moveTo/lineTo -> closePath() -> ctx.clip() を行い、その外接矩形 (minX, minY, maxX-minX, maxY-minY) に大理石テクスチャとオーバーレイを描画すること。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: スライド間カメラ補間 (`interpolatePitchTransform`) と解像度非依存 MVP 行列生成
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/tactical/unified-interpolation.ts`
  - `src/features/tactical-unified/core/utils/canvas-pitch-transform-helper.ts`
  - `src/lib/tactical/__tests__/unified-interpolation.test.ts`
  - `src/features/tactical-unified/__tests__/pitch-tilt-export.test.ts`
- **契約 (Interface)**:
  ```ts
  export function interpolatePitchTransform(
    transformA?: PitchTransform | null,
    transformB?: PitchTransform | null,
    t?: number,
  ): InterpolatedPitchTransformState;

  export const REFERENCE_STAGE_HEIGHT = 360;
  export function buildExportMVPMatrix(
    pitchTransform: PitchTransform,
    exportWidth: number,
    exportHeight: number,
    aspectRatio?: AspectRatio,
    referenceHeight?: number,
  ): mat4;
  ```
- **Testing Strategy**:
  - `unified-interpolation.test.ts`: スライド0 (`zoom: 1, tilt: 0, panX: 0`) からスライド1 (`zoom: 2, tilt: 30, panX: 100`) への遷移中間時刻で `frame.pitchTransform` が補間されることを検証。
  - `pitch-tilt-export.test.ts`: `buildExportMVPMatrix` で `exportHeight = 360` と `exportHeight = 1080` の双方で同一の正規化パン位置（NDC座標比率）になることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/lib/tactical/__tests__/unified-interpolation.test.ts` ➔ 実装 ➔ `bun run ai:check src/lib/tactical/unified-interpolation.ts src/features/tactical-unified/core/utils/canvas-pitch-transform-helper.ts src/lib/tactical/__tests__/unified-interpolation.test.ts src/features/tactical-unified/__tests__/pitch-tilt-export.test.ts` PASS
- **Worker Handoff Log**:
  - `InterpolatedPitchTransformState`, `interpolatePitchTransform`, `REFERENCE_STAGE_HEIGHT = 360`, `buildExportMVPMatrix(..., referenceHeight = 360)` を export 完了。`isLocked` は `t < 0.5 ? a.isLocked : b.isLocked` で二値切り替え。

---

### Phase 2: 3Dフレーム描画の動的カメラ行列化・大理石台形投影・深度ソート・遠近スケール
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/tactical/export/tactical-frame-renderer.ts`
  - `src/lib/tactical/export/renderers/pitch-renderer.ts`
  - `src/lib/tactical/export/renderers/player-renderer.ts`
  - `src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts`
- **契約 (Interface)**:
  - `tactical-frame-renderer.ts`: `frame = getInterpolatedUnifiedSlideFrame(slides, timeMs)` を先頭で取得し、`mvpMatrix` 未指定時も `effectiveTransform = options.pitchTransformOverride ?? frame.pitchTransform` に非デフォルト値（`tilt !== 0 || zoom !== 1 || panX !== 0 || panY !== 0`）があれば `new Float32Array(buildExportMVPMatrix(effectiveTransform, w, h, aspectRatio))` を生成して `m` に設定。
  - `pitch-renderer.ts`: `isMarble && m` の場合、ピッチ内枠4頂点を `projectObjToScreen` で投影した台形パスで `ctx.clip()` し、外接バウンディングボックスでテクスチャとオーバーレイを描画。
  - `player-renderer.ts`: 描画前に `projectObjToScreen(p.x, p.y).y` 昇順でソート。`m` 存在時は半径に `depthScale = Math.max(0.75, Math.min(1.25, 0.88 + (p.y / 100) * 0.24))` を乗算し、`visionCone` も `m` 存在時はピッチ正規化座標上の円弧点を `projectObjToScreen` で投影して描画。
- **Testing Strategy**:
  - `tactical-frame-renderer.test.ts`: `mvpMatrix` を渡さずともスライドの `pitchTransform`（`tilt: 30, zoom: 1.5`）から動的3D投影が行われること、大理石背景＋3Dチルト時に台形4頂点クリップが呼ばれること、選手がY座標順（奥から手前）に描画されることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts` ➔ 実装 ➔ `bun run ai:check src/lib/tactical/export/tactical-frame-renderer.ts src/lib/tactical/export/renderers/pitch-renderer.ts src/lib/tactical/export/renderers/player-renderer.ts src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts` PASS
- **Worker Handoff Log**:
  - `renderTacticalFrameToCanvas` に動的 `buildExportMVPMatrix`（`pitchTransformOverride ?? frame.pitchTransform`）と大理石台形3Dクリップ・選手深度ソート（Y昇順）・遠近スケール・視界コーン3D投影を実装。`player-renderer.ts` は299行に集約しR8をクリア。

---

### Phase 3: プレビュー再生・動画出力・iPhone共有での動的カメラワーク統合
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts`
  - `src/lib/tactical/export/video-mediabunny-export.ts`
  - `src/features/tactical-unified/components/use-share-page-export.ts`
  - `src/features/tactical-unified/__tests__/video-export.test.ts`
- **契約 (Interface)**:
  - `use-export-preview-animation.ts`: 複数スライド（`slides.length > 1`）の再生・シーク時は固定 `mvpMatrix` を渡さず（`mvpMatrix: null`）、`renderTacticalFrameToCanvas` 内のフレーム補間 `frame.pitchTransform` による動的カメラワークを使用する。単一スライド時または `pitchTransformOverride` 指定時のみ `pitchTransform` をオーバーライド適用。
  - `video-mediabunny-export.ts` & `use-share-page-export.ts`: `slides && slides.length > 1` の場合は固定の `mvpMatrix` を生成せず `mvpMatrix: undefined` とし、各フレームの補間済み `frame.pitchTransform` で動的カメラワークをエンコードする（`slides.length === 1` の場合のみ `options.pitchTransform` を使用）。
- **Testing Strategy**:
  - `video-export.test.ts`: スライド間で異なる `pitchTransform` を持つマルチスライド再生・エクスポート時に、フレームごとにカメラ変換が動的に補間・反映されることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/__tests__/video-export.test.ts` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/panels/export/use-export-preview-animation.ts src/lib/tactical/export/video-mediabunny-export.ts src/features/tactical-unified/components/use-share-page-export.ts src/features/tactical-unified/__tests__/video-export.test.ts` PASS
- **Worker Handoff Log**:
  - マルチスライド時（`slides.length > 1`）は `mvpMatrix: undefined`（プレビューは `null`）を渡し `renderTacticalFrameToCanvas` 内の毎フレーム動的MVP補間を有効化。単一スライド時のみ固定 `mvpMatrix` を注入。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-30 18:08
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  3Dカメラ動的補間、解像度非依存パン、大理石台形投影クリップ、選手深度ソート・遠近スケール、プレビュー/動画エクスポート動的カメラワークが6大設計品質原則に準拠して完璧に実装・テストされていることを確認。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
