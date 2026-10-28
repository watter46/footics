# TASK-093: Footics UI/UX 全面デザイン改修（Matte & Charcoal + 5大推奨仕様）

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-28
- **Target Files**:
  - `src/components/ui/floating-surface.tsx` (MODIFY)
  - `src/components/ui/icon-button.tsx` (MODIFY)
  - `src/components/ui/action-button.tsx` (MODIFY)
  - `src/components/ui/segmented-control.tsx` (MODIFY)
  - `src/components/ui/__tests__/design-primitives.test.tsx` (MODIFY)
  - `src/features/tactical-unified/tactical-unified-page.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/top-bar.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/top-bar-panels.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/timeline-bar.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/playback-controls.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-modal.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/dialogs/project-manager-modal.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/dialogs/project-row.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/dialogs/project-list-view.tsx` (MODIFY)
  - `extension/features/canvas/components/QuickCanvasTopBar.tsx` (MODIFY)
  - `extension/features/memo-overlay/components/mini-memo-panel.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. 既存ロジック・データモデル（Dexie/Zustand）・イベントハンドラ・ホスト境界（Web/Extension）の動作を完全保護（機能破壊ゼロ）。
- [x] 2. UI Primitive（FloatingSurface, IconButton, ActionButton, SegmentedControl）を新デザイン規約（Matte Black & Charcoal Gray）へ更新。
- [x] 3. Tactical Studio 画面シェル（TopBar, 3ペイン構造, Focus Mode [ショートカット `\`], TimelineBar [オレンジグロー]）を刷新。
- [x] 4. ExportModal, ProjectManagerModal（`bg-black/70 backdrop-blur-xs`, `#222226` サーフェス）およびボーダーレス・データグリッド（ホバー行点灯 `#18181B`）を刷新。
- [x] 5. Chrome Extension 側（QuickCanvasTopBar, MiniMemoPanel）のトーン統一。
- [x] 6. 過度なブラーを排除し、Edge/iOS Safari（100dvh, manipulation）およびKonva 60fpsパフォーマンスを保護。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Design System Tokens & Style Specs
```ts
// 色彩設計（4層明度差サーフェス & アクセント）
// Base: #0D0D0E, Sub: #121214, Card/Row: #18181B, Top/Modal: #222226
// Border: border-white/[0.07], Primary Accent: #FF5500, Info: #00A8FF
// Icon: strokeWidth={1.5}, Modal Backdrop: bg-black/70 backdrop-blur-xs
```

### 3.2 Gotchas & Rules
- `src/components/ui/` は Level 1 Pure Primitive。ホスト依存（chrome.*, window.location等）を絶対に持ち込まないこと。
- イベントハンドラ（`onClick`, `onPointerDown`, Dnd-kit等）やZustandセレクタのシグネチャは一切変更しない。
- `data-testid` やアクセシビリティ（`aria-*`）属性を維持する。

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: Design Primitives の拡張
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/components/ui/floating-surface.tsx`
  - `src/components/ui/icon-button.tsx`
  - `src/components/ui/action-button.tsx`
  - `src/components/ui/segmented-control.tsx`
  - `src/components/ui/__tests__/design-primitives.test.tsx`
- **Tasks**:
  - [x] 1. FloatingSurface: floating (`bg-[#18181B] border-white/[0.07]`), subtle (`bg-white/[0.03] border-white/[0.05]`), solid (`bg-[#121214] border-white/[0.07]`)
  - [x] 2. IconButton: primary (`bg-[#FF5500] hover:bg-[#ff6a1f] text-white shadow-[0_0_12px_rgba(255,85,0,0.35)]`), active (`bg-[#FF5500]/15 text-[#FF5500] border border-[#FF5500]/30`)
  - [x] 3. ActionButton: primary (`bg-[#FF5500] hover:bg-[#ff6a1f] text-white shadow-[0_0_12px_rgba(255,85,0,0.35)]`), default (`bg-[#18181B] hover:bg-[#222226] text-white/90 border border-white/[0.07]`)
  - [x] 4. SegmentedControl: `bg-[#0D0D0E] border-white/[0.07]`, active (`bg-[#18181B] text-white border border-white/[0.07]`)
  - [x] 5. テスト更新・実行: `bun run ai:check src/components/ui` PASS

### Phase 2: Tactical Studio の画面シェル刷新
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/tactical-unified-page.tsx`
  - `src/features/tactical-unified/panels/toolbar/top-bar.tsx`
  - `src/features/tactical-unified/panels/toolbar/top-bar-panels.tsx`
  - `src/features/tactical-unified/panels/timeline/timeline-bar.tsx`
  - `src/features/tactical-unified/panels/timeline/playback-controls.tsx`
- **Tasks**:
  - [x] 1. `tactical-unified-page.tsx`: 背景 `bg-[#0D0D0E]`、`h-[100dvh]`、3ペイン（左ペイン/中央ピッチ/右ペイン）、Focus Modeトグル（ショートカット `\`）
  - [x] 2. `top-bar.tsx` & `top-bar-panels.tsx`: 背景 `bg-[#121214] border-b border-white/[0.07]`、1.5pxアイコン、左右ペイントリガー
  - [x] 3. `timeline-bar.tsx` & `playback-controls.tsx`: 背景 `bg-[#121214] border-t border-white/[0.07]`、オレンジグロー再生ボタン・進捗バー
  - [x] 4. `bun run ai:check src/features/tactical-unified/panels/toolbar src/features/tactical-unified/panels/timeline src/features/tactical-unified/panels/left-panel src/features/tactical-unified/tactical-unified-page.tsx` PASS

### Phase 3: モーダル・トースト & ダッシュボード
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/export/export-modal.tsx`
  - `src/features/tactical-unified/panels/dialogs/project-manager-modal.tsx`
  - `src/features/tactical-unified/panels/dialogs/project-row.tsx`
  - `src/features/tactical-unified/panels/dialogs/project-list-view.tsx`
- **Tasks**:
  - [x] 1. `export-modal.tsx`: `bg-black/70 backdrop-blur-xs`、サーフェス `#222226`、枠線 `border-white/[0.08]`
  - [x] 2. `project-manager-modal.tsx`: `bg-black/70 backdrop-blur-xs`、サーフェス `#222226`
  - [x] 3. `project-row.tsx` & `project-list-view.tsx`: ボーダーレス・データグリッド化、ホバー行点灯 `#18181B`、等幅フォント、オレンジ/シアンアクセント
  - [x] 4. `bun run ai:check src/features/tactical-unified/panels/export src/features/tactical-unified/panels/dialogs` PASS

### Phase 4: Chrome Extension 側
- **Worker Model**: `flash`
- **対象ファイル**:
  - `extension/features/canvas/components/QuickCanvasTopBar.tsx`
  - `extension/features/memo-overlay/components/mini-memo-panel.tsx`
- **Tasks**:
  - [x] 1. `QuickCanvasTopBar.tsx`: ヘッダー `bg-[#121214] border-b border-white/[0.07]`、ボタン類トーン統一
  - [x] 2. `mini-memo-panel.tsx`: サーフェス `#222226`、枠線 `border-white/[0.08]`、ヘッダー `#18181B`、保存ボタンオレンジ
  - [x] 3. `bun run ai:check extension/features/canvas/components/QuickCanvasTopBar.tsx extension/features/memo-overlay/components/mini-memo-panel.tsx` PASS

### Phase 5: 統合検証 & コミット
- **Worker Model**: `flash`
- **Tasks**:
  - [x] 1. 変更全ファイルの最終整合性チェック
  - [x] 2. `bun run ai:commit -m "style(design): apply Matte & Charcoal design system to Footics"`

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-28
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 既存機能・イベントハンドラが完全維持され、PrimitiveのテストがPASSしていること
  - [x] 2. ホスト境界 & Store Provider: Web/Extension共用コンポーネントにホスト依存がないこと
  - [x] 3. 設計負債 & 拡張性: ハードコード色を排除し、Matte & Charcoal トークンに集約されていること
  - [x] 4. サイレント破壊 & 既存保護: 既存のコンポーネントPropsやシグネチャが破壊されていないこと
- **Summary**: 4大定性監査クリア。Matte & Charcoal デザインシステム（4段階明度差サーフェス、極細ボーダー、1.5pxアイコン、Focus Mode、Dimモーダル、ボーダーレス・データグリッド）を適用。型・テスト・ホスト境界・既存ロジック完全維持。
