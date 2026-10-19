# TASK-018: useMemoOverlayEventBridge ハンドラマップ化 & 統合検証

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-19
- **Target Files**:
  - `src/features/memo-overlay/hooks/event-bridge-handlers.ts` (NEW)
  - `src/features/memo-overlay/hooks/useMemoOverlayEventBridge.ts` (MODIFY)
  - `src/features/memo-overlay/hooks/__tests__/useMemoOverlayEventBridge.test.ts` (NEW)
  - `tasks/TASK-018-event-bridge-handler-map.md` (NEW)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `event-bridge-handlers.ts` を新設し、各アクションに対する純粋ハンドラおよび `EVENT_BRIDGE_HANDLERS` マップ（Strategy パターン）を実装すること（Hook <= 150行, Pure Util <= 250行クリア）。
- [x] 2. `useMemoOverlayEventBridge.ts` の長大な `switch` 文を撤廃し、ハンドラマップによるディスパッチへリファクタリングして 60行以内にスリム化すること。
- [x] 3. `TOGGLE_MATCH_MEMO`, `TOGGLE_EVENT_MEMO`, `CLOSE_OVERLAY`, `SAVE_MEMO`, `NEXT_PHASE`, `PREV_PHASE`, `BACKSPACE`, `NAVIGATE_SUGGESTION`, `FILTER_CATEGORY` の全アクション挙動を 100% 維持すること。
- [x] 4. 単体テスト `useMemoOverlayEventBridge.test.ts` を新設し、TDD で全ハンドラの実行および `isActive` 制御を検証すること。
- [x] 5. `bun run ai:check src/features/memo-overlay` で exit code 0 を確認すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Event Bridge Handler Map Pattern
```ts
// src/features/memo-overlay/hooks/event-bridge-handlers.ts
import type { MemoOverlayState } from '../stores/memo-overlay-types';

export interface FooticsActionDetail {
  action: string;
  categoryIndex?: number;
  key?: string;
  shiftKey?: boolean;
  matchId?: string;
  id?: string;
  period?: number;
  minute?: number;
  second?: number;
  labels?: string[];
  memo?: string;
}

export interface EventBridgeContext {
  onClose: () => void;
  onSave: () => void;
  onOpen?: (params: { mode: 'MATCH' | 'EVENT'; matchId?: string; data?: any }) => void;
  store: MemoOverlayState;
}

export type ActionHandler = (detail: FooticsActionDetail, ctx: EventBridgeContext) => void;

export const EVENT_BRIDGE_HANDLERS: Record<string, ActionHandler> = {
  TOGGLE_MATCH_MEMO: (detail, { onOpen }) => {
    onOpen?.({ mode: 'MATCH', matchId: detail.matchId, data: { memo: detail.memo } });
  },
  TOGGLE_EVENT_MEMO: (detail, { onOpen }) => {
    onOpen?.({
      mode: 'EVENT',
      matchId: detail.matchId,
      data: {
        id: detail.id,
        period: detail.period,
        minute: detail.minute,
        second: detail.second,
        labels: detail.labels,
        memo: detail.memo,
      },
    });
  },
  CLOSE_OVERLAY: (_detail, { onClose }) => onClose(),
  SAVE_MEMO: (_detail, { onSave }) => onSave(),
  NEXT_PHASE: (_detail, { store, onSave }) => {
    if (store.mode === 'EVENT') {
      const result = store.nextPhase();
      if (result === 'BLOCKED') return;
    } else {
      onSave();
    }
  },
  PREV_PHASE: (_detail, { store }) => store.prevPhase(),
  BACKSPACE: (_detail, { store }) => {
    if (store.mode === 'EVENT') {
      if (store.phase === 0) store.backspaceTimeStr();
      else if (store.phase === 1) store.backspaceLabel();
    }
  },
  NAVIGATE_SUGGESTION: (detail, { store }) => {
    if (store.mode === 'EVENT' && store.phase === 1) {
      const direction = detail.key === 'ArrowDown' ? 1 : -1;
      store.navigateSuggestion(direction);
    }
  },
  FILTER_CATEGORY: (detail, { store }) => {
    if (store.mode === 'EVENT' && typeof detail.categoryIndex === 'number') {
      store.filterByCategory(detail.categoryIndex);
    }
  },
};
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: ハンドラマップ抽出 & フックスリム化 (TDD)
- **Worker Model**: `inherit`
- **対象ファイル**:
  - `src/features/memo-overlay/hooks/event-bridge-handlers.ts`
  - `src/features/memo-overlay/hooks/useMemoOverlayEventBridge.ts`
  - `src/features/memo-overlay/hooks/__tests__/useMemoOverlayEventBridge.test.ts`
- **契約 (Interface)**: 上記 Context Snippets に準拠
- **Testing Strategy**:
  - `useMemoOverlayEventBridge.test.ts` を先に作成（RED）
  - 実装完了後 `bun run ai:check src/features/memo-overlay` で exit code 0 を確認
- **Tasks**:
  - [x] 1. TDD実装: テスト `useMemoOverlayEventBridge.test.ts` を作成し RED を確認
  - [x] 2. `event-bridge-handlers.ts` を作成し、`useMemoOverlayEventBridge.ts` を 60行以内にリファクタリングして GREEN
  - [x] 3. `bun run ai:check src/features/memo-overlay` で exit code 0 を確認
- **Worker Handoff Log**:
  - `src/features/memo-overlay/hooks/__tests__/useMemoOverlayEventBridge.test.ts` を作成し、`bun run ai:check:red` にて RED（exit code 0）を確認。
  - `src/features/memo-overlay/hooks/event-bridge-handlers.ts` を新規作成し、全 9 アクション（TOGGLE_MATCH_MEMO, TOGGLE_EVENT_MEMO, CLOSE_OVERLAY, SAVE_MEMO, NEXT_PHASE, PREV_PHASE, BACKSPACE, NAVIGATE_SUGGESTION, FILTER_CATEGORY）に対するハンドラと `EVENT_BRIDGE_HANDLERS` マップ（83行 <= 250行）を定義。
  - `src/features/memo-overlay/hooks/useMemoOverlayEventBridge.ts` の switch 文を撤廃してハンドラマップ呼び出しに集約し、47行（<= 60行）にスリム化。
  - `bun run ai:check src/features/memo-overlay` を実行し、Lint/型チェック/全テスト（24ファイル・54テスト）が exit code 0 で合格。

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `inherit`
- **Reviewed At**: 2026-10-19
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 要件網羅性: 70行の switch 分岐がハンドラマップに手戻りなく移植され、テストが配備されているか
  - [x] 境界と副作用: 不要なイベントリスナーの解除漏れがないか
  - [x] 設計負債防止: useMemoOverlayEventBridge.ts が 60行以内に収まり、OCP に準拠しているか
  - [x] サイレント破壊防止: 全 9 種のアクションハンドリングが既存通り動作するか
- **Summary**:
  4大定性監査（要件網羅性・境界と副作用・設計負債防止・サイレント破壊防止）を完了。全9種のアクション分岐が純粋ハンドラマップ（Strategy パターン）に忠実に移植され、`useMemoOverlayEventBridge.ts` が47行（<= 60行制約）にスリム化されている。CustomEventのリスナー解除および `isActive` ガードも厳密に保持され、単体テスト・結合テストともに全網羅されていることを確認。LGTM としてタスク完了を承認。

## 6. Rejections / Additional Tasks (不可逆修正欄)
