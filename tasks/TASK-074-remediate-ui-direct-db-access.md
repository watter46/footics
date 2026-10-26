# TASK-074: [Level 3-B] UIコンポーネント6件のDB直参照・invalidateQueries直書きの廃止とdepcruise例外撤去

## 1. Metadata
- **Status**: `TODO`
- **Created**: 2026-10-26
- **Target Files**:
  - `src/features/match/components/match-view-wrapper.tsx` (MODIFY)
  - `src/features/match/hooks/use-match-detail-query.ts` (NEW)
  - `src/features/memo-overlay/components/MemoOverlayModal.tsx` (MODIFY)
  - `src/features/memo-overlay/hooks/use-memo-overlay-mutations.ts` (NEW)
  - `src/features/teams/components/AddPlayerDialog.tsx` (MODIFY)
  - `src/features/teams/components/EditPlayerDialog.tsx` (MODIFY)
  - `src/features/teams/components/player-whoscored-link-section.tsx` (MODIFY)
  - `src/features/teams/hooks/use-player-dialog-mutations.ts` (NEW)
  - `src/features/tactical-unified/panels/toolbar/top-bar-more-menu.tsx` (MODIFY)
  - `src/features/tactical-unified/hooks/use-tactical-project-io.ts` (NEW)
  - `.dependency-cruiser.cjs` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [ ] 1. `.dependency-cruiser.cjs` の `no-component-direct-db-access` に例外登録されている 6 つの UI コンポーネントから `@/lib/db` への直接 import をすべて撤去し、専用のカスタムフック（`useQuery` / `useMutation`）経由に移行する。
- [ ] 2. `MemoOverlayModal.tsx`, `EditPlayerDialog.tsx`, `player-whoscored-link-section.tsx` 内に直書きされた `queryClient.invalidateQueries` を各カスタムフックの `onSuccess` 内にカプセル化する。
- [ ] 3. `.dependency-cruiser.cjs` の `no-component-direct-db-access` ルールから 6 ファイルの `pathNot` 例外指定をすべて削除し、`bunx depcruise --config .dependency-cruiser.cjs src` がエラー 0 で PASS すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
```

### 3.2 Key Interfaces & Types
```ts
// UI コンポーネントは mutation.mutateAsync(...) を呼ぶのみとし、db や queryClient を直接触らない
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```ts
// 並列実行する TASK-066 とファイル競合しないよう、既存の use-player-master.ts や queries.ts は編集せず、新規の専用フックファイル（use-player-dialog-mutations.ts 等）を作成して切り出すこと。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: Teams 3 コンポーネント (AddPlayerDialog, EditPlayerDialog, player-whoscored-link-section) のフック分離
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/teams/hooks/use-player-dialog-mutations.ts`, `src/features/teams/components/AddPlayerDialog.tsx`, `src/features/teams/components/EditPlayerDialog.tsx`, `src/features/teams/components/player-whoscored-link-section.tsx`
- **契約 (Interface)**:
  ```ts
  export function usePlayerDialogMutations(season: string, team: string)
  ```
- **Testing Strategy**: `bun run ai:check` で対象コンポーネントとフックの単体テストが PASS すること。
- **Tasks**:
  - [ ] 1. TDD実装: `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:

### Phase 2: Match / MemoOverlay / Tactical 3 コンポーネントのフック分離と .dependency-cruiser.cjs 例外全撤去
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/match/hooks/use-match-detail-query.ts`, `src/features/match/components/match-view-wrapper.tsx`, `src/features/memo-overlay/hooks/use-memo-overlay-mutations.ts`, `src/features/memo-overlay/components/MemoOverlayModal.tsx`, `src/features/tactical-unified/hooks/use-tactical-project-io.ts`, `src/features/tactical-unified/panels/toolbar/top-bar-more-menu.tsx`, `.dependency-cruiser.cjs`
- **契約 (Interface)**:
  ```js
  // .dependency-cruiser.cjs の pathNot から6つの個別ファイルパス例外を完全削除
  ```
- **Testing Strategy**: `bun run ai:check` および `bun run ai:reviewer:check` がエラー 0 で PASS すること。
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
