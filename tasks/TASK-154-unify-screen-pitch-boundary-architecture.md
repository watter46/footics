# TASK-154: スクリーン・ピッチ・境界線・フォーメーション座標の4層単一座標リファクタリング

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-05
- **Target Files**:
  - `src/lib/tactical/pitch-geometry.ts` (MODIFY)
  - `src/lib/types/tactical/primitives.ts` (MODIFY)
  - `src/lib/types/tactical/project.ts` (MODIFY)
  - `src/lib/types/tactical/factory.ts` (MODIFY)
  - `src/lib/types/tactical/migration.ts` (MODIFY)
  - `src/lib/data/formations.ts` (MODIFY)
  - `src/features/tactical-unified/stores/tactical-unified-selectors.ts` (MODIFY)
  - `src/features/tactical-unified/stores/slide-aspect-helpers.ts` (MODIFY)
  - `src/features/tactical-unified/stores/project-slice-config-actions.ts` (MODIFY)
  - `src/features/tactical-unified/stores/pitch-slice.ts` (MODIFY)
  - `src/features/tactical-unified/stores/phase-crud-actions.ts` (MODIFY)
  - `src/features/tactical-unified/stores/slide-crud-actions.ts` (MODIFY)
  - `src/features/tactical-unified/components/header/XMediaPresetMenu.tsx` (MODIFY)
  - `src/features/tactical-unified/hooks/use-canvas-viewport.ts` (MODIFY)
  - `src/features/tactical-unified/components/canvas/FullTacticalCanvas.tsx` (MODIFY)
  - `src/features/tactical-unified/components/canvas/BackgroundImageLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/components/canvas/pitch-marble-background.tsx` (MODIFY)
  - `src/features/tactical-unified/components/canvas/BoundaryBoxOverlay.tsx` (MODIFY)
  - `src/features/tactical-unified/components/canvas/BoundaryBoxHud.tsx` (MODIFY)
  - `src/features/tactical-unified/components/canvas/TacticalTopBar.tsx` (MODIFY)
  - `src/features/tactical-unified/components/canvas/PlayerMarkerItem.tsx` (MODIFY)
  - `src/features/tactical-unified/components/canvas/use-marker-drag-handlers.ts` (MODIFY)
  - `src/features/tactical-unified/components/canvas/use-ball-drag.ts` (MODIFY)
  - `src/features/tactical-unified/components/canvas/use-canvas-pointer-interaction.ts` (MODIFY)
  - `src/features/tactical-unified/utils/geometry.ts` (MODIFY)
  - `src/features/tactical-unified/utils/renderer/renderer-context.ts` (MODIFY)
  - `src/features/tactical-unified/utils/renderer/pitch-renderer.ts` (MODIFY)
  - `src/features/tactical-unified/utils/renderer/pitch-markings-2d.ts` (MODIFY)
  - `src/features/tactical-unified/utils/renderer/pitch-markings-3d.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/use-export-preview-animation.ts` (MODIFY)
  - `src/features/tactical-unified/components/preview/tactical-split-preview-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/components/export/export-modal-body.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. 全画面（ボード・レイアウト・エクスポート）の第1層スクリーン外枠が `16:9`（1920×1080）固定、全座標が `16:9` スクリーン全体 `X: 0〜100, Y: 0〜100` の単一座標系に統一されていること
- [x] 2. `aspectRatio` と `boundaryBox` が `TacticalPhase` 単位で保持・更新され、新規 Project / Phase のデフォルトが `aspectRatio: '16:9'`・`boundaryBox: DEFAULT_BOUNDARY_BOX_16_9`（`visible: false`）であり、既存データは `ensureTacticalProject` でフェーズ単位へ正規化されること
- [x] 3. トップバーの比率切替（`setAspectRatio`）はアクティブフェーズのピッチ形状と選手・オブジェクト座標変換のみを行い、境界線（`boundaryBox`）を一切書き換えないこと
- [x] 4. フォーメーション配置と比率変換が `getScreenPitchBounds(aspectRatio)` と向き（`16:9`=横: Home左/Away右、`9:16`・`4:5`・`1:1`=縦: Home下/Away上）に基づく単一ロジックに統合され、縦横逆転バグが起きないこと
- [x] 5. 選手・ボールは `16:9` スクリーン内（`0 ≦ x ≦ 100, 0 ≦ y ≦ 100`）にクランプ（白線外余白は配置可・境界線は無視）され、矢印・ゾーン・テキストはスクリーン外（`< 0` や `> 100`）にも配置可能であること
- [x] 6. レイアウト画面・エクスポート画面は第1層＋第2層（中央配置ピッチ＋選手・描画物＋3Dカメラ `pitchTransform`）を `16:9`（1920×1080）で正規描画した上で、第3層（フェーズの `boundaryBox`）の内側領域をクロップして出力・表示すること

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs & Key Interfaces
```ts
// src/lib/tactical/pitch-geometry.ts に追加する 16:9 スクリーン内ピッチ矩形・白線枠ヘルパー
export interface ScreenPitchBounds {
  outerLeft: number; outerTop: number; outerWidth: number; outerHeight: number;
  xMin: number; xMax: number; xSpan: number; xMid: number;
  yMin: number; yMax: number; ySpan: number; yMid: number;
  isHorizontal: boolean; // aspectRatio === '16:9'
}
export function getScreenOuterPitchRect(aspectRatio: AspectRatio): { left: number; top: number; width: number; height: number };
export function getScreenPitchBounds(aspectRatio: AspectRatio, marginPercent?: number): ScreenPitchBounds;

// src/lib/types/tactical/project.ts (TacticalPhaseSchema 拡張 & TacticalProjectSchema デフォルト変更)
export const TacticalPhaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  aspectRatio: AspectRatioSchema.default('16:9'),
  boundaryBox: BoundaryBoxSchema.default(DEFAULT_BOUNDARY_BOX_16_9),
  slides: z.array(SlideSchema),
});

// src/lib/types/tactical/primitives.ts
export type XMediaPresetKey = 'landscape_16_9' | 'portrait_4_5' | 'vertical_9_16' | 'square_1_1' | 'pitch_fit';
export function transformCoord(
  point: { x: number; y: number },
  fromAspect: AspectRatio,
  toAspect: AspectRatio,
  options?: { clamp?: boolean },
): { x: number; y: number };
```

### 3.2 単一座標系（`16:9` スクリーン `0..100`）の算出規則と 4層モデル設計契約
- **`getScreenOuterPitchRect(aspectRatio)`**: `16:9` スクリーン（`screenAspect = 16 / 9`）の中央に `targetAspect = ASPECT_RATIOS[aspectRatio]` を内接配置する（すべて `targetAspect <= 16 / 9` のため `height = 100, top = 0, width = (targetAspect / (16 / 9)) * 100, left = (100 - width) / 2`）。
- **`getScreenPitchBounds(aspectRatio, margin = 3.0)`**: `xMin = left + width * (margin / 100)`, `xMax = left + width * (1 - margin / 100)`, `yMin = top + height * (margin / 100)` (`= 3`), `yMax = top + height * (1 - margin / 100)` (`= 97`), `isHorizontal = aspectRatio === '16:9'`。
- **`getFormationActualPos(top, left, isAway, aspectRatio = '16:9')`**:
  - Home (`!isAway`): `attackRatio = (top / 100) * 0.5`, `widthRatio = left / 100`
  - Away (`isAway`): `attackRatio = 1 - (top / 100) * 0.5`, `widthRatio = (100 - left) / 100`
  - `isHorizontal`（`'16:9'`）: `x = xMin + attackRatio * xSpan`, `y = yMin + (1 - widthRatio) * ySpan`
  - `!isHorizontal`（`'9:16' | '4:5' | '1:1'`）: `x = xMin + widthRatio * xSpan`, `y = yMax - attackRatio * ySpan`
  - `getFormationActualPosVertical(top, left, isAway)` は `getFormationActualPos(top, left, isAway, '4:5')` に委譲。
- **`transformCoord(point, fromAspect, toAspect, options)`**:
  - `fromBounds = getScreenPitchBounds(fromAspect)`, `toBounds = getScreenPitchBounds(toAspect)` を使用。
  - `fromBounds.isHorizontal` なら `attackNorm = (point.x - fromBounds.xMin) / fromBounds.xSpan`, `widthNorm = 1 - (point.y - fromBounds.yMin) / fromBounds.ySpan`；縦なら `attackNorm = (fromBounds.yMax - point.y) / fromBounds.ySpan`, `widthNorm = (point.x - fromBounds.xMin) / fromBounds.xSpan`。
  - `toBounds.isHorizontal` なら `nx = toBounds.xMin + attackNorm * toBounds.xSpan`, `ny = toBounds.yMin + (1 - widthNorm) * toBounds.ySpan`；縦なら `nx = toBounds.xMin + widthNorm * toBounds.xSpan`, `ny = toBounds.yMax - attackNorm * toBounds.ySpan`。
  - `options?.clamp !== false`（デフォルト true）なら `[0, 100]` にクランプ、`clamp === false`（矢印・ゾーン・テキスト）ならクランプしない。
- **4層コンポーネント & Store セレクタ契約**: Level 2/3 コンポーネントは `selectActivePhaseAspectRatio` / `selectActivePhaseBoundaryBox` でアクティブフェーズの設定を購読する。

---

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: データモデル（TacticalPhase単位化・デフォルト16:9統一）＆単一座標・フォーメーション変換の一元化
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/tactical/pitch-geometry.ts`, `src/lib/types/tactical/primitives.ts`, `src/lib/types/tactical/project.ts`, `src/lib/types/tactical/factory.ts`, `src/lib/types/tactical/migration.ts`, `src/lib/data/formations.ts`, `src/lib/types/__tests__/tactical-phase-and-coords.test.ts`
- **契約 (Interface)**:
  - `createDefaultProject` / `createDefaultPhase` / `createDefaultSlide` / `createDefaultInitialPlayers` / `createDefault442Players` のデフォルト比率を `'16:9'`、境界線を `DEFAULT_BOUNDARY_BOX_16_9`（`visible: false`）に統一。
  - `ensureTacticalProject` で各フェーズの `aspectRatio`（フォールバック: `phase.aspectRatio ?? phase.slides[0]?.aspectRatio ?? p.aspectRatio ?? '16:9'`）と `boundaryBox`（フォールバック: `phase.boundaryBox ?? phase.slides[0]?.boundaryBox ?? p.boundaryBox ?? DEFAULT_BOUNDARY_BOX_16_9`）を正規化し、先頭フェーズと `project.aspectRatio` / `project.boundaryBox` を同期。
  - `X_MEDIA_PRESETS` に `square_1_1: { key: 'square_1_1', label: '1:1 (スクエア)', ratio: '1:1', aspectValue: 1 }` を追加し、`createXBoundaryBox(presetRatio, '16:9')` で `'16:9'` スクリーン内の境界線枠を算出。
- **Testing Strategy**: `src/lib/types/__tests__/tactical-phase-and-coords.test.ts` で新規 Project/Phase の `'16:9'` 初期値、既存データのフェーズ正規化、`getFormationActualPos` の横（`'16:9'`）・縦（`'4:5'`, `'9:16'`, `'1:1'`）座標、`transformCoord` の往復変換不変性と `clamp: false` 時の範囲外保持を検証。既存テストの `'4:5'` 初期値前提も `'16:9'` に更新。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/lib/types/__tests__/tactical-phase-and-coords.test.ts` ➔ 実装 ➔ `bun run ai:check` PASS
- **Worker Handoff Log**:
  - `ScreenPitchBounds`, `getScreenOuterPitchRect`, `getScreenPitchBounds` を `pitch-geometry.ts` から export。`transformCoord` はピッチbounds射影ベースで `options?.clamp !== false` をサポート。
  - `TacticalPhaseSchema` は `aspectRatio`・`boundaryBox` のデフォルト値を `'16:9'`・`DEFAULT_BOUNDARY_BOX_16_9` とし、手動リテラルとの後方互換性のため `.optional()` を付与。`ensureTacticalProject` で正規化保証。

---

### Phase 2: Zustand Store（TacticalPhase単位のaspectRatio/boundaryBox更新・ピッチ比率と境界線の完全分離）
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/stores/tactical-unified-selectors.ts`, `src/features/tactical-unified/stores/slide-aspect-helpers.ts`, `src/features/tactical-unified/stores/project-slice-config-actions.ts`, `src/features/tactical-unified/stores/pitch-slice.ts`, `src/features/tactical-unified/stores/phase-crud-actions.ts`, `src/features/tactical-unified/stores/slide-crud-actions.ts`, `src/features/tactical-unified/components/header/XMediaPresetMenu.tsx`, `src/features/tactical-unified/stores/__tests__/phase-aspect-and-boundary.test.ts`
- **契約 (Interface)**:
  - `selectActivePhaseAspectRatio(s)` と `selectActivePhaseBoundaryBox(s)` を追加。
  - `setAspectRatio(ratio)` はアクティブ `TacticalPhase` の `aspectRatio`（および `project.aspectRatio` ミラー）のみを更新し、そのフェーズ内の `slides` のみを `transformSlideForAspect(sl, oldRatio, ratio)` で変換する。**`boundaryBox` は一切変更しない**。
  - `transformSlideForAspect` は選手・ボールを `transformCoord(p, from, to, { clamp: true })`、矢印・ゾーン・テキストを `transformCoord(p, from, to, { clamp: false })` で変換し、`boundaryBox` を上書きしない。
  - `pitch-slice.ts` の境界線操作（`setBoundaryBox`, `updateBoundaryBox`, `updateActiveSlideBoundaryBox`, `autoFitBoundaryBox`, `applyXMediaPreset`, `centerPitchAndBoundary`）はすべてアクティブ `TacticalPhase.boundaryBox`（および `project.boundaryBox` ミラー）を更新する。`autoFitBoundaryBox` / `pitch_fit` は `getScreenOuterPitchRect(activePhaseAspect)` の枠（`x: left, y: top, width, height`）を設定する。
  - `setActivePhase`, `selectPhaseAndSlide`, `setActiveSlide` で切替先フェーズの `aspectRatio` / `boundaryBox` を `project` ミラーへ同期する。`XMediaPresetMenu.tsx` に `1:1`（`square_1_1`）プリセット選択肢を追加する。
- **Testing Strategy**: `src/features/tactical-unified/stores/__tests__/phase-aspect-and-boundary.test.ts` で比率切替時に境界線が変わらないこと、境界線変更が同一フェーズ内の全シーンで共有され別フェーズには影響しないこと、フェーズ切替時の同期を検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/stores/__tests__/phase-aspect-and-boundary.test.ts` ➔ 実装 ➔ `bun run ai:check` PASS
- **Worker Handoff Log**:
  - `selectActivePhaseAspectRatio` と `selectActivePhaseBoundaryBox` を selectors から export。`setAspectRatio` は境界線を変更せずアクティブフェーズのみ更新。
  - `transformSlideForAspect` は選手・ボールをクランプしアノテーションを clamp=false 保持。境界線操作は `findPhaseIdForSlide` / `updatePhaseBoundaryInProject` 経由でフェーズ単位に更新。

---

### Phase 3: ボード画面の4層レイヤー統一（16:9固定スクリーン・中央サブピッチ描画・選手/ボール0..100クランプ・オブジェクト制限解除）
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/hooks/use-canvas-viewport.ts`, `src/features/tactical-unified/components/canvas/FullTacticalCanvas.tsx`, `src/features/tactical-unified/components/canvas/BackgroundImageLayer.tsx`, `src/features/tactical-unified/components/canvas/pitch-marble-background.tsx`, `src/features/tactical-unified/components/canvas/BoundaryBoxOverlay.tsx`, `src/features/tactical-unified/components/canvas/BoundaryBoxHud.tsx`, `src/features/tactical-unified/components/canvas/TacticalTopBar.tsx`, `src/features/tactical-unified/components/canvas/PlayerMarkerItem.tsx`, `src/features/tactical-unified/components/canvas/use-marker-drag-handlers.ts`, `src/features/tactical-unified/components/canvas/use-ball-drag.ts`, `src/features/tactical-unified/components/canvas/use-canvas-pointer-interaction.ts`, `src/features/tactical-unified/utils/geometry.ts`, `src/features/tactical-unified/utils/__tests__/geometry-and-viewport.test.ts`
- **契約 (Interface)**:
  - `use-canvas-viewport.ts` / `FullTacticalCanvas.tsx`: 第1層スクリーン `vRect` を常に `calculateVirtualCanvasRect(containerSize, 16 / 9, 1920)` で計算（`16:9` 固定）。アクティブフェーズの `aspectRatio` と `boundaryBox` をセレクタ経由で取得。
  - `BackgroundImageLayer.tsx` / `pitch-marble-background.tsx`: `subPitchRect = calculatePitchRect({ width, height }, aspectRatio)` 領域内にのみピッチ背景・大理石を描画し、`16:9` スクリーン余白はダーク背景を維持。
  - `resolveBoundaryBoxPixelRect`（`geometry.ts`）: 常に `pitchRect`（`vRect` = `16:9` スクリーン）を基準に `boundaryBox`（`0..100`）のピクセル矩形を算出。
  - `PlayerMarkerItem.tsx` / `use-marker-drag-handlers.ts` / `use-ball-drag.ts`: ドラッグ範囲と終了座標を `16:9` スクリーン（`0..100`）にクランプ。
  - `use-canvas-pointer-interaction.ts`: 描画ツール操作時は `pointerToNormalizedCoord(pos, vRect, { allowOverflow: true })` を使用し、`0..100` 外への配置を許可。
- **Testing Strategy**: `src/features/tactical-unified/utils/__tests__/geometry-and-viewport.test.ts` で `resolveBoundaryBoxPixelRect` の `16:9` スクリーン基準変換および `pointerToNormalizedCoord` のクランプ有無を検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/utils/__tests__/geometry-and-viewport.test.ts` ➔ 実装 ➔ `bun run ai:check` PASS
- **Worker Handoff Log**:
  - `pointerToNormalizedCoord` を `geometry.ts` から export。描画時は `allowOverflow: true` で 0..100 外を許容し、選手・ボールドラッグは `[0, 100]` にクランプ。
  - `vRect` を常に 16:9 固定で算出し、ピッチ背景・大理石描画は `calculatePitchRect` の `subPitchRect` 領域内に内接配置。

---

### Phase 4: レイアウト画面・エクスポート画面の単一16:9スクリーン描画＋第2層サブピッチ投影＋第3層境界線クロップ統一
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/utils/renderer/renderer-context.ts`, `src/features/tactical-unified/utils/renderer/pitch-renderer.ts`, `src/features/tactical-unified/utils/renderer/pitch-markings-2d.ts`, `src/features/tactical-unified/utils/renderer/pitch-markings-3d.ts`, `src/features/tactical-unified/hooks/use-export-preview-animation.ts`, `src/features/tactical-unified/components/preview/tactical-split-preview-panel.tsx`, `src/features/tactical-unified/components/export/export-modal-body.tsx`, `src/features/tactical-unified/utils/__tests__/canvas-frame-renderer.test.ts`
- **契約 (Interface)**:
  - `renderer-context.ts` (`createFrameRenderContext`): `toScreenX(normX) = (normX / 100) * baseWidth`, `toScreenY(normY) = (normY / 100) * baseHeight` に統一（全座標が `16:9` スクリーン `0..100` のため）。`outerPitchRect = calculatePitchRect({ width: baseWidth, height: baseHeight }, aspectRatio)` を保持。
  - `pitch-renderer.ts` / `pitch-markings-2d.ts` / `pitch-markings-3d.ts`: SVG ピッチ座標 `(svgX, svgY)` を `outerPitchRect` 内の正規化 `16:9` スクリーン座標 `normX = ((outerPitchRect.x + (svgX / config.widthPx) * outerPitchRect.width) / baseWidth) * 100`, `normY = ((outerPitchRect.y + (svgY / config.heightPx) * outerPitchRect.height) / baseHeight) * 100` に変換して描画・`project3DPoint` 投影する。
  - `use-export-preview-animation.ts` / `tactical-split-preview-panel.tsx` / `export-modal-body.tsx`: フェーズの `aspectRatio` と `boundaryBox` を参照し、`renderTacticalFrameToCanvas` に実際の `aspectRatio`（`'16:9'` 固定ではなくフェーズの `aspectRatio`）を渡して `16:9`（1920×1080）で描画した後、`boundaryBox` でクロップ出力する。
- **Testing Strategy**: `src/features/tactical-unified/utils/__tests__/canvas-frame-renderer.test.ts` で `'4:5'` / `'9:16'` / `'16:9'` 時の `toScreenX` / `toScreenY` 単一座標変換および 2D/3D 描画整合性を検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/utils/__tests__/canvas-frame-renderer.test.ts` ➔ 実装 ➔ `bun run ai:check` PASS
- **Worker Handoff Log**:
  - `toScreenX` / `toScreenY` / `toScreenSizeX` / `toScreenSizeY` を 16:9 スクリーン座標 (0..100) 基準に統一し、`outerPitchRect` を context に保持。
  - ピッチ線・大理石描画は `outerPitchRect` 内へ射影、プレビュー・エクスポートはフェーズの `aspectRatio` で描画し `boundaryBox` でクロップ出力。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-05 04:56
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**: 4層単一座標系（16:9固定スクリーン0..100）への一元化、TacticalPhase単位のaspectRatio/boundaryBox分離、クランプとオーバーフロー制御、およびレンダラー・プレビューのクロップ統合が6大設計品質原則に準拠して美しく完遂されていることを確認。

## 6. Rejections / Additional Tasks (不可逆修正欄)
