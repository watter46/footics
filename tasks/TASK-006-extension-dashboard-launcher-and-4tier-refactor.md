# TASK-006: Extension Dashboard 起動 & メモ機能・Dashboard 4層モデルリファクタリング

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-19
- **Target**: `extension/`, `src/features/memo-overlay/`
- **User Environment**: **Microsoft Edge (Chromium on Windows 11 / WSL2)**

---

## 2. Requirements (要件)
<!-- Reviewerはこの要件が満たされているかを厳密に審査する -->

- [x] [要件1: Edge Action Icon & 各画面からの Dashboard 起動導線開通]
  - `extension/wxt.config.ts` の `manifest.action` を有効化し、ツールバーアイコンのクリックを有効化。
  - `extension/entrypoints/background.ts` で `browser.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: false })` を設定し、`browser.action.onClicked` をリッスンして `dashboard.html` のスマートタブ制御（既存タブがあればフォーカス、無ければ新規オープン）を実装。
  - `extension/features/sidepanel/components/sidepanel-view.tsx` のヘッダーに `LayoutDashboard` アイコンボタンを追加し、クリックでダッシュボードを開く。
  - `extension/features/memo-overlay/components/mini-memo-panel.tsx` のヘッダーに `LayoutDashboard` アイコンボタンを追加し、クリックでダッシュボードを開く。
- [x] [要件2: メモ機能の 4層モデルリファクタリング & ホスト境界隔離]
  - `src/features/memo-overlay/components/MemoOverlayView.tsx`（現在 319行）から `globalThis.browser.storage.local` および `getMatchMemo(matchId)` の直接アクセスを完全撤去。
  - メモの初期データは `initialData?.memo` Props 確定注入で受け取り、マウント後の非同期ロード待ちによる Flicker を排除。
  - 行数を 180行以下に圧縮し、Biome の認知複雑度エラーを解消。
  - `extension/features/memo-overlay/memo-overlay-bridge.tsx`（Level 3 Feature View）で初期データを解決して `MemoOverlayView` へ Props 確定注入。
- [x] [要件3: Dashboard の 4層モデルリファクタリング & 200行以下分割]
  - `extension/features/dashboard/components/DashboardView.tsx`（現在 499行）を Level 3 Feature View として再構築（約120〜140行）。
  - カスタムフックを抽出:
    - `use-dashboard-data.ts`: データ取得、お気に入りトグル、削除、一括削除、トースト
    - `use-dashboard-filters.ts`: 検索クエリ、お気に入りフィルタ、アコーディオン開閉
    - `use-screenshot-actions.ts`: 単体・一括ダウンロード、Canvas 画面オープン（ホスト境界隔離）
  - Level 2 Domain UI Blocks を抽出:
    - `DashboardHeader.tsx`: タイトル、検索、お気に入りフィルタ、リロード
    - `DashboardStatsBar.tsx`: 4つのメトリクスカード
    - `ScreenshotEmptyState.tsx`: 0件案内表示
    - `ScreenshotCard.tsx`: スクショ単体カード
    - `VideoGroupCard.tsx`: 動画別アコーディオンカード
  - 全コンポーネントが 200行以下（最大250行ルール厳守）。
- [x] [要件4: 単体テスト・自動検証ゲート・Edge ビルド同期]
  - 新規作成・分割したフックおよびコンポーネントのテストを作成し、Vitest 全PASS。
  - `bun run ai:check` (Odin Strict, Biome, Scoped TypeScript, Vitest) が exit code 0 で全PASS。
  - `bun run --cwd extension compile && bun run --cwd extension build` が exit code 0 で全PASS。
  - `bun run extension:sync` で Windows 側 Edge ディレクトリへ同期。

---

## 3. Implementation Phases (実装フェーズ)

### Phase 1: Edge Action Icon & 各画面の Dashboard 起動導線開通
- **対象スコープ**: `extension/wxt.config.ts`, `extension/entrypoints/background.ts`, `extension/features/sidepanel/components/sidepanel-view.tsx`, `extension/features/memo-overlay/components/mini-memo-panel.tsx`
- **Steps**:
  - [x] 1. `extension/wxt.config.ts` に `action` を定義
  - [x] 2. `extension/entrypoints/background.ts` に `sidePanel.setPanelBehavior` 及び `browser.action.onClicked` スマートタブ制御を追加
  - [x] 3. `sidepanel-view.tsx` に Dashboard アイコンボタン追加
  - [x] 4. `mini-memo-panel.tsx` に Dashboard アイコンボタン追加
- **Phase Verification**:
  - `bun run ai:check extension/wxt.config.ts extension/entrypoints/background.ts extension/features/sidepanel/ extension/features/memo-overlay/components/mini-memo-panel.tsx`

### Phase 2: メモ機能の 4層モデルリファクタリング & ホスト境界隔離
- **対象スコープ**: `src/features/memo-overlay/components/MemoOverlayView.tsx`, `extension/features/memo-overlay/memo-overlay-bridge.tsx`
- **Steps**:
  - [x] 1. 失敗するテスト作成 (RED): `src/features/memo-overlay/components/__tests__/memo-overlay-view-refactor.test.tsx`
  - [x] 2. `MemoOverlayView.tsx` からホスト依存（`browser.storage.local`, `getMatchMemo`）を削除し、Props 確定注入に対応。180行以下に圧縮
  - [x] 3. `memo-overlay-bridge.tsx` で初期メモを安全にロードして `MemoOverlayView` に注入
  - [x] 4. テスト通過確認 (GREEN)
- **Phase Verification**:
  - `bun run ai:check src/features/memo-overlay/ extension/features/memo-overlay/`

### Phase 3: Dashboard のフック & Level 2 コンポーネント分離 (TDD)
- **対象スコープ**: `extension/features/dashboard/hooks/`, `extension/features/dashboard/components/`
- **Steps**:
  - [x] 1. 失敗するテスト作成 (RED):
    - `extension/features/dashboard/hooks/__tests__/use-dashboard-filters.test.ts`
    - `extension/features/dashboard/hooks/__tests__/use-dashboard-data.test.ts`
    - `extension/features/dashboard/components/__tests__/screenshot-card.test.tsx`
  - [x] 2. フック実装 (GREEN):
    - `use-dashboard-data.ts`
    - `use-dashboard-filters.ts`
    - `use-screenshot-actions.ts`
  - [x] 3. Level 2 UI コンポーネント実装:
    - `DashboardHeader.tsx`
    - `DashboardStatsBar.tsx`
    - `ScreenshotEmptyState.tsx`
    - `ScreenshotCard.tsx`
    - `VideoGroupCard.tsx`
  - [x] 4. `DashboardView.tsx` を Level 3 Feature View として再構築（約120〜140行）
  - [x] 5. テスト通過確認 (GREEN)
- **Phase Verification**:
  - `bun run ai:check extension/features/dashboard/`

### Phase 4: 全体検証・Edge ビルド & 同期
- **対象スコープ**: プロジェクト全体・Extension パッケージ
- **Steps**:
  - [x] 1. `bun run ai:check` 全パス確認
  - [x] 2. `bun run --cwd extension compile && bun run --cwd extension build` ビルド成功確認
  - [x] 3. `bun run extension:sync` で Windows 側 Edge 拡張機能ディレクトリへ同期
  - [x] 4. 全体検証完了確認
- **Phase Verification**:
  - All automated checks exit code 0.

---

## 4. Reviewer Checklist & Assessment

### 4.1 Automated Gates (自動検証)
- [x] すべての Phase のチェックボックス (`- [x]`) が完了していること
- [x] `bun run ai:check` (Odin Strict, Biome, Scoped TypeScript, Vitest) が exit code 0 で全PASS
- [x] Extension 型検査およびビルド (`bun run --cwd extension compile && bun run --cwd extension build`) が exit code 0 で全PASS
- [x] `bun run extension:sync` で Windows 側 Edge 拡張機能ディレクトリへ同期完了

### 4.2 Quality & Spec Audit (仕様・品質審査)
- [x] **要件網羅性**: 要件1〜4がすべて実装・検証完了
- [x] **ホスト境界の原則**: `MemoOverlayView.tsx` 内の `browser.storage` / Dexie DB 直接参照を全廃し、Props 確定注入による Zero-Flicker を達成
- [x] **行数規約**: `DashboardView.tsx` を 499行から 91行に圧縮、分割した全フックおよびコンポーネントが 200行以下（最大250行ルール厳守）
- [x] **Edge 導線**: Action Icon スマートタブ制御、Sidepanel / MiniMemoPanel からの Dashboard 起動アイコン開通

### 4.3 Reviewer Decision
- **Status**: `LGTM`
- **Reviewed At**: 2026-10-19 06:33
- **Reviewer Model**: `inherit`
- **Summary**: 全要件が 4層コンポーネントモデル・ホスト境界隔離・Zero-Flicker 規約に完全適合して実装され、テスト全25件PASSおよびEdge同期を確認。

