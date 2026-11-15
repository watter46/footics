# TASK-198a: Konva オブジェクト（Zone / Text / Arrow）の Dumb View 化

- **Status**: `DONE`
- **Commit**: `refactor(tactical): convert Zone, Text, and Arrow Konva nodes to Dumb Views driven by SceneGraph primitives`
- **Execution Waves**:
  - Wave 1 (並列): Phase 1 (`ZonePolygonNode` + `ZoneShapeNode` + `zone-geometry` + `zone-object-components.test.ts`), Phase 2 (`zone-features.test.ts`), Phase 3 (`TextObject` + `billboard-item-node`), Phase 4 (`arrow-start-handle` + `arrow-end-handle` + `arrow-control-points` + `arrow-handles-group`)
  - Wave 2 (直列, Wave 1 後): Phase 5 (`ArrowObject` + `arrow-line-node` + `PitchGroundLayer` + `[DELETE] use-arrow-curve`, `[DELETE] use-arrow-sync`)
- **Negative Contracts**:
  - `absent: src/features/tactical-unified/core/components/annotations/use-arrow-curve.ts`
  - `absent: src/features/tactical-unified/core/components/annotations/use-arrow-sync.ts`
  - `rg(src/features/tactical-unified/core/components/): \buseArrowKonvaUpdater\b|\bgetZoneStyle\b`
  - `rg(src/features/tactical-unified/core/components/annotations/TextObject.tsx,src/features/tactical-unified/core/components/zones/ZonePolygonNode.tsx,src/features/tactical-unified/core/components/zones/ZoneShapeNode.tsx): \buseCanvasStore\b`

---

## 1. Architectural Invariants & Design Decisions

- **Invariants (壊してはいけない前提条件)**:
  1. Konva コンポーネント内での幾何学計算（ベジェ/波線頂点分割・`getZoneStyle`・`normX/normY` 未解決フォールバック・`useArrowCurve`）および Konva ノードへの命令的書き換え（`useArrowKonvaUpdater`, `arrowRef.current.points()`, `controlHandleRef.current.position()`）を全面禁止する。
  2. すべての矢印・テキスト・ゾーン描画座標とスタイルは `ResolvedArrowPrimitive` / `ResolvedBillboardTextItem` / `ResolvedZonePrimitive` からのみ転写する。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `ZonePolygonNode` / `ZoneShapeNode` は `resolvedZone: ResolvedZonePrimitive` を必須とし、`useCanvasStore` を `useSessionStore`（`setIsDragging`, `setIsHudOpen`）へ置換する。ドラッグ・`Transformer` 確定時の永続反映（`updateZone`）用の `pxToNorm` 逆算のみ操作ハンドラ内に残す。
  2. `TextObject` は `resolvedText: ResolvedBillboardTextItem` を必須とし、`normX`/`normY` フォールバックおよび `useCanvasStore` を撤去して `useSessionStore`（`setIsDragging`, `setIsHudOpen`, `setActiveDragDelta`）へ移行する。
  3. `ArrowObject` は `resolvedArrow: ResolvedArrowPrimitive` を必須とし、`useArrowCurve` / `useArrowSyncAndRegistry` / `useArrowKonvaUpdater` を撤去する。ハンドルドラッグ中の一時プレビューは命令的 `node.position()` / `arrow.points()` 書き換えではなく、`ArrowObject` のローカル React state（`draftEndpoints`）経由で React props として再描画し、`onDragEnd` 時に `draftEndpoints` を `null` に戻して `updateArrow` を発行する。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/core/components/zones/ZonePolygonNode.tsx`
  - `src/features/tactical-unified/core/components/zones/ZoneShapeNode.tsx`
  - `src/features/tactical-unified/core/components/zones/zone-geometry.ts`
  - `src/features/tactical-unified/core/components/annotations/TextObject.tsx`
  - `src/features/tactical-unified/core/components/billboard-item-node.tsx`
  - `src/features/tactical-unified/core/components/annotations/ArrowObject.tsx`
  - `src/features/tactical-unified/core/components/annotations/arrow-line-node.tsx`
  - `src/features/tactical-unified/core/components/annotations/arrow-handles-group.tsx`
  - `src/features/tactical-unified/core/components/annotations/arrow-start-handle.tsx`
  - `src/features/tactical-unified/core/components/annotations/arrow-end-handle.tsx`
  - `src/features/tactical-unified/core/components/annotations/arrow-control-points.tsx`
  - `src/features/tactical-unified/core/components/PitchGroundLayer.tsx`
  - `src/features/tactical-unified/__tests__/zone-object-components.test.ts`
  - `src/features/tactical-unified/__tests__/zone-features.test.ts`

---

## 2. Implementation Phases

### Phase 1: ZonePolygonNode / ZoneShapeNode Dumb View 化 & zone-geometry 整理

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/zones/ZonePolygonNode.tsx` (106 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/components/zones/ZoneShapeNode.tsx` (145 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/components/zones/zone-geometry.ts` (119 lines)
  - `[MODIFY]` `src/features/tactical-unified/__tests__/zone-object-components.test.ts` (223 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/compiler/scene-graph-dto.ts`
  - `src/features/tactical-unified/stores/tactical-store-provider.tsx`
- **Contract**:
  ```ts
  export interface ZoneNodeProps {
    zone: ZoneAnnotation;
    stageSize: { width: number; height: number };
    isSelected: boolean;
    isInteractive?: boolean;
    onSelect: (e: KonvaEventObject<MouseEvent | TouchEvent>) => void;
    updateZone: (zoneId: string, patch: Partial<ZoneAnnotation>) => void;
    nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
    resolvedZone: ResolvedZonePrimitive;
  }
  ```
  - 振る舞い仕様・境界条件:
    1. `zone-geometry.ts`: `getZoneStyle` と `alphaHex` を削除する（`computeTransformedZonePatch` 等は維持）。
    2. `ZonePolygonNode` & `ZoneShapeNode`: `useCanvasStore`・`getZoneStyle`・未解決フォールバック（`!hasResolvedRect` 等）を撤去し、`useSessionStore`（`setIsDragging`, `setIsHudOpen`）へ移行する。塗り・線色・透明度・線幅・座標（`resolvedZone.flatPointsPx` / `resolvedZone.xPx`, `yPx`, `widthPx`, `heightPx`, `rotationDeg`）はすべて `resolvedZone` から直接転写する（`opacity={resolvedZone.opacity}` と `fill={resolvedZone.color}` / `strokeOpacity={resolvedZone.strokeOpacity}` 等で Konva へ転写、`visible={resolvedZone.visible}`）。
    3. `zone-object-components.test.ts`: `CanvasStoreContext`・`createCanvasStore`・`getZoneStyle` テストを削除し、`TacticalStoreProvider` 配下で `resolvedZone` 必須の `ZoneShapeNode` / `ZonePolygonNode` 描画を検証する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/__tests__/zone-object-components.test.ts`:
    - `ZoneShapeNode`: `resolvedZone`（`rect` / `ellipse`）の座標・回転・色・線幅がそのまま Konva Shape 属性へ反映されること。
    - `ZonePolygonNode`: `resolvedZone.flatPointsPx`・色・線幅がそのまま Konva Line へ反映されること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/zones/ZonePolygonNode.tsx src/features/tactical-unified/core/components/zones/ZoneShapeNode.tsx src/features/tactical-unified/core/components/zones/zone-geometry.ts src/features/tactical-unified/__tests__/zone-object-components.test.ts`

### Phase 2: zone-features.test.ts の getZoneStyle 参照除去

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/__tests__/zone-features.test.ts` (219 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/compiler/compile-zones.ts`
  - `src/lib/tactical/engine/timeline-evaluator.ts`
- **Contract**:
  - `getZoneStyle` の import およびテストブロック（L2, L39-L73）を削除し、同等仕様（`strokeColor` 未指定時フォールバック、`strokeOpacity`, `strokeWidthPx`）を `compileZones`（`compile-zones.ts`）の純粋関数テストとして検証する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/__tests__/zone-features.test.ts`:
    - `compileZones`: カスタム `strokeColor` / `strokeOpacity` / `strokeWidth` 反映、およびデフォルト値解決。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/__tests__/zone-features.test.ts`

### Phase 3: TextObject Dumb View 化 & BillboardItemNode 整合

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/annotations/TextObject.tsx` (93 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/components/billboard-item-node.tsx` (159 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/compiler/scene-graph-dto.ts`
  - `src/features/tactical-unified/stores/tactical-store-provider.tsx`
- **Contract**:
  ```ts
  export interface TextObjectProps {
    textId: string;
    locked?: boolean;
    stageSize: { width: number; height: number };
    isSelected: boolean;
    isEditing?: boolean;
    isInteractive?: boolean;
    onSelect: (e: KonvaClickEvent) => void;
    onDblClick: (e: KonvaClickEvent) => void;
    updateText: (textId: string, patch: Partial<DomainTextAnnotation>) => void;
    nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
    resolvedText: ResolvedBillboardTextItem;
  }
  ```
  - 振る舞い仕様・境界条件:
    1. `TextObject`: `useCanvasStore`・`normX`・`normY` フォールバックを撤去し、`useSessionStore`（`setIsDragging`, `setIsHudOpen`）へ移行する。表示座標（`x={resolvedText.positionPx.x}`, `y={resolvedText.positionPx.y}`）・`text={resolvedText.content}`・`fontSize={resolvedText.fontSizePx}`・`fill={isSelected ? '#60a5fa' : resolvedText.color}`・`fontStyle`・`opacity={resolvedText.opacity}`・`visible={!isEditing && resolvedText.visible}` はすべて `resolvedText` から転写する。
    2. `billboard-item-node.tsx`: `item.kind === 'text'` 時に `textId={item.id}`, `resolvedText={item}` を渡す（`TextAnnotation` 互換オブジェクト組み立て不要）。
- **Concrete Test Cases**:
  - `TextObject` 統合描画は `TASK-197b` (`five-layer-architecture.test.tsx`, `hud-and-editor.test.tsx`) で検証される。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/annotations/TextObject.tsx src/features/tactical-unified/core/components/billboard-item-node.tsx`

### Phase 4: Arrow ハンドル 3 種・HandlesGroup から命令的 Konva 更新撤去

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/annotations/arrow-start-handle.tsx` (156 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/components/annotations/arrow-end-handle.tsx` (165 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/components/annotations/arrow-control-points.tsx` (158 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/components/annotations/arrow-handles-group.tsx` (68 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/compiler/scene-graph-dto.ts`
- **Contract**:
  ```ts
  export interface ArrowHandlePreviewDelta {
    readonly kind: 'start' | 'end' | 'control';
    readonly pxX: number;
    readonly pxY: number;
  }
  ```
  - 振る舞い仕様・境界条件:
    1. 4 ファイルから `updateKonvaPoints` props および `controlHandleRef.current.position(...)` などの他ノード命令書き換えを完全撤去する。
    2. 各ハンドルは `onPreviewMove?: (delta: ArrowHandlePreviewDelta | null) => void` を受け取り、`onDragMove` 中は `onPreviewMove({ kind, pxX: pos.x, pxY: pos.y })` のみを通知し、`onDragEnd` で `onPreviewMove?.(null)` 後に `updateArrow(...)` を発行する。
    3. 座標 props（`sPxX`, `sPxY`, `ePxX`, `ePxY`, `midHandlePxX`, `midHandlePxY`）は `ArrowObject` からリアクティブに受け取る。
- **Concrete Test Cases**:
  - Phase 5 完了時に `ArrowObject` 全体でコンパイル・テスト検証。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/annotations/arrow-start-handle.tsx src/features/tactical-unified/core/components/annotations/arrow-end-handle.tsx src/features/tactical-unified/core/components/annotations/arrow-control-points.tsx src/features/tactical-unified/core/components/annotations/arrow-handles-group.tsx`

### Phase 5: ArrowObject & ArrowLineNode Dumb View 化 + use-arrow-curve / sync 削除

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/annotations/ArrowObject.tsx` (141 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/components/annotations/arrow-line-node.tsx` (159 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/components/PitchGroundLayer.tsx` (290 lines)
  - `[DELETE]` `src/features/tactical-unified/core/components/annotations/use-arrow-curve.ts`
  - `[DELETE]` `src/features/tactical-unified/core/components/annotations/use-arrow-sync.ts`
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/compiler/scene-graph-dto.ts`
  - `src/lib/tactical/compiler/geometry-primitives.ts`
  - `src/features/tactical-unified/core/components/annotations/arrow-geometry.ts`
- **Contract**:
  ```ts
  export interface ArrowObjectProps {
    arrow: DomainArrowAnnotation;
    stageSize: { width: number; height: number };
    isSelected: boolean;
    isInteractive?: boolean;
    onSelect: (e: KonvaClickEvent) => void;
    updateArrow: (arrowId: string, patch: Partial<DomainArrowAnnotation>) => void;
    nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
    resolvedArrow: ResolvedArrowPrimitive;
  }
  ```
  - 振る舞い仕様・境界条件:
    1. `ArrowObject`: `useArrowCurve`・`useArrowSyncAndRegistry`・`useArrowKonvaUpdater` を撤去し、2 ファイルを `[DELETE]` する。通常表示時は `resolvedArrow.flatPointsPx`, `startPointPx`, `endPointPx`, `controlHandlePx`, `color`, `strokeWidthPx`, `dashArrayPx`, `dashOffsetPx`, `opacity`, `visible`, `startMarker`, `endMarker`, `pointerLengthPx`, `pointerWidthPx`, `dotRadiusPx` をそのまま `ArrowLineNode` / `ArrowHeadNode` / `ArrowHandlesGroup` へ転写する。
    2. ハンドル操作中のみローカル state `previewHandle` を保持し、React props 経由で `ArrowLineNode` の `points` とハンドル座標を更新する（`arrowRef.current.points()` 命令操作禁止）。`nodesRegistryRef` への `arrowNodes` 登録は `ref` コールバックまたは最小 effect（座標書き込みなし）で行う。
    3. `ArrowLineNode`: `computeArrowDimensions` や `arrow.arrowType === ...` の計算を持たず、`resolvedArrow` の `strokeWidthPx`, `pointerLengthPx`, `pointerWidthPx`, `dashArrayPx`, `dashOffsetPx`, `opacity`, `visible`, `endMarker === 'arrow'` を直接転写する。
    4. `PitchGroundLayer`: `ArrowObject` 呼び出しに非 null `resolvedArrow` と `DomainArrowAnnotation` のみを渡し（`players` props 削除）、`ZoneObject` 呼び出しにも非 null `resolvedZone` と `DomainZoneAnnotation` のみを渡す（`isCreatingThis` / `mousePreviewPos` props 削除）。
- **Concrete Test Cases**:
  - `PitchGroundLayer` + `ArrowObject` 描画検証は `TASK-197b` (`five-layer-architecture.test.tsx`) と統合確認。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/annotations/ArrowObject.tsx src/features/tactical-unified/core/components/annotations/arrow-line-node.tsx src/features/tactical-unified/core/components/PitchGroundLayer.tsx`
