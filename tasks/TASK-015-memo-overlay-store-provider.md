# TASK-015: MemoOverlay Store Provider 化 & 初期Props確定注入

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-19
- **Target Files**:
  - `src/features/memo-overlay/stores/memo-overlay-store.ts` (MODIFY)
  - `src/features/memo-overlay/stores/memo-overlay-provider.tsx` (NEW)
  - `src/features/memo-overlay/stores/__tests__/memo-overlay-provider.test.tsx` (NEW)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `createMemoOverlayStore(initialState?: Partial<MemoOverlayState>)` ファクトリ関数を実装し、独立した Zustand Vanilla Store インスタンスを生成可能にすること（Store上限 200行クリア: 197行）。
- [x] 2. `MemoOverlayStoreProvider` (React Context) を作成し、マウント時に初期状態（mode, period, timeStr, memo, selectedLabels, eventId 等）を確定注入（Props確定注入）可能にすること（初期チラつき Flicker の根絶）。
- [x] 3. `useMemoOverlayContext()` および `useMemoOverlayStoreContext()` フックを提供し、Provider 配下のコンポーネントから型安全に状態およびアクションを取得可能にすること。
- [x] 4. 既存の `useMemoOverlayStore`（シングルトン）の公開シグネチャと後方互換性を 100% 維持し、既存コード・テストに破壊的変更を与えないこと。
- [x] 5. `src/features/memo-overlay/stores/__tests__/memo-overlay-provider.test.tsx` を新設し、TDD で初期値注入・状態更新・独立インスタンス性を検証すること。
- [x] 6. `bun run ai:check src/features/memo-overlay` および既存テスト 29件（全PASS）がすべて PASS すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Store Factory & Initial State Interface
```ts
// src/features/memo-overlay/stores/memo-overlay-types.ts
export interface MemoOverlayInitialState {
  mode?: MemoMode;
  phase?: EventPhase;
  timeStr?: string;
  selectedLabels?: string[];
  labelInput?: string;
  memo?: string;
  period?: number;
  eventId?: string;
  isModalOpen?: boolean;
}

// Store Factory signature
export type MemoOverlayStore = ReturnType<typeof createMemoOverlayStore>;
export function createMemoOverlayStore(initialState?: Partial<MemoOverlayState>): ReturnType<typeof createStore<MemoOverlayState>>;
```

### 3.2 Provider & Context Usage Pattern
```tsx
// src/features/memo-overlay/stores/memo-overlay-provider.tsx
import { createContext, useContext, useRef, type ReactNode } from 'react';
import { useStore } from 'zustand';
import { createMemoOverlayStore, type MemoOverlayStore } from './memo-overlay-store';
import type { MemoOverlayState } from './memo-overlay-types';

export const MemoOverlayStoreContext = createContext<MemoOverlayStore | null>(null);

export interface MemoOverlayStoreProviderProps {
  children: ReactNode;
  initialState?: Partial<MemoOverlayState>;
}

export function MemoOverlayStoreProvider({ children, initialState }: MemoOverlayStoreProviderProps) {
  const storeRef = useRef<MemoOverlayStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createMemoOverlayStore(initialState);
  }
  return (
    <MemoOverlayStoreContext.Provider value={storeRef.current}>
      {children}
    </MemoOverlayStoreContext.Provider>
  );
}

export function useMemoOverlayStoreContext<T>(selector: (state: MemoOverlayState) => T): T {
  const store = useContext(MemoOverlayStoreContext);
  if (!store) {
    // Provider 外での fallback として既存シングルトンを利用
    return useMemoOverlayStore(selector);
  }
  return useStore(store, selector);
}
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: createMemoOverlayStore ファクトリ化 & Provider 実装 (TDD)
- **Worker Model**: `inherit`
- **対象ファイル**:
  - `src/features/memo-overlay/stores/memo-overlay-store.ts`
  - `src/features/memo-overlay/stores/memo-overlay-provider.tsx`
  - `src/features/memo-overlay/stores/__tests__/memo-overlay-provider.test.tsx`
- **契約 (Interface)**:
  - `export function createMemoOverlayStore(initialState?: Partial<MemoOverlayState>)`
  - `export const MemoOverlayStoreProvider: React.FC<MemoOverlayStoreProviderProps>`
  - `export function useMemoOverlayStoreContext<T>(selector: (state: MemoOverlayState) => T): T`
- **Testing Strategy**:
  - `memo-overlay-provider.test.tsx` を先に作成（RED）
  - `bun run ai:check:red src/features/memo-overlay/stores/__tests__/memo-overlay-provider.test.tsx`
  - 実装完了後 `bun run ai:check src/features/memo-overlay/stores/`
- **Tasks**:
  - [x] 1. TDD実装: テスト `memo-overlay-provider.test.tsx` を作成し RED を確認
  - [x] 2. `createMemoOverlayStore` ファクトリと `MemoOverlayStoreProvider` を実装して GREEN
  - [x] 3. `bun run ai:check src/features/memo-overlay` で exit code 0 を確認
- **Worker Handoff Log**:
  - 確定シンボル:
    - `MemoOverlayInitialState` in `src/features/memo-overlay/stores/memo-overlay-types.ts`
    - `createMemoOverlayStore`, `defaultMemoOverlayStore`, `useMemoOverlayStore`, `MemoOverlayStore` in `src/features/memo-overlay/stores/memo-overlay-store.ts` (197行 <= 200行)
    - `MemoOverlayStoreProvider`, `useMemoOverlayStoreContext`, `useMemoOverlayContext`, `MemoOverlayStoreContext` in `src/features/memo-overlay/stores/memo-overlay-provider.tsx` (53行 <= 100行)
  - テスト結果:
    - `memo-overlay-provider.test.tsx`: 8 tests PASS
    - `memo-overlay-store.test.ts`: 15 tests PASS
    - `memo-overlay-view-refactor.test.tsx`: 6 tests PASS
    - `bun run ai:check src/features/memo-overlay` 全PASS (exit code 0)


## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `inherit`
- **Reviewed At**: 2026-10-19
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 要件網羅性: Requirements の仕様が手抜きなくコードに実在するか（テストのハリボテ化がないか）
  - [x] 境界と副作用: Level 2 core にホスト依存の混入がないか、useEffectによるFlickerがないか
  - [x] 設計負債防止: 1ファイル200行以内（Store 200行以内）に収まっているか
  - [x] サイレント破壊防止: 既存の `useMemoOverlayStore` 呼び出しや既存テストを壊していないか
- **Summary**:
  - **要件網羅性**: `createMemoOverlayStore` による独立インスタンス生成、`MemoOverlayStoreProvider` による初回同期Props確定注入、`useMemoOverlayStoreContext` / `useMemoOverlayContext` のセレクタ対応およびProvider外フォールバックが完全実装されている。テストも8件の具体的なアサーションでハリボテなく検証されている。
  - **境界と副作用**: `chrome.*` 等のホスト依存は皆無。Storeインスタンス化はマウント時 `useRef` で同期実行されるため、レンダリング遅延による初期チラつき（Flicker）は完全に根絶されている。
  - **設計負債防止**: `memo-overlay-store.ts` は 197行（上限200行未満）、`memo-overlay-provider.tsx` は 50行（上限100行未満）で規約を厳守。
  - **サイレント破壊防止**: シングルトン `useMemoOverlayStore` は `Object.assign` により Zustand 従来のフック兼ストアシグネチャを 100% 維持しており、既存テスト・コードへの後方互換性が完全に担保されている。既存exportの欠落や不要な `biome-ignore` の混入もない。

## 6. Rejections / Additional Tasks (不可逆修正欄)
