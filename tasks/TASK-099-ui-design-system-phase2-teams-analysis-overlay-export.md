# TASK-099: UIデザインシステム Phase 2-B スカッド・分析・メモ・エクスポート置換

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-28
- **Target Files**:
  - `src/features/teams/components/squad-header.tsx` (MODIFY)
  - `src/features/teams/components/squad-player-card.tsx` (MODIFY)
  - `src/features/teams/components/squad-filter-bar.tsx` (MODIFY)
  - `src/features/teams/components/squad-empty-state.tsx` (MODIFY)
  - `src/features/teams/components/squad-stats-summary.tsx` (MODIFY)
  - `src/features/teams/components/AddPlayerDialog.tsx` (MODIFY)
  - `src/features/teams/components/EditPlayerDialog.tsx` (MODIFY)
  - `src/features/teams/components/CopySeasonPlayersDialog.tsx` (MODIFY)
  - `src/features/teams/components/player-basic-form-fields.tsx` (MODIFY)
  - `src/features/teams/components/PlayerPhoto.tsx` (MODIFY)
  - `src/features/teams/components/TeamSquadClient.tsx` (MODIFY)
  - `src/features/teams/components/copy-season-player-grid.tsx` (MODIFY)
  - `src/features/teams/components/player-whoscored-link-section.tsx` (MODIFY)
  - `src/features/teams/components/squad-category-list.tsx` (MODIFY)
  - `src/features/analysis/components/EventTimeline.tsx` (MODIFY)
  - `src/features/analysis/components/MatchMemoDisplay.tsx` (MODIFY)
  - `src/features/analysis/components/timeline/TimelineHeader.tsx` (MODIFY)
  - `src/features/memo-overlay/components/MemoOverlayModal.tsx` (MODIFY)
  - `src/features/memo-overlay/components/MemoOverlayView.tsx` (MODIFY)
  - `src/features/memo-overlay/components/parts/*.tsx` (MODIFY)
  - `src/app/export/page.tsx` (MODIFY)
  - `src/features/tactical-unified/components/export-page-view.tsx` (MODIFY)
  - `src/features/tactical-unified/components/shared-export-view.tsx` (MODIFY)
  - `src/features/tactical-unified/components/share-page-client-view.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/CanvasStageContainer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/BoundaryBoxHud.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/x-media-preset-menu.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria
- [x] 1. スカッド画面群（`src/features/teams/` 14ファイル）の `slate-*` を全廃し、L2 Card、新 `Button`, `IconButton`, `PositionBadge`, `FilterPills`, `EmptyState`, `KpiTile`, 新 `Dialog` に全面統一。
- [x] 2. タイムライン・分析（`EventTimeline`, `TimelineHeader`, `MatchMemoDisplay`）の背景を L0/L1、Card を新 `Card`, `IconButton` に統一。
- [x] 3. メモオーバーレイ（`MemoOverlayModal`, `MemoOverlayView`, `parts/*` 8ファイル）の背景を L3 `#222226`、`border-white/[0.08]`、新 `Button`, `Input` に置換。
- [x] 4. エクスポート画面群（`export/page.tsx`, `export-page-view`, `shared-export-view`, `share-page-client-view`）および HUD（`BoundaryBoxHud`, `x-media-preset-menu`）を L0/L1/L2、新 `DropdownMenu`、`PageLoading`, `EmptyState`, `ErrorState` に統一。
- [x] 5. 全体検証 `grep -rnE "\b(bg|border|text)-(slate|zinc|gray|neutral)-" src/app src/features src/components" が 0 件、`bun run ai:check` PASS。

## 3. Context Snippets

### 3.1 Import Specs
```ts
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/menu';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Card, KpiTile } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/select';
import { PositionBadge } from '@/components/ui/position-badge';
import { EmptyState } from '@/components/ui/patterns/empty-state';
import { PageLoading } from '@/components/ui/patterns/loading-state';
import { ErrorState } from '@/components/ui/patterns/error-state';
```

### 3.2 Key Notes
```ts
// 1. AddPlayerDialog / EditPlayerDialog / CopySeasonPlayersDialog: 自前 createPortal 削除 -> 新 Dialog 利用
// 2. BoundaryBoxHud / x-media-preset-menu: 自前 handleClickOutside 削除 -> 新 DropdownMenu 利用
// 3. 全ファイルで slate-*, zinc-*, gray-*, neutral-* クラスのベタ書きを完全排除
```

## 4. Implementation Phases

### Phase 1: スカッド・チーム詳細の置換
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/teams/components/*.tsx`
- **Tasks**:
  - [x] 1. `squad-header.tsx`: L2 Card化、新 `Button`, `NativeSelect`、独自 `COLOR_STYLES` 撤廃。
  - [x] 2. `squad-player-card.tsx`: L2 Card、新 `IconButton`, `PositionBadge` 適用。
  - [x] 3. `squad-filter-bar.tsx` を `FilterPills`、`squad-empty-state.tsx` を `EmptyState`、`squad-stats-summary.tsx` を `KpiTile` に置換。
  - [x] 4. `AddPlayerDialog`, `EditPlayerDialog`, `CopySeasonPlayersDialog`, `player-basic-form-fields` を新 `Dialog`, `Input`, `NativeSelect`, `Button` で統一。
  - [x] 5. `PlayerPhoto`, `TeamSquadClient`, `copy-season-player-grid`, `player-whoscored-link-section`, `squad-category-list` の `slate-*` を新トークンへ置換。
  - [x] 6. `bun run ai:check src/features/teams` PASS。
- **Worker Handoff Log**:
  - `src/features/teams` 配下 14 ファイルの旧カラートークン (`slate-*`) を完全排除し、Base UI / デザインシステムトークン（`Card`, `KpiTile`, `Button`, `IconButton`, `PositionBadge`, `FilterPills`, `EmptyState`, `Dialog`, `Input`, `NativeSelect`, `PageLoading`）に刷新。全 45 件のテストおよび Biome/TS 検証 PASS。

### Phase 2: タイムライン・分析 ＆ メモオーバーレイの置換
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/analysis/components/**/*.tsx`, `src/features/memo-overlay/components/**/*.tsx`
- **Tasks**:
  - [x] 1. `EventTimeline.tsx`, `TimelineHeader.tsx`, `MatchMemoDisplay.tsx` の L0/L1 背景、新 `Card`, `IconButton` 置換。
  - [x] 2. `MemoOverlayModal.tsx` & `MemoOverlayView.tsx` を L3 `#222226`、`border-white/[0.08]` に刷新。
  - [x] 3. `parts/` 配下全ファイルの `slate-*` 撤廃、新 `Button`, `Input` 適用。
  - [x] 4. `bun run ai:check src/features/analysis src/features/memo-overlay` PASS。
- **Worker Handoff Log**:
  - `EventTimeline`, `TimelineHeader`, `MatchMemoDisplay` を L0/L1 背景・新 `Card`/`IconButton` に刷新、旧 `slate-*` ゼロ化。
  - `MemoOverlayModal`, `MemoOverlayView` および `parts/*` 全ファイル（`MatchMemoUnit`, `MemoOverlayFooterNav`, `MemoOverlayHeader` 等）で新 `Button`, `IconButton` を適用し、L3 (`bg-surface-l3`) およびデザイントークンへ完全統一。全 70 件のテスト PASS。

### Phase 3: エクスポート・共有画面 ＆ HUD メニューの置換
- **Worker Model**: `flash`
- **対象ファイル**: `src/app/export/page.tsx`, `src/features/tactical-unified/components/*.tsx`, `src/features/tactical-unified/core/components/*.tsx`, `src/features/tactical-unified/panels/toolbar/x-media-preset-menu.tsx`
- **Tasks**:
  - [x] 1. `export/page.tsx` & `export-page-view.tsx` を L0/L1/L2、新 `EmptyState`, `PageLoading`, `ErrorState`, `Card`, `Button` に置換。
  - [x] 2. `shared-export-view.tsx` & `share-page-client-view.tsx` を L0/L2、新 `Card`, `Button`, `PageLoading` に置換。
  - [x] 3. `CanvasStageContainer.tsx` の `bg-zinc-950` を L0 `#0D0D0E` に置換。
  - [x] 4. `BoundaryBoxHud.tsx` & `x-media-preset-menu.tsx` の自前 OutsideClick を新 `DropdownMenu` に置換、L3 背景適用。
  - [x] 5. `bun run ai:check src/app/export src/features/tactical-unified` PASS。
- **Worker Handoff Log**:
  - `export/page.tsx`, `export-page-view.tsx`, `shared-export-view.tsx`, `share-page-client-view.tsx` の旧配色を排除し、L0/L1/L2 および新 `Card`, `Button`, `EmptyState`, `PageLoading`, `ErrorState` へ置換。
  - `CanvasStageContainer.tsx` の `bg-zinc-950` を `bg-surface-l0` に置換。`BoundaryBoxHud.tsx` と `x-media-preset-menu.tsx` の自前 OutsideClick を新 `DropdownMenu` に置換して L3 背景を適用。全関連テスト 25 件および `bun run ai:check` PASS。

### Phase 4: 全体スコープ最終検証
- **Worker Model**: `flash`
- **Tasks**:
  - [x] 1. `grep -rnE "\b(bg|border|text)-(slate|zinc|gray|neutral)-" src/app src/features src/components --exclude-dir=test` で残存 0 件を確認。
  - [x] 2. `bun run ai:check src/components/ui src/features src/app` で exit code 0 を確認。
- **Worker Handoff Log**:
  - `grep -rnE "\b(bg|border|text)-(slate|zinc|gray|neutral)-"` 残存 0 件を確認。
  - `bun run ai:check` および `vitest run` 全 626 件のテストがすべて exit code 0 (PASS) であることを確認完了。

---

## 5. Reviewer Assessment
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-28 19:48
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性: 52ファイルすべての旧配色完全排除、Base UI 統一
  - [x] 2. ホスト境界 & Store Provider: モーダル・ダイアログの挙動が安定しているか
  - [x] 3. 設計負債 & 拡張性: 自前 OutsideClick/Portal の完全撤廃
  - [x] 4. サイレント破壊: スカッド登録、メモ入力、エクスポート共有の各機能が壊れていないか
- **Summary**: スカッド、分析、メモオーバーレイ、エクスポート画面、HUDメニューに渡る52ファイルの旧カラートークン（slate/zinc/gray/neutral）完全撤廃を確認。自前 createPortal や OutsideClick リスナーを Base UI の Dialog/DropdownMenu へ全面統一し、メモリリーク防止と宣言的UIの向上を達成。ホスト境界・StoreProvider・既存機能の破壊もなく品質基準をクリア。
