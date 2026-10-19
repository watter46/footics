# TASK-020: use-dashboard God Hook 解体 & 単一責務フック分割

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-19
- **Target Files**:
  - `src/features/dashboard/hooks/use-match-metadata.ts` (NEW)
  - `src/features/dashboard/hooks/use-match-cache-recovery.ts` (NEW)
  - `src/features/dashboard/hooks/use-custom-event-operations.ts` (NEW)
  - `src/features/dashboard/hooks/use-dashboard.ts` (MODIFY)
  - `src/features/dashboard/hooks/index.ts` (NEW)
  - `src/features/dashboard/index.ts` (MODIFY)
  - `src/features/dashboard/hooks/__tests__/use-match-metadata.test.ts` (NEW)
  - `src/features/dashboard/hooks/__tests__/use-custom-event-operations.test.ts` (NEW)
  - `tasks/TASK-020-use-dashboard-god-hook-refactor.md` (NEW)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `use-match-metadata.ts` を新設し、TanStack Query による `getMatch(matchId)` のフェッチ、`status` ('loading-data' | 'error' | 'ready')、`error`、`cacheMissing` をカプセル化すること（Hook <= 80行）。
- [x] 2. `use-match-cache-recovery.ts` を新設し、`cleanupOldCache()` のマウント時クリーンアップと、キャッシュ欠損時の `importMatchJsonFile` 復元ハンドラ、`isRestoring`、`restoreInputRef` をカプセル化すること（Hook <= 80行）。
- [x] 3. `use-custom-event-operations.ts` を新設し、`refreshTrigger` 状態管理、`deleteCustomEvent` 実行、`handleEditCustomEvent`（`useMemoOverlayStore` への初期値注入とモーダル開）、`handleRefreshCustomEvents` をカプセル化すること（Hook <= 90行）。
- [x] 4. `use-dashboard.ts` を上記 3 つの単一責務フックと `useDashboardFilters`, `useEvents` を束ねる純粋な Facade Hook へリファクタリングし、70行以内にスリム化すること。
- [x] 5. 単体テスト `use-match-metadata.test.ts` および `use-custom-event-operations.test.ts` を新設し、TDD で検証すること。
- [x] 6. `bun run ai:check src/features/dashboard` で exit code 0 を確認すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 useMatchMetadata
```ts
// src/features/dashboard/hooks/use-match-metadata.ts
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getMatch } from '@/lib/db';

export function useMatchMetadata(matchId: string) {
  const { data: metadata, isLoading, error: queryError } = useQuery({
    queryKey: ['matchData', matchId],
    queryFn: () => getMatch(matchId),
  });

  const status = useMemo(() => {
    if (isLoading) return 'loading-data' as const;
    if (queryError || !metadata) return 'error' as const;
    return 'ready' as const;
  }, [isLoading, queryError, metadata]);

  const error = queryError ? (queryError as Error).message : (!metadata && !isLoading ? 'Metadata not found' : null);
  const cacheMissing = !metadata && !isLoading;

  return { metadata, status, error, cacheMissing, isLoading };
}
```

### 3.2 useMatchCacheRecovery
```ts
// src/features/dashboard/hooks/use-match-cache-recovery.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { cleanupOldCache, importMatchJsonFile } from '@/lib/data-loader';

export function useMatchCacheRecovery(onSuccess?: () => void) {
  const [isRestoring, setIsRestoring] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { cleanupOldCache(); }, []);

  const handleRestoreCache = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsRestoring(true);
    const toastId = toast.loading('Restoring match cache...');
    try {
      await importMatchJsonFile(file);
      toast.success('Cache restored successfully!', { id: toastId });
      if (onSuccess) onSuccess();
      else window.location.reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Restore failed: ${msg}`, { id: toastId });
    } finally {
      setIsRestoring(false);
      if (restoreInputRef.current) restoreInputRef.current.value = '';
    }
  }, [onSuccess]);

  return { isRestoring, restoreInputRef, handleRestoreCache };
}
```

### 3.3 useCustomEventOperations
```ts
// src/features/dashboard/hooks/use-custom-event-operations.ts
import { useCallback, useState } from 'react';
import { useMemoOverlayStore } from '@/features/memo-overlay';
import { deleteCustomEvent } from '@/lib/db';
import type { EventRow } from '@/types';

export function useCustomEventOperations() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const resetMemoOverlay = useMemoOverlayStore((s) => s.reset);
  const setEventId = useMemoOverlayStore((s) => s.setEventId);
  const setPeriod = useMemoOverlayStore((s) => s.setPeriod);
  const setTimeStr = useMemoOverlayStore((s) => s.setTimeStr);
  const setSelectedLabels = useMemoOverlayStore((s) => s.setSelectedLabels);
  const setMemo = useMemoOverlayStore((s) => s.setMemo);
  const forceSetPhase = useMemoOverlayStore((s) => s.forceSetPhase);
  const setModalOpen = useMemoOverlayStore((s) => s.setModalOpen);

  const handleEditCustomEvent = useCallback((event: EventRow) => {
    const labels = (event.custom_label || '').split(' / ').map((s) => s.trim()).filter(Boolean);
    resetMemoOverlay('EVENT');
    setEventId(event.id.toString());
    setPeriod(Number(event.period));
    setTimeStr(`${event.minute}:${event.second.toString().padStart(2, '0')}`);
    setSelectedLabels(labels);
    setMemo(event.custom_memo || '');
    forceSetPhase(2);
    setModalOpen(true);
  }, [resetMemoOverlay, setEventId, setPeriod, setTimeStr, setSelectedLabels, setMemo, forceSetPhase, setModalOpen]);

  const handleDeleteCustomEvent = useCallback(async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    await deleteCustomEvent(eventId);
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const handleRefreshCustomEvents = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return { refreshTrigger, handleEditCustomEvent, handleDeleteCustomEvent, handleRefreshCustomEvents };
}
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 3フック抽出 & useDashboard スリム化 (TDD)
- **Worker Model**: `inherit`
- **対象ファイル**: 上記 Target Files
- **Testing Strategy**:
  - テストファイルを先に作成（RED）
  - 実装完了後 `bun run ai:check src/features/dashboard` で exit code 0 を確認
- **Tasks**:
  - [x] 1. TDD実装: テスト `use-match-metadata.test.ts`, `use-custom-event-operations.test.ts` を作成し RED を確認
  - [x] 2. `use-match-metadata.ts`, `use-match-cache-recovery.ts`, `use-custom-event-operations.ts` を実装
  - [x] 3. `use-dashboard.ts` を 70行以内にリファクタリングして GREEN
  - [x] 4. `src/features/dashboard/hooks/index.ts` を作成し、`src/features/dashboard/index.ts` から export
  - [x] 5. `bun run ai:check src/features/dashboard` で exit code 0 を確認
- **Worker Handoff Log**:
  - **TDDサイクル実施**:
    - `use-match-metadata.test.ts` (4 tests) と `use-custom-event-operations.test.ts` (5 tests) を新設し RED を確認後、実装を進めて GREEN を達成（9/9 tests pass）。
  - **フック抽出と行数検証**:
    - `use-match-metadata.ts`: 38行（上限 80行クリア）。TanStack Query 経由のメタデータ取得、キャッシュ欠損判定（cacheMissing）、ステータス判定（`DashboardStatus = 'idle' | 'initializing' | 'loading-data' | 'error' | 'ready'`）をカプセル化。Dashboard.tsx との完全な後方互換性を保持。
    - `use-match-cache-recovery.ts`: 47行（上限 80行クリア）。マウント時キャッシュクリーンアップ、ファイル復元ハンドラ、toast 通知、再読込処理をカプセル化。
    - `use-custom-event-operations.ts`: 65行（上限 90行クリア）。refreshTrigger 状態管理、deleteCustomEvent 実行と確認ダイアログ、useMemoOverlayStore への値注入・モーダルオープンをカプセル化。
    - `use-dashboard.ts`: 38行（上限 70行クリア、元187行から大幅スリム化）。4つの専門フック（メタデータ、復元、カスタムイベント、フィルタ）と useEvents を束ねる純粋な Facade Hook へ再構成。返り値インターフェースは完全等価を維持。
  - **エクスポート整備**:
    - `src/features/dashboard/hooks/index.ts` を新設し全フックをバレルエクスポート。
    - `src/features/dashboard/index.ts` から `export * from './hooks'` を行い外部公開 API を整備。
  - **品質検査結果**:
    - `bun run ai:check src/features/dashboard` を実行し、Biome（23ファイル）、TypeScript型検査、Vitest単体テスト（9 tests）がすべて exit code 0 でパス。

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `inherit`
- **Reviewed At**: 2026-10-19
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 要件網羅性: 3つのフックが単一責務で抽出され、useDashboard が 70行以内にスリム化されているか
  - [x] 境界と副作用: cleanup や DB 更新等の副作用が各フック内に適切にカプセル化されているか
  - [x] 設計負債防止: 全フック <= 100行を遵守し、型定義が厳格か
  - [x] サイレント破壊防止: Dashboard.tsx への返り値インターフェースが等価に維持されているか
- **Summary**:
  - **要件網羅性 & 行数制約**: `useMatchMetadata` (38行), `useMatchCacheRecovery` (47行), `useCustomEventOperations` (65行) の3つの単一責務フックへ綺麗に分解され、`useDashboard` は 39行の薄い Facade Hook としてスリム化を達成。
  - **副作用のカプセル化**: キャッシュクリーンアップ・JSON復元・カスタムイベント削除確認および Zustand（useMemoOverlayStore）連携が各専門フック内に適切にカプセル化されている。
  - **型安全・設計負債防止**: `DashboardStatus` 型の明確化、依存配列の完全性、および TDD による 9件のユニットテストが追加され、全件グリーン。
  - **サイレント破壊防止**: `Dashboard.tsx` が消費する返り値インターフェース（メタデータ、ステータス、キャッシュ復元、フィルタ、カスタムイベント操作、events、isQuerying）が完全等価に維持されていることを確認。

## 6. Rejections / Additional Tasks (不可逆修正欄)
