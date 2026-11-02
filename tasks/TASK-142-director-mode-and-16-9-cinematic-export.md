# TASK-142: director-mode-and-16-9-cinematic-export

## 1. Metadata
- **Status**: `TODO`
- **Created**: 2026-11-03
- **Target Files**:
  - `src/lib/types/tactical/slide.ts` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/screen-background-panel.tsx` (NEW)
  - `src/features/tactical-unified/panels/right-panel/right-panel.tsx` (MODIFY)
  - `src/lib/tactical/export/renderers/pitch-renderer.ts` (MODIFY)
  - `src/lib/tactical/export/tactical-frame-renderer.ts` (MODIFY)
  - `src/lib/tactical/export/video-mediabunny-export.ts` (MODIFY)
  - `src/features/tactical-unified/stores/tool-slice.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/use-keyboard-shortcuts.ts` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/top-bar-center.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/tactical-unified-page.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria
- [ ] 1. 画面背景の独立管理: ピッチ外観（芝・大理石）とは完全に分離し、右パネルに専用タブ（Screen）を新設してダークシネマティック / 単色ダークを設定可能にする
- [ ] 2. 16:9 レンダリング & エクスポート反映: 中心#2B2B2B〜外周#050505の放射グラデーション（キャッシュ最適化済み）と中央ピッチ配置を、画面プレビューおよび mediabunny 1920×1080 MP4 / PNG 出力へ 100% 確実に反映
- [ ] 3. 2モード統合 & Zero-Flicker: スプリット方式を廃止し、✏️ 作図モード (Board) と 🎬 演出モード (Director) の全画面切替。演出モード時は左右パネルを自動折りたたみ、作図復帰時に状態復元
- [ ] 4. 操作 & 再生同期: Tabキーおよびトップバー中央ボタンで即時トグル切替（入力フォーム除外）、Spaceキーで再生/停止（モード遷移なし）、再生秒数の完全同期

## 3. Context Snippets

### 3.1 Import Specs
```ts
import type { ScreenBackgroundConfig } from '@/lib/types/tactical-unified';
import { renderPitch } from './renderers/pitch-renderer';
import { exportVideoWithMediabunny } from '@/lib/tactical/export/video-mediabunny-export';
```

### 3.2 Key Interfaces & Types
```ts
export type WorkspaceMode = 'board' | 'director';

export interface ScreenBackgroundConfig {
  type: 'cinematic' | 'dark'; // cinematic: ビネット加工, dark: #0D0D0E
}
```

### 3.3 Implementation Notes & Gotchas
- ピッチ背景（`pitchAppearance`）と画面背景（`screenBackground`）を混同しないこと。
- 放射グラデーションは毎フレーム新規作成せず、サイズ基準でキャッシュしてエクスポート描画負荷を抑制すること。
- Tabキー押下時は `isInputFocused()` ガードを徹底し、入力フォームでの誤爆を防止すること。

## 4. Implementation Phases

### Phase 1: 画面背景（Screen）独立型定義と右パネル専用タブ新設
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/types/tactical/slide.ts`, `src/features/tactical-unified/stores/project-slice.ts`, `src/features/tactical-unified/panels/right-panel/right-panel.tsx`, `src/features/tactical-unified/panels/right-panel/screen-background-panel.tsx`
- **契約**:
  - `ScreenBackgroundConfigSchema`（`type: 'cinematic' | 'dark'`、既定: `'cinematic'`）を追加し、Project に `screenBackground` を定義。
  - 右パネルに `screen` タブ（Monitor / Sparkles アイコン）を新設し、`ScreenBackgroundPanel` で切り替え可能にする。
- **Testing Strategy**: `src/features/tactical-unified/panels/right-panel/__tests__/screen-background-panel.test.tsx` でタブ切り替えと設定更新を検証。
- **Tasks**:
  - [x] 1. TDD実装: テスト作成 ➔ スキーマ＆パネル実装 ➔ `bun run ai:check` PASS
- **Worker Handoff Log**:
  - Export symbols: `ScreenBackgroundConfigSchema`, `ScreenBackgroundConfig`, `DEFAULT_SCREEN_BACKGROUND`, `ScreenBackgroundPanel`
  - Gotcha: `screenBackground` は project 直下に独立管理され、更新アクション `updateScreenBackground` は `recordHistory` および `isDirty: true` を自動適用。右パネルタブは `'screen'`（Monitor アイコン）。

---

### Phase 2: 16:9 レンダラー基盤とエクスポート（MP4/PNG）確実反映
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/tactical/export/renderers/pitch-renderer.ts`, `src/lib/tactical/export/tactical-frame-renderer.ts`, `src/lib/tactical/export/video-mediabunny-export.ts`
- **契約**:
  - 放射グラデーションのキャッシュ機構を導入（CPU/GPUボトルネック排除）。
  - `renderPitch` で 16:9 背景を描画し、中央にピッチ枠を配置。
  - `exportVideoWithMediabunny` が 16:9 背景付きで 1920×1080 MP4 / 静止画を出力することを確認。
- **Testing Strategy**: `src/lib/tactical/export/__tests__/pitch-renderer-cinematic.test.ts` で背景描画キャッシュと中央ピッチ配置を検証。
- **Tasks**:
  - [x] 1. TDD実装: テスト作成 ➔ レンダラー最適化 ➔ `bun run ai:check` PASS
- **Worker Handoff Log**:
  - Export symbols: `clearPitchRendererCache`, `renderPitch` (`screenBackground?: ScreenBackgroundConfig` added to arg#6), `RenderTacticalFrameOptions.screenBackground`, `VideoExportOptions.screenBackground`
  - Gotcha: `radialGradientCache` は `${w}x${h}` をキーにキャッシュされ、単色ダーク時はグラデーション生成を回避。`clearPitchRendererCache` でキャッシュ破棄可能。

---

### Phase 3: 2モード状態管理とショートカット・再生同期
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/stores/tool-slice.ts`, `src/features/tactical-unified/hooks/use-keyboard-shortcuts.ts`
- **契約**:
  - `tool-slice.ts` に `workspaceMode: 'board' | 'director'`, `toggleWorkspaceMode`, `setWorkspaceMode` を追加。
  - `use-keyboard-shortcuts.ts` に Tab キーハンドラ（`isInputFocused()` チェック付き）を追加。
  - Space キー押下でどちらのモードでも即座に再生/停止が切り替わり、モード遷移しないことを担保。
- **Testing Strategy**: `src/features/tactical-unified/stores/__tests__/workspace-mode.test.ts` で Tab 切替と再生状態の保持をテスト。
- **Tasks**:
  - [x] 1. TDD実装: テスト作成 ➔ ストア＆ショートカット実装 ➔ `bun run ai:check` PASS
- **Worker Handoff Log**:
  - Export symbols: `WorkspaceMode` (`'board' | 'director'`), `savedPanelStateBeforeDirector`, `setWorkspaceMode`, `toggleWorkspaceMode`
  - Gotcha: `tool-slice.ts` 300行ルール遵守のため型定義を `tool-types.ts` に分離して re-export。Tab キー押下時は `isInputFocused()` ガード付きで `toggleWorkspaceMode` をトリガー、Space キーはモード非依存で再生/停止をトグル。

---

### Phase 4: 演出モード画面（DirectorView）とトップバー統合
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx`, `src/features/tactical-unified/panels/toolbar/top-bar-center.tsx`, `src/features/tactical-unified/tactical-unified-page.tsx`
- **契約**:
  - `top-bar-center.tsx` に「✏️ 作図 / 🎬 演出」セグメントコントロール（Tab対応）を追加。
  - `tactical-unified-page.tsx` のスプリット左右分割を廃止し、`workspaceMode === 'director'` で全画面演出ビューを表示。
  - 演出モード表示時は左右パネルを自動非表示とし、作図復帰時に元の開閉状態を復元。
- **Testing Strategy**: `src/features/tactical-unified/__tests__/tactical-unified-page-modes.test.tsx` でモード切替とUIレイアウトを検証。
- **Tasks**:
  - [x] 1. TDD実装: テスト作成 ➔ コンポーネント実装 ➔ `bun run ai:check` PASS
- **Worker Handoff Log**:
  - Export symbols: `TopBarCenter` (`WORKSPACE_MODE_OPTIONS`), `TopBar` (Director mode toggle icon button), `TacticalSplitPreviewPanel` (🎬 Director Mode title & `setWorkspaceMode('board')` close button)
  - Gotcha: `tactical-unified-page.tsx` のスプリット左右分割を全画面切替（`FullTacticalCanvas` ⇄ `TacticalSplitPreviewPanel`）へ置き換え、Director モード時は左右パネルを非表示化。既存の統合テストも director mode に追従済み。

## 5. Reviewer Assessment
- **Reviewer Model**: `pro`
- **Reviewed At**: 
- **Decision**: `TODO`
- **Audit Checklist**:
  - [ ] 1. 要件網羅性 & テスタビリティ: 画面背景の独立管理、16:9背景エクスポート確実反映、2モード統合、Tab/Spaceショートカット、再生同期、Mediabunny出力の全網羅
  - [ ] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Store Provider経由での状態取得、リスナー解放、グラデーションキャッシュ解放
  - [ ] 3. 設計負債 & 拡張性: スプリットの残骸コード排除、SLAP/Shell Purity遵守、ピッチ背景と画面背景の完全分離
  - [ ] 4. サイレント破壊 & 既存保護: 既存作図機能・スライド操作・DB保存の破壊防止
- **Summary**:

## 6. Rejections / Additional Tasks
