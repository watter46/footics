# TASK-198c: ArrowObject 制御点ハンドル位置・ドラッグ追従修正 & Zone 四隅外側回転の有効化

- **Status**: `DONE`
- **Commit**: `fix(tactical): keep arrow control handle on curve during drag and fix corner-outside zone rotation`
- **Execution Waves**:
  - Wave 1 (並列): Phase 1 (`compile-arrows` + `scene-compiler.test.ts`), Phase 2 (`scene-graph-dto` + `compile-zones` + `session-store` + `use-resolved-scene-graph`), Phase 3 (`ArrowObject` + `arrow-line-node` + `arrow-object-interaction.test.tsx`)
  - Wave 2 (直列, Wave 1 後): Phase 4 (`ZoneShapeNode` + `use-zone-shape` + `zone-geometry` + `zone-object-components.test.ts`), Phase 5 (`canvas-zone-rotation-helpers` + `use-canvas-zone-rotation` + `use-canvas-pointer-interaction` + `use-canvas-pointer.test.ts`)
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/core/components/zones/zone-geometry.ts): points:\s*\[`

---

## 1. Architectural Invariants & Design Decisions

- **Invariants (壊してはいけない前提条件)**:
  1. `ResolvedArrowPrimitive.controlHandlePx` は 2 次ベジェ制御点 $P_c$（曲線外）ではなく、描画される曲線上の $t=0.5$ 中点 $B(0.5) = 0.25 S + 0.5 P_c + 0.25 E$ を表す（`ArrowControlPoints` の逆算式 $P_c = 2 M - 0.5(S + E)$ と対称）。
  2. ゾーンの回転 UI は従来通り **四隅の `Transformer` リサイズハンドル（`⇔`）を維持**し（`rotateEnabled={false}` のまま上部ロリポップハンドルは出さない）、**四隅の枠外ホバーで回転カーソル（`ROTATE_CURSOR`）を表示して回転**させる。
  3. ドラッグ回転中は Cold State（`DocumentStore.dispatchSlide`）を 60Hz で呼び出さず、`SessionStore.activeZoneRotation`（Hot State）でプレビューし、`pointerup` 確定時のみ 1 回 `UPDATE_ZONE` を発行して Undo 履歴汚染を防ぐ。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `ArrowObject` はローカル state（`previewHandle` / `bodyDragDelta`）のみを使い、ハンドル操作中は `subdivideQuadraticBezier` / `generateWavyLinePoints`（`geometry-primitives.ts`）で滑らかな曲線・波線を維持し、矢印本体ドラッグ中はハンドルと先端ドットも追従させる。
  2. `useCanvasZoneRotation` は `stage.container()`（`.konvajs-content`）へ直接 `ROTATE_CURSOR` を設定・解除し（`'data:image/svg+xml'` を含む場合のみ解除して `Transformer` のリサイズカーソルを上書きしない）、`pointerToNormalizedCoord` で `vRect` オフセットと `pitchTransform` を逆変換したピッチローカル座標で四隅外側判定を行う。
  3. `computeTransformedZonePatch`（`zone-geometry.ts`）は `RectZone`/`EllipseZone` 向けに `{ x, y, width, height, rotation }` のみを返し、不要な `points` 配列を付与しない。
- **Consumers (同期更新対象)**:
  - `src/lib/tactical/compiler/compile-arrows.ts`
  - `src/lib/tactical/compiler/scene-graph-dto.ts`
  - `src/lib/tactical/compiler/compile-zones.ts`
  - `src/features/tactical-unified/stores/session-store.ts`
  - `src/features/tactical-unified/hooks/use-resolved-scene-graph.ts`
  - `src/features/tactical-unified/core/components/annotations/ArrowObject.tsx`
  - `src/features/tactical-unified/core/components/annotations/arrow-line-node.tsx`
  - `src/features/tactical-unified/core/components/zones/ZoneShapeNode.tsx`
  - `src/features/tactical-unified/core/components/zones/use-zone-shape.ts`
  - `src/features/tactical-unified/core/components/zones/zone-geometry.ts`
  - `src/features/tactical-unified/core/utils/canvas-zone-rotation-helpers.ts`
  - `src/features/tactical-unified/core/hooks/use-canvas-zone-rotation.ts`
  - `src/features/tactical-unified/core/hooks/use-canvas-pointer-interaction.ts`

---

## 2. Implementation Phases

### Phase 1: `compileArrows` の `controlHandlePx` 線上中点算出修正

- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/compiler/compile-arrows.ts` (compileArrows, L167-L250)
  - `[MODIFY]` `src/lib/tactical/compiler/__tests__/scene-compiler.test.ts` (L245-L317)
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/compiler/scene-graph-dto.ts`
  - `src/lib/tactical/compiler/geometry-primitives.ts`
- **Contract**:
  ```ts
  // !isWavy && cpPx 定義時、オフセット済始終点と cpPx から曲線上 t=0.5 の中点を算出
  const controlHandlePx =
    !isWavy && cpPx
      ? toStagePixelPoint(
          0.25 * offsetRes.startX + 0.5 * cpPx.x + 0.25 * offsetRes.endX,
          0.25 * offsetRes.startY + 0.5 * cpPx.y + 0.25 * offsetRes.endY,
        )
      : undefined;
  ```
  - 振る舞い仕様・境界条件:
    1. `isWavy`（`arrowType === 'dribble'`）または `cpPx === undefined` のとき `controlHandlePx` は `undefined`。
    2. 曲線矢印（`controlPoint` あり）かつ選手追従・ドット終端・`activeDragDelta` 適用時も、`offsetRes.startX/Y` と `offsetRes.endX/Y` および `cpPx` を用いるため `controlHandlePx` は常に描画ベジェ曲線（`flatPointsPx` の $t=0.5$ 点）上に一致する。
- **Concrete Test Cases**:
  - `src/lib/tactical/compiler/__tests__/scene-compiler.test.ts`（純粋関数 I/O）:
    - `controlPoint` を持つ矢印で `controlHandlePx` が $0.25 S + 0.5 P_c + 0.25 E$（`flatPointsPx` 中央頂点）に一致すること。
    - `activeDragDelta` で矢印または紐づく選手を移動した際も `controlHandlePx` が移動後曲線上に維持されること。
- **Verification**:
  - `bun run ai:check src/lib/tactical/compiler/compile-arrows.ts src/lib/tactical/compiler/__tests__/scene-compiler.test.ts`

### Phase 2: ゾーン回転プレビュー用 Hot State (`activeZoneRotation`) の導入

- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/compiler/scene-graph-dto.ts` (EphemeralSessionState, L15-L26)
  - `[MODIFY]` `src/lib/tactical/compiler/compile-zones.ts` (compileZones, L17-L111)
  - `[MODIFY]` `src/features/tactical-unified/stores/session-store.ts` (SessionStoreState, L28-L41, L86-L150)
  - `[MODIFY]` `src/features/tactical-unified/hooks/use-resolved-scene-graph.ts` (useResolvedSceneGraph, L106-L161)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/stores/tactical-store-provider.tsx`
- **Contract**:
  ```ts
  export interface EphemeralZoneRotation {
    readonly zoneId: string;
    readonly rotationDeg: number;
  }
  // EphemeralSessionState に readonly activeZoneRotation?: EphemeralZoneRotation | null; を追加
  // SessionStoreState に readonly activeZoneRotation: EphemeralZoneRotation | null;
  // および readonly setActiveZoneRotation: (rot: EphemeralZoneRotation | null) => void; を追加
  ```
  - 振る舞い仕様・境界条件:
    1. `compileZones` は `session?.activeZoneRotation?.zoneId === zone.id` の場合、`rotationDeg` に `session.activeZoneRotation.rotationDeg` を優先適用する（それ以外は `zone.rotation ?? 0`）。
    2. `useResolvedSceneGraph` は `activeZoneRotation` を購読して `session` memo へ含め、`resetSession` でも `activeZoneRotation: null` に初期化する。
- **Concrete Test Cases**:
  - Phase 4 / Phase 5 の結合テスト（`zone-object-components.test.ts`, `use-canvas-pointer.test.ts`）で `SessionStore.setActiveZoneRotation` から `compileZones` / `ZoneShapeNode` 反映まで検証。
- **Verification**:
  - `bun run ai:check src/lib/tactical/compiler/scene-graph-dto.ts src/lib/tactical/compiler/compile-zones.ts src/features/tactical-unified/stores/session-store.ts src/features/tactical-unified/hooks/use-resolved-scene-graph.ts`

### Phase 3: `ArrowObject` & `ArrowLineNode` のドラッグ中曲線・波線・本体追従修正

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/annotations/ArrowObject.tsx` (L30-L147)
  - `[MODIFY]` `src/features/tactical-unified/core/components/annotations/arrow-line-node.tsx` (L10-L121)
  - `[ADD]` `src/features/tactical-unified/__tests__/arrow-object-interaction.test.tsx`
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/compiler/geometry-primitives.ts`
  - `src/features/tactical-unified/core/components/annotations/arrow-control-points.tsx`
  - `src/features/tactical-unified/core/components/annotations/arrow-handles-group.tsx`
- **Contract**:
  ```ts
  export interface ArrowBodyDragDelta {
    readonly dxPx: number;
    readonly dyPx: number;
  }
  // ArrowLineNodeProps に onBodyDragMove?: (delta: ArrowBodyDragDelta | null) => void; を追加
  ```
  - 振る舞い仕様・境界条件:
    1. `previewHandle === null` 時、`renderPoints` は `[...resolvedArrow.flatPointsPx]`、`midHandlePx` は `resolvedArrow.controlHandlePx ?? (sPx + ePx) / 2` をそのまま使う。
    2. `previewHandle !== null` 時:
       - `isWavy` なら `generateWavyLinePoints(sPxX, sPxY, ePxX, ePxY)` を使い、`midHandlePx` は `(sPx + ePx) / 2`。
       - `previewHandle.kind === 'control'` なら `midHandlePx = (previewHandle.pxX, previewHandle.pxY)`、$P_c = 2 M - 0.5(S + E)$ を求めて `subdivideQuadraticBezier(sPxX, sPxY, cpX, cpY, ePxX, ePxY)` を描画する。
       - `previewHandle.kind === 'start' | 'end'` かつ `resolvedArrow.controlHandlePx` あり（曲線）なら、元 $P_c = 2 \cdot \text{controlHandlePx} - 0.5(\text{startPointPx} + \text{endPointPx})$ を固定して新 $M = 0.25 S + 0.5 P_c + 0.25 E$ を算出し `subdivideQuadraticBezier(sPxX, sPxY, cpX, cpY, ePxX, ePxY)` を描画する。直線なら `[sPxX, sPxY, ePxX, ePxY]`。
    3. `ArrowLineNode` は `onDragMove` で `onBodyDragMove?.({ dxPx: node.x(), dyPx: node.y() })` を通知し、`onDragEnd` で `node.position({ x: 0, y: 0 })` かつ `onBodyDragMove?.(null)` 後に `updateArrow` を発行する。`ArrowObject` は `ArrowHeadNode` と `ArrowHandlesGroup` の座標へ `bodyDragDelta`（`dxPx, dyPx`）を加算する（`ArrowLineNode` 本体の `points` は Konva 自体の位置移動と二重加算しない）。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/__tests__/arrow-object-interaction.test.tsx`（実 `Stage` / `Layer` 描画、`vi.mock` なし）:
    - 曲線矢印で `ArrowControlPoints` ハンドル位置が `resolvedArrow.controlHandlePx`（曲線上）に一致すること。
    - 制御点ハンドル `dragmove` 中に `ArrowLineNode` が 3 点折れ線ではなく分割ベジェ点数（`> 6` 要素）でハンドル位置を通過すること。
    - 波線（`arrowType: 'dribble'`）の終点 `dragmove` 中も波線頂点列（`> 4` 要素）が維持されること。
    - 矢印本体 `ArrowLineNode` の `dragmove` 中にハンドル座標が `(dxPx, dyPx)` 分追従すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/annotations/ArrowObject.tsx src/features/tactical-unified/core/components/annotations/arrow-line-node.tsx src/features/tactical-unified/__tests__/arrow-object-interaction.test.tsx`

### Phase 4: `ZoneShapeNode` / `useZoneShape` / `zone-geometry` の回転連動・変形確定修正

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/zones/ZoneShapeNode.tsx` (L18-L130)
  - `[MODIFY]` `src/features/tactical-unified/core/components/zones/use-zone-shape.ts` (L14-L104)
  - `[MODIFY]` `src/features/tactical-unified/core/components/zones/zone-geometry.ts` (L58-L94)
  - `[MODIFY]` `src/features/tactical-unified/__tests__/zone-object-components.test.ts` (L33-L248)
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/compiler/scene-graph-dto.ts`
- **Contract**:
  ```ts
  export interface UseZoneShapeParams {
    zone: ZoneAnnotation;
    stageSize: { width: number; height: number };
    isSelected: boolean;
    updateZone: (zoneId: string, patch: Partial<ZoneAnnotation>) => void;
    nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
    resolvedWidthPx?: number;
    resolvedHeightPx?: number;
    resolvedRotationDeg?: number;
  }
  ```
  - 振る舞い仕様・境界条件:
    1. `ZoneShapeNode` の `Transformer` は `rotateEnabled={false}`（上部ロリポップなし・四隅 `⇔` リサイズ専用）を維持し、`onTransformStart` で `setIsDragging(true); setIsHudOpen(false);`、`onTransformEnd` で `rawHandleTransformEnd()` 後に `setIsDragging(false); setIsHudOpen(true);` を実行する。
    2. `useZoneShape` は `effectivePxW = resolvedWidthPx ?? pxW`、`effectivePxH = resolvedHeightPx ?? pxH` を `handleDragEnd` / `handleTransformEnd` で使用し、`isSelected` 中に `effectivePxW / effectivePxH / resolvedRotationDeg / resolvedZone` が変化したら `transformerRef.current?.forceUpdate()` と `batchDraw()` で選択枠を同期する。
    3. `computeTransformedZonePatch`（`zone-geometry.ts`）は `width > 0 && height > 0` をガードし、`{ x, y, width, height, rotation: Number.isFinite(rot) ? rot : 0 }` のみを返す（`points` 配列は返さない）。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/__tests__/zone-object-components.test.ts`:
    - `computeTransformedZonePatch`: 回転角 `45`・`scaleX/Y` 変形後に `rotation: 45` と正規化座標・サイズを返し、`points` プロパティを含まないこと。
    - `ZoneShapeNode`: `isSelected={true}` 時に `Transformer` が `rotateEnabled === false` かつ 8 アンカー付きで接続され、`resolvedZone.rotationDeg` 更新時に角度が反映されること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/zones/ZoneShapeNode.tsx src/features/tactical-unified/core/components/zones/use-zone-shape.ts src/features/tactical-unified/core/components/zones/zone-geometry.ts src/features/tactical-unified/__tests__/zone-object-components.test.ts`

### Phase 5: 四隅外側ホバー回転（カーソル表示・座標整合・Hot State 回転）修正

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/utils/canvas-zone-rotation-helpers.ts` (L45-L142)
  - `[MODIFY]` `src/features/tactical-unified/core/hooks/use-canvas-zone-rotation.ts` (L15-L176)
  - `[MODIFY]` `src/features/tactical-unified/core/hooks/use-canvas-pointer-interaction.ts` (L54-L123)
  - `[MODIFY]` `src/features/tactical-unified/core/hooks/__tests__/use-canvas-pointer.test.ts` (L1-L283)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/utils/geometry.ts`
  - `src/features/tactical-unified/core/utils/canvas-pointer-dispatcher.ts`
- **Contract**:
  ```ts
  // checkCornerRotateZone: ゾーンの回転ローカル座標 (lx, ly) へ変換し、
  // 枠内 (ax <= hw && ay <= hh) を除外し、四隅外側近傍 (dist in [7, 28] かつ ax >= hw - 8 && ay >= hh - 8) のみ true
  export function updateRotateCursor(
    container: HTMLDivElement | null,
    isOver: boolean,
    stageContainer?: HTMLDivElement | null,
  ): void;
  ```
  - 振る舞い仕様・境界条件:
    1. `useCanvasPointerInteraction` は `e.target` が `Transformer` 配下または `_anchor` 名を含む場合 `isAnchor = true` として `zoneRotation.handlePointerDown` / `handlePointerMove` へ渡し、`e.target.getStage?.()?.container?.() ?? null` を `stageContainer` として渡す。
    2. `useCanvasZoneRotation` は `pointerToNormalizedCoord(pixelPos, vRect, { allowOverflow: true, transform: activeSlide?.pitchTransform })` からピッチローカル座標 `(norm.x / 100 * vRect.width, norm.y / 100 * vRect.height)` を算出して `checkCornerRotateZone` と中心角度計算に使う（`vRect.x/y` 余白・ズーム・パンずれを解消）。
    3. `updateRotateCursor` は `isOver` 時 `container` と `stageContainer` 両方へ `ROTATE_CURSOR` を設定し、`!isOver` 時は `cursor.includes('data:image/svg+xml')` の要素のみ `'default'` へ戻す（`Transformer` の `⇔` リサイズカーソルを絶対に上書きしない）。
    4. `handlePointerMove` 中は `setActiveZoneRotation({ zoneId: selectedZone.id, rotationDeg: newRot })` のみ更新し、`handlePointerUp` で `setActiveZoneRotation(null)` 後に `dispatchSlide(..., { type: 'UPDATE_ZONE', id: selectedZone.id, patch: { rotation: finalRot } })` を 1 回だけ発行する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/hooks/__tests__/use-canvas-pointer.test.ts`（実 `TacticalStoreProvider` 接続）:
    - 選択中 `rect` ゾーンの四隅内側および `isAnchor = true` では `checkCornerRotateZone` / 回転開始せず、四隅外側（例: 右上隅から外側 `+10px, -10px`）で回転開始し、ドラッグ中は `SessionStore.activeZoneRotation` のみ更新され `DocumentStore` は増えず、`pointerUp` で `DocumentStore` の `zone.rotation` が確定更新されること。
    - `vRect` に `{ x: 40, y: 20 }` オフセットがある場合も四隅外側判定と回転中心が正確に一致すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/utils/canvas-zone-rotation-helpers.ts src/features/tactical-unified/core/hooks/use-canvas-zone-rotation.ts src/features/tactical-unified/core/hooks/use-canvas-pointer-interaction.ts src/features/tactical-unified/core/hooks/__tests__/use-canvas-pointer.test.ts`
