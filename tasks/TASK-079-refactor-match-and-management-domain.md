# TASK-079: [Match & Management] 試合メモ・タイムライン・データ管理の垂直リファクタリング

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-26
- **Target Files**:
  - `src/lib/db/export.ts` (MODIFY)
  - `src/lib/db/__tests__/export.test.ts` (MODIFY)
  - `src/lib/db/queries.ts` (MODIFY)
  - `src/lib/db/queries-player.ts` (NEW)
  - `src/lib/db/schema.ts` (MODIFY)
  - `src/lib/data-management.ts` (MODIFY)
  - `src/lib/data-management-helpers.ts` (NEW)
  - `src/features/match/hooks/use-match-memo.ts` (MODIFY)
  - `src/features/match/hooks/use-match-detail.ts` (NEW)
  - `src/features/match/components/match-view-wrapper.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `src/lib/db/__tests__/export.test.ts` の失敗テスト2件が修復され、`dispatchRefreshEvent` の `window.postMessage` 通知契約と `use-match-memo.ts` のイベント購読が完全に整合して PASS すること
- [x] 2. `src/lib/db/queries.ts` (491行) から選手マスター・写真操作を `src/lib/db/queries-player.ts` に分離し、両ファイルとも 300行以下（`queries.ts` からの re-export で既存 import 互換維持）にすること
- [x] 3. `src/lib/data-management.ts` (362行・`any` 9件) および `src/lib/db/schema.ts` (`any` 1件) の `any` / `as unknown as` を全廃し、補助ロジックを `src/lib/data-management-helpers.ts` へ分離して 300行以下にすること
- [x] 4. `src/features/match/components/match-view-wrapper.tsx` の直接 DB 参照（`getMatch`, `setKeyValue`）を `src/features/match/hooks/use-match-detail.ts` フックへ移行し、UI 直 DB アクセスをゼロにすること

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { matchKeys } from '@/lib/query-keys';
import { getMatch, setKeyValue } from '@/lib/db';
import type { CustomEvent, MatchMemo } from '@/lib/schema';
import type { PlayerMaster, PlayerPhoto } from '@/lib/db/schema';
```

### 3.2 Key Interfaces & Types
```ts
export interface FooticsRefreshMessage {
  type: 'footics-action' | 'FOOTICS_ACTION';
  action?: string;
  detail?: { action: string; matchId?: string };
  payload?: { matchId?: string };
}

export interface BackupPayload {
  version: number;
  exportedAt: string;
  customEvents?: CustomEvent[];
  matchMemos?: MatchMemo[];
  playerMasters?: PlayerMaster[];
  playerPhotos?: PlayerPhoto[];
}
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```ts
// 1. schema.ts を編集する際は既存の .upgrade() ブロックを絶対に削除・破損しないこと（code-guardrails により検査される）
// 2. queries.ts から queries-player.ts を分離する際、queries.ts 側で export * from './queries-player' を行い既存の import 元を破壊しないこと
// 3. export.test.ts では window.postMessage の呼び出しを vi.spyOn(window, 'postMessage') で検証すること
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: メモ入出力テスト修復とイベント同期の安定化
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/db/export.ts`, `src/lib/db/__tests__/export.test.ts`, `src/features/match/hooks/use-match-memo.ts`
- **契約 (Interface)**:
  ```ts
  export async function importMemosBatch(customEvents: CustomEvent[], matchMemos?: MatchMemo[]): Promise<void>;
  ```
- **Testing Strategy**: `src/lib/db/__tests__/export.test.ts` にて `importMemosBatch` 実行時に `window.postMessage` が `'footics-action'` ペイロードで呼ばれることを検証。`use-match-memo.test.ts`（または既存テスト）でメモ更新同期を検証。
- **Tasks**:
  - [x] 1. TDD実装: `rtk vitest run src/lib/db/__tests__/export.test.ts` ➔ テストと購読処理の整合修正 ➔ `bun run ai:check src/lib/db/export.ts src/lib/db/__tests__/export.test.ts src/features/match/hooks/use-match-memo.ts` PASS
- **Worker Handoff Log**:
  - `export.test.ts` で `window.postMessage` spy に移行し `footics-action` 送信を検証。`use-match-memo.ts` に `useEffect` で postMessage リスナーを追加しクエリ無効化を配線。

### Phase 2: DB クエリ層の 300行以下分割と Schema 型安全化
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/db/queries.ts`, `src/lib/db/queries-player.ts`, `src/lib/db/schema.ts`
- **契約 (Interface)**:
  ```ts
  // queries-player.ts: savePlayerMaster, getPlayerMastersBySeason, deletePlayerMaster, mergePlayerId, savePlayerPhoto, getPlayerPhoto 等を定義し queries.ts から再エクスポート
  ```
- **Testing Strategy**: 既存の `src/lib/db/__tests__/` 全テストがリグレッションなく PASS すること。
- **Tasks**:
  - [x] 1. TDD実装: `queries-player.ts` 抽出と `schema.ts` の `any` 除去 ➔ `bun run ai:check src/lib/db/queries.ts src/lib/db/queries-player.ts src/lib/db/schema.ts` PASS
- **Worker Handoff Log**:
  - `queries-player.ts` (267行) を新設し全選手マスター/写真操作を移行。`queries.ts` (137行) から re-export。`schema.ts` (83行) の VersionError 型ガードを安全化。

### Phase 3: データ管理 (data-management.ts) の型安全化と 300行以下分割
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/data-management.ts`, `src/lib/data-management-helpers.ts`, `src/lib/__tests__/data-management.test.ts`
- **契約 (Interface)**:
  ```ts
  export function isValidBackupRecord(val: unknown): val is Record<string, unknown>;
  ```
- **Testing Strategy**: `src/lib/__tests__/data-management.test.ts` にてバックアップ JSON の検証・インポート・エクスポートが期待通り動作することを検証。
- **Tasks**:
  - [x] 1. TDD実装: `data-management-helpers.ts` 分離と `any` 9件の型ガード置換 ➔ `bun run ai:check src/lib/data-management.ts src/lib/data-management-helpers.ts` PASS
- **Worker Handoff Log**:
  - `data-management-helpers.ts` (136行) へ補助・Blob変換・写真探索を抽出し、`data-management.ts` (282行) から `any` 6件 / `as unknown as` 3件を全廃。

### Phase 4: Match View Wrapper の UI直DBアクセス解消
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/match/hooks/use-match-detail.ts`, `src/features/match/components/match-view-wrapper.tsx`
- **契約 (Interface)**:
  ```ts
  export function useMatchDetail(matchId: string): { match: Match | null | undefined; isLoading: boolean; recordRecentMatch: (id: string) => Promise<void> };
  ```
- **Testing Strategy**: `match-view-wrapper.tsx` から `@/lib/db` の直接 import が消え、`matchKeys.detail(matchId)` を用いた `useMatchDetail` 経由で動作すること。
- **Tasks**:
  - [x] 1. TDD実装: `use-match-detail.ts` 作成と `match-view-wrapper.tsx` 移行 ➔ `bun run ai:check src/features/match/hooks/use-match-detail.ts src/features/match/components/match-view-wrapper.tsx` PASS
- **Worker Handoff Log**:
  - `use-match-detail.ts` (33行) を新設し TanStack Query キャッシュ購読および最近の試合記録を隠蔽。`match-view-wrapper.tsx` (90行) から直接 DB アクセスを排除。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-26 19:43
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**: メモ購読通知のpostMessage統一、DBクエリ層の300行以下分割とschemaのany排除、data-managementの型安全化/ヘルパー分離、UI直DBアクセスのuseMatchDetailフック移行が全て設計原則に準拠して完了。

## 6. Rejections / Additional Tasks (不可逆修正欄)
