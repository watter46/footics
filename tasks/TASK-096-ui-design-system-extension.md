# TASK-096: Chrome Extension への新UIデザインシステム適用

## 1. Metadata
- **Status**: `READY`
- **Created**: 2026-10-28
- **Updated**: 2026-10-29 (新デザインシステム components.html / TASK-097〜100 仕様反映)
- **SSOT**:
  - `public/design-demos/components.html` (コンポーネントカタログ・Matte & Charcoal 厳格仕様)
  - `.agents/rules/coding-standards.md` (UIデザイン規約)
- **Target Files**:
  - `extension/features/dashboard/components/DashboardView.tsx` (MODIFY)
  - `extension/features/dashboard/components/DashboardHeader.tsx` (MODIFY)
  - `extension/features/dashboard/components/DashboardStatsBar.tsx` (MODIFY)
  - `extension/features/dashboard/components/ScreenshotEmptyState.tsx` (MODIFY)
  - `extension/features/dashboard/components/VideoGroupCard.tsx` (MODIFY)
  - `extension/features/dashboard/components/ScreenshotCard.tsx` (MODIFY)
  - `extension/features/canvas/components/QuickCanvasTopBar.tsx` (MODIFY)
  - `extension/features/canvas/components/RatioPresetSelector.tsx` (MODIFY)
  - `extension/features/canvas/components/VideoMetaInfo.tsx` (MODIFY)
  - `extension/features/canvas/components/__tests__/quick-top-bar.test.tsx` (MODIFY)
  - `extension/features/memo-overlay/components/mini-memo-panel.tsx` (MODIFY)
  - `extension/features/memo-overlay/components/QuickTagBar.tsx` (MODIFY)
  - `extension/features/memo-overlay/components/success-toast.tsx` (MODIFY)
  - `extension/features/memo-overlay/__tests__/quick-tag-bar.test.tsx` (MODIFY)
  - `extension/features/sidepanel/components/sidepanel-view.tsx` (MODIFY)

---

## 2. Requirements & Acceptance Criteria (受入要件)
- [ ] 1. **Extension Dashboard 刷新**:
  - `zinc-*` ハードコードを完全排除。
  - 全体背景に L0 (`#0D0D0E`)、ヘッダーに L1 (`#121214`)、カード類に L2 (`#18181B`)、極細枠線 `border-white/[0.07]` を適用。
  - 検索入力に新 `SearchInput`、お気に入りトグル・再読込に新 `Button` / `IconButton` を適用。
  - 統計バー（`DashboardStatsBar`）に新 `KpiTile` / L2 Card スタイルを適用。
  - 空状態（`ScreenshotEmptyState`）に共通 `EmptyState` パターンを適用。
  - `VideoGroupCard` / `ScreenshotCard` を新 L2 Card、新 `IconButton`、ネオンオレンジ（`#FF5500` / `#FF8100`）のお気に入り表示、等幅フォントタイムスタンプへ刷新。
  - ローディング表示を共通 `PageLoading` / `InlineLoading` パターンへ統一。
- [ ] 2. **Quick Canvas 刷新**:
  - `QuickCanvasTopBar`: L1 ヘッダー (`#121214`)、枠線 `border-white/[0.07]`、新 `IconButton` / `ActionButton` で統一。プライマリ操作（X共有）は新デザインのネオンオレンジ（`btn-guideline-primary` / `#FF5500`）へ統一。
  - `RatioPresetSelector`: 旧青色（`bg-blue-600`, `text-blue-400`）を完全排除し、半透明オレンジ（`bg-[#FF8100]/20 text-[#FF8100] border-[#FF8100]/40 shadow-[0_0_10px_rgba(255,129,0,0.2)]`）または新 `SegmentedControl` 体系へ統一。
  - `VideoMetaInfo`: メタテキスト・リンク・時刻表示を新トークン（`#A1A1AA`, `#71717A`）へ統一。
  - `quick-top-bar.test.tsx`: 旧青色（`bg-blue-600`）を検証していたテストアサーションを新プライマリボタンスタイルへ更新。
- [ ] 3. **Memo Overlay 刷新**:
  - `mini-memo-panel`: L3 Modal (`#222226`、枠線 `border-white/[0.08]`)、ヘッダー L2 (`#18181B`)、入力部 L0 (`#0D0D0E`)、新 `Button`（保存: `#FF5500`）、新 `IconButton` へ刷新。
  - `QuickTagBar`: 旧 `slate-*` を完全排除。L3 背景、選択時の半透明オレンジハイライト（`bg-[#FF8100]/20 text-[#FF8100] border-[#FF8100]/50`）、ショートカット番号バッジへ統一。
  - `success-toast`: 旧 `bg-slate-900` を L3 (`#222226`)、枠線 `border-emerald-500/30`、新タイポグラフィへ刷新。
  - `quick-tag-bar.test.tsx`: タグ選択スタイルのアサーションを新トークンへ同期。
- [ ] 4. **Sidepanel 刷新**:
  - `sidepanel-view`: 旧 `slate-*`（`slate-950`, `slate-900`, `slate-800` 等）を完全撤廃。
  - 背景 L0 (`#0D0D0E`)、ヘッダー L1 (`#121214`)、入力部 L1/L2、保存ボタンに新 `Button`（`variant="primary"` / `#FF5500`）、ダッシュボード遷移に新 `IconButton` を適用。
- [ ] 5. **旧カラートークン完全排除**:
  - 対象ファイル群から `zinc-*`, `slate-*`, `gray-*`, `neutral-*` のベタ書きクラスを 0 件にする。
- [ ] 6. **ホスト境界 & 既存機能保護**:
  - `extension/` から `@/components/ui/...` への一方向依存を維持し、Web側に拡張機能依存を持ち込まない。
  - IndexedDB 同期、Alt+S キャプチャ、ショートカットキー（Ctrl+Enter, Esc, 1〜4, Alt+M）、キャンバス編集、画像ダウンロードの全動作を破壊しない。
- [ ] 7. **検証**:
  - `bun run ai:check extension/features` が exit code 0 で全テスト PASS すること。

---

## 3. Context Snippets (設計・実装規約)

### 3.1 4階層サーフェス明度設計 ＆ トークン仕様
```tsx
// 4階層サーフェス（純黒を排した階層）
// L0: CANVAS / BASE BG   -> #0D0D0E (bg-surface-l0)
// L1: SIDEBAR / TOPBAR   -> #121214 (bg-surface-l1)
// L2: CARD / ROW / PANEL -> #18181B (bg-surface-l2)
// L3: MODAL / OVERLAY    -> #222226 (bg-surface-l3)
// 枠線: border-white/[0.07] (L1/L2) または border-white/[0.08] (L3)

// アクセントカラー体系
// 主要アクション (Primary): #FF5500 / #FF8100 (ネオンオレンジ)
// 選択中ハイライト: bg-[#FF8100]/20 text-[#FF8100] border-[#FF8100]/40 shadow-[0_0_10px_rgba(255,129,0,0.2)]
// 成功 (Success): #10B981 (エメラルド)
// 危険 (Destructive): #EB3B5A / #EF4444
// テキスト基本色: 主文 text-[#F4F4F5] (text-white), 補足 text-[#A1A1AA], 弱 text-[#71717A]
```

### 3.2 UI Primitives Import Specs
```tsx
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { ActionButton } from '@/components/ui/action-button';
import { Input, SearchInput } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, KpiTile } from '@/components/ui/card';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { EmptyState } from '@/components/ui/patterns/empty-state';
import { PageLoading, InlineLoading } from '@/components/ui/patterns/loading-state';
import { PositionBadge } from '@/components/ui/position-badge';
import { Badge } from '@/components/ui/badge';
```

### 3.3 Gotchas & Rules
1. **ホスト境界**: `@/components/ui/...` は Level 1 プリミティブのため Extension からの import は完全に安全。ただし `src/` 側のコンポーネントに `chrome.*` や `extension/` 依存を逆流させてはならない。
2. **テストアサーションの同期**: `QuickCanvasTopBar` の X共有ボタンは旧仕様の `bg-blue-600` から新 `btn-guideline-primary`（オレンジ系）へ移行済み。`quick-top-bar.test.tsx` の期待値を新仕様に合わせて更新すること。
3. **Shadow DOM / オーバーレイの z-index**: `mini-memo-panel.tsx` やトーストの z-index (`2147483647` / `Z_INDEX.TOAST`) を保持し、親ページの CSS との衝突を防ぐこと。
4. **検証コマンドのスコープ**: `extension/node_modules` の巻き込みを防ぐため、検証時は必ず `bun run ai:check extension/features` を指定すること。

---

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: Extension Dashboard（一覧・ヘッダー・統計・カード）の刷新
- **Worker Model**: `flash`
- **対象ファイル**:
  - `extension/features/dashboard/components/DashboardView.tsx`
  - `extension/features/dashboard/components/DashboardHeader.tsx`
  - `extension/features/dashboard/components/DashboardStatsBar.tsx`
  - `extension/features/dashboard/components/ScreenshotEmptyState.tsx`
  - `extension/features/dashboard/components/VideoGroupCard.tsx`
  - `extension/features/dashboard/components/ScreenshotCard.tsx`
- **Tasks**:
  - [ ] 1. `DashboardView.tsx`: 背景 L0 `#0D0D0E`、自前スピナーを `PageLoading` に置換、トーストを L3 `#222226` / `border-white/[0.08]` に置換。
  - [ ] 2. `DashboardHeader.tsx`: L1 `#121214`、枠線 `border-white/[0.07]`、検索欄を `SearchInput`、お気に入りトグルを `Button`、再読込を `IconButton`、アイコンバッジを `#FF5500`/15 & `#FF5500` に刷新。
  - [ ] 3. `DashboardStatsBar.tsx`: 4つの統計ブロックを `KpiTile` または L2 Card (`#18181B`)、極細枠線、新テキストトークンへ置換。
  - [ ] 4. `ScreenshotEmptyState.tsx`: 共通 `EmptyState` パターンへ置換し、Alt+S のショートカット案内を維持。
  - [ ] 5. `VideoGroupCard.tsx`: L2 Card (`#18181B`)、ヘッダー領域 L1/L2、アコーディオンボタン・一括保存・削除ボタンを新 `Button` / `IconButton` に刷新。
  - [ ] 6. `ScreenshotCard.tsx`: L2 Card (`#18181B`)、枠線 `border-white/[0.07]`、ホバー時 `#1e1e22` / `border-white/20`、編集バッジを `#FF5500`、お気に入りを `#FF5500` ネオントークン、ダウンロード・削除を新 `IconButton` に刷新。
  - [ ] 7. 検証: `bun run ai:check extension/features/dashboard` PASS。

### Phase 2: Quick Canvas（トップバー・アスペクト比・メタ情報）の刷新 ＆ テスト同期
- **Worker Model**: `flash`
- **対象ファイル**:
  - `extension/features/canvas/components/QuickCanvasTopBar.tsx`
  - `extension/features/canvas/components/RatioPresetSelector.tsx`
  - `extension/features/canvas/components/VideoMetaInfo.tsx`
  - `extension/features/canvas/components/__tests__/quick-top-bar.test.tsx`
- **Tasks**:
  - [ ] 1. `QuickCanvasTopBar.tsx`: L1 `#121214`、極細枠線、お気に入りアクティブ時のネオンオレンジスタイル（`#FF5500`）の整理。
  - [ ] 2. `RatioPresetSelector.tsx`: 青色 (`bg-blue-600`, `text-blue-400`) を完全排除。新 `SegmentedControl` またはアクティブ時半透明オレンジ（`bg-[#FF8100]/20 text-[#FF8100] border-[#FF8100]/40 shadow-[0_0_10px_rgba(255,129,0,0.2)]`）へ刷新。
  - [ ] 3. `VideoMetaInfo.tsx`: タイトル、時間タグ（等幅フォント）、外部リンクのホバースタイルを新デザイントークンに統一。
  - [ ] 4. `quick-top-bar.test.tsx`: X共有ボタンの旧青色（`bg-blue-600`）アサーションを新プライマリボタン仕様（`btn-guideline-primary`）に更新し、RatioSelector のアクティブスタイルアサーションを同期。
  - [ ] 5. 検証: `bun run ai:check extension/features/canvas` PASS。

### Phase 3: Memo Overlay ＆ QuickTagBar の刷新 ＆ テスト同期
- **Worker Model**: `flash`
- **対象ファイル**:
  - `extension/features/memo-overlay/components/mini-memo-panel.tsx`
  - `extension/features/memo-overlay/components/QuickTagBar.tsx`
  - `extension/features/memo-overlay/components/success-toast.tsx`
  - `extension/features/memo-overlay/__tests__/quick-tag-bar.test.tsx`
- **Tasks**:
  - [ ] 1. `mini-memo-panel.tsx`: L3 Modal (`#222226`)、ヘッダー L2 (`#18181B`)、枠線 `border-white/[0.08]`、入力 L0 (`#0D0D0E`)、保存ボタンに `Button` (`variant="primary"` / `#FF5500`)、ツールボタンに `IconButton` を適用。
  - [ ] 2. `QuickTagBar.tsx`: 旧 `slate-*` を完全排除。L3 背景 (`#222226`)、選択状態を半透明オレンジ（`bg-[#FF8100]/20 text-[#FF8100] border-[#FF8100]/50`）、未選択時ホバーを新トークンへ置換。
  - [ ] 3. `success-toast.tsx`: 旧 `bg-slate-900` を L3 (`#222226`)、枠線 `border-emerald-500/30`、フォントを新トークンへ置換。
  - [ ] 4. `quick-tag-bar.test.tsx`: タグ選択時のクラステストアサーションを新オレンジスタイル（`bg-[#FF8100]/20` 等）に同期。
  - [ ] 5. 検証: `bun run ai:check extension/features/memo-overlay` PASS。

### Phase 4: Sidepanel の刷新
- **Worker Model**: `flash`
- **対象ファイル**:
  - `extension/features/sidepanel/components/sidepanel-view.tsx`
- **Tasks**:
  - [ ] 1. `sidepanel-view.tsx`: 旧 `slate-*`（`slate-950`, `slate-900`, `slate-800` 等）を完全撤廃。
  - [ ] 2. 全体背景 L0 `#0D0D0E`、ヘッダー L1 `#121214`、案内ボックス L2 `#18181B`、入力エリア L1/L2、保存ボタンを新 `Button` (`variant="primary"` / `#FF5500`)、ダッシュボード遷移ボタンを新 `IconButton` に置換。
  - [ ] 3. 検証: `bun run ai:check extension/features/sidepanel` PASS。

### Phase 5: 統合検証 & コミット
- **Worker Model**: `flash`
- **Tasks**:
  - [ ] 1. 旧カラートークン残存検査: `grep -rnE "\b(bg|border|text)-(slate|zinc|gray|neutral)-" extension/features` が 0 件であることを確認。
  - [ ] 2. スコープ付き全体検証: `bun run ai:check extension/features` が exit code 0 で全パスすることを確認。
  - [ ] 3. コミット実行: `bun run ai:commit -m "feat(ui): apply new UI design system to chrome extension"`。

---

## 5. Reviewer Assessment (コード差分監査基準)
- **Reviewer Model**: `pro`
- **Audit Checklist**:
  - [ ] 1. **要件網羅性 & ビジュアル整合性**: Extension 全画面（Dashboard, Canvas, Memo Overlay, Sidepanel）で L0〜L3 サーフェス、極細境界線、ネオンオレンジアクセントが厳格に適用され、旧カラー（zinc/slate）が完全撲滅されていること。
  - [ ] 2. **ホスト境界の厳守**: `extension/` から `src/components/ui/` への一方向依存が維持され、Web 側への拡張機能依存漏れがないこと。
  - [ ] 3. **既存機能の完全保護**: IndexedDB 同期、キャプチャ実行、ショートカットキー（Ctrl+Enter, Esc, 1〜4, Alt+M, Alt+S）、キャンバス編集、ダウンロード動作が一切破壊されていないこと。
  - [ ] 4. **テスト健全性**: スタイリング変更に伴うテストアサーション更新が適切に行われ、単体テストがすべてグリーン（PASS）であること。
