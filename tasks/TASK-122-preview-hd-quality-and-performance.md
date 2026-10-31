# TASK-122: プレビュー画面の1080p高画質化・エクスポート完全一致・描画パフォーマンス最適化

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-31
- **Target Files**:
  - `src/lib/tactical/export/tactical-frame-renderer.ts` (MODIFY)
  - `src/lib/tactical/export/renderers/pitch-markings-3d.ts` (MODIFY)
  - `src/lib/tactical/export/renderers/player-renderer.ts` (MODIFY)
  - `src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-animation-frame-loop.ts` (NEW)
  - `src/features/tactical-unified/panels/export/export-preview-player.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. `PREVIEW_DIMENSIONS` が実際のエクスポート（Full HD 1080p: `'16:9': 1920x1080`, `'9:16': 1080x1920`, `'4:5': 1080x1350`, `'1:1': 1080x1080`）に統一され、スプリット画面拡大表示時やカメラ操作時にもピッチ白線・マーカー・文字がエクスポート結果と同一の解像度・サイズ比率で鮮明に描画されること。
- [x] 2. `tactical-frame-renderer.ts` の `snap` 関数による強制整数丸め（`Math.round`）が廃止（`const snap = (v: number) => v;`）され、かつ `pitch-markings-3d.ts` の円弧分割数が高精細化されることで、3D投影時の斜め線・円弧・オブジェクトが階段状にカクつかずサブピクセル精度で滑らかに描画されること。
- [x] 3. `player-renderer.ts` において、3Dリングマーカー（`markerType === 'ring'`）の5つのパスが単一の複合 `Path2D`（`new Path2D(MARKER_PATHS.join(' '))`）に事前統合されて1回の `stroke` / `fill` で描画され、また `tilt === 0`（平面視でズーム・パンのみ適用時）では選手に不自然な奥行き縮小（`depthScale`）が適用されないこと。
- [x] 4. `useExportPreviewAnimation` において、カメラが正面初期状態（`tilt === 0 && (yaw ?? 90) === 90 && zoom === 1 && panX === 0 && panY === 0`）のときは `mvpMatrix` が `null` になり、エクスポート時と同じく2Dネイティブ描画パス（`renderPitchMarkings2D`）が使用されること。
- [x] 5. カメラドラッグ等による `pitchTransform` や `boundaryBox` の高頻度更新時に、`preloadSlidePlayerPhotos` の `useEffect` が再実行されて `ImageBitmap.close()` が乱発される現象が防止（選手写真の構成シグネチャ変化時のみ再ロード）されること。
- [x] 6. `boundaryBox` で元の比率と異なる領域を切り抜いている場合、`useExportPreviewAnimation` が切り抜き後の縦横比 `previewAspectStyle` を算出し、`TacticalSplitPreviewPanel` および `ExportPreviewPlayer` のプレビューコンテナの `style={{ aspectRatio: previewAspectStyle }}` に適用して歪みなく表示されること。

## 3. Context Snippets (参照コード・型定義・import)
<!-- Workerが自律探索（Read/Grep）を行わずに実装できるよう、必要な文脈を過不足なく事前注入する -->

### 3.1 Import Specs
```ts
// src/features/tactical-unified/panels/export/use-export-preview-animation.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildExportMVPMatrix } from '@/features/tactical-unified/core';
import { preloadSlidePlayerPhotos } from '@/lib/tactical/export/share-payload';
import { renderTacticalFrameToCanvas } from '@/lib/tactical/export/tactical-frame-renderer';
import { calculateUnifiedTotalDuration } from '@/lib/tactical/unified-interpolation';
import type {
  AspectRatio,
  BoundaryBox,
  PitchAppearanceConfig,
  PitchTransform,
  Slide,
} from '@/lib/types/tactical-unified';
```

### 3.2 Key Interfaces & Types
```ts
export const PREVIEW_DIMENSIONS: Record<
  AspectRatio,
  { width: number; height: number }
> = {
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '4:5': { width: 1080, height: 1350 },
  '1:1': { width: 1080, height: 1080 },
};

export function hasActivePitchTransform(pt?: PitchTransform | null): boolean {
  if (!pt) return false;
  return (
    pt.tilt !== 0 ||
    (pt.yaw !== undefined && pt.yaw !== 90) ||
    pt.zoom !== 1 ||
    pt.panX !== 0 ||
    pt.panY !== 0
  );
}
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```ts
// 1. tactical-frame-renderer.ts:
//    - L191 の `const snap = (v: number) => Math.round(v);` を `const snap = (v: number) => v;` に変更する。
// 2. pitch-markings-3d.ts:
//    - draw3DArc のデフォルト segments = 64、センターサークルは segments = 72、ペナルティアークは segments = 36、コーナーアークは segments = 16、draw3DSpot は segments = 24 に引き上げる。
// 3. player-renderer.ts:
//    - モジュール先頭で `const CACHED_COMBINED_MARKER_PATH: Path2D | null = typeof Path2D !== 'undefined' ? new Path2D(MARKER_PATHS.join(' ')) : null;` を生成する。
//    - isRingMarker 内で `if (CACHED_COMBINED_MARKER_PATH)` を使い、グロー層は `ctx.stroke(CACHED_COMBINED_MARKER_PATH)` 1回、コア層は `ctx.fill(CACHED_COMBINED_MARKER_PATH)` 1回で描画する。
//    - depthScale の判定: 透視投影の傾き成分があるときのみ適用する:
//      const hasPerspectiveTilt = Boolean(m && (Math.abs(m[7]) > 1e-5 || Math.abs(m[3]) > 1e-5));
//      const depthScale = hasPerspectiveTilt ? Math.max(0.75, Math.min(1.25, 0.88 + (p.y / 100) * 0.24)) : 1;
// 4. use-export-preview-animation.ts:
//    - PREVIEW_DIMENSIONS を 1080p (1920x1080, 1080x1920, 1080x1350, 1080x1080) に変更する。
//    - mvpMatrix の useMemo で `if (slides.length > 1 || !hasActivePitchTransform(pitchTransform) || !pitchTransform) return null;` とする。
//    - 選手写真プリロードの最適化: `slidesRef = useRef(slides); slidesRef.current = slides;` を保持し、
//      `photoSignature`（各スライドの insideContent === 'photo' の選手の `${p.id}:${p.playerId ?? ''}` と `photos` のキー・値の結合文字列）を useMemo で算出し、
//      preloadSlidePlayerPhotos の useEffect 依存配列を `[photoSignature, photos, playerPhotos]` にする（内部では `preloadSlidePlayerPhotos(slidesRef.current, photos)` を呼ぶ）。
//    - boundaryBox が有効（enabled && width > 0 && height > 0 && (width < 100 || height < 100 || x > 0 || y > 0)）な場合、
//      `const cropW = Math.max(1, Math.round(previewWidth * (boundaryBox.width / 100)));`
//      `const cropH = Math.max(1, Math.round(previewHeight * (boundaryBox.height / 100)));`
//      から `previewAspectStyle = `${cropW} / ${cropH}``（無効時は `undefined`）を算出し、フックの戻り値に追加する。
// 5. tactical-split-preview-panel.tsx & export-preview-player.tsx:
//    - TacticalSplitPreviewPanel の `previewSlides` を `useMemo(() => (activeSlide ? [activeSlide] : slides), [activeSlide, slides])` でメモ化する。
//    - useExportPreviewAnimation から `previewAspectStyle` を受け取り、キャンバスを囲む外枠 div に `style={previewAspectStyle ? { aspectRatio: previewAspectStyle } : undefined}` を付与する（既存のクラス名 SPLIT_PREVIEW_CONTAINER_CLASSES / ASPECT_CONTAINER_CLASSES はそのまま維持すること）。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: フレームレンダラーのサブピクセル高精度化・3D傾き判定・3Dリング一括描画最適化
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/tactical/export/tactical-frame-renderer.ts`, `src/lib/tactical/export/renderers/pitch-markings-3d.ts`, `src/lib/tactical/export/renderers/player-renderer.ts`, `src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts`
- **契約 (Interface)**:
  ```ts
  export function renderTacticalFrameToCanvas(
    ctx: AnyCanvasRenderingContext2D,
    options: RenderTacticalFrameOptions,
  ): void;
  ```
- **Testing Strategy**:
  - `src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts`:
    - `renderTacticalFrameToCanvas` が `snap` で座標を整数に丸めず浮動小数点精度を維持すること。
    - `tilt: 0, zoom: 1.5`（平面ズームのみ）のとき選手半径に `depthScale` の前後差がつかず一定であり、`tilt: 40` のときは前後差がつくこと。
    - `markerType: 'ring'` の描画時に複合 `Path2D` により `ctx.stroke` / `ctx.fill` がパーツごとの5回ループではなく1回ずつで効率的に呼ばれること。
- **Tasks**:
  - [x] 1. TDD実装: `tactical-frame-renderer.test.ts` にテスト追加 ➔ `tactical-frame-renderer.ts`, `pitch-markings-3d.ts`, `player-renderer.ts` 実装 ➔ `bun run ai:check src/lib/tactical/export/tactical-frame-renderer.ts src/lib/tactical/export/renderers/pitch-markings-3d.ts src/lib/tactical/export/renderers/player-renderer.ts src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts` PASS
- **Worker Handoff Log**:
  - `snap` の恒等関数化、`pitchMarkings3D` 円弧セグメント高精細化、`CACHED_COMBINED_MARKER_PATH` による 1 パス描画、透視投影傾き成分（`m[7]`, `m[3]`）有無に応じた `depthScale` 適用を完了。

### Phase 2: プレビュー1080p高解像度化・0°/90°正面2Dパス統一・写真再デコード防止・境界線比率同期
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/panels/export/use-export-preview-animation.ts`, `src/features/tactical-unified/panels/export/export-preview-player.tsx`, `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx`, `src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx`
- **契約 (Interface)**:
  ```ts
  export function hasActivePitchTransform(pt?: PitchTransform | null): boolean;
  ```
- **Testing Strategy**:
  - `src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx`:
    - プレビュー `<canvas>` の解像度が `4:5` で `1080x1350`（`16:9` で `1920x1080`）になること。
    - カメラが `tilt: 0, yaw: 90, zoom: 1, panX: 0, panY: 0` のとき `renderTacticalFrameToCanvas` に `mvpMatrix: null` が渡されること。
    - カメラドラッグ（`pointerMove`）を繰り返しても `preloadSlidePlayerPhotos` が再実行されないこと。
    - `boundaryBox`（例: `{ x: 10, y: 10, width: 50, height: 80, enabled: true }`）設定時に外枠コンテナへ切り抜き比率の `aspectRatio` スタイルが適用されること。
- **Tasks**:
  - [x] 1. TDD実装: `tactical-split-preview-panel.test.tsx` にテスト追加 ➔ `use-export-preview-animation.ts`, `export-preview-player.tsx`, `tactical-split-preview-panel.tsx` 実装 ➔ `bun run ai:check src/features/tactical-unified/panels/export/use-export-preview-animation.ts src/features/tactical-unified/panels/export/export-preview-player.tsx src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx` PASS
- **Worker Handoff Log**:
  - `hasActivePitchTransform` を export。`PREVIEW_DIMENSIONS` を Full HD (1080p) 解像度に統一し、`boundaryBox` 有効時の `previewAspectStyle` をコンテナ div の style に適用。
  - `useAnimationFrameLoop` を `use-animation-frame-loop.ts` に分割してファイルサイズ300行制限を遵守し、`photoSignature` による選手写真再デコード抑制を実装。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-31 16:10
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  Full HD 1080pプレビュー解像度統一、snapの恒等化によるサブピクセル精度維持、3D円弧高精細化、複合Path2Dによるリングマーカー1パス描画、平面視でのdepthScaleバイパス、正面カメラ初期状態でのmvpMatrix null（2Dパス）統一、photoSignatureによる写真再デコード・bitmap破棄抑制、およびboundaryBox切り抜き比率同期の全6受入要件を完全充足。ホスト境界・Store Provider・RAIIもクリア。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
