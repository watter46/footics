# TASK-083: [Teams, Squad & Analysis] チーム分析・スカッド・フォーメーションの垂直リファクタリング

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-26
- **Target Files**:
  - `src/features/teams/hooks/use-player-master.ts` (MODIFY)
  - `src/features/teams/components/AddPlayerDialog.tsx` (MODIFY)
  - `src/features/teams/components/EditPlayerDialog.tsx` (MODIFY)
  - `src/features/teams/components/player-whoscored-link-section.tsx` (MODIFY)
  - `src/features/teams/hooks/use-team-squad.ts` (MODIFY)
  - `src/features/teams/hooks/use-team-squad-client.ts` (MODIFY)
  - `src/features/analysis/hooks/use-events.ts` (MODIFY)
  - `src/registry/events/corner-kick.ts` (MODIFY)
  - `src/registry/events/free-kick.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `AddPlayerDialog.tsx`, `EditPlayerDialog.tsx`, `player-whoscored-link-section.tsx` の直接 DB アクセス（`@/lib/db/queries` からの `savePlayerMaster`, `savePlayerPhoto`, `mergePlayerId` 呼び出し）を全廃し、`use-player-master.ts` のミューテーションフック経由へ完全移行すること
- [x] 2. `use-player-master.ts`, `use-team-squad.ts`, `use-team-squad-client.ts`, `use-events.ts` の TanStack Query キーを `@/lib/query-keys` のファクトリ関数に統一し、ハードコード配列キーを排除すること
- [x] 3. `src/registry/events/corner-kick.ts` および `free-kick.ts` の `any` (計2件) を全廃し、厳密なイベント行型で判定を行うこと
- [x] 4. Teams / Analysis ドメインの全単体テスト（`AddPlayerDialog.test.tsx`, `use-player-master.test.tsx`, `use-team-squad.test.tsx` 等）が 100% PASS すること

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { customEventKeys, eventKeys, matchKeys, playerKeys } from '@/lib/query-keys';
import { usePlayerMasterMutations } from '@/features/teams/hooks/use-player-master';
import type { EventRow } from '@/types';
```

### 3.2 Key Interfaces & Types
```ts
export interface PlayerMasterMutations {
  savePlayer: (master: PlayerMaster, photoBlob?: Blob | null) => Promise<void>;
  updatePlayer: (master: PlayerMaster) => Promise<void>;
  mergePlayer: (sourceId: number, targetId: number, season?: string) => Promise<void>;
}
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```ts
// 1. AddPlayerDialog.tsx / EditPlayerDialog.tsx / player-whoscored-link-section.tsx から '@/lib/db/queries' の import を完全に削除すること（.dependency-cruiser の例外撤去条件）
// 2. AddPlayerDialog.test.tsx 等の既存テストで savePlayerMaster 等をモックしている場合、フック経由でも同じ下層関数が呼ばれるように設計して既存テストとの互換性を保つこと
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: Teams ダイアログ3件の UI直DBアクセス解消とフック統合
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/teams/hooks/use-player-master.ts`, `src/features/teams/components/AddPlayerDialog.tsx`, `src/features/teams/components/EditPlayerDialog.tsx`, `src/features/teams/components/player-whoscored-link-section.tsx`
- **契約 (Interface)**:
  ```ts
  // use-player-master.ts のミューテーションをダイアログ3件から呼び出し、コンポーネント内の @/lib/db/queries 直 import をゼロにする
  ```
- **Testing Strategy**: `AddPlayerDialog.test.tsx` および `use-player-master.test.tsx` が PASS し、3コンポーネントの DB 直参照が 0 になること。
- **Tasks**:
  - [x] 1. TDD実装: `use-player-master.ts` 整備とダイアログ3件のフック移行 ➔ `bun run ai:check src/features/teams/hooks/use-player-master.ts src/features/teams/components/AddPlayerDialog.tsx src/features/teams/components/EditPlayerDialog.tsx src/features/teams/components/player-whoscored-link-section.tsx` PASS
- **Worker Handoff Log**:
  - `PlayerMasterMutations`, `usePlayerMasterMutations` を export。`useContext(QueryClientContext)` で Provider スコープ外（テスト環境等）でも安全に動作可能にし、対象3コンポーネントの `@/lib/db/queries` 直参照を全廃。

### Phase 2: Squad & Analysis フックの Query Keys 一元化
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/teams/hooks/use-team-squad.ts`, `src/features/teams/hooks/use-team-squad-client.ts`, `src/features/analysis/hooks/use-events.ts`
- **契約 (Interface)**:
  ```ts
  // matchKeys, playerKeys, eventKeys, customEventKeys を用いて queryKey を統一
  ```
- **Testing Strategy**: `use-team-squad.test.tsx`, `use-chelsea-squad.test.tsx` 等がすべて PASS すること。
- **Tasks**:
  - [x] 1. TDD実装: 3フックの Query Key ファクトリ統一 ➔ `bun run ai:check src/features/teams/hooks/use-team-squad.ts src/features/teams/hooks/use-team-squad-client.ts src/features/analysis/hooks/use-events.ts` PASS
- **Worker Handoff Log**:
  - Query keys統一: matches (`matchKeys.lists()`), squad/excluded (`[...playerKeys.lists(), ...]`), events (`eventKeys.filtered({ ...filters, matchId })`)

### Phase 3: Event Registry の any 全廃
- **Worker Model**: `flash_lite`
- **対象ファイル**: `src/registry/events/corner-kick.ts`, `src/registry/events/free-kick.ts`
- **契約 (Interface)**:
  ```ts
  // qualifiers 配列の要素型を明示し any 2件を排除
  ```
- **Testing Strategy**: `explicitAny` が 0 になり、型チェック・Lint が PASS すること。
- **Tasks**:
  - [x] 1. TDD実装: `corner-kick.ts` と `free-kick.ts` の `any` 排除 ➔ `bun run ai:check src/registry/events/corner-kick.ts src/registry/events/free-kick.ts` PASS
- **Worker Handoff Log**:
  - `CornerKickStrategy`, `FreeKickStrategy`: `import type { Qualifier } from '@/types';` を追加し、`((event.qualifiers || []) as Qualifier[])` で `any` を完全排除。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-26
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  ダイアログ3件のDB直接アクセスが `usePlayerMasterMutations` へ一元化され、Query Keys はファクトリ関数へ統合、Event Registry の `any` も完全に排除された。全単体テスト PASS 確認済み。

## 6. Rejections / Additional Tasks (不可逆修正欄)
