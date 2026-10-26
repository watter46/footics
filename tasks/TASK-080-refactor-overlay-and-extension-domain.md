# TASK-080: [Overlay & Extension] オーバーレイ・拡張機能・通信基盤の垂直リファクタリング

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-26
- **Target Files**:
  - `src/lib/shortcuts.ts` (MODIFY)
  - `src/hooks/use-shortcut.ts` (MODIFY)
  - `extension/features/memo-overlay/hooks/use-overlay-shortcut-interceptor.ts` (MODIFY)
  - `extension/entrypoints/background.ts` (MODIFY)
  - `extension/entrypoints/main-bridge.content.ts` (MODIFY)
  - `extension/entrypoints/overlay.content.tsx` (MODIFY)
  - `extension/features/memo-overlay/hooks/use-match-memo-loader.ts` (MODIFY)
  - `src/features/memo-overlay/stores/memo-overlay-store.ts` (MODIFY)
  - `src/features/memo-overlay/stores/memo-overlay-provider.tsx` (MODIFY)
  - `src/features/memo-overlay/hooks/use-memo-overlay-actions.ts` (NEW)
  - `src/features/memo-overlay/components/MemoOverlayModal.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. ショートカット基盤 (`src/lib/shortcuts.ts`, `src/hooks/use-shortcut.ts`, `use-overlay-shortcut-interceptor.ts`) から `any` / `as unknown as` を全廃し、入力欄での Ctrl+Enter 保存およびオーバーレイのイベント捕捉が型安全に動作すること
- [x] 2. Chrome Extension エントリーポイント (`background.ts`, `main-bridge.content.ts`, `overlay.content.tsx`, `use-match-memo-loader.ts`) の `any` (計6件) を全廃し、型付きメッセージ定義で通信すること
- [x] 3. `memo-overlay-store.ts` および `memo-overlay-provider.tsx` の `any` (計2件) を解消し、Store Provider パターンの型整合性を担保すること
- [x] 4. `MemoOverlayModal.tsx` の直接 DB 参照 (`putMatchMemo`, `saveCustomEvent`) を `use-memo-overlay-actions.ts` フックへ分離し、UI コンポーネントからの DB 直アクセスをゼロにすること

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { SHORTCUT_ACTIONS, type ShortcutAction } from '@/lib/shortcuts';
import { putMatchMemo, saveCustomEvent } from '@/lib/db/extension-db-queries';
import { customEventKeys, matchKeys } from '@/lib/query-keys';
```

### 3.2 Key Interfaces & Types
```ts
export interface ExtensionBridgeMessage {
  type: 'FOOTICS_ACTION' | 'footics-action' | 'FOOTICS_SYNC_REQUEST';
  action?: ShortcutAction | string;
  detail?: { action: string; matchId?: string; [key: string]: unknown };
  payload?: Record<string, unknown>;
}

export interface UseMemoOverlayActionsReturn {
  saveEvent: (event: CustomEvent) => Promise<void>;
  saveMemo: (memo: MatchMemo) => Promise<void>;
}
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```ts
// 1. src/features/memo-overlay/ 配下（Level 2/3 共用）には chrome.* API を絶対に混入させないこと
// 2. MemoOverlayModal.tsx では DB 直接 import を廃止し、useMemoOverlayActions フック経由で保存と queryClient.invalidateQueries を実行すること
// 3. リスナー登録を行うフックでは、アンマウント時に必ず removeEventListener を行う RAII を徹底すること
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: ショートカット基盤の型安全化とオーバーレイ制御の整理
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/shortcuts.ts`, `src/hooks/use-shortcut.ts`, `extension/features/memo-overlay/hooks/use-overlay-shortcut-interceptor.ts`
- **契約 (Interface)**:
  ```ts
  export function isShortcutAction(value: unknown): value is ShortcutAction;
  ```
- **Testing Strategy**: 既存のショートカット・インターセプターのテストがすべて PASS し、`explicitAny` が 0 になること。
- **Tasks**:
  - [x] 1. TDD実装: 3ファイルの `any` / `as unknown as` を型ガード・厳密なイベント型へ置換 ➔ `bun run ai:check src/lib/shortcuts.ts src/hooks/use-shortcut.ts extension/features/memo-overlay/hooks/use-overlay-shortcut-interceptor.ts` PASS
- **Worker Handoff Log**: `isShortcutAction` export 確定、`window.__trigger_shortcut` の RAII 解除を追加、全テスト PASS。

### Phase 2: Extension エントリーポイントと通信ブリッジの any 全廃
- **Worker Model**: `flash`
- **対象ファイル**: `extension/entrypoints/background.ts`, `extension/entrypoints/main-bridge.content.ts`, `extension/entrypoints/overlay.content.tsx`, `extension/features/memo-overlay/hooks/use-match-memo-loader.ts`
- **契約 (Interface)**:
  ```ts
  // background.ts 内のメッセージハンドラ・コマンド引数に明示的な型定義を適用し any 3件を排除
  ```
- **Testing Strategy**: `extension/` 配下の単体テストがすべて PASS し、4ファイルの `explicitAny` が 0 になること。
- **Tasks**:
  - [x] 1. TDD実装: Extension 4ファイルの `any` 排除 ➔ `bun run ai:check extension/entrypoints/background.ts extension/entrypoints/main-bridge.content.ts extension/entrypoints/overlay.content.tsx extension/features/memo-overlay/hooks/use-match-memo-loader.ts` PASS
- **Worker Handoff Log**: `sendMessage` 型パラメータ・`CustomEvent` 型ガード・`isTriggerCaptureMessage`・`StorageLocalLike` により `any` 6件を全廃。

### Phase 3: MemoOverlay Store 型安全化と Modal の UI直DBアクセス解消
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/memo-overlay/stores/memo-overlay-store.ts`, `src/features/memo-overlay/stores/memo-overlay-provider.tsx`, `src/features/memo-overlay/hooks/use-memo-overlay-actions.ts`, `src/features/memo-overlay/components/MemoOverlayModal.tsx`
- **契約 (Interface)**:
  ```ts
  export function useMemoOverlayActions(matchId?: string): UseMemoOverlayActionsReturn;
  ```
- **Testing Strategy**: `src/features/memo-overlay/__tests__/memo-overlay-modal.test.tsx` が PASS し、`MemoOverlayModal.tsx` から DB 直接 import が除去されていること。
- **Tasks**:
  - [x] 1. TDD実装: `use-memo-overlay-actions.ts` 抽出と Store の `any` 排除 ➔ `bun run ai:check src/features/memo-overlay/stores/memo-overlay-store.ts src/features/memo-overlay/stores/memo-overlay-provider.tsx src/features/memo-overlay/hooks/use-memo-overlay-actions.ts src/features/memo-overlay/components/MemoOverlayModal.tsx` PASS
- **Worker Handoff Log**: `useMemoOverlayActions` フック新設、Store/Provider の `as unknown as T` 解消、DB 直接参照除去、61件テスト全 PASS。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-26 19:42
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**: ショートカット基盤・拡張機能通信・StoreProvider の any 全廃、および MemoOverlayModal からの DB/Query 抽出 (useMemoOverlayActions) によりホスト境界と SLAP を完全担保。

## 6. Rejections / Additional Tasks (不可逆修正欄)
