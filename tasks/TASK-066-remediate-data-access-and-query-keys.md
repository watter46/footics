# TASK-066: データアクセス3層規約の完全適用（UI直DB参照の廃止・queryKeys統一・Zod境界検証）

## 1. Metadata
- **Status**: `TODO`
- **Created**: 2026-10-26
- **Target Files**:
  - `src/lib/query-keys.ts` (MODIFY)
  - `src/lib/db/queries.ts` (MODIFY)
  - `src/features/match/components/match-view-wrapper.tsx` (MODIFY)
  - `src/features/memo-overlay/components/MemoOverlayModal.tsx` (MODIFY)
  - `src/features/teams/components/AddPlayerDialog.tsx` (MODIFY)
  - `src/features/teams/components/EditPlayerDialog.tsx` (MODIFY)
  - `src/features/teams/components/player-whoscored-link-section.tsx` (MODIFY)
  - `src/features/teams/hooks/use-player-master.ts` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/top-bar-more-menu.tsx` (MODIFY)
  - `.dependency-cruiser.cjs` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [ ] 1. `.dependency-cruiser.cjs` の `no-component-direct-db-access` に例外登録されている 6 つの UI コンポーネントから `@/lib/db` への直接 import を撤去し、カスタムフック（`useQuery` / `useMutation`）経由に移行して `.dependency-cruiser.cjs` の `pathNot` 例外をすべて削除する。
- [ ] 2. コードベース内の配列リテラル `queryKey`（19箇所：`['matchData', matchId]`, `['season-players', ...]`, `['chelsea-squad']` 等）をすべて `src/lib/query-keys.ts` のファクトリ関数に統一する。
- [ ] 3. コンポーネント内に直書きされた `queryClient.invalidateQueries`（`MemoOverlayModal.tsx`, `EditPlayerDialog.tsx`, `player-whoscored-link-section.tsx`）を各ドメインの `useMutation` フック内の `onSuccess` にカプセル化する。
- [ ] 4. `src/lib/db/queries.ts`（490行）を機能ドメイン別のリポジトリファイル（300行以下）へ分割し、入出力境界に Zod バリデーションを追加する。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { queryKeys } from '@/lib/query-keys';
```

### 3.2 Key Interfaces & Types
```ts
// src/lib/query-keys.ts に全ドメインのキー生成関数を集約
export const queryKeys = {
  matches: {
    all: ['matches'] as const,
    detail: (matchId: string) => ['matches', 'detail', matchId] as const,
  },
  // ...
};
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```ts
// ❌ 修正前: コンポーネント内で直接 savePlayerMaster + invalidateQueries
await savePlayerMaster(record);
await queryClient.invalidateQueries({ queryKey: ['season-players', season, team] });

// ✅ 修正後: useMutation フックを呼び出すのみ
await savePlayerMutation.mutateAsync(record);
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: queryKeys ファクトリの拡充と配列リテラル queryKey 19箇所の統一
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/query-keys.ts`, `src/features/dashboard/hooks/use-match-metadata.ts`, `src/features/teams/hooks/use-player-master.ts`, `src/features/national-dashboard/hooks/use-national-dashboard.ts`
- **契約 (Interface)**:
  ```ts
  // queryKey: ['...'] の直書きを 0 件にする
  ```
- **Testing Strategy**: 既存のフック単体テストおよび `bun run ai:check` が PASS すること。
- **Tasks**:
  - [ ] 1. TDD実装: `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:

### Phase 2: UI コンポーネント6件の DB 直接参照・invalidateQueries 直書きのフック化と depcruise 例外撤去
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/match/components/match-view-wrapper.tsx`, `src/features/memo-overlay/components/MemoOverlayModal.tsx`, `src/features/teams/components/AddPlayerDialog.tsx`, `src/features/teams/components/EditPlayerDialog.tsx`, `src/features/teams/components/player-whoscored-link-section.tsx`, `src/features/tactical-unified/panels/toolbar/top-bar-more-menu.tsx`, `.dependency-cruiser.cjs`
- **契約 (Interface)**:
  ```js
  // .dependency-cruiser.cjs の no-component-direct-db-access から個別ファイル例外を全削除
  ```
- **Testing Strategy**: `bunx depcruise --config .dependency-cruiser.cjs src` がエラー 0 で PASS すること。
- **Tasks**:
  - [ ] 1. TDD実装: `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:

### Phase 3: src/lib/db/queries.ts (490行) のドメイン別リポジトリ分割と Zod 境界検証
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/db/queries.ts`, `src/lib/db/repositories/match-repository.ts`, `src/lib/db/repositories/player-repository.ts`, `.agents/guardrails-baseline.json`
- **契約 (Interface)**:
  ```ts
  // 各リポジトリファイルは 300 行以下、queries.ts は barrel ではなく直接 import へ移行または縮小
  ```
- **Testing Strategy**: `src/lib/db/__tests__/` の単体テストと `bun run ai:check` が PASS すること。
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
