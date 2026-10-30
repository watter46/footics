# TASK-119: 左右2画面スプリット（Side-by-Side）3Dプレビューワークスペースとカメラ操作UIの実装

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-30
- **Target Files**:
  - `src/features/tactical-unified/stores/tool-slice.ts` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/top-bar.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/split-preview/split-preview-camera-bar.tsx` (NEW)
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx` (NEW)
  - `src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx` (NEW)
  - `src/features/tactical-unified/tactical-unified-page.tsx` (MODIFY)
  - `src/features/tactical-unified/__tests__/tactical-unified-page-integration.test.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. **スプリット表示ステートと右パネル自動退避**: `ToolSlice` の `PanelState` に `splitPreviewOpen?: boolean`（初期値 `false`）と `toggleSplitPreview: () => void`, `setSplitPreviewOpen: (open: boolean) => void` を追加。スプリット表示を ON（`true`）にする際、`panels.isRightPanelOpen` を自動的に `false`（48pxアイコンレール）に折りたたむこと。
- [x] 2. **TopBar トグルボタン**: `TopBar`（`top-bar.tsx`）の右側アクション領域に「3D Split（`aria-label="Toggle 3D Split Preview"`）」トグルボタンを配置し、ワンクリックでスプリット表示を開閉できること。
- [x] 3. **右側リアルタイム3Dプレビューパネル (`TacticalSplitPreviewPanel`)**:
  - 上部に `SplitPreviewCameraBar` を配置し、チルト角度プリセットボタン（`0°`, `15°`, `25°`, `35°`）＋微調整スライダー（`0°〜45°`, step `1`）＋現在のズーム倍率表示（例 `1.0x`）＋カメラリセットボタン（`zoom: 1, panX: 0, panY: 0, tilt: 0`）を提供すること。
  - プレビューキャンバス上でのドラッグ操作で現在スライドの `pitchTransform.panX / panY` を移動し、ホイール操作で `pitchTransform.zoom`（`0.5`〜`2.5`）を拡大縮小してスライドごとのカメラワーク（Keyframe）を直感的に保存できること。
  - 停止中（`!isPlaying`）は現在選択中のスライド（`activeSlide`）の最新状態（左画面での選手・ボール・矢印のドラッグ移動やチルト・ズーム・パン変更）をリアルタイムに即座に再描画し、再生ボタンを押すと全スライド間の補間アニメーション（カメラワーク連動）を60fps再生すること。
- [x] 4. **左右2画面（Side-by-Side）ワークスペース統合**: `tactical-unified-page.tsx` で `splitPreviewOpen && !isFocusMode` のとき、中央ワークスペースを左右2分割（左: `FullTacticalCanvas`、右: `TacticalSplitPreviewPanel`）で並列表示すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { Columns2, RotateCcw } from 'lucide-react';
import {
  selectActivePhaseSlides,
  selectActiveSlide,
} from '@/features/tactical-unified/stores/tactical-unified-selectors';
import {
  useTacticalUnifiedStoreContext,
} from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import {
  ExportPreviewControls,
  PREVIEW_DIMENSIONS,
  useExportPreviewAnimation,
} from '@/features/tactical-unified/panels/export/export-preview-player';
```

### 3.2 Key Interfaces & Types
```ts
// src/features/tactical-unified/stores/tool-slice.ts
export interface PanelState {
  sidebarOpen: boolean;
  inspectorOpen: boolean;
  rightPanelTab: 'formation' | 'squad' | 'pitch';
  isRightPanelOpen: boolean;
  splitPreviewOpen?: boolean;
  exportModalOpen: boolean;
  projectManagerModalOpen: boolean;
}

// src/features/tactical-unified/panels/split-preview/split-preview-camera-bar.tsx
export const SPLIT_TILT_PRESETS = [0, 15, 25, 35] as const;

export interface SplitPreviewCameraBarProps {
  tilt: number;
  zoom: number;
  panX: number;
  panY: number;
  onChangeTilt: (tilt: number) => void;
  onResetCamera: () => void;
}
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```ts
// - TacticalSplitPreviewPanel では Store Provider 原則に従い useTacticalUnifiedStoreContext で slides, activeSlide, aspectRatio, pitchAppearance, updatePitchTransform を取得すること。
// - 停止中 (!isPlaying) に左画面での選手ドラッグや現在スライドの編集がリアルタイム反映されるよう、useExportPreviewAnimation に渡す slides は再生中 (isPlaying) なら全 slides、停止中 (!isPlaying) なら activeSlide ? [activeSlide] : slides とし、停止中は activeSlide.pitchTransform をそのまま反映させる（ただし再生ボタンやシークバーは全 slides の totalDurationMs を基準に動作させるため、再生開始時に isPlaying=true で全 slides を走らせるか、停止中は activeSlide の開始時刻へ自動シークさせる）。
// - キャンバス上の直接カメラ操作: onPointerDown / onPointerMove / onPointerUp でドラッグ差分 (dx, dy) を activeSlide.pitchTransform.panX + dx, panY + dy に反映し、onWheel で zoom を Math.max(0.5, Math.min(2.5, +(zoom - e.deltaY * 0.0015).toFixed(2))) として updatePitchTransform(activeSlide.id, patch) を呼ぶこと。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: ストア (`ToolSlice`) のスプリット状態追加・右パネル自動退避と TopBar トグルボタン実装
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/stores/tool-slice.ts`
  - `src/features/tactical-unified/panels/toolbar/top-bar.tsx`
- **契約 (Interface)**:
  - `tool-slice.ts`: `panels.splitPreviewOpen: false` を初期値に追加。`toggleSplitPreview` と `setSplitPreviewOpen(open)` を実装し、スプリットが `true` になる際は `isRightPanelOpen: false` を同時セット。
  - `top-bar.tsx`: 右側アクション領域（`Copy PNG` の左）に `Columns2` アイコンを用いたトグルボタン（`aria-label="Toggle 3D Split Preview"`, `title="Toggle 3D Split Preview (Side-by-Side)"`, `isActive={Boolean(splitPreviewOpen && !isFocusMode)}`）を配置。
- **Testing Strategy**:
  - Phase 3 の統合テストおよび単体検証（`bun run ai:check`）で `toggleSplitPreview` による `splitPreviewOpen` 切替と `isRightPanelOpen: false` 自動退避を検証。
- **Tasks**:
  - [x] 1. 実装 & 検証: `bun run ai:check src/features/tactical-unified/stores/tool-slice.ts src/features/tactical-unified/panels/toolbar/top-bar.tsx` PASS
- **Worker Handoff Log**:
  - ToolSlice: `toggleSplitPreview`, `setSplitPreviewOpen`, `panels.splitPreviewOpen`（ON時に `isRightPanelOpen: false` 連動退避）。
  - TopBar: `Columns2` アイコンで `aria-label="Toggle 3D Split Preview"` トグルボタンを配置済み。

---

### Phase 2: 右側リアルタイム3Dプレビューパネル (`TacticalSplitPreviewPanel`) とカメラ操作バーの実装
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/split-preview/split-preview-camera-bar.tsx` (NEW)
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx` (NEW)
  - `src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx` (NEW)
- **契約 (Interface)**:
  - `split-preview-camera-bar.tsx`: `'use client'`。プリセットボタン（`0°`, `15°`, `25°`, `35°`）、スライダー（`min=0, max=45, step=1, aria-label="3D Tilt Angle Slider"`）、ズームバッジ（`${zoom.toFixed(1)}x`）、リセットボタン（`aria-label="Reset 3D Camera"`）を描画。
  - `tactical-split-preview-panel.tsx`: `'use client'`。上部にヘッダー＋`SplitPreviewCameraBar`、中央に3Dプレビュー `<canvas>`（ドラッグで3Dカメラパン、ホイールで3Dカメラズーム）、下部に `ExportPreviewControls`（再生/一時停止/リセット/シークバー）を配置。
- **Testing Strategy**:
  - `tactical-split-preview-panel.test.tsx`: プリセットボタン（`25°` 等）やスライダー操作で現在スライドの `pitchTransform.tilt` が更新されること、キャンバスホイール・ドラッグで `zoom` / `panX` / `panY` が更新されること、リセットボタンで初期カメラに戻ることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/panels/split-preview/split-preview-camera-bar.tsx src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx` PASS
- **Worker Handoff Log**:
  - `SplitPreviewCameraBar` (export `SPLIT_TILT_PRESETS`, `SplitPreviewCameraBarProps`, `SplitPreviewCameraBar`)、`TacticalSplitPreviewPanel` (export `TacticalSplitPreviewPanel`) を実装。
  - 停止中は `activeSlide` 単一スライド＋`pitchTransform` を渡しリアルタイム編集・チルト・ズーム・ドラッグ操作を即時反映し、再生時は全スライド補間アニメーションを実行。

---

### Phase 3: ワークスペース (`tactical-unified-page.tsx`) への左右2画面スプリット統合
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/tactical-unified-page.tsx`
  - `src/features/tactical-unified/__tests__/tactical-unified-page-integration.test.tsx`
- **契約 (Interface)**:
  - `tactical-unified-page.tsx`: `splitPreviewOpen = useTacticalUnifiedStoreContext((s) => Boolean(s.panels.splitPreviewOpen))` を取得。中央ワークスペースを `<div className="flex-1 min-w-0 relative overflow-hidden flex flex-row bg-[#0D0D0E]">` とし、左側の `<main className="flex-1 min-w-0 relative overflow-hidden flex flex-col bg-[#0D0D0E]"><FullTacticalCanvas ref={canvasRef} /></main>` の右隣に、`{!isFocusMode && splitPreviewOpen && <TacticalSplitPreviewPanel />}`（幅 `w-1/2 min-w-[320px] max-w-[55%] border-l border-white/[0.08]`）を並列配置。
- **Testing Strategy**:
  - `tactical-unified-page-integration.test.tsx`: TopBar の `Toggle 3D Split Preview` ボタン押下で右側3Dプレビューパネルが展開され、同時に開いていた右パネルが自動折りたたみされることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/__tests__/tactical-unified-page-integration.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/tactical-unified-page.tsx src/features/tactical-unified/__tests__/tactical-unified-page-integration.test.tsx` PASS
- **Worker Handoff Log**:
  - `splitPreviewOpen` による中央ワークスペース左右スプリット表示（`FullTacticalCanvas` + `TacticalSplitPreviewPanel`）を `isFocusMode` ガード付きで配線。
  - TopBar トグルによるパネル開閉と右パネルの連動折りたたみを統合テストで検証済み。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-30 20:15
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  4大定性監査（6大設計品質原則）をすべてクリア。Store Provider（Context）経由での安全な状態購読、リアルタイムチルト・パン・ズームカメラ操作の連動反映、スプリットON時の右パネル連動折りたたみ、およびアニメーション再生 hook の再利用による OCP/SLAP 遵守を確認。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
