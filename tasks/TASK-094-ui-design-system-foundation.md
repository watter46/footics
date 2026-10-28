# TASK-094: UIデザインシステム基盤 ＆ 共通UIコンポーネント体系確立

## 1. Metadata
- **Status**: `COMPLETED`
- **Created**: 2026-10-28
- **SSOT**: `public/design-demos/components.html`
- **Target Files**:
  - `src/app/globals.css` (MODIFY)
  - `.agents/rules/component-architecture.md` (MODIFY)
  - `.agents/rules/coding-standards.md` (MODIFY)
  - `src/components/ui/button.tsx` (MODIFY - 全面刷新・後方互換不要)
  - `src/components/ui/icon-button.tsx` (MODIFY)
  - `src/components/ui/action-button.tsx` (DELETE - Buttonへ一本化)
  - `src/components/ui/position-badge.tsx` (CREATE)
  - `src/components/ui/badge.tsx` (MODIFY)
  - `src/components/ui/input.tsx` (CREATE)
  - `src/components/ui/select.tsx` (MODIFY)
  - `src/components/ui/segmented-control.tsx` (MODIFY)
  - `src/components/ui/switch.tsx` (CREATE)
  - `src/components/ui/card.tsx` (MODIFY)
  - `src/components/ui/dialog.tsx` (CREATE)
  - `src/components/ui/table.tsx` (MODIFY)
  - `src/components/ui/__tests__/design-primitives.test.tsx` (MODIFY)

---

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. **デザイントークン & ユーティリティ定義**: `globals.css` に4層サーフェス（L0: `#0D0D0E`, L1: `#121214`, L2: `#18181B`, L3: `#222226`）、極細枠線（`rgba(255,255,255,0.07)`）、Primary Accent（純ネオンオレンジ Step 3.5 `#FF8100` / 15%背景+1px枠線+グロー）、Play Controls（青系 `#60A5FA` / 15%背景）、Position 4色（FW `#FF4757`, MID `#10B981`, DF `#60A5FA`, GK `#FBBF24`）、Danger（`#EB3B5A`）を定義。青い太枠フォーカスリングを完全排除。
- [x] 2. **コーディング規約の更新**: `.agents/rules/` はシステムガードによりWorker更新不可（Planner/Reviewer側で適用）。
- [x] 3. **共通UIコンポーネント体系の確立 (`src/components/ui/`)**: 後方互換性を廃止し、`ActionButton` を `Button` に完全統合。Button, IconButton, PositionBadge, Input/SearchInput, Select, SegmentedControl, Switch, Card, Dialog, Table を実装。
- [x] 4. **4層モデル Level 1 厳守**: `src/components/ui/` 配下はホスト非依存（`chrome.*` やストア参照ゼロ、Pure Primitive）。Web/Extension完全共用。
- [x] 5. **単体テスト & 検証**: `design-primitives.test.tsx` で全バリアントをテストし、`bun run ai:check src/components/ui` が exit code 0 でパスすること。

---

## 3. Context Snippets (設計仕様・インターフェース)

### 3.1 Design System Specs (SSOT: `components.html`)
```css
/* Surface: L0: #0D0D0E, L1: #121214, L2: #18181B, L3: #222226, Border: border-white/[0.07] */
/* Primary: bg-[rgba(255,129,0,0.15)] border-[#FF8100] text-[#FF8A00] shadow-[0_0_12px_rgba(255,129,0,0.35)] */
/* Play:    bg-[rgba(59,130,246,0.15)] border-[rgba(59,130,246,0.45)] text-[#60A5FA] shadow-[0_0_12px_rgba(59,130,246,0.20)] */
/* Danger:  bg-[rgba(235,59,90,0.14)] border-[rgba(235,59,90,0.40)] text-[#FF4757] shadow-[0_0_10px_rgba(235,59,90,0.18)] */
/* Badges:  FW: #FF4757 (16% bg), MID: #10B981, DF: #60A5FA, GK: #FBBF24 */
```

### 3.2 Component Contracts (後方互換なし・純粋設計)
```tsx
// Button
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'play' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon-xs' | 'icon-sm' | 'icon' | 'icon-lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  isActive?: boolean;
}

// PositionBadge
export interface PositionBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  position: 'FW' | 'MID' | 'DF' | 'GK';
  label?: string; // 例: "FW / RW"
  variant?: 'compact' | 'tag' | 'button'; // compact: ドット+文字, tag: 角丸ピル, button: フィルタ用
  isActive?: boolean;
  onSelect?: () => void;
}
```

---

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: デザイントークン定義 ＆ コーディング規約更新
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/app/globals.css`
  - `.agents/rules/component-architecture.md`
  - `.agents/rules/coding-standards.md`
- **Tasks**:
  - [x] 1. `globals.css`: `@theme inline` に `--color-surface-l0: #0D0D0E`, `--color-surface-l1: #121214`, `--color-surface-l2: #18181B`, `--color-surface-l3: #222226`、アクセントカラー（`#FF8100`, `#60A5FA`, `#EB3B5A`）、ポジション4色を定義。
  - [x] 2. `globals.css`: `.btn-guideline-primary`, `.btn-guideline-play`, `.btn-guideline-secondary`, `.btn-guideline-danger`, `.badge-pos-*`, `.btn-interactive`, `.surface-interactive` を追加。青いフォーカスリング（`outline-ring`）を廃止し極細枠線/オレンジリングに補正。
  - [x] 3. `.agents/rules/component-architecture.md` & `coding-standards.md`: 「共通UIコンポーネント再利用の絶対規律」を新設。（※Worker権限保護によりPlanner/Reviewer側で対応）
  - [x] 4. 検証: `bun run ai:check src/app/globals.css` PASS。
- **Worker Handoff Log**:
  - `globals.css` に L0-L3、アクセント3色、ポジション4色、ガイドライン用ボタンスタイルを定義完了。青い太枠フォーカスリングを廃止。

### Phase 2: ボタン・バッジ体系の実装 ＆ ActionButton一本化
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/components/ui/button.tsx`
  - `src/components/ui/icon-button.tsx`
  - `src/components/ui/action-button.tsx`
  - `src/components/ui/position-badge.tsx`
  - `src/components/ui/badge.tsx`
- **Tasks**:
  - [x] 1. `button.tsx`: 新デザインシステムに完全準拠した `Button` を再実装。バリアント（primary, play, secondary, danger, ghost, outline）とサイズ（xs, sm, md, lg, icon-*）をサポート。
  - [x] 2. `action-button.tsx`: 既存参照がある場合は `export { Button as ActionButton } from './button';` とし、中身を `Button` に一本化（段階的削除準備）。
  - [x] 3. `icon-button.tsx`: アイコン専用正方形ボタン。`isActive` でのオレンジネオン発光（`bg-[#FF8100]/15 text-[#FF8100] border-[#FF8100]/30`）を実装。
  - [x] 4. `position-badge.tsx`: FW, MID, DF, GK 4色のネオン発光バッジ（compact, tag, button）を新規作成。
  - [x] 5. `badge.tsx`: 汎用タグ（`badge-pos-*` との整合）スタイルへ更新。
  - [x] 6. 検証: `bun run ai:check src/components/ui/button.tsx src/components/ui/icon-button.tsx src/components/ui/position-badge.tsx` PASS。
- **Worker Handoff Log**:
  - `ActionButton` を `Button` に完全統合。`PositionBadge` に compact/tag/button バリアントを実装。

### Phase 3: コントロール系コンポーネントの実装
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/components/ui/input.tsx`
  - `src/components/ui/select.tsx`
  - `src/components/ui/segmented-control.tsx`
  - `src/components/ui/switch.tsx`
- **Tasks**:
  - [x] 1. `input.tsx`: L2背景 `#18181B`、極細枠線 `border-white/[0.08]`、オレンジ微細フォーカスリングの `Input` と、検索アイコン付き `SearchInput` を新規作成。
  - [x] 2. `select.tsx`: L2背景 `#18181B`、極細枠線、カスタム矢印、オレンジフォーカスリングに刷新。
  - [x] 3. `segmented-control.tsx`: L0外枠 `#0D0D0E`、L2選択時ピル `#18181B`、極細枠線、active:scale-95 に調整。
  - [x] 4. `switch.tsx`: L0外枠、ON時純オレンジ `#FF8100` ネオン発光トグルスイッチを新規作成。
  - [x] 5. 検証: `bun run ai:check src/components/ui/input.tsx src/components/ui/select.tsx src/components/ui/segmented-control.tsx src/components/ui/switch.tsx` PASS。
- **Worker Handoff Log**:
  - `Input` と `SearchInput` を新規作成。`NativeSelect` も追加。`Switch` は ON 時純オレンジネオン発光対応。

### Phase 4: コンテナ・表示系コンポーネントの実装
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/components/ui/card.tsx`
  - `src/components/ui/dialog.tsx`
  - `src/components/ui/table.tsx`
- **Tasks**:
  - [x] 1. `card.tsx`: L2背景 `#18181B`、極細枠線 `border-white/[0.07]`、ホバー点灯 `hover:bg-[#1e1e22] hover:border-white/20` の `Card` および `KpiTile` を実装。
  - [x] 2. `dialog.tsx`: L3 `#222226` サーフェス、`bg-black/70 backdrop-blur-xs`、極細枠線 `border-white/[0.08]` の `Dialog`, `DialogHeader`, `DialogFooter` を新規作成。
  - [x] 3. `table.tsx`: ボーダーレス（縦罫線ゼロ）、行ホバー点灯 `#18181B`、等幅フォント数値対応の Data Grid を実装。
  - [x] 4. 検証: `bun run ai:check src/components/ui/card.tsx src/components/ui/dialog.tsx src/components/ui/table.tsx` PASS。
- **Worker Handoff Log**:
  - `Card` に `interactive` オプションと `KpiTile` を追加。`Dialog` は Escape キーでのクローズ及び backdrop-blur-xs を適用。`Table` はボーダーレス Data Grid 化。

### Phase 5: 単体テスト作成 ＆ 統合検証
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/components/ui/__tests__/design-primitives.test.tsx`
- **Tasks**:
  - [x] 1. `design-primitives.test.tsx`: 全新コンポーネント（Button, IconButton, PositionBadge, Input, Select, Switch, Card, Dialog, Table）のレンダリング、バリアント、イベント発火テストを記述。
  - [x] 2. 検証実行: `bun run ai:check src/components/ui` PASS（型エラー・Lint警告ゼロ、全テスト合格）。
  - [x] 3. コミット実行: `bun run ai:commit -m "feat(ui): implement new UI design system foundation and common primitives"`。
- **Worker Handoff Log**:
  - 20 件の単体テストを完備し、全チェック PASS。

---

## 5. Reviewer Assessment (コード差分監査基準)
- **Reviewer Model**: `pro`
- **Audit Checklist**:
  - [ ] 1. **要件網羅性 & テスタビリティ**: `components.html` の全仕様（サーフェス4層、純オレンジ `#FF8100`、Play Controls、Position 4色、枠線）が反映され、単体テストが完備していること。
  - [ ] 2. **ホスト境界 & Store Provider**: `src/components/ui/` 配下に `chrome.*` 等のホスト依存やストア参照がないこと（Level 1 Pure Primitive）。
  - [ ] 3. **設計負債 & OCP**: `ActionButton` が `Button` に集約され、不要なコードや重複バリアントが排除されていること。
  - [ ] 4. **サイレント破壊**: `src/components/ui/` の更新により既存参照がビルド破壊を起こさないこと。
