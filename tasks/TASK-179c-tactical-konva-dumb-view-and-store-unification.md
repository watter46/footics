# TASK-179c: Konva Stage / Layer の Dumb View 化と単一ストア・再生UX統合

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-12
- **Target Files**:
  - `src/features/tactical-unified/views/FullTacticalCanvas.tsx` (MODIFY)
  - `src/features/tactical-unified/hooks/use-tactical-animation.ts` (MODIFY)
  - `extension/features/canvas/components/QuickAnnotationCanvas.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/canvas-stage.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/PitchGroundLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/annotations/ArrowObject.tsx` (MODIFY)
  - `src/features/tactical-unified/__tests__/tactical-animation.test.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/__tests__/billboard-depth-sort.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. `src/features/tactical-unified/views/FullTacticalCanvas.tsx` にて、空の独立 `createCanvasStore` 放置を解消し、`TacticalUnifiedStore` ⇄ `TacticalStoreProvider` (`documentStore`, `sessionStore`, `playbackStore`) ⇄ `canvasStore` を同期させること（左右パネル・タイムラインでの選手/矢印/ゾーン/スライド変更が中央 Konva Stage に即座に反映され、ステージ上のドラッグ・編集が `TacticalUnifiedStore` と `documentStore` に双方向反映されること）。
- [x] 2. `src/features/tactical-unified/hooks/use-tactical-animation.ts` にて、再生中（`isPlaying === true`）の 60fps RAF ループ内で `playbackStore.setTimeMs(nextTimeMs)` に加えて `evaluateTimelineFrame(activePhase, toMilliseconds(nextTimeMs))` を評価し、補間されたフレーム状態を `onFrameEvaluated` コールバック（または `canvasStore`）へ反映して画面上の選手・ボール・矢印・ゾーンが滑らかにアニメーション再生されること。
- [x] 3. `extension/features/canvas/components/QuickAnnotationCanvas.tsx` にて、マウント時および `handleCanvasAutoSave` 内の冗長な `serializeProjectToScreenshotJson(documentStore.getState().project)` 二重変換ピンポンを廃止し、`screenshot.canvasAnnotations` を初期 JSON として直接渡すとともに、自動保存時は `translateScreenshotToProject` ➔ `documentStore.getState().loadProject(bundle.project)` の一方向更新のみとすること。
- [x] 4. `src/features/tactical-unified/core/components/canvas-stage.tsx` で `TacticalStoresContext` 存在時に `useResolvedSceneGraph` を呼び出し、`ResolvedSceneGraphDTO` を `PitchGroundLayer`・`BillboardObjectLayer`・`ArrowObject` に渡して描画に使用すること（`rtk grep "useResolvedSceneGraph" src/features/tactical-unified/core/` が `1` 件以上ヒットすること）。

## 2.5 Architectural Invariants & Why (破壊禁止の前提と設計理由)
- **Invariants (破壊禁止の不変条件と理由)**:
  1. **Ghost Pipeline の完全根絶**: `useResolvedSceneGraph` がテストからしか呼ばれない状態を解消し、本番の `CanvasStage` ➔ `PitchGroundLayer` / `BillboardObjectLayer` / `ArrowObject` に配線する。
  2. **4層コンポーネントモデルとホスト境界の厳守**: `src/features/tactical-unified/core/**`（Level 2）は Web (`FullTacticalCanvas`) と Chrome Extension (`QuickAnnotationCanvas`) の両方から利用されるため、`TacticalStoresContext` が存在する場合のみ `useResolvedSceneGraph` を解決し、単体テスト等で `CanvasStoreProvider` のみでマウントされた場合もクラッシュしないフォールバック互換性を保つこと。
  3. **RAII 副作用クリーンアップ**: `FullTacticalCanvas` および `useTacticalAnimation` 内のストア購読（`subscribe`）や `requestAnimationFrame` はアンマウント時に必ず解除（`unsubscribe` / `cancelAnimationFrame`）すること。
- **Consumers (呼び出し元・別画面の同期確認リスト)**:
  - `src/features/tactical-unified/__tests__/FullTacticalCanvas.integration.test.tsx` — `FullTacticalCanvas` のマウント・ツールバー・ステージ統合テスト。
  - `src/features/tactical-unified/__tests__/tactical-animation.test.ts` — アニメーション再生フックと `useResolvedSceneGraph` のテスト。
  - `extension/features/canvas/__tests__/QuickAnnotationCanvas.test.tsx`（または関連テスト）— Extension 側のキャンバス動作。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { useContext } from 'react';
import { normalizeTacticalProject } from '@/lib/tactical/acl/legacy-project-translator';
import { evaluateTimelineFrame } from '@/lib/tactical/engine/timeline-evaluator';
import type {
  ResolvedArrowPrimitive,
  ResolvedSceneGraphDTO,
} from '@/lib/tactical/compiler/scene-graph-dto';
import { useResolvedSceneGraph } from '@/features/tactical-unified/hooks/use-resolved-scene-graph';
import {
  TacticalStoresContext,
  useTacticalStoresContext,
} from '@/features/tactical-unified/stores/tactical-store-provider';
```

### 3.2 Key Interfaces & Types
```ts
export interface UseTacticalAnimationOptions {
  pitchSize?: { width: number; height: number };
  nodesRegistryRef?: { current?: unknown };
  loop?: boolean;
  onFrameEvaluated?: (frame: EvaluatedTimelineFrame) => void;
}
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```ts
// CanvasStage での安全な SceneGraph 解決（TacticalStoresContext がない単体テスト環境でも安全に動作）
function ResolvedSceneGraphBridge({
  viewport,
  children,
}: {
  viewport: StageViewport;
  children: (sceneGraph: ResolvedSceneGraphDTO) => React.ReactNode;
}) {
  const sceneGraph = useResolvedSceneGraph(viewport);
  return <>{children(sceneGraph)}</>;
}
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: FullTacticalCanvas・QuickAnnotationCanvas ストア統合とアニメーション再生復旧
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/views/FullTacticalCanvas.tsx`, `src/features/tactical-unified/hooks/use-tactical-animation.ts`, `extension/features/canvas/components/QuickAnnotationCanvas.tsx`, `src/features/tactical-unified/__tests__/tactical-animation.test.ts`
- **契約 (Exact Contract & Formula)**:
  ```ts
  // 1. src/features/tactical-unified/hooks/use-tactical-animation.ts
  // UseTacticalAnimationOptions に onFrameEvaluated?: (frame: EvaluatedTimelineFrame) => void を追加。
  // RAF の tick(now) 内で nextTimeMs を算出した直後に:
  // playbackStore.getState().setTimeMs(nextTimeMs);
  // if (activePhase && options?.onFrameEvaluated) {
  //   const evaluated = evaluateTimelineFrame(activePhase, toMilliseconds(nextTimeMs));
  //   options.onFrameEvaluated(evaluated);
  // }
  // を実行し、再生中の補間済みフレームを通知する。

  // 2. src/features/tactical-unified/views/FullTacticalCanvas.tsx
  // FullTacticalCanvasInner にて useTacticalStoresContext() から { documentStore, sessionStore, playbackStore } を取得する。
  // - storeApi (TacticalUnifiedStore) の状態変化を useEffect + storeApi.subscribe で監視し:
  //   a) activeSlide = activeSlides.find((s) => s.id === activeSlideId) ?? activeSlides[0]
  //   b) canvasStore.setState({
  //        annotations: {
  //          markers: activeSlide?.players ?? [],
  //          arrows: activeSlide?.annotations.arrows ?? [],
  //          zones: activeSlide?.annotations.zones ?? [],
  //          texts: activeSlide?.annotations.texts ?? [],
  //        },
  //        ball: activeSlide?.ball ?? { x: 50, y: 50, visible: true },
  //        activeSlideId: activeSlide?.id ?? null,
  //        selectedIds: state.selectedIds,
  //        activeTool: state.activeTool,
  //        pitchTransform: state.pitchTransform,
  //        aspectRatio: activePhase?.aspectRatio ?? '4:5',
  //        teamVisibility: state.teamVisibility ?? 'both',
  //        markerMode: state.markerMode,
  //        connectingPlayerId: state.connectingPlayerId,
  //      })
  //   c) documentStore.getState().loadProject(normalizeTacticalProject({ phases: state.phases, activePhaseId: state.activePhaseId, activeSlideId: state.activeSlideId }).project)
  //   d) sessionStore.getState().resetSession({ activePhaseId: state.activePhaseId, activeSlideId: state.activeSlideId, activeTool: state.activeTool, selectedIds: state.selectedIds })
  //   e) playbackStore: state.isPlaying が変化した際、true なら playbackStore.getState().startPlayback()、false なら playbackStore.getState().pausePlayback() を呼ぶ。
  // - canvasStore のアクション（updateMarker, updateMarkers, updateArrow, updateZone, updateText, addArrow, addZone, addText, selectObject, setActiveTool, setPitchTransform, moveMarkerToBench, updateBall）をオーバーライドし、呼び出し時に storeApi.getState() の対応アクションを呼び出すように配線する。
  // - useTacticalAnimation({ nodesRegistryRef, onFrameEvaluated: (evaluated) => { ... } }) で再生中の補間スライド（evaluated.slide.players, arrows, zones, texts, ball）を canvasStore.setState に反映する。

  // 3. extension/features/canvas/components/QuickAnnotationCanvas.tsx
  // - initialAnnotationsJson のための serializeProjectToScreenshotJson(documentStore.getState().project) を廃止し、config には initialAnnotationsJson: screenshot.canvasAnnotations を直接渡す。
  // - handleCanvasAutoSave 内では translateScreenshotToProject ➔ documentStore.getState().loadProject(bundle.project) ➔ onAutoSave?.(annotationsJson) のみを実行し、serializeProjectToScreenshotJson の再シリアライズ往復を廃止する。
  ```
- **Testing Strategy (Concrete Test Values)**:
  `src/features/tactical-unified/__tests__/tactical-animation.test.ts` にて以下を検証:
  1. `useTacticalAnimation` に `onFrameEvaluated` コールバックを渡して `playbackStore.getState().startPlayback()` を実行し RAF を進めた際（`t = 500ms`）、`onFrameEvaluated` が補間済みの `EvaluatedTimelineFrame`（`slide.players[0].x === 35` 等）を引数に呼び出されること。
  2. `FullTacticalCanvas.integration.test.tsx` がすべて PASS すること。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/__tests__/tactical-animation.test.ts` ➔ Phase 1 対象3ファイルを実装 ➔ `bun run ai:check src/features/tactical-unified/views/FullTacticalCanvas.tsx src/features/tactical-unified/hooks/use-tactical-animation.ts extension/features/canvas/components/QuickAnnotationCanvas.tsx src/features/tactical-unified/__tests__/tactical-animation.test.ts` PASS
- **Worker Handoff Log**:
  - `useTacticalAnimation`: `onFrameEvaluated?: (frame: EvaluatedTimelineFrame) => void` オプション追加、RAF ループ内で `evaluateTimelineFrame` 補間フレームを通知。
  - `FullTacticalCanvas`: `TacticalUnifiedStore` ⇄ `documentStore` / `sessionStore` / `playbackStore` ⇄ `canvasStore` を同期し、アクション委譲および補間フレームの `canvasStore` 反映を完了。`QuickAnnotationCanvas`: 初期 annotations と自動保存時の再シリアライズ往復を廃止。

---

### Phase 2: Konva Stage / Layer / ArrowObject への useResolvedSceneGraph 接続
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/core/components/canvas-stage.tsx`, `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx`, `src/features/tactical-unified/core/components/PitchGroundLayer.tsx`, `src/features/tactical-unified/core/components/annotations/ArrowObject.tsx`, `src/features/tactical-unified/core/components/__tests__/billboard-depth-sort.test.ts`
- **契約 (Exact Contract & Formula)**:
  ```ts
  // 1. src/features/tactical-unified/core/components/canvas-stage.tsx
  // TacticalStoresContext を useContext(TacticalStoresContext) で確認し、Context が存在する場合のみ内部ブリッジコンポーネントまたはフック経由で
  // useResolvedSceneGraph({ width: vRect.width, height: vRect.height, offsetX: 0, offsetY: 0 }) を呼び出し、
  // 得られた sceneGraph: ResolvedSceneGraphDTO | null を PitchGroundLayer と BillboardObjectLayer に props (sceneGraph={sceneGraph}) として渡す。

  // 2. src/features/tactical-unified/core/components/BillboardObjectLayer.tsx
  // BillboardObjectLayerProps に sceneGraph?: ResolvedSceneGraphDTO | null を追加。
  // sortedItems の useMemo 内で、sceneGraph && sceneGraph.billboardItems.length > 0 の場合は、
  // sceneGraph.billboardItems の順序（Compiler によって既に depthSortKey 昇順ソート済み）に従って BillboardItem 配列を構築して返す。
  // sceneGraph が未提供（単体テスト等）の場合のみ既存の sortBillboardItemsByDepth フォールバックを使用する。

  // 3. src/features/tactical-unified/core/components/PitchGroundLayer.tsx & annotations/ArrowObject.tsx
  // PitchGroundLayerProps に sceneGraph?: ResolvedSceneGraphDTO | null を追加。
  // sortedArrows.map 内で const resolvedArrow = sceneGraph?.arrows.find((a) => a.id === arrow.id) ?? null を取得し、ArrowObject に resolvedArrow={resolvedArrow} を渡す。
  // ArrowObjectProps に resolvedArrow?: ResolvedArrowPrimitive | null を追加し、resolvedArrow が存在する場合は curve.renderPoints の初期ポイント列として resolvedArrow.flatPointsPx as number[] を優先利用できるようにする。
  ```
- **Testing Strategy (Concrete Test Values)**:
  `src/features/tactical-unified/core/components/__tests__/billboard-depth-sort.test.ts` にて以下を検証:
  1. `sceneGraph.billboardItems` に `{ kind: 'player', id: 'p-back', depthSortKey: 100 }` と `{ kind: 'player', id: 'p-front', depthSortKey: 300 }` が含まれる場合、`BillboardObjectLayer` が `p-back` ➔ `p-front` の順序でアイテムを解決すること。
  2. `rtk grep "useResolvedSceneGraph" src/features/tactical-unified/core/` が `canvas-stage.tsx` にヒットすること。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/core/components/__tests__/billboard-depth-sort.test.ts` ➔ Phase 2 対象4ファイルを実装 ➔ `bun run ai:check src/features/tactical-unified/core/` PASS
- **Worker Handoff Log**:
  - `CanvasStage`: `TacticalStoresContext` 存在時に `useResolvedSceneGraph` をブリッジ解決し `PitchGroundLayer` と `BillboardObjectLayer` に `sceneGraph` を渡すよう配線完了。
  - `sortBillboardItemsBySceneGraph` を export し、`sceneGraph.billboardItems` の `depthSortKey` 順序に沿った描画深さソートおよび `ArrowObject` の `flatPointsPx` 優先描画に対応。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-12 15:35
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. ドメイン論理 & 要件網羅性 & テスタビリティ: 数式/座標/状態遷移の整合性、受入要件の全網羅、Concrete Test Values検証、ハック排除
  - [x] 2. Invariants保護 & Consumer同期: Section 2.5 の不変条件（ちゃぶ台返し防止）遵守、別画面・呼び出し元（Consumers）の更新漏れゼロ
  - [x] 3. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 4. 設計負債 & サイレント破壊防止: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、公開シグネチャ保護、指示外変更の排除
- **Summary**:
  `useResolvedSceneGraph` の配線により幽霊パイプラインを完全解消し、`FullTacticalCanvas` と `CanvasStage` の双方向ストア同期・アニメーションRAF補間フレーム反映、Extension側の二重シリアライズ廃止を極めてクリーンに達成。4大定性監査を全項目クリア。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
