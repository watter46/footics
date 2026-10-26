# TASK-085: Fix Memo Overlay Save and Shortcuts

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-26
- **Target Files**:
  - `vitest.config.ts` (MODIFY)
  - `src/features/memo-overlay/stores/memo-overlay-provider.tsx` (MODIFY)
  - `src/features/memo-overlay/hooks/useMemoOverlayEventBridge.ts` (MODIFY)
  - `extension/features/memo-overlay/hooks/use-memo-save.ts` (MODIFY)
  - `extension/features/memo-overlay/memo-overlay-bridge.tsx` (MODIFY)
  - `src/features/memo-overlay/components/MemoOverlayModal.tsx` (MODIFY)
  - `src/features/memo-overlay/components/__tests__/memo-overlay-modal.test.tsx` (MODIFY)
  - `extension/features/memo-overlay/__tests__/memo-overlay-bridge.test.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `vitest.config.ts` に `~: path.resolve(__dirname, './extension')` の alias を追加し、拡張機能テストが解決可能になること
- [x] 2. `useMemoOverlayStoreApi` フックを `memo-overlay-provider.tsx` に提供し、Provider 配下のコンポーネントおよびフックが現在アクティブな Store インスタンス（Context Store または defaultMemoOverlayStore）を取得できること
- [x] 3. `useMemoOverlayEventBridge.ts` がシングルトン固定ではなく `useMemoOverlayStoreApi` 経由でアクティブな Store をハンドラーへ引き渡すこと
- [x] 4. `extension/features/memo-overlay/hooks/use-memo-save.ts` が `useMemoOverlayStoreApi` を用いて現在編集中の状態（Context Store）からバリデーションおよびペイロード作成を実行すること
- [x] 5. `extension/features/memo-overlay/memo-overlay-bridge.tsx` にて `useMemoSave` および `useMemoOverlayEventBridge` を `MemoOverlayStoreProvider` の内部（`MemoOverlayBridgeInner`）へ配置し、Ctrl+Enter および保存ボタンクリックで保存キューへの書き込みとオーバーレイの終了が動作すること
- [x] 6. `src/features/memo-overlay/components/MemoOverlayModal.tsx` にて、グローバルストアの状態（`mode`, `initialMemo`, `eventId`, `timeStr`, `selectedLabels` 等）を `MemoOverlayStoreProvider` へ引き継ぎ、Provider 内部コンポーネント（`MemoOverlayModalInner`）でアクティブな Context Store のデータを元に `handleSave`（`saveEvent` / `saveMemo`）を実行すること
- [x] 7. 単体テスト（`memo-overlay-modal.test.tsx`, `memo-overlay-bridge.test.tsx` 等）がすべて PASS すること

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { createContext, useContext, useRef, type ReactNode } from 'react';
import { useStore } from 'zustand';
import {
  type MemoOverlayStore,
  createMemoOverlayStore,
  defaultMemoOverlayStore,
} from './memo-overlay-store';
import type { MemoOverlayState } from './memo-overlay-types';
import { useMemoOverlayStoreApi } from '../stores/memo-overlay-provider';
```

### 3.2 Key Interfaces & Types
```ts
export function useMemoOverlayStoreApi(): MemoOverlayStore {
  const store = useContext(MemoOverlayStoreContext);
  return store ?? defaultMemoOverlayStore;
}
```

### 3.3 Reference Pattern (Inner Component inside Provider)
```tsx
export function MemoOverlayBridge() {
  // ... loader and state setup ...
  return (
    <MemoOverlayStoreProvider initialState={memoInitialState}>
      <MemoOverlayBridgeInner
        matchId={matchId}
        mode={mode}
        resolvedMemo={resolvedMemo}
        initialData={initialData}
        close={close}
        open={open}
        isVisible={isVisible}
      />
    </MemoOverlayStoreProvider>
  );
}
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: テスト環境エイリアスと useMemoOverlayStoreApi の提供
- **Worker Model**: `flash`
- **対象ファイル**: `vitest.config.ts`, `src/features/memo-overlay/stores/memo-overlay-provider.tsx`, `src/features/memo-overlay/hooks/useMemoOverlayEventBridge.ts`
- **契約 (Interface)**:
  ```ts
  export function useMemoOverlayStoreApi(): MemoOverlayStore;
  ```
- **Testing Strategy**: `bun vitest run src/features/memo-overlay/stores/__tests__/memo-overlay-provider.test.tsx` および `vitest run extension/features/memo-overlay/__tests__/quick-tag-bar.test.tsx` が PASS すること。
- **Tasks**:
  - [x] 1. `vitest.config.ts` に `~` エイリアスを追加
  - [x] 2. `memo-overlay-provider.tsx` に `useMemoOverlayStoreApi` を追加
  - [x] 3. `useMemoOverlayEventBridge.ts` で `useMemoOverlayStoreApi` を使用するように修正
  - [x] 4. 検証: `bun run ai:check src/features/memo-overlay/stores/memo-overlay-provider.tsx src/features/memo-overlay/hooks/useMemoOverlayEventBridge.ts`
- **Worker Handoff Log**:
  - `useMemoOverlayStoreApi` を `memo-overlay-provider.tsx` から export し、Provider 配下でアクティブな store、外では `defaultMemoOverlayStore` を返すよう実装。
  - `useMemoOverlayEventBridge.ts` で `useMemoOverlayStoreApi` を購読し、イベント発生時にアクティブな Context Store をハンドラに渡すよう改修。

### Phase 2: 拡張機能オーバーレイの保存とショートカット連携の是正
- **Worker Model**: `flash`
- **対象ファイル**: `extension/features/memo-overlay/hooks/use-memo-save.ts`, `extension/features/memo-overlay/memo-overlay-bridge.tsx`, `extension/features/memo-overlay/__tests__/memo-overlay-bridge.test.tsx`
- **契約 (Interface)**:
  ```ts
  export function useMemoSave(): { handleSave: () => Promise<void>; validate: (state: MemoOverlayState) => boolean };
  ```
- **Testing Strategy**: `bun vitest run extension/features/memo-overlay/__tests__/memo-overlay-bridge.test.tsx` が PASS すること。
- **Tasks**:
  - [x] 1. `use-memo-save.ts` で `useMemoOverlayStoreApi` を使用し、アクティブな Store の状態を検証・保存
  - [x] 2. `memo-overlay-bridge.tsx` に `MemoOverlayBridgeInner` を新設し、Provider 内で `useMemoSave` と `useMemoOverlayEventBridge` を実行
  - [x] 3. テストの整合性を確認
  - [x] 4. 検証: `bun run ai:check extension/features/memo-overlay/hooks/use-memo-save.ts extension/features/memo-overlay/memo-overlay-bridge.tsx`
- **Worker Handoff Log**:
  - `use-memo-save.ts` を `useMemoOverlayStoreApi` による Context Store 参照へ変更し、Provider のローカル入力状態から保存キューへペイロードを送信するように改修。
  - `memo-overlay-bridge.tsx` 内に `MemoOverlayBridgeInner` を定義し、`MemoOverlayStoreProvider` の内部で `useMemoSave` と `useMemoOverlayEventBridge` を配線することでショートカット・保存連携を正常化。

### Phase 3: Web 画面 MemoOverlayModal の状態引継ぎと保存処理の是正
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/memo-overlay/components/MemoOverlayModal.tsx`, `src/features/memo-overlay/components/__tests__/memo-overlay-modal.test.tsx`
- **契約 (Interface)**:
  ```tsx
  export function MemoOverlayModal(props: MemoOverlayModalProps): ReactNode;
  ```
- **Testing Strategy**: `bun vitest run src/features/memo-overlay/components/__tests__/memo-overlay-modal.test.tsx` が PASS すること。
- **Tasks**:
  - [x] 1. `MemoOverlayModal.tsx` でグローバルストア状態（`mode`, `eventId`, `period`, `timeStr`, `selectedLabels`, `memo` 等）を引き継ぐ
  - [x] 2. Provider 内部コンポーネント `MemoOverlayModalInner` を抽出し、アクティブな Store の状態を `handleSave` で取得して保存
  - [x] 3. `memo-overlay-modal.test.tsx` を修正・拡充し、画面入力値が正常に保存されることを検証
  - [x] 4. 検証: `bun run ai:check src/features/memo-overlay/components/MemoOverlayModal.tsx src/features/memo-overlay/components/__tests__/memo-overlay-modal.test.tsx`
- **Worker Handoff Log**:
  - `MemoOverlayModal` にてグローバルストアの最新状態から `initialState`（mode, eventId, period, timeStr, selectedLabels, memo, phase）を生成して `MemoOverlayStoreProvider` に注入。
  - Provider 内部コンポーネント `MemoOverlayModalInner` を抽出し、`useMemoOverlayStoreApi` 経由で編集中の状態を取得して `handleSave`（`saveEvent` / `saveMemo`）を実行するよう改修。hotkeys・EventBridge も Inner 内へ配置。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-26 20:45
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**: Store Provider パターン下での二重ストア状態を解消し、`useMemoOverlayStoreApi` によるアクティブな Context Store 参照へ統一。Inner コンポーネント抽出により保存ロジック・キーリスナーの配線を適正化し、拡張機能およびWeb画面でのメモ保存・Ctrl+Enter ショートカットが正常に動作することを検証。

## 6. Rejections / Additional Tasks (不可逆修正欄)
