# TASK-065: [Level 2-A] 残存 CustomEvent (5ファイル) の型付き postMessage / コールバック移行

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-26
- **Target Files**:
  - `src/hooks/use-shortcut.ts` (MODIFY)
  - `src/features/match/hooks/use-match-memo.ts` (MODIFY)
  - `src/lib/db/extension-db-queries.ts` (MODIFY)
  - `extension/features/memo-overlay/hooks/use-overlay-shortcut-interceptor.ts` (MODIFY)
  - `extension/features/storage-sync/footics-app-bridge.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `src/hooks/use-shortcut.ts`, `src/features/match/hooks/use-match-memo.ts`, `src/lib/db/extension-db-queries.ts` の `window.dispatchEvent(new CustomEvent(...))` を、型付き `window.postMessage` または明示的なコールバック呼び出しへ置換する。
- [x] 2. `extension/features/memo-overlay/hooks/use-overlay-shortcut-interceptor.ts` および `extension/features/storage-sync/footics-app-bridge.ts` の `CustomEvent` 送受信を、Zod スキーマ検証付きの `window.postMessage` プロトコルへ統一し、`CustomEvent` の使用を 0 件にする。
- [x] 3. 並列実行中の他タスクとの競合を防ぐため、Target Files の5ファイルと対応する単体テストのみを編集し（.agents/guardrails-baseline.json は編集しないこと）、完了後に `bun run ai:commit` で対象ファイルのみを指定してコミットする。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { z } from 'zod';
```

### 3.2 Key Interfaces & Types
```ts
export const footicsBridgeActionPayloadSchema = z
  .object({
    matchId: z.string().optional(),
  })
  .passthrough();

export const footicsBridgeMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('FOOTICS_ACTION'),
    action: z.string(),
    payload: z.unknown().optional(),
  }),
  z.object({
    type: z.literal('FOOTICS_TRIGGER_CAPTURE'),
  }),
]);
export type FooticsBridgeMessage = z.infer<typeof footicsBridgeMessageSchema>;
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```ts
// ❌ 禁止: window.dispatchEvent(new CustomEvent('footics-action', { detail: { action } }));
// ✅ 推奨: window.postMessage({ type: 'FOOTICS_ACTION', action }, window.location.origin);
// 並列実行時の競合を防ぐため、上記5ファイルと対応テストファイルのみを編集し、.agents/guardrails-baseline.json は編集しないこと。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: CustomEvent 残存 5 ファイルの postMessage / コールバック移行と単体テスト更新
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/hooks/use-shortcut.ts`
  - `src/features/match/hooks/use-match-memo.ts`
  - `src/lib/db/extension-db-queries.ts`
  - `extension/features/memo-overlay/hooks/use-overlay-shortcut-interceptor.ts`
  - `extension/features/storage-sync/footics-app-bridge.ts`
  - 対応テスト:
    - `src/hooks/__tests__/use-shortcut.test.ts`
    - `src/lib/db/__tests__/queries.test.ts`
    - `extension/features/storage-sync/__tests__/footics-app-bridge.test.ts`
- **契約 (Interface)**:
  1. `src/hooks/use-shortcut.ts`:
     - `__trigger_shortcut` は `window.postMessage({ type: 'FOOTICS_ACTION', action: name }, targetOrigin)` を発火。
     - `useExternalAction` は `window.addEventListener('message', ...)` で `{ type: 'FOOTICS_ACTION', action }` を受信し、`action()` を呼ぶ（既存の `footics-action` も安全に互換処理）。`removeEventListener` を確実に行う。
     - `new CustomEvent` は完全撤去。
  2. `src/features/match/hooks/use-match-memo.ts`:
     - `window.dispatchEvent(new CustomEvent('footics-save-request', ...))` を撤去。
     - `import { getMatchMemo, putMatchMemo } from '@/lib/db';` とし、`mutationFn` 内で直接 `await putMatchMemo({ matchId, memo: newMemo, updatedAt: Date.now() })` を呼び出す。
  3. `src/lib/db/extension-db-queries.ts`:
     - `dispatchRefreshEvent` から `window.dispatchEvent(new CustomEvent('footics-action', ...))` を撤去。
     - `window.postMessage({ type: 'footics-action', detail }, targetOrigin)` および `window.postMessage({ type: 'FOOTICS_ACTION', action: SHORTCUT_ACTIONS.REFRESH_DATA, payload: { matchId: matchId ? String(matchId) : undefined } }, targetOrigin)` を送信する。
  4. `extension/features/memo-overlay/hooks/use-overlay-shortcut-interceptor.ts`:
     - `escape`, `ctrl+enter`, `alt+m` の `new CustomEvent('footics-action', ...)` を `window.postMessage({ type: 'FOOTICS_ACTION', action: '...' }, targetOrigin)` に置換。
     - `alt+s` の `new CustomEvent('footics-trigger-capture')` を `window.postMessage({ type: 'FOOTICS_TRIGGER_CAPTURE' }, targetOrigin)` に置換。
  5. `extension/features/storage-sync/footics-app-bridge.ts`:
     - `footicsBridgeMessageSchema` を export。
     - `setupMatchSync` の `window.addEventListener('footics-action', ...)` を `window.addEventListener('message', ...)` に移行。`footicsBridgeMessageSchema` で検証し、`type === 'FOOTICS_ACTION' && action === 'REFRESH_DATA'` 時に `syncMatchMemoCacheToStorage(matchId)` を呼ぶ。
     - `handleKeydown` で Escape 押下時の `new CustomEvent('footics-action', ...)` を `window.postMessage({ type: 'FOOTICS_ACTION', action: 'CLOSE_OVERLAY' }, targetOrigin)` に置換。
     - CustomEvent の使用は 0 件。
  6. 単体テスト更新:
     - `src/hooks/__tests__/use-shortcut.test.ts`: `useExternalAction` の `postMessage` 受信と `__trigger_shortcut` の `postMessage` 送信テストを追加。
     - `src/lib/db/__tests__/queries.test.ts`: `dispatchRefreshEvent` のテストで `window.postMessage` が呼ばれ、`dispatchEvent` は呼ばれないことを検証。
     - `extension/features/storage-sync/__tests__/footics-app-bridge.test.ts`: `setupMatchSync` の `postMessage` 受信テストおよび `Escape` 押下時の `postMessage` 発火テストを追加。
- **Testing Strategy**: `bun run ai:check` が PASS すること。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:
  - `extension/features/storage-sync/footics-app-bridge.ts`: `footicsBridgeMessageSchema`, `footicsBridgeActionPayloadSchema`, `setupMatchSync` を export。CustomEvent は全廃し型付き postMessage へ統一。
  - `src/hooks/use-shortcut.ts`: `__trigger_shortcut` を postMessage 発火に更新、`useExternalAction` は `message` と既存 `footics-action` の両方を受信して後方互換を確保。

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
- **Summary**: 残存 CustomEvent 5ファイルの型付き postMessage / コールバック移行、および単体テスト全39件のパスを確認。承認。

## 6. Rejections / Additional Tasks (不可逆修正欄)
