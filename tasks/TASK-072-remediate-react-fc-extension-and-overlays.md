# TASK-072: [Level 2-C] React.FC の関数宣言移行① (Extension 12件 + MemoOverlay / Analysis / Sidebar 20件)

## 1. Metadata
- **Status**: `TODO`
- **Created**: 2026-10-26
- **Target Files**:
  - `extension/features/canvas/components/QuickAnnotationCanvas.tsx` (MODIFY)
  - `extension/features/dashboard/components/*.tsx` (MODIFY)
  - `extension/features/memo-overlay/**/*.tsx` (MODIFY)
  - `extension/features/sidepanel/components/sidepanel-view.tsx` (MODIFY)
  - `src/features/analysis/components/timeline/*.tsx` (MODIFY)
  - `src/features/memo-overlay/components/**/*.tsx` (MODIFY)
  - `src/features/sidebar/components/*.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [ ] 1. `extension/features/` 配下の 12 コンポーネントから `React.FC` / `FC` 型注釈を撤去し、`export function ComponentName(props: ComponentNameProps)` 形式の標準関数宣言に統一する（R2 規約準拠）。
- [ ] 2. `src/features/memo-overlay/`（12件）、`src/features/analysis/`（4件）、`src/features/sidebar/`（4件）の計 20 コンポーネントから `React.FC` / `FC` を撤去し、標準関数宣言に統一する。
- [ ] 3. すべての対象コンポーネントで export 名（Named export / Default export）および Props 型を維持し、既存テストを破壊しないこと。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```tsx
// 不要になった type { FC } from 'react' は削除する
```

### 3.2 Key Interfaces & Types
```tsx
// ❌ 禁止: export const QuickTagBar: React.FC<QuickTagBarProps> = ({ tags }) => { ... };
// ✅ 推奨:
export function QuickTagBar({ tags }: QuickTagBarProps) {
  // ...
}
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```tsx
// 並列実行時のファイル競合を防ぐため、.agents/guardrails-baseline.json や Teams / SyntaxStudio 領域のファイルは編集しないこと。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: extension/features/ 配下 12 コンポーネントの React.FC 撤去
- **Worker Model**: `flash_lite`
- **対象ファイル**: `extension/features/canvas/components/QuickAnnotationCanvas.tsx`, `extension/features/dashboard/components/DashboardHeader.tsx`, `extension/features/dashboard/components/DashboardStatsBar.tsx`, `extension/features/dashboard/components/DashboardView.tsx`, `extension/features/dashboard/components/ScreenshotCard.tsx`, `extension/features/dashboard/components/ScreenshotEmptyState.tsx`, `extension/features/dashboard/components/VideoGroupCard.tsx`, `extension/features/memo-overlay/components/QuickTagBar.tsx`, `extension/features/memo-overlay/components/mini-memo-panel.tsx`, `extension/features/memo-overlay/components/success-toast.tsx`, `extension/features/memo-overlay/memo-overlay-bridge.tsx`, `extension/features/sidepanel/components/sidepanel-view.tsx`
- **契約 (Interface)**:
  ```tsx
  // 12ファイルすべてで React.FC / FC を使用しない関数宣言へ変換
  ```
- **Testing Strategy**: `bun run ai:check` で対象ファイルの検査と関連テストが PASS すること。
- **Tasks**:
  - [ ] 1. TDD実装: `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:

### Phase 2: memo-overlay (12件)・analysis (4件)・sidebar (4件) の React.FC 撤去
- **Worker Model**: `flash_lite`
- **対象ファイル**: `src/features/analysis/components/timeline/TimelineHeader.tsx`, `src/features/analysis/components/timeline/TimelineRow.tsx`, `src/features/analysis/components/timeline/TimelineRowCustom.tsx`, `src/features/analysis/components/timeline/TimelineRowStandard.tsx`, `src/features/memo-overlay/components/MemoOverlayModal.tsx`, `src/features/memo-overlay/components/MemoOverlayView.tsx`, `src/features/memo-overlay/components/parts/MatchMemoUnit.tsx`, `src/features/memo-overlay/components/parts/MemoOverlayEventContent.tsx`, `src/features/memo-overlay/components/parts/MemoOverlayFloatingError.tsx`, `src/features/memo-overlay/components/parts/MemoOverlayFooterNav.tsx`, `src/features/memo-overlay/components/parts/MemoOverlayHeader.tsx`, `src/features/memo-overlay/components/parts/MemoOverlayInstanceBar.tsx`, `src/features/memo-overlay/components/parts/MemoOverlayProgress.tsx`, `src/features/memo-overlay/components/parts/PhaseLabelSelection.tsx`, `src/features/memo-overlay/components/parts/PhaseMemoInput.tsx`, `src/features/memo-overlay/components/parts/PhaseTimeInput.tsx`, `src/features/sidebar/components/OutcomeFilter.tsx`, `src/features/sidebar/components/StrategyFilter.tsx`, `src/features/sidebar/components/TeamFilter.tsx`, `src/features/sidebar/components/TimelineSourceFilter.tsx`
- **契約 (Interface)**:
  ```tsx
  // 20ファイルすべてで React.FC / FC を使用しない関数宣言へ変換
  ```
- **Testing Strategy**: `bun run ai:check` で対象ファイルの検査と関連テストが PASS すること。
- **Tasks**:
  - [ ] 1. TDD実装: `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 
- **Decision**: `TODO`
- **Audit Checklist**:
  - [ ] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [ ] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [ ] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [ ] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:

## 6. Rejections / Additional Tasks (不可逆修正欄)
