# TASK-100: UIデザインシステム残存改修・ベタ書きUI置換・描画レイアウト不具合修正

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-28
- **Target Files**:
  - `src/features/tactical-unified/panels/toolbar/top-bar.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/top-bar-center.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/top-bar-history.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/top-bar-title.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/hud/text-hud.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/hud/arrow-hud.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/hud/zone-hud.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/hud/connect-line-hud.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/hud/player-hud.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/hud/player-quick-actions.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/hud/mini-color-picker.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/timeline-bar.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/slide-context-menu.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/slide-card-actions.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/slide-transition-popover.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/batch-transition-popover.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/bench-swap-selector.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/squad-sub-form.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/formation-bench-add-form.tsx` (MODIFY)
  - `src/features/match/components/match-list/FilterBar.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. **Tactical TopBar はみ出し・衝突の解消（最重要）**:
  - `top-bar.tsx` の3カラム構造（左・中央・右）に `min-w-0` と優先度別の折りたたみ/縮小（`shrink` 制御）を導入し、中画面幅（1024px〜1366px）やウィンドウリサイズ時でも要素がヘッダー外にはみ出さず、右端のアクションメニューが絶対に押し出されないこと。
  - タイトル表示部は最大幅制限（`truncate`）を強化し、中央の `TopBarCenter` と重なり合わないこと。
- [x] 2. **タイムラインバー・右パネル・フィルターバーの描画崩れ修正**:
  - `timeline-bar.tsx`: サムネイル横スクロール領域に `min-w-0` / `overflow-x-auto` を正しく適用し、スライド数増加時にも左側の再生ボタン群や右側の追加ボタンと重ならないこと。
  - `bench-swap-selector.tsx`: ベンチ交代選択ポップオーバーの幅と `truncate` を調整し、狭小幅や多数選手表示時でも右端の欠け・はみ出しを防止すること。
  - `FilterBar.tsx`: タブレット縦向き・小画面幅時に横スクロールが発生しないよう、`flex-wrap` またはレスポンシブ配置に改修すること。
- [x] 3. **ベタ書き button / input の `ui/` コンポーネント置換**:
  - `top-bar-center.tsx` の Swap / Reset を `Button` (`variant="secondary"`, `size="sm"`) に置換。
  - `top-bar-history.tsx` の Undo / Redo を `IconButton` (`variant="ghost"`, `size="sm"`) に置換。
  - `slide-card-actions.tsx` のカード上アクションを `IconButton` (`size="xs"`) に置換。
  - `slide-context-menu.tsx` の自前メニューを Base UI `DropdownMenu` に置換。
  - `squad-sub-form.tsx`, `formation-bench-add-form.tsx` の登録ボタンと入力を `Button`, `Input` に統一。
- [x] 4. **本番画面の新デザインシステムトークン完全反映**:
  - `top-bar-title.tsx`: `blue-500` 系を排除し、L1/L2 背景、アクセント色（`#FF8100` 等）へ統一。
  - `text-hud.tsx`, `arrow-hud.tsx`, `zone-hud.tsx`, `connect-line-hud.tsx`, `player-hud.tsx`, `player-quick-actions.tsx`, `mini-color-picker.tsx`: 旧ダークカラー（`#222222`, `#383838`, `#333333`, `#1a1a1a`）を L2/L3 サーフェス（`bg-[#18181B]`, `bg-[#222226]`, `border-white/[0.08]`）および共通 `IconButton` / トークンに刷新。
  - `slide-transition-popover.tsx`, `batch-transition-popover.tsx`: 旧青系（`#60A5FA`）を `#FF8100` 等の新アクセントトークンに統一。
- [x] 5. **検証**:
  - `bun run ai:check` が全対象ファイルで exit code 0 (PASS)。
  - 既存のクリックイベント、ショートカット、キャンバス操作、Undo/Redo ロジックの完全保護（破壊ゼロ）。

## 3. Context Snippets (設計・実装規約)

### 3.1 UI Primitives Import
```tsx
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/menu';
import { SegmentedControl } from '@/components/ui/segmented-control';
```

### 3.2 TopBar Responsive Layout
```tsx
// Left: flex items-center gap-2 shrink-0 min-w-0
// Center: flex items-center justify-center min-w-0 shrink overflow-hidden (小画面時は一部ラベル非表示または集約)
// Right: flex items-center gap-1.5 shrink-0
```

---

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: Tactical TopBar レイアウト不具合修正 ＆ 共通UI置換
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/toolbar/top-bar.tsx`
  - `src/features/tactical-unified/panels/toolbar/top-bar-center.tsx`
  - `src/features/tactical-unified/panels/toolbar/top-bar-history.tsx`
  - `src/features/tactical-unified/panels/toolbar/top-bar-title.tsx`
- **Tasks**:
  - [x] 1. `top-bar.tsx`: 3カラムのコンテナに `min-w-0`, `shrink-0`, `overflow-hidden` を適用し、画面幅が縮小しても右側メニューが押し出されないレイアウトに修正。
  - [x] 2. `top-bar-center.tsx`: ベタ書き `<button>` を `Button` (`variant="secondary"`, `size="sm"`) に置換し、小画面幅（1280px未満）で Swap/Reset のテキストを `hidden 2xl:inline` 等で縮小可能にする。
  - [x] 3. `top-bar-history.tsx`: Undo/Redo ボタンを `IconButton` (`variant="ghost"`, `size="sm"`) に置換。
  - [x] 4. `top-bar-title.tsx`: `blue-500` 系カラーを全廃し、L1/L2、`#FF8100`、タイトル入力欄を新トークンに置換。
  - [x] 5. 検証: `bun run ai:check src/features/tactical-unified/panels/toolbar` PASS。
- **Worker Handoff Log**:
  - TopBar 3カラムに `min-w-0`, `shrink-0`, `overflow-hidden` を適用。Swap/Reset を `Button`、Undo/Redo を `IconButton` に置換。Title/Projects から `blue-500` を一掃し新デザイントークン（#FF8100, L1/L2）に統一。全25テストPASS。

### Phase 2: Tactical HUD 内部の旧配色排除 ＆ 共通ボタン置換
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/core/components/hud/text-hud.tsx`
  - `src/features/tactical-unified/core/components/hud/arrow-hud.tsx`
  - `src/features/tactical-unified/core/components/hud/zone-hud.tsx`
  - `src/features/tactical-unified/core/components/hud/connect-line-hud.tsx`
  - `src/features/tactical-unified/core/components/hud/player-hud.tsx`
  - `src/features/tactical-unified/core/components/hud/player-quick-actions.tsx`
  - `src/features/tactical-unified/core/components/hud/mini-color-picker.tsx`
- **Tasks**:
  - [x] 1. `text-hud.tsx`, `arrow-hud.tsx`, `zone-hud.tsx`, `connect-line-hud.tsx`: ハードコードされた `#383838` セパレータを `border-white/[0.08]` または `bg-white/[0.08]` に置換。ベタ書きボタンを共通ホバースタイルまたは `IconButton` (`size="xs"`) に統一。
  - [x] 2. `mini-color-picker.tsx`, `player-hud.tsx`: ポップオーバー背景を L3 `#222226`、枠線を `border-white/[0.08]`、入力フィールドを L1 `#121214` に刷新。
  - [x] 3. `player-quick-actions.tsx`: ボタン群のスタイルを新UIホバートークンに刷新。
  - [x] 4. 検証: `bun run ai:check src/features/tactical-unified/core/components/hud` PASS。
- **Worker Handoff Log**:
  - HUD各コンポーネントの旧ダークカラー（#383838, #333333, #222222, #1a1a1a）および旧青（#0d99ff）を L1/L2/L3 サーフェス（#121214, #18181B, #222226）および新アクセント（#FF8100）に刷新。全9テストPASS確認。

### Phase 3: タイムライン・右パネル・マッチフィルターのレイアウト崩れ修正 ＆ UI置換
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/timeline/timeline-bar.tsx`
  - `src/features/tactical-unified/panels/timeline/slide-context-menu.tsx`
  - `src/features/tactical-unified/panels/timeline/slide-card-actions.tsx`
  - `src/features/tactical-unified/panels/timeline/slide-transition-popover.tsx`
  - `src/features/tactical-unified/panels/timeline/batch-transition-popover.tsx`
  - `src/features/tactical-unified/panels/right-panel/bench-swap-selector.tsx`
  - `src/features/tactical-unified/panels/right-panel/squad-sub-form.tsx`
  - `src/features/tactical-unified/panels/right-panel/formation-bench-add-form.tsx`
  - `src/features/match/components/match-list/FilterBar.tsx`
- **Tasks**:
  - [x] 1. `timeline-bar.tsx`: サムネイル表示領域のフレックス縮小・スクロール境界（`min-w-0`）を調整し、要素重複を根絶。
  - [x] 2. `slide-card-actions.tsx`: ホバーアクションボタンを `IconButton` (`size="xs"`) に置換。
  - [x] 3. `slide-context-menu.tsx`: 自前 fixed メニューを Base UI `DropdownMenu` または L3 背景の共通ポップオーバーに置換。
  - [x] 4. `slide-transition-popover.tsx`, `batch-transition-popover.tsx`: 旧青色 `#60A5FA` を `#FF8100` 等の新トークンに統一。
  - [x] 5. `bench-swap-selector.tsx`: 選手リストの幅オーバーフロー対策（`truncate`, `max-w`）を適用。
  - [x] 6. `squad-sub-form.tsx`, `formation-bench-add-form.tsx`: 送信ボタンを新 `Button`、入力欄を新 `Input` に置換。
  - [x] 7. `FilterBar.tsx`: 小画面・タブレット縦向き時の `flex-wrap` および幅制御を強化。
  - [x] 8. 検証: `bun run ai:check src/features/tactical-unified/panels/timeline src/features/tactical-unified/panels/right-panel src/features/match` PASS。
- **Worker Handoff Log**:
  - タイムラインサムネイル領域・FilterBar・BenchSwapSelector に `min-w-0` / `truncate` / レスポンシブ幅を適用し、小画面・縮小時のはみ出しを根絶。SlideCardActions/SquadSubForm/FormationBenchAddForm を共通 `IconButton` / `Button` / `Input` に置換し、Transition Popovers / ContextMenu から旧青色 `#60A5FA` を排除し L3 / `#FF8100` に統一。全62テストPASS。

### Phase 4: 全体統合検証 ＆ コミット
- **Worker Model**: `flash`
- **Tasks**:
  - [x] 1. 全体スコープでの Lint・型チェック・テスト確認（`bun run ai:check`）。
  - [x] 2. 本番画面における旧カラー残存（`slate-*`）ゼロを確認。
  - [x] 3. コミット実行: `bun run ai:commit -m "fix(ui): resolve layout overflows, replace raw elements, and apply design system"`。

---

## 5. Reviewer Assessment (コード差分監査基準)
- **Reviewer Model**: `pro`
- **Decision**: `LGTM`
- **Reviewed At**: 2026-10-28 23:50
- **Summary**: TopBarレスポンシブ崩れ・HUD旧配色・ベタ書きUIの共通Primitive置換を完全確認。ゼロ・リグレッションかつ6大設計原則に完全準拠。
- **Audit Checklist**:
  - [x] 1. **レイアウト安定性**: Tactical TopBar が 1024px〜1440px のどの画面幅でも破綻・押し出しなく収まっているか。
  - [x] 2. **ベタ書き排除**: 指摘箇所の `<button>` や raw `<input>` が `src/components/ui/` の部品に正しく置き換わっているか。
  - [x] 3. **デザイントークン統一**: HUDポップオーバー等から旧配色（#222222, 青系アクセント等）が一掃されているか。
  - [x] 4. **機能無欠陥（ゼロ・リグレッション）**: ショートカット操作、キャンバス描画、タイムライン再生、エクスポート動作に影響を与えていないか。
