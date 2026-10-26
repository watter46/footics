# TASK-073: [Level 2-D] React.FC / forwardRef の React 19 標準記法への移行② (Teams 15件 + SyntaxStudio / Tactical 7件)

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-26
- **Target Files**:
  - `src/features/teams/components/*.tsx` (MODIFY)
  - `src/components/features/syntax-studio/syntax-json-drawer.tsx` (MODIFY)
  - `src/components/features/syntax-studio/syntax-pitch-svg.tsx` (MODIFY)
  - `src/components/features/syntax-studio/syntax-scene-tabs.tsx` (MODIFY)
  - `src/components/features/syntax-studio/syntax-studio-header.tsx` (MODIFY)
  - `src/components/layout/TeamsDropdown.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/CanvasStageContainer.tsx` (MODIFY)
  - `src/features/tactical-unified/views/FullTacticalCanvas.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `src/features/teams/components/` 配下の 15 コンポーネントから `React.FC` / `FC` を撤去し、`export function ComponentName(props: ComponentNameProps)` に統一する。
- [x] 2. `syntax-studio`（4件）、`TeamsDropdown.tsx`、`CanvasStageContainer.tsx`、`FullTacticalCanvas.tsx` から `React.FC` および `forwardRef` を撤去し、React 19 標準の関数宣言（`ref` prop 直接受け取り）へ移行する。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```tsx
import type { Ref } from 'react';
```

### 3.2 Key Interfaces & Types
```tsx
// React 19 では forwardRef を使わず Props に ref?: Ref<...> を定義する
export interface CanvasStageContainerProps {
  ref?: Ref<HTMLDivElement>;
  // ...
}
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```tsx
// syntax-pitch-canvas.tsx は TASK-067 で編集するため本タスクでは触れないこと。
// 並列実行時の競合防止のため、.agents/guardrails-baseline.json は編集しないこと。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: src/features/teams/components/ 15件の React.FC 撤去
- **Worker Model**: `flash_lite`
- **対象ファイル**: `src/features/teams/components/AddPlayerDialog.tsx`, `src/features/teams/components/CopySeasonPlayersDialog.tsx`, `src/features/teams/components/EditPlayerDialog.tsx`, `src/features/teams/components/PlayerPhoto.tsx`, `src/features/teams/components/TeamSquadClient.tsx`, `src/features/teams/components/copy-season-player-grid.tsx`, `src/features/teams/components/player-basic-form-fields.tsx`, `src/features/teams/components/player-whoscored-link-section.tsx`, `src/features/teams/components/squad-category-list.tsx`, `src/features/teams/components/squad-dialogs.tsx`, `src/features/teams/components/squad-empty-state.tsx`, `src/features/teams/components/squad-filter-bar.tsx`, `src/features/teams/components/squad-header.tsx`, `src/features/teams/components/squad-player-card.tsx`, `src/features/teams/components/squad-stats-summary.tsx`
- **契約 (Interface)**:
  ```tsx
  // 15ファイルすべてで React.FC / FC を使用しない関数宣言へ変換
  ```
- **Testing Strategy**: `bun run ai:check` で対象ファイルの検査と関連テストが PASS すること。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**: Teams配下15ファイルの React.FC 撤去および関数コンポーネント化完了

### Phase 2: syntax-studio (4件)・TeamsDropdown・tactical-unified (2件) の React.FC / forwardRef 撤去
- **Worker Model**: `flash`
- **対象ファイル**: `src/components/features/syntax-studio/syntax-json-drawer.tsx`, `src/components/features/syntax-studio/syntax-pitch-svg.tsx`, `src/components/features/syntax-studio/syntax-scene-tabs.tsx`, `src/components/features/syntax-studio/syntax-studio-header.tsx`, `src/components/layout/TeamsDropdown.tsx`, `src/features/tactical-unified/core/components/CanvasStageContainer.tsx`, `src/features/tactical-unified/views/FullTacticalCanvas.tsx`
- **契約 (Interface)**:
  ```tsx
  // React.FC および forwardRef を廃止し React 19 関数コンポーネントへ統一
  ```
- **Testing Strategy**: `bun run ai:check` で対象ファイルの検査と関連テストが PASS すること。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**: 7ファイルの React.FC/forwardRef 撤去および React 19 ref prop 移行完了

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-26 17:26
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**: 対象22ファイルから React.FC / forwardRef を完全に撤去し、React 19 標準関数コンポーネントおよび ref prop への移行を確認。保護対象ファイル（syntax-pitch-canvas.tsx 等）への変更なし。LGTM。

## 6. Rejections / Additional Tasks (不可逆修正欄)
