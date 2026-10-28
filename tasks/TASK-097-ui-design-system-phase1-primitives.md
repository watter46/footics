# TASK-097: UIデザインシステム Phase 1 共通部品 Base UI 統一 ＆ パターン整備

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-28
- **Target Files**:
  - `src/components/ui/menu.tsx` (NEW)
  - `src/components/ui/dialog.tsx` (MODIFY)
  - `src/components/ui/patterns/empty-state.tsx` (NEW)
  - `src/components/ui/patterns/loading-state.tsx` (NEW)
  - `src/components/ui/patterns/error-state.tsx` (NEW)
  - `src/components/ui/patterns/filter-pills.tsx` (NEW)
  - `src/components/ui/length-input.tsx` (MODIFY)
  - `src/components/ui/zone-picker.tsx` (MODIFY)
  - `src/components/ui/scroll-area.tsx` (MODIFY)
  - `src/components/ui/TacticalBenchIndicator.tsx` (MODIFY)
  - `src/components/ui/__tests__/design-primitives.test.tsx` (MODIFY)
  - `src/components/ui/__tests__/design-patterns.test.tsx` (NEW)

## 2. Requirements & Acceptance Criteria
- [x] 1. `@base-ui/react/menu` を用いた `menu.tsx` を新規作成し、L3 `#222226`、`border-white/[0.08]`、`hover:bg-white/[0.06]` を適用。
- [x] 2. `dialog.tsx` を `@base-ui/react/dialog` に移行し、L3背景、`bg-black/70 backdrop-blur-xs`、アクセシブルなフォーカストラップを完備（既存インターフェース `<Dialog open onClose size>` も互換サポート）。
- [x] 3. 汎用パターン `empty-state.tsx`, `loading-state.tsx`, `error-state.tsx`, `filter-pills.tsx` を新トークン準拠で新規作成。
- [x] 4. 既存プリミティブ 4 ファイルから `slate-*` を完全排除し、新トークン（L2 `#18181B`、`border-white/[0.08]`、`#FF8100` 等）へ置換。
- [x] 5. `bun run ai:check src/components/ui` が exit code 0 で全パス。

## 3. Context Snippets

### 3.1 Import Specs
```ts
import { Menu } from '@base-ui/react/menu';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { cn } from '@/lib/utils';
```

### 3.2 Key Interfaces & Contracts
```ts
// menu.tsx
export { Menu as DropdownMenu };
export const DropdownMenuTrigger = Menu.Trigger;
// Popup with Portal & Positioner: L3 #222226, border-white/[0.08], shadow-xl, rounded-[8px]

// empty-state.tsx
export interface EmptyStateProps {
  icon?: React.ElementType | React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

// loading-state.tsx
export function PageLoading({ message }: { message?: string });
export function InlineLoading({ message }: { message?: string });

// error-state.tsx
export interface ErrorStateProps {
  title?: string;
  message: string;
  code?: string;
  onRetry?: () => void;
  backHref?: string;
  backLabel?: string;
  fullscreen?: boolean;
}

// filter-pills.tsx
export interface FilterPillsProps<T extends string = string> {
  items: Array<{ id: T; label: string; count?: number; icon?: React.ReactNode; color?: string }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}
```

### 3.3 Implementation Notes & Gotchas
```ts
// 1. menu.tsx と dialog.tsx は 'use client' 必須。
// 2. dialog.tsx は既存の <Dialog open={open} onClose={onClose} size="lg">{children}</Dialog> も動作するようにラッパー互換性を維持する。
// 3. length-input / zone-picker / scroll-area / TacticalBenchIndicator の slate-* を L2 #18181B, border-white/[0.08], #FF8100 に置換。
```

## 4. Implementation Phases

### Phase 1: Base UI Menu & Dialog
- **Worker Model**: `flash`
- **対象ファイル**: `src/components/ui/menu.tsx`, `src/components/ui/dialog.tsx`, `src/components/ui/__tests__/design-primitives.test.tsx`
- **Tasks**:
  - [x] 1. `@base-ui/react/menu` ラッパーコンポーネント `menu.tsx` を新規作成（L3 `#222226`, `border-white/[0.08]`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`, `DropdownMenuLabel`）。
  - [x] 2. `dialog.tsx` を `@base-ui/react/dialog` ベースにリファクタ。`DialogBackdrop` (`bg-black/70 backdrop-blur-xs`), `DialogContent` (`#222226`), 互換ラッパー `<Dialog open onClose>` を実装。
  - [x] 3. `src/components/ui/__tests__/design-primitives.test.tsx` に Menu と Dialog の単体テストを追加し、`bun run ai:check src/components/ui` で PASS を確認。
- **Worker Handoff Log**:
  - `DropdownMenu` は JSX Root と Menu 名前空間を `Object.assign(Menu.Root, Menu)` で両立 export。
  - `DropdownMenuLabel` (`Menu.GroupLabel`) は `@base-ui/react` の規約上 `<DropdownMenuGroup>` 内で使用必須。

### Phase 2: UI Patterns (Empty, Loading, Error, FilterPills)
- **Worker Model**: `flash`
- **対象ファイル**: `src/components/ui/patterns/*.tsx`, `src/components/ui/__tests__/design-patterns.test.tsx`
- **Tasks**:
  - [x] 1. `empty-state.tsx`, `loading-state.tsx`, `error-state.tsx`, `filter-pills.tsx` を作成。
  - [x] 2. `src/components/ui/__tests__/design-patterns.test.tsx` を作成し各パターンのレンダリングテストを記述。
  - [x] 3. `bun run ai:check src/components/ui/patterns` で PASS を確認。
- **Worker Handoff Log**:
  - `EmptyState`, `PageLoading`, `InlineLoading`, `ErrorState`, `FilterPills` を新トークン準拠で新規作成。`ai:check`（11 tests）全 PASS。

### Phase 3: 既存プリミティブの配色改修
- **Worker Model**: `flash`
- **対象ファイル**: `src/components/ui/length-input.tsx`, `src/components/ui/zone-picker.tsx`, `src/components/ui/scroll-area.tsx`, `src/components/ui/TacticalBenchIndicator.tsx`
- **Tasks**:
  - [x] 1. 4ファイル内の `slate-*` を完全排除し、新トークン（L2 `#18181B`、`border-white/[0.07]`〜`[0.08]`、`#FF8100`）へ置換。
  - [x] 2. `grep -rnE "\b(bg|border|text)-(slate|zinc|gray)-" src/components/ui` で残存 0 件を確認。
  - [x] 3. `bun run ai:check src/components/ui` で全検証 PASS を確認。
- **Worker Handoff Log**:
  - `length-input`, `zone-picker`, `scroll-area`, `TacticalBenchIndicator` から旧カラー（`slate-*`, `fuchsia-*`）を排除し、L2 `#18181B` / `border-white/[0.08]` / `#FF8100` へ統一完了。grep 残存 0 件・`ai:check` 全 PASS。

---

## 5. Reviewer Assessment
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-28 18:52
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: Base UI Menu/Dialog、4大UIパターン、既存プリミティブ改修が完全か
  - [x] 2. ホスト境界 & Store Provider: UIコンポーネントが余計なストア・ホスト依存を持たず純粋か
  - [x] 3. 設計負債 & 拡張性: Base UI のアクセシビリティ仕様に準拠しているか
  - [x] 4. サイレント破壊: 既存の `Dialog` やプリミティブの呼び出し元を壊していないか
- **Summary**: Base UI Menu/Dialog、4大UIパターン（Empty, Loading, Error, FilterPills）、既存プリミティブの配色新トークン統一が完全準拠。既存呼び出し元に対する後方互換性および単体テストのアサーション品質も良好。
