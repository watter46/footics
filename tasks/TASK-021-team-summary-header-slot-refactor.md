# TASK-021: TeamSummaryHeader の Level 2 純化 & Dashboard 合成整理

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-19
- **Target Files**:
  - `src/features/dashboard/widgets/team-summary/types.ts` (MODIFY)
  - `src/features/dashboard/widgets/team-summary/components/team-summary-header.tsx` (MODIFY)
  - `src/features/dashboard/components/Dashboard.tsx` (MODIFY)
  - `src/features/dashboard/widgets/team-summary/components/__tests__/team-summary-header.test.tsx` (NEW)
  - `tasks/TASK-021-team-summary-header-slot-refactor.md` (NEW)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `TeamSummaryHeaderProps` から `matchId` および `onRefreshCustomEvents` を完全削除し、`actionSlot?: React.ReactNode` を追加すること。
- [x] 2. `team-summary-header.tsx` から `DataManagementMenu` のインポートと直接描画を完全撤廃し、`{actionSlot}` を描画する純粋な Level 2 Domain UI へ純化すること（Component <= 100行）。
- [x] 3. `Dashboard.tsx` (Level 3 Feature View) 側で `TeamSummaryHeader` に `actionSlot={<DataManagementMenu matchId={matchId} onRefresh={d.handleRefreshCustomEvents} />}` を注入して合成すること。
- [x] 4. 単体テスト `team-summary-header.test.tsx` を新設し、ヘッダー表示および `actionSlot` のレンダリングを TDD で検証すること。
- [x] 5. `bun run ai:check src/features/dashboard` で exit code 0 を確認すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 TeamSummaryHeaderProps
```ts
// src/features/dashboard/widgets/team-summary/types.ts
import type { MatchData } from '@/types';

export interface TeamSummaryHeaderProps {
  metadata: MatchData;
  activeFilterCount: number;
  onOpenSidebar: () => void;
  onAddEvent: () => void;
  actionSlot?: React.ReactNode;
}
```

### 3.2 TeamSummaryHeader Implementation
```tsx
// src/features/dashboard/widgets/team-summary/components/team-summary-header.tsx
// DataManagementMenu への直接依存を排除し、右端アクション群の末尾に {actionSlot} を描画
```

### 3.3 Dashboard.tsx Composition
```tsx
// src/features/dashboard/components/Dashboard.tsx
import { DataManagementMenu } from '@/features/management';

<TeamSummaryHeader
  metadata={d.metadata}
  activeFilterCount={activeFilterCount}
  onOpenSidebar={() => setIsSidebarOpen(true)}
  onAddEvent={handleAddEvent}
  actionSlot={
    <DataManagementMenu
      matchId={matchId}
      onRefresh={d.handleRefreshCustomEvents}
    />
  }
/>
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: TeamSummaryHeader スロット化 & Dashboard 合成 (TDD)
- **Worker Model**: `inherit`
- **対象ファイル**: 上記 Target Files
- **Testing Strategy**:
  - `src/features/dashboard/widgets/team-summary/components/__tests__/team-summary-header.test.tsx` を先に作成（RED）
  - 実装完了後 `bun run ai:check src/features/dashboard` で exit code 0 を確認
- **Tasks**:
  - [x] 1. TDD実装: テスト `team-summary-header.test.tsx` を作成し RED を確認
  - [x] 2. `team-summary/types.ts` および `team-summary-header.tsx` をリファクタリング
  - [x] 3. `Dashboard.tsx` 側で `DataManagementMenu` をスロット注入して GREEN
  - [x] 4. `bun run ai:check src/features/dashboard` で exit code 0 を確認
- **Worker Handoff Log**:
  - **TDDサイクル実施**:
    - `team-summary-header.test.tsx` (4 tests) を新設し RED を確認後、実装を進めて GREEN を達成（4/4 tests pass）。
  - **TeamSummaryHeader の Level 2 純化 & 行数検証**:
    - `team-summary-header.tsx`: 93行（上限 100行クリア、元107行から削減）。`DataManagementMenu` への直接依存を排除し、右端に `{actionSlot}` を描画する純粋な Level 2 Domain UI Block として純化。
    - `team-summary/types.ts`: `matchId` および `onRefreshCustomEvents` を完全削除し、`actionSlot?: ReactNode` を追加。
  - **Dashboard 合成**:
    - `Dashboard.tsx` (Level 3 Feature View) 側で `DataManagementMenu` をインポートし、`TeamSummaryHeader` の `actionSlot` に `<DataManagementMenu matchId={matchId} onRefresh={d.handleRefreshCustomEvents} />` を注入してコンポジションを整理。
  - **品質検査結果**:
    - `bun run ai:check src/features/dashboard` を実行し、Biome（24ファイル）、TypeScript型検査、Vitest単体テスト（3 suites, 13 tests）がすべて exit code 0 でパス。

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `inherit`
- **Reviewed At**: 2026-10-19
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 要件網羅性: matchId / onRefreshCustomEvents が Props から消去され、actionSlot 注入に一本化されているか
  - [x] 境界と副作用: TeamSummaryHeader が純粋な Level 2 Domain UI に純化され、不要な副作用や DB 依存がないか
  - [x] 設計負債防止: 行数制約（Component <= 100行）を厳守しているか
  - [x] サイレント破壊防止: Dashboard 画面で DataManagementMenu が今まで通り表示・動作するか
- **Summary**:
  1. **要件網羅性**: `TeamSummaryHeaderProps` から `matchId` および `onRefreshCustomEvents` を完全削除し、`actionSlot?: ReactNode` に一本化。`TeamSummaryHeader` 内部の `DataManagementMenu` 依存が排除され、右端へのスロット描画に置き換わっている。
  2. **境界と副作用**: コンポーネントは 94行（<= 100行 厳守）となり、Props とコールバックのみに依存する純粋な Level 2 Domain UI Block として純化。副作用・ホスト依存・DB 依存はゼロ。
  3. **設計負債防止・OCP**: `Dashboard.tsx` (Level 3 Feature View) 側で `actionSlot={<DataManagementMenu ... />}` を注入して合成（Composition）する構成に整理され、拡張性・再利用性が大幅に向上。
  4. **サイレント破壊防止**: `Dashboard.tsx` から `DataManagementMenu` に渡す props (`matchId`, `onRefresh`) はリファクタリング前と同一であり、機能的等価性を維持。TDD による 4 件の単体テスト、型検査、Biome チェックがすべてパスしていることを確認。

## 6. Rejections / Additional Tasks (不可逆修正欄)
- 特になし。完璧な実装とリファクタリングです。
