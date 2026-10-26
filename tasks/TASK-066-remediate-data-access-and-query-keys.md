# TASK-066: [Level 3-A] queryKeys ファクトリ統一 (19箇所) と queries.ts (491行) のリポジトリ分割

## 1. Metadata
- **Status**: `TODO`
- **Created**: 2026-10-26
- **Target Files**:
  - `src/lib/query-keys.ts` (MODIFY)
  - `src/lib/db/queries.ts` (MODIFY)
  - `src/lib/db/repositories/match-repository.ts` (NEW)
  - `src/lib/db/repositories/player-repository.ts` (NEW)
  - `src/lib/db/repositories/memo-repository.ts` (NEW)
  - `src/features/dashboard/hooks/use-match-metadata.ts` (MODIFY)
  - `src/features/teams/hooks/use-player-master.ts` (MODIFY)
  - `src/features/teams/hooks/use-chelsea-squad.ts` (MODIFY)
  - `src/features/national-dashboard/hooks/use-national-dashboard.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [ ] 1. コードベース内のカスタムフックに残存する配列リテラル `queryKey`（`['matchData', matchId]`, `['season-players', ...]`, `['chelsea-squad']` 等）をすべて `src/lib/query-keys.ts` のファクトリ関数に統一する（R5 規約準拠）。
- [ ] 2. 491行に肥大化した `src/lib/db/queries.ts` を機能ドメイン別のリポジトリファイル（`match-repository.ts`, `player-repository.ts`, `memo-repository.ts`、各300行以下）へ分割し、`queries.ts` 自体も 300行以下に収める。
- [ ] 3. 各リポジトリの DB 保存・読込境界に Zod スキーマ検証または安全な型ガードを組み込む。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { queryKeys } from '@/lib/query-keys';
```

### 3.2 Key Interfaces & Types
```ts
export const queryKeys = {
  matches: {
    all: ['matches'] as const,
    detail: (matchId: string) => ['matches', 'detail', matchId] as const,
  },
  players: {
    season: (season: string, team: string) =>
      ['season-players', season, team] as const,
  },
  // ...
};
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```ts
// queries.ts で export * from '...' は使用禁止（Biome noReExportAll 違反になるため、明示的な named export または段階的移行を行うこと）。
// 並列実行する TASK-074（UIコンポーネント6件のDB直参照解消）と競合しないよう、UIコンポーネント（.tsx）や .dependency-cruiser.cjs は編集しないこと。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: queryKeys ファクトリの拡充とカスタムフック内の配列リテラル queryKey 統一
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/query-keys.ts`, `src/features/dashboard/hooks/use-match-metadata.ts`, `src/features/teams/hooks/use-player-master.ts`, `src/features/teams/hooks/use-chelsea-squad.ts`, `src/features/national-dashboard/hooks/use-national-dashboard.ts`
- **契約 (Interface)**:
  ```ts
  // 対象フック内の queryKey 配列リテラル直書きを 0 件にする
  ```
- **Testing Strategy**: 既存のフック単体テストおよび `bun run ai:check` が PASS すること。
- **Tasks**:
  - [ ] 1. TDD実装: `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:

### Phase 2: src/lib/db/queries.ts (491行) のドメイン別リポジトリ分割（各300行以下）
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/db/queries.ts`, `src/lib/db/repositories/match-repository.ts`, `src/lib/db/repositories/player-repository.ts`, `src/lib/db/repositories/memo-repository.ts`
- **契約 (Interface)**:
  ```ts
  // 既存の公開関数シグネチャを維持したまま各ファイルを 300行以下に分割
  ```
- **Testing Strategy**: `src/lib/db/` の単体テストおよび `bun run ai:check` が PASS すること。
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
