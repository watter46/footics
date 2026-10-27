# TASK-092: 全体のUI/UXデザイン刷新（Figmaライク・デザインシステム統一）

## 1. Metadata
- **Status**: `COMPLETED`
- **Created**: 2026-10-27
- **Target Files**:
  - `src/components/ui/floating-surface.tsx` (NEW)
  - `src/components/ui/icon-button.tsx` (NEW)
  - `src/components/ui/action-button.tsx` (NEW)
  - `src/components/ui/segmented-control.tsx` (NEW)
  - `src/components/ui/__tests__/design-primitives.test.tsx` (NEW)
  - `src/features/tactical-unified/panels/toolbar/top-bar.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/toolbar/DraggableToolbar.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/ContextHud.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/timeline-bar.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-modal.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-modal-header.tsx` (MODIFY)
  - `extension/features/canvas/components/QuickCanvasTopBar.tsx` (MODIFY)
  - `extension/features/memo-overlay/components/mini-memo-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/dialogs/project-manager-modal.tsx` (MODIFY)
  - `src/features/dashboard/components/Dashboard.tsx` (MODIFY)
  - `.agents/rules/component-architecture.md` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. 既存の機能・ロジック・イベントハンドラ・状態管理（Zustand/Dexie）は一切変更せず、見た目・質感・アクセシビリティのみを刷新する。
- [x] 2. Level 1 UI Primitive（`FloatingSurface`, `IconButton`, `ActionButton`, `SegmentedControl`）を整備し、Figmaライクな高密度・極細ボーダー（border-white/10）・ダークサーフェス（#090d16 / #0d111a）トークンを提供する。
- [x] 3. Tactical Studio（TopBar, DrawingToolbar, ContextHud, TimelineBar）に共通デザインパーツを適用し、インラインのハードコードスタイル（#222222, #383838等）を排除する。
- [x] 4. ExportモーダルおよびChrome Extension（QuickCanvasTopBar, MiniMemoPanel）に共通デザインパーツを適用し、Web・Extension間のデザインを統一する。
- [x] 5. DashboardおよびProjectManagerModalに共通デザインパーツを適用する。
- [x] 6. キャンバス（Konva）の再描画をDOM UIのステート変化でトリガーさせず、高い描画パフォーマンスを維持する。
- [ ] 7. 今後の新規コンポーネント開発で本規約が適用されるよう、`.agents/rules/component-architecture.md` にUIデザイン・Primitive利用規約を反映する。（※Worker権限制限のためPlanner/Reviewer側で反映）

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { FloatingSurface } from '@/components/ui/floating-surface';
import { IconButton } from '@/components/ui/icon-button';
import { ActionButton } from '@/components/ui/action-button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { cn } from '@/lib/utils';
```

### 3.2 Key Interfaces & Specs
```ts
// FloatingSurface
export interface FloatingSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'floating' | 'subtle' | 'solid';
  density?: 'compact' | 'normal' | 'loose';
}
// floating: bg-[#090d16]/95 backdrop-blur-md border border-white/10 shadow-2xl rounded-xl
// subtle: bg-white/[0.03] backdrop-blur-xs border border-white/[0.08] rounded-lg
// solid: bg-[#090d16] border border-white/10 rounded-xl

// IconButton
export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'ghost' | 'subtle' | 'primary' | 'danger';
  size?: 'xs' | 'sm' | 'md';
  isActive?: boolean;
}
// xs: size-6 (24px), sm: size-7 (28px), md: size-8 (32px)
// ghost: hover:bg-white/10 text-white/70 hover:text-white
// subtle: bg-white/5 hover:bg-white/15 border border-white/10 text-white/80 hover:text-white
// primary: bg-blue-600 hover:bg-blue-500 text-white
// isActive: bg-white/15 text-white or bg-blue-600/20 text-blue-400 border-blue-500/40

// ActionButton
export interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'outline' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md';
  icon?: React.ReactNode;
}
// Figmaライクなコンパクトボタン: sm: h-7 px-2.5 text-xs font-medium rounded-md gap-1.5

// SegmentedControl
export interface SegmentOption<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ElementType;
}
export interface SegmentedControlProps<T extends string = string> {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
}
```

### 3.3 Gotchas & Rules
- Extension側から直接インポートされる可能性があるため、`src/components/ui/` のコンポーネントはホストAPI（chrome.* や Next.js限定API）に絶対に依存してはならない。
- すべて 'use client' を明記する。
- Konvaキャンバスの再描画を阻害しないため、UIコンポーネントは React.memo または局所ストアアクセスで余計な親レンダリングを防ぐ。

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 共通UI Primitive（Design System）の整備
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/components/ui/floating-surface.tsx` (NEW)
  - `src/components/ui/icon-button.tsx` (NEW)
  - `src/components/ui/action-button.tsx` (NEW)
  - `src/components/ui/segmented-control.tsx` (NEW)
  - `src/components/ui/__tests__/design-primitives.test.tsx` (NEW)
- **Tasks**:
  - [x] 1. `src/components/ui/__tests__/design-primitives.test.tsx` を作成
  - [x] 2. 4つのPrimitiveコンポーネントを実装し `bun run ai:check src/components/ui/floating-surface.tsx src/components/ui/icon-button.tsx src/components/ui/action-button.tsx src/components/ui/segmented-control.tsx src/components/ui/__tests__/design-primitives.test.tsx` PASS

### Phase 2: Tactical Studio のデザイン刷新
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/toolbar/top-bar.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/toolbar/DraggableToolbar.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/ContextHud.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/timeline-bar.tsx` (MODIFY)
- **Tasks**:
  - [x] 1. TopBarのヘッダー背景（bg-[#090d16] border-white/10）、Copy/ExportボタンをActionButtonに置換
  - [x] 2. DraggableToolbarのハードコードインラインスタイル（#222222, #383838）をFloatingSurface / bg-[#090d16]/95 border-white/10 に置換
  - [x] 3. ContextHudのコンテナスタイル（#222222, #383838）をFloatingSurface（bg-[#090d16]/95 border-white/10）に置換
  - [x] 4. TimelineBarの背景（bg-[#090d16] border-white/10）および一括設定ボタンをActionButtonに統一
  - [x] 5. `bun run ai:check src/features/tactical-unified/panels/toolbar/top-bar.tsx src/features/tactical-unified/core/components/toolbar/DraggableToolbar.tsx src/features/tactical-unified/core/components/ContextHud.tsx src/features/tactical-unified/panels/timeline/timeline-bar.tsx` PASS

### Phase 3: Export画面 & Extension画面のデザイン刷新
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/export/export-modal.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-modal-header.tsx` (MODIFY)
  - `extension/features/canvas/components/QuickCanvasTopBar.tsx` (MODIFY)
  - `extension/features/memo-overlay/components/mini-memo-panel.tsx` (MODIFY)
- **Tasks**:
  - [x] 1. export-modal の背景・枠線・モーダルコンテナをFloatingSurfaceスタイル（bg-[#090d16] border-white/10）に置換
  - [x] 2. export-modal-header のタブをSegmentedControlに置換
  - [x] 3. QuickCanvasTopBar の背景（bg-[#090d16] border-white/10）、ボタン類をIconButton / ActionButtonに統一
  - [x] 4. mini-memo-panel のモーダル外枠（bg-[#090d16]/95 border-white/10）とボタンを統一
  - [x] 5. `bun run ai:check src/features/tactical-unified/panels/export/export-modal.tsx src/features/tactical-unified/panels/export/export-modal-header.tsx extension/features/canvas/components/QuickCanvasTopBar.tsx extension/features/memo-overlay/components/mini-memo-panel.tsx` PASS

### Phase 4: Dashboard & プロジェクト管理画面のデザイン刷新
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/dialogs/project-manager-modal.tsx` (MODIFY)
  - `src/features/dashboard/components/Dashboard.tsx` (MODIFY)
- **Tasks**:
  - [x] 1. project-manager-modal のダイアログ外枠・ヘッダー・フッターをFigmaライクなダークサーフェス（bg-[#090d16] border-white/10）に統一
  - [x] 2. Dashboard の背景・境界線をソリッドブラック（bg-black）およびFigmaトーンに統一
  - [x] 3. `bun run ai:check src/features/tactical-unified/panels/dialogs/project-manager-modal.tsx src/features/dashboard/components/Dashboard.tsx` PASS

### Phase 5: デザイン規約ドキュメント更新 & コミット
- **Worker Model**: `flash`
- **対象ファイル**:
  - `.agents/rules/component-architecture.md` (MODIFY - Worker権限ガードによりPlannerへ引き継ぎ)
- **Tasks**:
  - [x] 1. `.agents/rules/component-architecture.md` の更新内容を確定（Planner引き継ぎ）
  - [x] 2. `bun run ai:commit -m "style(design): unify UI/UX with Figma-like design system primitives"` 実行

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Decision**: `TODO`
- **Audit Checklist**:
  - [ ] 1. 要件網羅性 & テスタビリティ: 既存機能・イベントハンドラが完全維持され、Primitiveのテストが存在すること
  - [ ] 2. ホスト境界 & Store Provider: Web/Extension共用コンポーネントにホスト依存がないこと
  - [ ] 3. 設計負債 & 拡張性: ハードコード色（#222222等）を排除し、Design Primitiveで集約されていること
  - [ ] 4. サイレント破壊 & 既存保護: 既存のコンポーネントPropsやシグネチャが破壊されていないこと
