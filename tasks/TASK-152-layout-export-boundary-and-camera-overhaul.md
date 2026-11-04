# TASK-152: レイアウト・エクスポート画面の境界線基準統一とカメラ操作・遅延保存の根本修正

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-04
- **Target Files**:
  - `src/features/tactical-unified/panels/split-preview/preview-boundary-overlay.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/hooks/use-tactical-auto-save.ts` (MODIFY)
  - `src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx` (MODIFY)
  - `src/features/tactical-unified/hooks/__tests__/use-tactical-auto-save-match.test.ts` (MODIFY)
  - `src/lib/tactical/export/tactical-frame-renderer.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-preview-player.tsx` (MODIFY)
  - `src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/__tests__/export-preview-player.test.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. **ピッチのカメラ操作（tilt/yaw, Shift+pan, wheel zoom）の完全復旧**: `PreviewBoundaryOverlay` の内側領域（`boundary-box-frame`）を `pointer-events-none` に変更し、ピッチ上のドラッグ（tilt/yaw）、Shift+ドラッグ（pan）、ホイール（zoom）が背後の `<canvas>` へ確実に透過・動作すること。境界線枠の移動は4辺の枠線バー（`boundary-edge-top/bottom/left/right`）のドラッグで行い、サイズ変更は4隅のハンドルで行うこと。
- [x] 2. **右パネル開閉時の全比率完全固定**: レイアウト画面（`TacticalSplitPreviewPanel`）のステージコンテナで `w-full max-h-full` による横伸び変形を廃止し、親の `containerType: 'size'` に対して厳密なアスペクト比（停止時は `16 / 9`、再生時は境界線比率 `previewAspectStyle`）で内接・中央配置すること。内部 `<canvas>` と `PreviewBoundaryOverlay` が余白ゼロで 1:1 一致し、右パネル開閉で境界線やピッチの比率・位置が一切変化しないこと。
- [x] 3. **ドラッグ終了時（指を離した時）のみのセーブ発火**: `TacticalSplitPreviewPanel` のカメラドラッグ中はローカル state（`dragPitchTransform`）で 60fps 描画して `pointerup` 時にのみ `updatePitchTransform` をコミットすること。さらに `useTacticalAutoSave` で `window` の `pointerdown`〜`pointerup`/`pointercancel`（RAII クリーンアップ付）を監視し、ドラッグ中（`isPointerDown === true`）は `saveStatus = 'saving'` および DB 保存タイマーを発火させず、指を離した後にのみ保存を開始すること。
- [x] 4. **16:9基準描画＋境界線切り抜きの2段階分離と中央比率プレビュー**: `tactical-frame-renderer.ts` の座標逆算ロジックを撤去し、常に基準 16:9 解像度（`baseWidth × baseHeight`）でシーンを描画した上で境界線領域（`x, y, width, height` %）を切り抜く2段階方式に統一すること。レイアウト画面の再生時およびエクスポート画面（`ExportPreviewPlayer`）では、プレビュー枠自体を境界線内の縦横比にして中央配置し、境界線内の動画・画像を 1:1 で表示すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { useExportPreviewAnimation } from '@/features/tactical-unified/panels/export/use-export-preview-animation';
import { renderTacticalFrameToCanvas, type RenderTacticalFrameParams } from '@/lib/tactical/export/tactical-frame-renderer';
import { calculateBoundaryCrop } from '@/lib/tactical/export/video-crop-calc';
import type { BoundaryBox, PitchTransform } from '@/lib/types/tactical/slide';
```

### 3.2 Key Interfaces & Types
```ts
// src/lib/tactical/export/tactical-frame-renderer.ts
export interface RenderTacticalFrameParams {
  width: number;
  height: number;
  baseWidth?: number;  // 追加: 16:9正規描画の基準幅 (例: 1920)
  baseHeight?: number; // 追加: 16:9正規描画の基準高 (例: 1080)
  aspectRatio: AspectRatio;
  boundaryBox?: BoundaryBox | null;
  // ...既存フィールド維持
}
```

### 3.3 Reference Pattern (厳密比率コンテナ・2段階クロップ・ドラッグ完了セーブ)
```tsx
// 1. 親のサイズに関わらず厳密な縦横比 (W / H) を維持する中央配置スタイル:
// 親ラッパー: className="... flex items-center justify-center overflow-hidden" style={{ containerType: 'size' }}
// ステージ枠:
const ratioNum = previewWidth > 0 && previewHeight > 0 ? previewWidth / previewHeight : 16 / 9;
style={{
  aspectRatio: `${previewWidth} / ${previewHeight}`,
  width: `min(100%, calc(100cqh * ${ratioNum}))`,
  maxHeight: '100%',
}}

// 2. preview-boundary-overlay.tsx: 内側は透過、4辺エッジバーで移動
<div data-testid="boundary-box-frame" className="absolute border-2 border-[#00A8FF] pointer-events-none" style={boxStyle}>
  <div data-testid="boundary-edge-top" onPointerDown={handleBoxPointerDown} className="absolute -top-1.5 left-2 right-2 h-3 cursor-move pointer-events-auto" />
  <div data-testid="boundary-edge-bottom" onPointerDown={handleBoxPointerDown} className="absolute -bottom-1.5 left-2 right-2 h-3 cursor-move pointer-events-auto" />
  <div data-testid="boundary-edge-left" onPointerDown={handleBoxPointerDown} className="absolute top-2 -left-1.5 bottom-2 w-3 cursor-move pointer-events-auto" />
  <div data-testid="boundary-edge-right" onPointerDown={handleBoxPointerDown} className="absolute top-2 -right-1.5 bottom-2 w-3 cursor-move pointer-events-auto" />
  {/* 4隅ハンドル (boundary-handle-nw/ne/sw/se) は pointer-events-auto を維持 */}
</div>
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: [Level 2/3] レイアウト画面のカメラ操作復旧・右パネル開閉時の比率完全固定・ドラッグ終了時セーブ
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/split-preview/preview-boundary-overlay.tsx`
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx`
  - `src/features/tactical-unified/hooks/use-tactical-auto-save.ts`
  - `src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx`
  - `src/features/tactical-unified/hooks/__tests__/use-tactical-auto-save-match.test.ts`
- **契約 (Interface)**:
  - `PreviewBoundaryOverlay`: `boundary-box-frame` を `pointer-events-none` に変更し、内側のピッチ操作を遮断しない。4辺（`boundary-edge-top`, `boundary-edge-bottom`, `boundary-edge-left`, `boundary-edge-right`）に `pointer-events-auto cursor-move` と `onPointerDown={handleBoxPointerDown}` を配置して枠移動を担わせる。
  - `TacticalSplitPreviewPanel`:
    - `useExportPreviewAnimation` の `boundaryBox` には `isPlaying && isBoundaryActive ? boundaryBox : null` を渡し、再生時は境界線内のみをクロップ再生、停止時は16:9全体＋境界線オーバーレイを表示する。
    - ステージ枠（`data-testid="preview-container"`）は停止時 `16 / 9`、再生時 `previewAspectStyle ?? '16 / 9'` の比率で `width: min(100%, calc(100cqh * ${ratioNum}))` により厳密ロックし、`<canvas>` は `w-full h-full block` で 1:1 重ね合わせにする（右パネル開閉によるズレを根絶）。
    - カメラドラッグ（tilt/yaw, Shift+pan）中はローカル state `dragPitchTransform` を更新して即時描画し、`handlePointerUp` 時のみ `updatePitchTransform` でストア更新する。ホイール zoom（`handleWheel`）も確実に動作させる。
  - `useTacticalAutoSave`: `window` の `pointerdown` / `pointerup` / `pointercancel` / `blur` を監視する `isPointerDown` state（RAIIクリーンアップ付）を追加。`isPointerDown === true` の間は `isDirty` が立っても `setSaveStatus('saving')` や保存タイマーを起動せず、ポインター解放後に発火させる。
- **Testing Strategy**:
  - `tactical-split-preview-panel.test.tsx`: ①境界線有効時も `<canvas>` 上のドラッグで tilt/yaw、Shift+ドラッグで pan、ホイールで zoom が動作し、ドラッグ終了時（pointerUp）に `updatePitchTransform` が呼ばれること、②4辺エッジバーのドラッグで境界線移動がコミットされること、③再生時に境界線比率でクロップ再生されることを検証。
  - `use-tactical-auto-save-match.test.ts`: `pointerdown` 中は `isDirty: true` でも `saveStatus` が `'saving'` にならず、`pointerup` 後に `'saving'` ➔ `'saved'` へ遷移することを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/panels/split-preview/ src/features/tactical-unified/hooks/` PASS
- **Worker Handoff Log**:
  - `PreviewBoundaryOverlay`: `boundary-box-frame` を `pointer-events-none` 化し、枠移動は 4辺バー（`boundary-edge-top/bottom/left/right`）で受領。JSDOMでは `cqh` が無効化されるためテストアサーションは `aspectRatio` で検証。
  - `TacticalSplitPreviewPanel`: ドラッグ中は `dragPitchTransform` でローカル即時描画し `pointerUp` 時にコミット。`useExportPreviewAnimation` には再生時のみ `boundaryBox` を渡す。
  - `useTacticalAutoSave`: `window` の pointerdown〜pointerup（RAIIクリーンアップ）によりドラッグ中は saving を保留し、ドラッグ解放後に保存。

---

### Phase 2: [Level 1/2/3] 16:9基準2段階クロップ描画への刷新とエクスポート画面の境界線比率中央配置
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/tactical/export/tactical-frame-renderer.ts`
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts`
  - `src/features/tactical-unified/panels/export/export-preview-player.tsx`
  - `src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts`
  - `src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts`
  - `src/features/tactical-unified/panels/export/__tests__/export-preview-player.test.tsx`
- **契約 (Interface)**:
  - `renderTacticalFrameToCanvas` (`tactical-frame-renderer.ts`):
    - `RenderTacticalFrameParams` に `baseWidth?: number; baseHeight?: number;` を追加。
    - `isBoundaryActive` 時、基準解像度 `canonicalW = params.baseWidth ?? Math.round((w * 100) / Math.max(1, boundaryBox.width))`、`canonicalH = params.baseHeight ?? Math.round((h * 100) / Math.max(1, boundaryBox.height))` を用いて、モジュールスコープで再利用するオフスクリーン `<canvas>`（`canonicalW × canonicalH`）へ **`boundaryBox: null` で16:9全体フレームを正規描画** し、そこから `cropX = (boundaryBox.x / 100) * canonicalW`, `cropY = (boundaryBox.y / 100) * canonicalH`, `cropW = (boundaryBox.width / 100) * canonicalW`, `cropH = (boundaryBox.height / 100) * canonicalH` を `ctx.drawImage(offscreen, cropX, cropY, cropW, cropH, 0, 0, w, h)` で出力先へ切り抜き描画する（※単体テスト等でオフスクリーン `getContext('2d')` が取得できない環境では、`canonicalW, canonicalH` と `ctx.translate(-cropX, -cropY)` による描画へ安全にフォールバックすること）。
  - `useExportPreviewAnimation`: `renderTacticalFrameToCanvas` 呼び出し時に `baseWidth: basePreviewDim.width, baseHeight: basePreviewDim.height` を渡す。
  - `ExportPreviewPlayer`: 親コンテナに `style={{ containerType: 'size' }}` を設定し、`data-testid="export-preview-viewport"` の枠自体を境界線内の縦横比（`aspectRatio: resolvedAspectRatio`, `width: min(100%, calc(100cqh * ${ratioNum}))`, `maxHeight: '100%'`）で中央配置する。内部 `<canvas>` は `className="w-full h-full block"` でビューポート枠に 1:1 フィットさせる。
- **Testing Strategy**:
  - `tactical-frame-renderer.test.ts`: `boundaryBox` と `baseWidth: 1920, baseHeight: 1080` 指定時に、16:9 基準の座標系から指定領域（`x, y, width, height` %）がズレなくクロップ描画されることを検証。
  - `use-export-preview-animation.test.ts` & `export-preview-player.test.tsx`: 境界線設定時（9:16, 4:5, 1:1, カスタム枠）に `export-preview-viewport` のアスペクト比と `<canvas>` 解像度が境界線比率に一致して中央配置され、`baseWidth/baseHeight` がレンダラーへ渡されることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts` ➔ 実装 ➔ `bun run ai:check src/lib/tactical/export/ src/features/tactical-unified/panels/export/` PASS
- **Worker Handoff Log**:
  - `tactical-frame-renderer`: `RenderTacticalFrameOptions` / `RenderTacticalFrameParams` に `baseWidth`/`baseHeight` 追加。`offscreen-canvas-pool` を新設し JSDOM 等の非完全コンテキストへの安全フォールバックと 2段階描画（`drawImage`）を両立。
  - `ExportPreviewPlayer`: `containerType: 'size'` 親コンテナと `100cqh * ratioNum` で境界線アスペクト比中央配置。`calculateBoundaryCrop` の 8px macroblock alignment を遵守。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-04 23:55
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**: 4大定性監査（6大設計品質原則）を完全クリア。境界線枠のpointer-events透過によるカメラ操作復旧、containerType: 'size' と 100cqh による厳密アスペクト比ロック、ドラッグ完了時コミット＋RAIIによる保存遅延、16:9オフスクリーン描画＋drawImage 2段階クロップが堅牢に実装されていることを確認。

## 6. Rejections / Additional Tasks (不可逆修正欄)
