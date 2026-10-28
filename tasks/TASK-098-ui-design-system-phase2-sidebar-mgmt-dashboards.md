# TASK-098: UIデザインシステム Phase 2-A サイドバー・データ管理・ダッシュボード置換

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-28
- **Target Files**:
  - `src/features/sidebar/components/MainSidebar.tsx` (MODIFY)
  - `src/features/sidebar/components/TeamFilter.tsx` (MODIFY)
  - `src/features/sidebar/components/TimelineSourceFilter.tsx` (MODIFY)
  - `src/features/sidebar/components/OutcomeFilter.tsx` (MODIFY)
  - `src/features/sidebar/components/StrategyFilter.tsx` (MODIFY)
  - `src/features/management/data-io/components/DataManagementMenu.tsx` (MODIFY)
  - `src/features/management/data-io/components/GlobalDataManagement.tsx` (MODIFY)
  - `src/features/management/data-io/components/ImportMatchButton.tsx` (MODIFY)
  - `src/components/layout/TeamsDropdown.tsx` (MODIFY)
  - `src/features/dashboard/widgets/dashboard-loading/components/dashboard-loading-view.tsx` (MODIFY)
  - `src/features/dashboard/widgets/cache-recovery/components/cache-recovery-view.tsx` (MODIFY)
  - `src/features/match/components/match-view-wrapper.tsx` (MODIFY)
  - `src/features/match/components/match-list-client.tsx` (MODIFY)
  - `src/features/national-dashboard/components/NationalDashboard.tsx` (MODIFY)
  - `src/app/tactical/error.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria
- [x] 1. サイドバー（`MainSidebar`, `TeamFilter`, `TimelineSourceFilter`, `OutcomeFilter`, `StrategyFilter`）の `slate-*` を全廃し、L1/L2、新 `Select`, `SegmentedControl`, `FilterPills` / `Button` に置換。
- [x] 2. データ管理（`DataManagementMenu`, `GlobalDataManagement`, `TeamsDropdown`）の自前 OutsideClick / `div.absolute` を新 `DropdownMenu` に置換し、`ImportMatchButton` を新 `Button` に統一。
- [x] 3. ダッシュボード・Match関連（`dashboard-loading-view`, `cache-recovery-view`, `match-view-wrapper`, `match-list-client`, `NationalDashboard`, `src/app/tactical/error.tsx`）の自前ローディング/エラー/空状態を新共通パターン（`PageLoading`, `ErrorState`, `EmptyState`, 新 `Card` / `Button`）に置換。
- [x] 4. 対象ファイルから `slate-*`, `zinc-*` が 0 件となり、`bun run ai:check` が PASS。

## 3. Context Snippets

### 3.1 Import Specs
```ts
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/menu';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Card } from '@/components/ui/card';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { EmptyState } from '@/components/ui/patterns/empty-state';
import { PageLoading } from '@/components/ui/patterns/loading-state';
import { ErrorState } from '@/components/ui/patterns/error-state';
import { FilterPills } from '@/components/ui/patterns/filter-pills';
```

### 3.2 Key Contracts & Notes
```ts
// 1. MainSidebar: L1 #121214, border-white/[0.07], モバイル閉じるボタンを IconButton variant="ghost"
// 2. DataManagementMenu & GlobalDataManagement & TeamsDropdown: 自前 isOpen/handleClickOutside 削除 -> DropdownMenu
// 3. dashboard-loading-view & match-view-wrapper: 自前 Loader2 削除 -> PageLoading
// 4. tactical/error.tsx & match-view-wrapper: 自前エラー表示 -> ErrorState
// 5. match-list-client: 自前 EmptyState 削除 -> 共通 EmptyState
```

## 4. Implementation Phases

### Phase 1: サイドバー ＆ フィルター群の置換
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/sidebar/components/*.tsx`
- **Tasks**:
  - [x] 1. `MainSidebar.tsx` を L1 `#121214`、`border-white/[0.07]`、閉じるボタンを新 `IconButton` に置換。
  - [x] 2. `TeamFilter.tsx` の `className` 上書き（`slate-*`）を削除し、新 `Select` トークンを適用。
  - [x] 3. `TimelineSourceFilter.tsx` を新 `SegmentedControl` に置換。
  - [x] 4. `OutcomeFilter.tsx` と `StrategyFilter.tsx` を新 `FilterPills` / `Button` に置換。
  - [x] 5. `bun run ai:check src/features/sidebar` PASS。
- **Worker Handoff Log**:
  - サイドバー全5ファイル（`MainSidebar`, `TeamFilter`, `TimelineSourceFilter`, `OutcomeFilter`, `StrategyFilter`）から `slate-*` / `zinc-*` を完全排除（0件確認済）。
  - 新UIコンポーネント（`IconButton`, `SegmentedControl`, `FilterPills`, `Button`）に置換し、テスト 4/4 PASS。

### Phase 2: データ管理メニュー ＆ ドロップダウンの Base UI 置換
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/management/data-io/components/*.tsx`, `src/components/layout/TeamsDropdown.tsx`
- **Tasks**:
  - [x] 1. `DataManagementMenu.tsx` と `GlobalDataManagement.tsx` の自前 `div.absolute` / backdrop を新 `DropdownMenu` に置換。
  - [x] 2. `ImportMatchButton.tsx` を新 `Button variant="secondary"` に置換。
  - [x] 3. `TeamsDropdown.tsx` の自前 OutsideClick を新 `DropdownMenu` に置換。
  - [x] 4. `bun run ai:check src/features/management/data-io src/components/layout` PASS。
- **Worker Handoff Log**:
  - `DropdownMenuLabel` は Base UI の仕様上 `DropdownMenuGroup` 内で配置。自前 `isOpen`/backdrop/`document.addEventListener` を全廃し、`DropdownMenu` + `Button` に統一。
  - 4対象ファイルから `slate-*`, `zinc-*` を完全排除（0件確認済）。テスト 10/10 PASS。

### Phase 3: ダッシュボード・Match・Error 画面の共通パターン置換
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/dashboard/widgets/**/*-view.tsx`, `src/features/match/components/*.tsx`, `src/features/national-dashboard/components/*.tsx`, `src/app/tactical/error.tsx`
- **Tasks**:
  - [x] 1. `dashboard-loading-view.tsx` を `PageLoading` に置換。
  - [x] 2. `cache-recovery-view.tsx` を新 `Card`, `Button`, L0 `#0D0D0E` に置換。
  - [x] 3. `match-view-wrapper.tsx` のローディングを `PageLoading`、エラーを `ErrorState` に置換。
  - [x] 4. `match-list-client.tsx` のローカル `EmptyState` を共通 `EmptyState` に置換。
  - [x] 5. `NationalDashboard.tsx` の背景・ヘッダーを L0/L1、ボタンを新 `Button` に置換。
  - [x] 6. `src/app/tactical/error.tsx` を共通 `ErrorState` に置換。
  - [x] 7. `bun run ai:check src/features/dashboard src/features/match src/features/national-dashboard src/app/tactical` PASS。
- **Worker Handoff Log**:
  - `ErrorState` に `retryLabel?: string` を追加（デフォルト `'Retry'`、日本語等カスタム可）。
  - 対象6ファイルから `slate-*` / `zinc-*` を完全排除（0件確認済）。共通パターン（`PageLoading`, `ErrorState`, `EmptyState`, 新 `Card`/`Button`）への統一完了。全42テストPASS。

---

## 5. Reviewer Assessment
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-28 19:16
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 自前ドロップダウンの完全撲滅、ローディング・エラー・空状態の統一
  - [x] 2. ホスト境界 & Store Provider: フリッカーがなく、状態更新が正常に追従するか
  - [x] 3. 設計負債 & 拡張性: OCP 遵守、不要なスタイルベタ書きがないか
  - [x] 4. サイレント破壊: ファイルインポート・バックアップ復旧・フィルター動作が維持されているか
- **Summary**: 全15対象ファイルから `slate-*`/`zinc-*` を完全排除し、Base UI コンポーネントおよび新デザインシステム共通パターン（DropdownMenu, PageLoading, ErrorState, EmptyState, SegmentedControl, FilterPills, Button, Card）へ綺麗に置換完了。自前リスナー・独自 OutsideClick も一掃され、イベント配線・アクセシビリティ・テスタビリティともに申し分なし。
