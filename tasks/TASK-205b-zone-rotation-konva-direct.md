# TASK-205b: ゾーン回転の Konva 直接操作化と `activeZoneRotation` 廃止

- **Status**: `DONE`
- **Commit**: `perf(tactical): rotate zones directly on Konva nodes and remove activeZoneRotation`
- **Execution Waves**:
  - Wave 1: Phase 1, Phase 2 (parallel)
  - Wave 2: Phase 3 (sequential after Wave 1)
  - Wave 3: Phase 4 (sequential after Wave 2)
- **Negative Contracts**:
  - `rg: activeZoneRotation|setActiveZoneRotation|EphemeralZoneRotation`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. ゾーンのコーナー外側ドラッグによる回転中、背景ボード全体（`useResolvedSceneGraph`）の再計算・再レンダリングが一切走らないこと。
  2. 回転中も Konva の `zoneNodes` と `Transformer` 選択枠が 0 フレーム遅延で同期回転し、`pointerup` 時のみ `UPDATE_ZONE` として 1 回分だけ Undo 履歴に積まれること。
  3. 複数選択中またはポリゴンゾーンでは回転モードに入らない既存仕様を維持すること。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `EphemeralZoneRotation`、`activeZoneRotation`、`setActiveZoneRotation` はフォールバックを残さず完全に削除する。
  2. `CanvasNodesRegistry` に `zoneTransformers: Map<string, Konva.Transformer>` を追加し、`useZoneShape` で登録・解除する。
  3. `useCanvasZoneRotation` は回転中に `nodesRegistryRef?.current?.zoneNodes.get(selectedZone.id)?.rotation(newRot)` と `zoneTransformers.get(selectedZone.id)?.forceUpdate()`、および `layer.batchDraw()` を直接実行する。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/core/hooks/use-canvas-pointer-interaction.ts`
  - `src/features/tactical-unified/core/components/CanvasStageContainer.tsx`

## 2. Implementation Phases

### Phase 1: Store / Compiler からの `activeZoneRotation` 完全削除
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/compiler/scene-graph-dto.ts` (L15-L30)
  - `[MODIFY]` `src/lib/tactical/compiler/compile-zones.ts` (L95-L114)
  - `[MODIFY]` `src/features/tactical-unified/stores/session-store.ts` (L1-L45, L89-L130)
  - `[MODIFY]` `src/features/tactical-unified/hooks/use-resolved-scene-graph.ts` (L106-L164)
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `scene-graph-dto.ts` から `EphemeralZoneRotation` インターフェースと `EphemeralSessionState.activeZoneRotation` を削除する。
    2. `compileZones` の `rotationDeg` は常に `zone.rotation ?? 0` を使用する。
    3. `session-store.ts` から `activeZoneRotation` フィールド・`CreateSessionStoreOptions.activeZoneRotation`・`setActiveZoneRotation` アクションを削除する。
    4. `useResolvedSceneGraph` から `activeZoneRotation` 購読を削除する。
- **Concrete Test Cases**:
  - Phase 4 で `use-canvas-pointer.test.ts` を更新して検証（本 Phase では `tsc` で全参照削除を保証）。
- **Verification**:
  - `bun run ai:check src/lib/tactical/compiler/scene-graph-dto.ts src/lib/tactical/compiler/compile-zones.ts src/features/tactical-unified/stores/session-store.ts src/features/tactical-unified/hooks/use-resolved-scene-graph.ts`

### Phase 2: `zoneTransformers` 登録と `useCanvasZoneRotation` の直接回転化
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/utils/canvas-registry.ts` (L29-L62)
  - `[MODIFY]` `src/features/tactical-unified/core/components/zones/use-zone-shape.ts` (L50-L72)
  - `[MODIFY]` `src/features/tactical-unified/core/hooks/use-canvas-zone-rotation.ts` (L16-L185)
  - `[MODIFY]` `src/features/tactical-unified/core/utils/canvas-pointer-dispatcher.ts` (UseCanvasPointerInteractionOptions)
- **Contract**:
  ```ts
  // canvas-registry.ts
  export interface CanvasNodesRegistry {
    // 既存フィールドに加え:
    zoneTransformers?: Map<string, Konva.Transformer>;
  }
  // use-canvas-zone-rotation.ts
  export interface UseCanvasZoneRotationOptions {
    vRect: { x?: number; y?: number; width: number; height: number };
    containerRef?: React.RefObject<HTMLDivElement | null>;
    nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
    isDrawing: boolean;
    isPanning: boolean;
  }
  ```
  - 振る舞い仕様・境界条件:
    1. `createCanvasNodesRegistry()` で `zoneTransformers: new Map()` を初期化する（オプショナル型にして既存テストのカスタムリテラル生成を壊さない）。
    2. `useZoneShape` で `transformerRef.current` を `nodesRegistryRef?.current?.zoneTransformers?.set(zone.id, transformerRef.current)` で登録し、アンマウント時に削除する。
    3. `useCanvasZoneRotation` の `handlePointerMove` は `setActiveZoneRotation` を呼ばず、`nodesRegistryRef?.current?.zoneNodes.get(selectedZone.id)` に対して `.rotation(newRot)`、`zoneTransformers?.get(selectedZone.id)?.forceUpdate()`、および `node.getLayer()?.batchDraw()` を直接実行する。
    4. `UseCanvasPointerInteractionOptions` に `nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>` を追加する。
- **Concrete Test Cases**:
  - Phase 4 で `use-canvas-pointer.test.ts` を更新して検証。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/utils/canvas-registry.ts src/features/tactical-unified/core/components/zones/use-zone-shape.ts src/features/tactical-unified/core/hooks/use-canvas-zone-rotation.ts src/features/tactical-unified/core/utils/canvas-pointer-dispatcher.ts`

### Phase 3: `useCanvasPointerInteraction` と `CanvasStageContainer` の配線
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/hooks/use-canvas-pointer-interaction.ts` (L25-L60)
  - `[MODIFY]` `src/features/tactical-unified/core/components/CanvasStageContainer.tsx` (L75-L115)
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `useCanvasPointerInteraction` は `nodesRegistryRef` を受け取り、`useCanvasZoneRotation` にそのまま渡す。
    2. `CanvasStageContainer` で `internalRegistryRef` / `nodesRegistryRef` の生成位置を `useCanvasPointerInteraction` より前に移動し、`nodesRegistryRef` を渡す。
- **Concrete Test Cases**:
  - Phase 4 で `use-canvas-pointer.test.ts` を更新して検証。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/hooks/use-canvas-pointer-interaction.ts src/features/tactical-unified/core/components/CanvasStageContainer.tsx`

### Phase 4: `use-canvas-pointer.test.ts` の更新（300行超テスト単独Phase）
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/hooks/__tests__/use-canvas-pointer.test.ts` (L340-L474)
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `sessionStore.getState().activeZoneRotation` への期待を削除する。
    2. 実 `Konva.Rect` / `Konva.Transformer` インスタンスを `createCanvasNodesRegistry()` の `zoneNodes` / `zoneTransformers` に登録して `useCanvasPointerInteraction` へ渡し、コーナー外側ドラッグ中の `pointermove` で `zoneNode.rotation()` が即座に更新されること、および `pointerup` 時のみ `documentStore` の `zone.rotation` と `past.length` が更新されることを検証する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/hooks/__tests__/use-canvas-pointer.test.ts`（実 Konva ノード + 実 TacticalStoreProvider 接続、モック禁止）:
    - `case 1`: コーナー外側ドラッグ中の `handlePointerMove` で `zoneNode.rotation()` が回転角に更新され、`past.length === 0` のままであること。
    - `case 2`: `handlePointerUp` で `activeSlide.zones[0].rotation` が確定保存され、`past.length === 1` になること。
    - `case 3`: `vRect` に `{ x: 40, y: 20 }` オフセットがある場合も四隅外側判定と回転中心が一致し、`zoneNode.rotation()` が期待角度（約 `90` 度）に更新されること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/hooks/__tests__/use-canvas-pointer.test.ts`
