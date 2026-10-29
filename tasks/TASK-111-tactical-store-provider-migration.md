# TASK-111: tactical-store-provider-migration

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-30
- **Target Files**:
  - `src/features/tactical-unified/stores/tactical-unified-store.ts` (MODIFY)
  - `src/features/tactical-unified/stores/tactical-unified-store-provider.tsx` (NEW)
  - `src/features/tactical-unified/stores/__tests__/tactical-unified-store-provider.test.tsx` (NEW)
  - `src/features/tactical-unified/tactical-unified-page.tsx` (MODIFY)
  - `src/features/tactical-unified/views/FullTacticalCanvas.tsx` (MODIFY)
  - `src/features/tactical-unified/adapters/tactical-canvas-store-adapter.ts` (MODIFY)
  - `src/features/tactical-unified/adapters/adapter-cache-helpers.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `createTacticalUnifiedStore` ファクトリ関数を新設し、Vanilla Store（`createStore`）ベースで独立したストアインスタンスを生成可能にすること。
- [x] 2. `TacticalUnifiedStoreProvider` を新設し、React Context 経由で Props（初期設定・初期データ）を確定注入（Zero-Flicker）可能にすること。
- [x] 3. `useTacticalUnifiedStoreContext` フックを提供し、Provider 配下のコンポーネントから安全にセレクター購読できること（移行互換として Context 外ではシングルトンへフォールバック）。
- [x] 4. `tactical-unified-page.tsx` を `TacticalUnifiedStoreProvider` で包み、初期 Props を確定注入すること。
- [x] 5. `FullTacticalCanvas.tsx` がグローバルシングルトン直接参照を廃止し、Context 経由の `StoreApi` をアダプターへ注入すること。
- [x] 6. アダプター内の冗長な二重キャッシュ・不要なローカル状態を撤去し、単一真実源からの純粋な委譲構造へスリム化すること。
- [x] 7. 全ての既存テスト（Vitest）および `bun run ai:check` が exit code 0 でパスすること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { createContext, useContext, useRef, type ReactNode } from 'react';
import { useStore, type StoreApi } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { TacticalUnifiedState } from './tactical-unified-store';
```

### 3.2 Key Interfaces & Types
```ts
export type TacticalUnifiedStoreApi = StoreApi<TacticalUnifiedState>;

export interface TacticalUnifiedStoreProviderProps {
  initialState?: Partial<TacticalUnifiedState>;
  children: ReactNode;
}
```

### 3.3 Implementation Notes & Gotchas
- **Zero-Flicker 確定注入**: `useRef<TacticalUnifiedStoreApi | null>(null)` を用い、初回マウント時に一度だけファクトリを実行してストアを生成する。
- **段階移行の安全性**: 既存 43 ファイルが `useTacticalUnifiedStore` を直接呼んでいるため、`useTacticalUnifiedStoreContext` を新設しつつ、従来の `useTacticalUnifiedStore` は即座に全面削除せず段階的移行を許容する。

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: Store Provider & Vanilla Factory 基盤新設
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/stores/tactical-unified-store.ts` (MODIFY)
  - `src/features/tactical-unified/stores/tactical-unified-store-provider.tsx` (NEW)
  - `src/features/tactical-unified/stores/__tests__/tactical-unified-store-provider.test.tsx` (NEW)
- **契約 (Interface)**:
  ```ts
  export function createTacticalUnifiedStore(initial?: Partial<TacticalUnifiedState>): TacticalUnifiedStoreApi;
  export function TacticalUnifiedStoreProvider(props: TacticalUnifiedStoreProviderProps): React.JSX.Element;
  export function useTacticalUnifiedStoreContext<T>(selector: (s: TacticalUnifiedState) => T): T;
  ```
- **Testing Strategy**: `tactical-unified-store-provider.test.tsx` で Context 経由の購読、複数 Provider の独立性、初期値確定注入を検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/stores/__tests__/tactical-unified-store-provider.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/stores/tactical-unified-store-provider.tsx` PASS
- **Worker Handoff Log**:
  - Exports: `createTacticalUnifiedStore`, `TacticalUnifiedStoreProvider`, `useTacticalUnifiedStoreContext`, `useTacticalUnifiedStoreApi`, `defaultTacticalUnifiedStore`
  - Gotcha: Context外呼び出し時は `defaultTacticalUnifiedStore` に安全にフォールバックし既存コンポーネントの後方互換性を担保。

---

### Phase 2: Page Shell への Provider 導入とマウント確定注入
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/tactical-unified-page.tsx` (MODIFY)
  - `src/features/tactical-unified/__tests__/tactical-unified-page-integration.test.tsx` (MODIFY)
- **契約 (Interface)**:
  - `TacticalUnifiedPage` 内部を `TacticalUnifiedStoreProvider` でラップし、外側 Shell と内側 Content を分離。
- **Testing Strategy**: `tactical-unified-page-integration.test.tsx` で Provider マウント後の描画と操作が正常に動作することを検証。
- **Tasks**:
  - [x] 1. `tactical-unified-page.tsx` を Provider ラップ構造にリファクタリング ➔ `bun run ai:check src/features/tactical-unified/tactical-unified-page.tsx` PASS
- **Worker Handoff Log**:
  - Exports: `TacticalUnifiedPage`, `TacticalUnifiedPageProps` (`initialState?: Partial<TacticalUnifiedState>` サポート追加)
  - Gotcha: `TacticalUnifiedPageContent` を分離して全16セレクターを `useTacticalUnifiedStoreContext` 購読に置換、確定注入テストを通過。

---

### Phase 3: FullTacticalCanvas の Context 接続とシングルトン結合解除
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/views/FullTacticalCanvas.tsx` (MODIFY)
  - `src/features/tactical-unified/views/__tests__/full-tactical-canvas.test.tsx` (MODIFY)
- **契約 (Interface)**:
  - `FullTacticalCanvas` 内で `useTacticalUnifiedStoreApi`（Context から StoreApi を取得）を使用し、`createTacticalCanvasStoreAdapter(storeApi)` に注入。
- **Testing Strategy**: `full-tactical-canvas.test.tsx` で Context 経由のストアがアダプターに正しく接続されることを検証。
- **Tasks**:
  - [x] 1. シングルトン直接参照を Context 経由に置換 ➔ `bun run ai:check src/features/tactical-unified/views/FullTacticalCanvas.tsx src/features/tactical-unified/views/__tests__/full-tactical-canvas.test.tsx` PASS
- **Worker Handoff Log**:
  - Gotcha: `FullTacticalCanvas` 内の全セレクターとアンマウント時クリーンアップを `useTacticalUnifiedStoreApi` / `useTacticalUnifiedStoreContext` に完全移行し、シングルトン直接参照を排除。

---

### Phase 4: アダプター二重キャッシュの撤去とスリム化
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/adapters/tactical-canvas-store-adapter.ts` (MODIFY)
  - `src/features/tactical-unified/adapters/adapter-cache-helpers.ts` (MODIFY)
  - `src/features/tactical-unified/adapters/__tests__/tactical-canvas-store-adapter.test.ts` (MODIFY)
- **契約 (Interface)**:
  - 冗長なローカルキャッシュを排除し、マスターストアへの直接委譲・純粋射影に一本化。
- **Testing Strategy**: `tactical-canvas-store-adapter.test.ts` でアダプター経由の読み出し・更新が破綻なく動作することを検証。
- **Tasks**:
  - [x] 1. 不要キャッシュの整理 ➔ `bun run ai:check src/features/tactical-unified/adapters/tactical-canvas-store-adapter.ts` PASS
- **Worker Handoff Log**:
  - Gotcha: アダプターのローカル clipboard 状態を撤去し、マスターストアへの純粋射影（markers, arrows, zones, texts）および操作委譲に一本化。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-30 02:18
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**: Store Provider パターンへの移行と初期値確定注入（Zero-Flicker）、アダプターの単一真実源化、後方互換性（43箇所の既存参照を保護する Object.assign 設計）が極めて高精度に達成されており、設計原則に完全準拠。

## 6. Rejections / Additional Tasks (不可逆修正欄)
