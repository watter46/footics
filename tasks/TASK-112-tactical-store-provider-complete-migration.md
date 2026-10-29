# TASK-112: tactical-store-provider-complete-migration

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-30
- **Target Files**:
  - `src/features/tactical-unified/stores/tactical-unified-store.ts` (MODIFY)
  - `src/features/tactical-unified/stores/tactical-unified-store-provider.tsx` (MODIFY)
  - `src/features/tactical-unified/stores/project-slice.ts` (MODIFY)
  - `src/features/tactical-unified/stores/__tests__/tactical-unified-store-provider.test.tsx` (MODIFY)
  - `src/features/tactical-unified/__tests__/tactical-unified-page-integration.test.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/top-bar.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/top-bar-center.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/top-bar-history.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/top-bar-more-menu.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/top-bar-title.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/x-media-preset-menu.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/timeline-bar.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/add-slide-button.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/playback-controls.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/slide-transition-popover.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/batch-transition-popover.tsx` (MODIFY)
  - `src/features/tactical-unified/objects/ball/components/ball-object.tsx` (MODIFY)
  - `src/features/tactical-unified/objects/ball/hooks/use-ball-drag.ts` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/right-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/squad-sub-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/formation-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/formation-custom-manager.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/dialogs/project-manager-modal.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/dialogs/use-project-actions.ts` (MODIFY)
  - `src/features/tactical-unified/panels/dialogs/project-create-form.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/dialogs/project-list-view.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/dialogs/project-import-export.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/dialogs/project-dialog-utils.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-json-tab.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-export-modal-state.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-export-share.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-video-morphing-config.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/use-keyboard-shortcuts.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/use-tactical-auto-save.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/use-tactical-match-init.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/use-tactical-drop-paste.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/use-tactical-animation.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/tactical-animation-canvas.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/use-konva-export.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/use-konva-video-export.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/konva-video-export-helper.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/__tests__/use-keyboard-shortcuts.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `TacticalUnifiedStoreProvider` と子孫コンポーネント・カスタムフック間のストアインスタンス分断（Split-Brain）を解消し、TopBar・TimelineBar・LeftPanel・RightPanel（Squad/Formation）・FullTacticalCanvas・BallObject・各種モーダル・ショートカット・自動保存が全て単一のストアインスタンスを参照して連動すること。
- [x] 2. `project-slice.ts` の `INITIAL_PROJECT` モジュール定数共有を廃止し、`createProjectSlice` 呼び出しごとに独立した初期プロジェクト（`createDefaultProject(crypto.randomUUID())`）を生成すること。
- [x] 3. `tactical-unified-store.ts` の `interceptProject` が `ensureTacticalProject` の正規化結果（および `slides` getter）を確実に状態へ反映し、`createTacticalUnifiedStore(initial)` に `project` が渡された際に `activePhaseId` / `activeSlideId` も整合すること。
- [x] 4. `useTacticalUnifiedStore` フック自体も `TacticalUnifiedStoreContext` が存在する場合は Context ストアを優先購読し、かつ `TacticalUnifiedStoreProvider` は `initialState`（または `store`）指定時は独立ストアを生成し、未指定時は `defaultTacticalUnifiedStore` を共有してページ間ブリッジ（`injectTeamSquadToTactical` / `injectMatchToTactical`）とも整合すること。
- [x] 5. トップバー操作、シーン追加・切替（シーンが共有されないこと）、メインキャンバス⇔サブキャンバス（ベンチ）間のマーカー移動およびサブキャンバス内移動、ボール移動が全て正常に機能し、全テストと `bun run ai:check` が exit code 0 でパスすること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Context Hook Import パターン
```ts
import {
  useTacticalUnifiedStoreApi,
  useTacticalUnifiedStoreContext,
} from '@/features/tactical-unified/stores/tactical-unified-store-provider';
```

### 3.2 Store Core & Provider 実装仕様
```ts
// src/features/tactical-unified/stores/tactical-unified-store.ts
import { createContext, useContext } from 'react';
// ...
export const TacticalUnifiedStoreContext =
  createContext<TacticalUnifiedStoreApi | null>(null);

function useTacticalUnifiedStoreImpl(): TacticalUnifiedState;
function useTacticalUnifiedStoreImpl<T>(
  selector: (state: TacticalUnifiedState) => T,
): T;
function useTacticalUnifiedStoreImpl<T>(
  selector?: (state: TacticalUnifiedState) => T,
): T {
  const contextStore = useContext(TacticalUnifiedStoreContext);
  return useStore(
    contextStore ?? defaultTacticalUnifiedStore,
    selector ?? (identity as (state: TacticalUnifiedState) => T),
  );
}
```

```tsx
// src/features/tactical-unified/stores/tactical-unified-store-provider.tsx
'use client';

import { type ReactNode, useContext, useRef } from 'react';
import { useStore } from 'zustand';
import {
  createTacticalUnifiedStore,
  defaultTacticalUnifiedStore,
  TacticalUnifiedStoreContext,
  type TacticalUnifiedState,
  type TacticalUnifiedStoreApi,
} from './tactical-unified-store';

export { TacticalUnifiedStoreContext };

export interface TacticalUnifiedStoreProviderProps {
  initialState?: Partial<TacticalUnifiedState>;
  store?: TacticalUnifiedStoreApi;
  children: ReactNode;
}

export function TacticalUnifiedStoreProvider({
  children,
  initialState,
  store,
}: TacticalUnifiedStoreProviderProps): React.JSX.Element {
  const storeRef = useRef<TacticalUnifiedStoreApi | null>(null);
  if (!storeRef.current) {
    if (store) {
      storeRef.current = store;
    } else if (initialState !== undefined) {
      storeRef.current = createTacticalUnifiedStore(initialState);
    } else {
      storeRef.current = defaultTacticalUnifiedStore;
    }
  }

  return (
    <TacticalUnifiedStoreContext.Provider value={storeRef.current}>
      {children}
    </TacticalUnifiedStoreContext.Provider>
  );
}
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: Store Core, Provider & Project Slice の正規化・統合
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/stores/tactical-unified-store.ts` (MODIFY)
  - `src/features/tactical-unified/stores/tactical-unified-store-provider.tsx` (MODIFY)
  - `src/features/tactical-unified/stores/project-slice.ts` (MODIFY)
  - `src/features/tactical-unified/stores/__tests__/tactical-unified-store-provider.test.tsx` (MODIFY)
  - `src/features/tactical-unified/__tests__/tactical-unified-page-integration.test.tsx` (MODIFY)
- **契約 (Interface)**:
  - `project-slice.ts`: モジュール定数 `INITIAL_PROJECT` を廃止し、`createProjectSlice` 関数内で毎回 `const initialProject = createDefaultProject(crypto.randomUUID());` を生成する。
  - `tactical-unified-store.ts`:
    - `interceptProject` で `ensureTacticalProject` の戻り値を `{ ...next, project: ensureTacticalProject(next.project) }` / `{ ...partial, project: ensureTacticalProject(partial.project) }` として確実に返す。
    - `createTacticalUnifiedStore(initial)` で `initial?.project` が存在する場合は `const normalizedProject = ensureTacticalProject(initial.project);` とし、`return { ...baseState, ...initial, project: normalizedProject, activePhaseId: initial.activePhaseId ?? normalizedProject.activePhaseId, activeSlideId: initial.activeSlideId ?? normalizedProject.activeSlideId };` とする。
    - `TacticalUnifiedStoreContext` を定義・export し、`useTacticalUnifiedStoreImpl` 内で `useContext(TacticalUnifiedStoreContext) ?? defaultTacticalUnifiedStore` を使用する（Note: `.ts` ファイルなので `'use client'` は記述しないこと）。
  - `tactical-unified-store-provider.tsx`:
    - `TacticalUnifiedStoreContext` を `./tactical-unified-store` から import & re-export。
    - `store?: TacticalUnifiedStoreApi` prop をサポートし、`store` 指定時は `store`、`initialState !== undefined` 時は `createTacticalUnifiedStore(initialState)`、両方未指定時は `defaultTacticalUnifiedStore` を使用する。
- **Testing Strategy**: `tactical-unified-store-provider.test.tsx` と `tactical-unified-page-integration.test.tsx` で、Provider 配下で `useTacticalUnifiedStore` と `useTacticalUnifiedStoreContext` が同じストアインスタンスを参照すること、TopBar・TimelineBar・RightPanel 操作が Canvas/Page 状態と完全に連動することを検証。
- **Tasks**:
  - [x] 1. TDD実装 & 検証: `bun run ai:check src/features/tactical-unified/stores/tactical-unified-store.ts src/features/tactical-unified/stores/tactical-unified-store-provider.tsx src/features/tactical-unified/stores/project-slice.ts src/features/tactical-unified/stores/__tests__/tactical-unified-store-provider.test.tsx src/features/tactical-unified/__tests__/tactical-unified-page-integration.test.tsx` PASS

**Worker Handoff Log**:
- `TacticalUnifiedStoreContext` を `tactical-unified-store.ts` で定義し `tactical-unified-store-provider.tsx` から re-export。`useTacticalUnifiedStore` は Context 優先で動作。
- `TacticalUnifiedStoreProvider` は `store` または `initialState` の有無に応じて適切なストアインスタンスを提供し、`project-slice` の参照共有を解消。

---

### Phase 2: TopBar, TimelineBar & BallObject の Context 移行
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/toolbar/top-bar.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/top-bar-center.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/top-bar-history.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/top-bar-more-menu.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/top-bar-title.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/x-media-preset-menu.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/timeline-bar.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/add-slide-button.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/playback-controls.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/slide-transition-popover.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/batch-transition-popover.tsx` (MODIFY)
  - `src/features/tactical-unified/objects/ball/components/ball-object.tsx` (MODIFY)
  - `src/features/tactical-unified/objects/ball/hooks/use-ball-drag.ts` (MODIFY)
- **契約 (Interface)**:
  - 上記 13 ファイル内の `useTacticalUnifiedStore(selector)` をすべて `useTacticalUnifiedStoreContext(selector)` に置換する。
  - `top-bar-more-menu.tsx` 内の `useTacticalUnifiedStore.getState()` 呼び出しは、コンポーネント冒頭で `const storeApi = useTacticalUnifiedStoreApi();` を取得し、`storeApi.getState()` に置換する。
  - セレクター関数（`selectActiveSlide`, `selectPreviousSlide`, `selectActivePhaseSlides` 等）の import は `@/features/tactical-unified/stores/tactical-unified-selectors` または `@/features/tactical-unified/stores/tactical-unified-store` から維持する。
- **Testing Strategy**: 既存の toolbar / timeline / ball 関連テストおよび `bun run ai:check` がすべてパスすること。
- **Tasks**:
  - [x] 1. Context フックへの移行と検証: `bun run ai:check src/features/tactical-unified/panels/toolbar/ src/features/tactical-unified/panels/timeline/ src/features/tactical-unified/objects/ball/` PASS

**Worker Handoff Log**:
- TopBar, TimelineBar, BallObject 関連 13 ファイルのシングルトンストア直接参照をすべて `useTacticalUnifiedStoreContext` / `useTacticalUnifiedStoreApi` に移行。
- toolbar/timeline/ball 関連の全 13 テストスイート（63 テスト）がすべて PASS。

---

### Phase 3: RightPanel, Dialogs & Export パネル群の Context 移行
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/right-panel/right-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/squad-sub-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/formation-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/formation-custom-manager.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/dialogs/project-manager-modal.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/dialogs/use-project-actions.ts` (MODIFY)
  - `src/features/tactical-unified/panels/dialogs/project-create-form.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/dialogs/project-list-view.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/dialogs/project-import-export.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/dialogs/project-dialog-utils.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-json-tab.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-export-modal-state.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-export-share.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-video-morphing-config.ts` (MODIFY)
- **契約 (Interface)**:
  - 上記ファイル内の `useTacticalUnifiedStore(selector)` をすべて `useTacticalUnifiedStoreContext(selector)` に置換する。
  - `squad-sub-panel.tsx` の `handleOrganizeBench` 内の `useTacticalUnifiedStore.getState().updateSlide(...)` は、`const updateSlide = useTacticalUnifiedStoreContext((s) => s.updateSlide);` を購読して `updateSlide(activeSlideId, { players: nextPlayers });` を呼ぶ形に置換する。
  - `use-export-share.ts` 内の `useTacticalUnifiedStore.getState()` は、フック冒頭で `const storeApi = useTacticalUnifiedStoreApi();` を取得して `storeApi.getState()` に置換する。
  - `project-dialog-utils.ts` の `renameProjectHelper` は第6引数にオプショナル `setTitle?: (title: string) => void` を受け取れるようにし（省略時は `defaultTacticalUnifiedStore.getState().setTitle(trimmed)`）、`use-project-actions.ts` から `storeApi.getState().setTitle` を渡すようにして `useTacticalUnifiedStore` 直接参照を排除する。
- **Testing Strategy**: 既存の right-panel / dialogs / export 関連テストおよび `bun run ai:check` がすべてパスすること。
- **Tasks**:
  - [x] 1. Context フックへの移行と検証: `bun run ai:check src/features/tactical-unified/panels/right-panel/ src/features/tactical-unified/panels/dialogs/ src/features/tactical-unified/panels/export/` PASS

**Worker Handoff Log**:
- RightPanel (`right-panel.tsx`, `squad-sub-panel.tsx`, `formation-panel.tsx`, `formation-custom-manager.tsx`)、Dialogs、Export の全 14 ファイルを `useTacticalUnifiedStoreContext` / `useTacticalUnifiedStoreApi` に完全移行。
- `project-dialog-utils.ts` の `renameProjectHelper` に `setTitle` オプショナル注入を追加しシングルトン直接参照を排除。

---

### Phase 4: Hooks 群の Context 移行
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/hooks/use-keyboard-shortcuts.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/use-tactical-auto-save.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/use-tactical-match-init.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/use-tactical-drop-paste.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/use-tactical-animation.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/tactical-animation-canvas.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/use-konva-export.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/use-konva-video-export.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/konva-video-export-helper.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/__tests__/use-keyboard-shortcuts.test.ts` (MODIFY)
- **契約 (Interface)**:
  - 各カスタムフック内の `useTacticalUnifiedStore(selector)` を `useTacticalUnifiedStoreContext(selector)` に置換し、`.getState()` / `.setState()` 呼び出しはフック冒頭で取得した `const storeApi = useTacticalUnifiedStoreApi();` の `storeApi.getState()` / `storeApi.setState()` に置換する。
  - `use-tactical-match-init.ts`: `loadAndInjectMatch(matchId, minute, storeApi)` に `storeApi` を渡し、`saved` がある場合は `storeApi.getState().loadProject(saved)` を呼ぶ。
  - `tactical-animation-canvas.ts`: `renderFrameToCanvas` の末尾にオプショナル引数 `storeApi: TacticalUnifiedStoreApi = defaultTacticalUnifiedStore` を追加し、`use-tactical-animation.ts` から `storeApi` を渡す。
  - `konva-video-export-helper.ts`: `ExecuteVideoExportParams` にオプショナル `aspectRatio?: AspectRatio` を追加し、`const aspectRatio = params.aspectRatio ?? defaultTacticalUnifiedStore.getState().project.aspectRatio;` とし、`use-konva-video-export.ts` から `storeApi.getState().project.aspectRatio` を渡す。
- **Testing Strategy**: 既存の hooks 関連テストおよび `bun run ai:check` がすべてパスすること。
- **Tasks**:
  - [x] 1. Context フックへの移行と検証: `bun run ai:check src/features/tactical-unified/hooks/` PASS

**Worker Handoff Log**:
- Hooks 群 9 ファイルすべてを `useTacticalUnifiedStoreContext` / `useTacticalUnifiedStoreApi` に移行し、非 React ヘルパーには `storeApi` / `aspectRatio` を DI してシングルトン直接参照を排除。
- 全 11 テストスイート（74 テスト）が exit code 0 で PASS。

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-30 03:13
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**: `TacticalUnifiedStoreProvider` と全40個のパネル・フック・オブジェクト群のストア参照が完全に単一インスタンスへ統合され、Split-Brain（二重ストア分断）、`INITIAL_PROJECT` 定数参照共有、`interceptProject` の正規化未反映がすべて解消されていることを確認。

## 6. Rejections / Additional Tasks (不可逆修正欄)
