# TASK-178f: 戦術ボードDDD移行(6/7): 3頻度Store ProviderとDumb Konva Viewへの刷新および命令的Updater撤去

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-12
- **Target Files**:
  - `src/features/tactical-unified/stores/document-store.ts` (CREATE)
  - `src/features/tactical-unified/stores/session-store.ts` (CREATE)
  - `src/features/tactical-unified/stores/playback-store.ts` (CREATE)
  - `src/features/tactical-unified/stores/tactical-store-provider.tsx` (CREATE)
  - `src/features/tactical-unified/hooks/use-resolved-scene-graph.ts` (CREATE)
  - `src/features/tactical-unified/hooks/use-tactical-animation.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/animation-node-updater.ts` (DELETE)
  - `src/features/tactical-unified/hooks/animation-ripple-updater.ts` (DELETE)
  - `src/features/tactical-unified/hooks/animation-trajectory-updater.ts` (DELETE)
  - `src/features/tactical-unified/hooks/animation-zone-updater.ts` (DELETE)
  - `src/features/tactical-unified/stores/__tests__/three-frequency-stores.test.ts` (CREATE)
  - `src/features/tactical-unified/__tests__/tactical-animation.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. Cold (`document-store.ts`: `DomainTacticalProject` + `dispatch(command)` + Undo/Redo 履歴スタック)、Hot (`session-store.ts`: `activePhaseId`, `activeSlideId`, `activeTool`, `selectedIds`, `activeDragDelta`, `drawingPreview`)、Stream (`playback-store.ts`: `timeMs: Milliseconds`, `isPlaying`) の3つの独立した Zustand Store が実装されていること
- [x] 2. `tactical-store-provider.tsx` が上記3ストアを Context 経由で提供し、Hot や Stream の 60fps 更新時に Cold ストアの購読者や Undo 履歴・自動保存が一切発火しないこと
- [x] 3. `use-resolved-scene-graph.ts` が編集時（静止フレーム）も再生時（`evaluateTimelineFrame(phase, timeMs)`）も `compileSceneGraph` を通して単一の `ResolvedSceneGraphDTO` を導出すること
- [x] 4. `use-tactical-animation.ts` が `playback-store` の `timeMs` 更新のみで再生ループを駆動するようになり、命令的 Konva ノード操作を行っていた `animation-node-updater.ts`, `animation-ripple-updater.ts`, `animation-trajectory-updater.ts`, `animation-zone-updater.ts` の4ファイルが完全削除されること

## 2.5 Architectural Invariants & Why (破壊禁止の前提と設計理由)
<!-- ちゃぶ台返し防止の前提条件と、影響を受ける呼び出し元（Consumers）の同期確認リストを明記する -->
- **Invariants (破壊禁止の不変条件と理由)**:
  1. **3頻度状態分離（Cold / Hot / Stream）**: ドラッグ中（`onDragMove`）や再生中（`requestAnimationFrame`）に永続ドキュメント（Cold）をクローン・更新すると GC スパイクと Undo 履歴汚染が起きるため、物理的に3つの Store インスタンスへ分離する。
  2. **Zustand `set()` 内のドメインロジック禁止**: `document-store.ts` の `dispatch(command)` は純粋関数 `applyTacticalCommand(project, command)` を呼ぶだけの薄いシェルとする。
  3. **命令的 Konva ミューテーションの禁止**: `animation-node-updater.ts` による React 外での Konva ノード直接書き換えは、宣言的 UI との状態乖離を引き起こすため完全廃止する。
- **Consumers (呼び出し元・別画面の同期確認リスト)**:
  - `src/lib/tactical/domain/project-reducer.ts` (`TASK-178b`) — `applyTacticalCommand`
  - `src/lib/tactical/engine/timeline-evaluator.ts` & `src/lib/tactical/compiler/compile-scene-graph.ts` (`TASK-178d`)
  - `src/features/tactical-unified/__tests__/tactical-animation.test.ts` — アニメーション再生テストの更新

## 3. Context Snippets (参照コード・型定義・import)
<!-- Workerが自律探索（Read/Grep）を行わずに実装できるよう、必要な文脈を過不足なく事前注入する -->

### 3.1 Import Specs
```ts
import { createStore, type StoreApi, useStore } from 'zustand';
import { applyTacticalCommand } from '@/lib/tactical/domain/project-reducer';
import type { SlideCommand, TacticalCommand } from '@/lib/tactical/domain/commands';
import { compileSceneGraph } from '@/lib/tactical/compiler/compile-scene-graph';
import {
  evaluateStaticSlideFrame,
  evaluateTimelineFrame,
} from '@/lib/tactical/engine/timeline-evaluator';
```

### 3.2 Key Interfaces & Types
```ts
export interface DocumentStoreState {
  readonly project: DomainTacticalProject;
  readonly past: readonly DomainTacticalProject[];
  readonly future: readonly DomainTacticalProject[];
  readonly isDirty: boolean;
  readonly dispatch: (command: TacticalCommand) => void;
  readonly dispatchSlide: (phaseId: string, slideId: string, command: SlideCommand) => void;
  readonly undo: () => void;
  readonly redo: () => void;
  readonly canUndo: () => boolean;
  readonly canRedo: () => boolean;
  readonly loadProject: (project: DomainTacticalProject) => void;
}
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```ts
// Hot State 更新で Cold State の subscribe が発火しない検証パターン
const coldListener = vi.fn();
stores.documentStore.subscribe(coldListener);
stores.sessionStore.getState().setActiveDragDelta({ entityIds: ['p1'], deltaScreenNormX: 5, deltaScreenNormY: 5 });
expect(coldListener).not.toHaveBeenCalled();
```

## 4. Implementation Phases (Worker 実装手順)
<!-- 1〜4ファイルは1 Phase一括、5ファイル以上は1 Phase最大4ファイル（テスト含め6ファイル）以下に分割、15ファイル超は連番タスク（TASK-XXXa, TASK-XXXb）に分割 -->

### Phase 1: 3頻度独立ストア（Document / Session / Playback）と `TacticalStoreProvider` の構築
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/stores/document-store.ts`, `src/features/tactical-unified/stores/session-store.ts`, `src/features/tactical-unified/stores/playback-store.ts`, `src/features/tactical-unified/stores/tactical-store-provider.tsx`, `src/features/tactical-unified/stores/__tests__/three-frequency-stores.test.ts`
- **契約 (Exact Contract & Formula)**:
  ```ts
  // 1. document-store.ts: dispatch(command) で applyTacticalCommand(state.project, command) を実行し、past に前状態を追加（最大50件）、future をクリア、isDirty: true に更新
  // 2. session-store.ts: EphemeralSessionState (activePhaseId, activeSlideId, activeTool, selectedIds, activeDragDelta, drawingPreview) の高速更新専用ストア
  // 3. playback-store.ts: { isPlaying: boolean, timeMs: Milliseconds, startPlayback, pausePlayback, stopPlayback, seekTo }
  // 4. tactical-store-provider.tsx: TacticalStoreProvider, useDocumentStore, useSessionStore, usePlaybackStore, useTacticalStoresContext を export
  ```
- **Testing Strategy (Concrete Test Values)**:
  - `src/features/tactical-unified/stores/__tests__/three-frequency-stores.test.ts`:
    - `sessionStore.getState().setActiveDragDelta(...)` を100回呼んでも `documentStore` の `past.length` は `0` かつ `isDirty === false` のままであること。
    - `documentStore.getState().dispatch(...)` 実行時のみ `past.length === 1` となり、`undo()` で元の座標に戻ること。
- **Tasks**:
  - [x] 1. TDD実装: `rtk vitest run src/features/tactical-unified/stores/__tests__/three-frequency-stores.test.ts` (RED) ➔ 4ファイル実装 ➔ `bun run ai:check src/features/tactical-unified/stores/document-store.ts src/features/tactical-unified/stores/session-store.ts src/features/tactical-unified/stores/playback-store.ts src/features/tactical-unified/stores/tactical-store-provider.tsx src/features/tactical-unified/stores/__tests__/three-frequency-stores.test.ts` PASS
- **Worker Handoff Log**:
  - export: `createDocumentStore`, `createSessionStore`, `createPlaybackStore`, `TacticalStoreProvider`, `useDocumentStore`, `useSessionStore`, `usePlaybackStore`, `useTacticalStoresContext`
  - Gotcha: `SessionStoreState` は `EphemeralSessionState` を満たす。Context Hooks は Rules of Hooks 遵守のため `identity` fallback 経由で単一 `useStore` 呼び出し。

---

### Phase 2: `useResolvedSceneGraph` の実装と `use-tactical-animation.ts` の刷新
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/hooks/use-resolved-scene-graph.ts`, `src/features/tactical-unified/hooks/use-tactical-animation.ts`, `src/features/tactical-unified/__tests__/tactical-animation.test.ts`
- **契約 (Exact Contract & Formula)**:
  ```ts
  // src/features/tactical-unified/hooks/use-resolved-scene-graph.ts
  export function resolveSceneGraphFromState(params: {
    readonly project: DomainTacticalProject;
    readonly session: EphemeralSessionState;
    readonly isPlaying: boolean;
    readonly timeMs: Milliseconds;
    readonly viewport: StageViewport;
  }): ResolvedSceneGraphDTO;
  // isPlaying === true の場合は evaluateTimelineFrame(activePhase, timeMs)、false の場合は evaluateStaticSlideFrame(activeSlide) を呼び、compileSceneGraph(frame, session, viewport) を返す。
  ```
- **Testing Strategy (Concrete Test Values)**:
  - `src/features/tactical-unified/__tests__/tactical-animation.test.ts`:
    - `isPlaying: true, timeMs: 750` の状態から `resolveSceneGraphFromState` が補間済みの `ResolvedSceneGraphDTO` を返し、命令的ノード操作なしでフレーム進行と停止リセットが動作することを検証。
- **Tasks**:
  - [x] 1. TDD実装: `use-resolved-scene-graph.ts` & `use-tactical-animation.ts` 実装 ➔ `bun run ai:check src/features/tactical-unified/hooks/use-resolved-scene-graph.ts src/features/tactical-unified/hooks/use-tactical-animation.ts src/features/tactical-unified/__tests__/tactical-animation.test.ts` PASS
- **Worker Handoff Log**:
  - export: `resolveSceneGraphFromState`, `useResolvedSceneGraph`, `useTacticalAnimation`, `calculatePhaseTotalDuration`
  - Gotcha: `useTacticalAnimation` から命令的ノード直接更新を全廃し `playbackStore.timeMs` 駆動へ刷新。`ResolvedBillboardItem` は `kind: 'player' | 'ball' | 'text'` かつ `positionPx` を保持。

---

### Phase 3: 命令的 Konva ノード更新モジュール（`animation-*-updater.ts` 4ファイル）の完全撤去
- **Worker Model**: `flash_lite`
- **対象ファイル**: `src/features/tactical-unified/hooks/animation-node-updater.ts` (DELETE), `src/features/tactical-unified/hooks/animation-ripple-updater.ts` (DELETE), `src/features/tactical-unified/hooks/animation-trajectory-updater.ts` (DELETE), `src/features/tactical-unified/hooks/animation-zone-updater.ts` (DELETE)
- **契約 (Exact Contract & Formula)**:
  ```ts
  // 上記4ファイルを物理削除し、プロジェクト全体で import 参照がゼロであることを保証する。
  ```
- **Testing Strategy (Concrete Test Values)**:
  - `rtk grep "animation-node-updater|animation-ripple-updater|animation-trajectory-updater|animation-zone-updater" src/` のマッチ数が `0` であること。
- **Tasks**:
  - [x] 1. 4ファイル削除 ➔ `bun run ai:check` PASS
- **Worker Handoff Log**:
  - `animation-node-updater.ts`, `animation-ripple-updater.ts`, `animation-trajectory-updater.ts`, `animation-zone-updater.ts` および関連テスト2ファイルを物理削除。
  - `tactical-animation-canvas.ts` は clean な timeline/playback re-export バレルへ純化し、`src/` 配下の updater 参照は 0 件を達成。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-12 03:28
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. ドメイン論理 & 要件網羅性 & テスタビリティ: 数式/座標/状態遷移の整合性、受入要件の全網羅、Concrete Test Values検証、ハック排除
  - [x] 2. Invariants保護 & Consumer同期: Section 2.5 の不変条件（ちゃぶ台返し防止）遵守、別画面・呼び出し元（Consumers）の更新漏れゼロ
  - [x] 3. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 4. 設計負債 & サイレント破壊防止: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、公開シグネチャ保護、指示外変更の排除
- **Summary**:
  Cold/Hot/Stream 3頻度分離Store、Provider、およびSceneGraph解決フックが完全実装。命令的Konva Updater 4ファイルが安全に根絶され、RAFループのRAIIクリーンアップも担保されている。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
