# TASK-207: RouteLine のデフォルト実線化・両端丸描画・線端オフセット修正

- **Status**: `DONE`
- **Commit**: `fix(tactical): fix route_line solid default, dual dot markers, and endpoint offset`
- **Execution Waves**:
  - Wave 1: Phase 1 (DTO・幾何計算・矢印コンパイラ)
  - Wave 2: Phase 2, Phase 3, Phase 4 (parallel after Wave 1)
  - Wave 3: Phase 5 (sequential after Wave 4)
- **Negative Contracts**:
  - `rg: arrow\.arrowType === 'run' \|\| arrow\.arrowType === 'route_line'`
  - `rg: const isDotEnd = resolvedArrow\.endMarker === 'dot'`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. `route_line` はデフォルトで実線（`dashArray: []` ➔ `dashArrayPx: []`）とし、`dashArray` に値が設定された場合のみ点線描画する。`run` タイプのデフォルト点線は維持する。
  2. `startMarker === 'dot'` / `endMarker === 'dot'` の丸中心座標（`startMarkerPointPx` / `endMarkerPointPx`）と、丸外周で止めた線本体端点（`flatPointsPx` の始点・終点）を明確に分離し、Konva・Canvas2D・作図プレビューの全てで丸の中に線が入らないようにする。
  3. 過去に `startMarker: 'none'` かつ `arrowType: 'route_line'` で保存されたプロジェクトデータも、ACL 正規化で両端丸（`startMarker: 'dot'`）に補正する。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `offsetArrowEndpoints` は線端座標（`startX, startY, endX, endY`）と丸マーカー中心座標（`startMarkerX, startMarkerY, endMarkerX, endMarkerY`）の両方を返す（`marker === 'dot'` のとき、自由配置なら中心オフセット 0・線端オフセット `dotRadius`、選手接続なら中心オフセット `playerRadius + dotRadius`・線端オフセット `playerRadius + dotRadius * 2`）。2点間距離が合計線端オフセット以下の場合は線分長を 0 にクランプして逆転を防ぐ。
  2. `ArrowObject` / `ArrowHeadNode` における `isDotEnd` による両側無条件描画を廃止し、`hasStartDot = startMarker === 'dot'` と `hasEndDot = endMarker === 'dot'` を独立判定する。
- **Consumers (同期更新対象)**:
  - `src/lib/tactical/compiler/compile-arrows.ts`
  - `src/lib/tactical/compiler/compile-zones.ts`
  - `src/lib/tactical/export/scene-graph-canvas2d-rasterizer.ts`
  - `src/features/tactical-unified/core/utils/canvas-drawing-factory.ts`
  - `src/features/tactical-unified/core/components/annotations/ArrowObject.tsx`
  - `src/features/tactical-unified/core/components/annotations/arrow-head-node.tsx`
  - `src/features/tactical-unified/core/components/InteractionPreviewLayer.tsx`
  - `src/features/tactical-unified/core/utils/drag-konva-sync.ts`

## 2. Implementation Phases

### Phase 1: 矢印プリミティブ DTO・線端オフセット・矢印コンパイラ修正
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/compiler/scene-graph-dto.ts` (L22-L43)
  - `[MODIFY]` `src/lib/tactical/compiler/geometry-primitives.ts` (L121-L186)
  - `[MODIFY]` `src/lib/tactical/compiler/compile-arrows.ts` (L69-L242)
  - `[ADD]` `src/lib/tactical/compiler/__tests__/route-line-compiler.test.ts` (~120 lines)
- **Contract**:
  ```ts
  // scene-graph-dto.ts: ResolvedArrowPrimitive へ追加
  readonly startMarkerPointPx?: StagePixelPoint;
  readonly endMarkerPointPx?: StagePixelPoint;

  // geometry-primitives.ts: offsetArrowEndpoints 戻り値拡張
  export function offsetArrowEndpoints(params: OffsetArrowEndpointsParams): {
    readonly startX: number;
    readonly startY: number;
    readonly endX: number;
    readonly endY: number;
    readonly startMarkerX: number;
    readonly startMarkerY: number;
    readonly endMarkerX: number;
    readonly endMarkerY: number;
  };
  ```
  - 振る舞い仕様・境界条件:
    1. `offsetArrowEndpoints` において、`startMarker === 'dot'` の場合、丸中心オフセットは `sourcePlayerRadius > 0 ? sourcePlayerRadius + dotRadius : 0`、線端オフセットは `sourcePlayerRadius > 0 ? sourcePlayerRadius + dotRadius * 2 : dotRadius` とする。`endMarker === 'dot'` も対称に計算する。
    2. 2点間距離 `totalDist` に対し `startLineOffset + endLineOffset >= totalDist` の場合は線端同士が交差・逆転しないよう中点へクランプする。
    3. `compileArrows` で `arrow.arrowType === 'route_line'` を点線フォールバック分岐から除外し、`dashArray` が空なら `dashArrayPx: []`（実線）を返す。
    4. `compileArrows` で `offsetRes.startMarkerX/Y` と `offsetRes.endMarkerX/Y` を `projectStagePixelWithPitchTransform` で投影し `startMarkerPointPx` / `endMarkerPointPx` に格納する。
- **Concrete Test Cases**:
  - `route-line-compiler.test.ts`（純粋関数 I/O テスト）:
    - `case 1`: `arrowType: 'route_line'`, `dashArray: []` のとき `dashArrayPx` が `[]` になること。
    - `case 2`: `arrowType: 'route_line'`, `dashArray: [6, 4]` のとき `dashArrayPx` がスケール済み点線配列になること。
    - `case 3`: `startMarker: 'dot'`, `endMarker: 'dot'`（選手未接続）で `startMarkerPointPx` / `endMarkerPointPx` が元座標と一致し、`flatPointsPx` の始点・終点がそれぞれ内側へ `dotRadiusPx` 分だけ離れていること。
    - `case 4`: 選手接続時に丸中心が `playerRadius + dotRadius`、線端が `playerRadius + dotRadius * 2` に配置され、短距離でも線端が逆転しないこと。
- **Verification**:
  - `bun run ai:check src/lib/tactical/compiler/scene-graph-dto.ts src/lib/tactical/compiler/geometry-primitives.ts src/lib/tactical/compiler/compile-arrows.ts src/lib/tactical/compiler/__tests__/route-line-compiler.test.ts`

### Phase 2: 作図確定ファクトリ & 既存ファクトリテスト同期
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/utils/canvas-drawing-factory.ts` (L155-L235)
  - `[MODIFY]` `src/features/tactical-unified/core/utils/__tests__/canvas-drawing-factory.test.ts` (L59-L80)
- **Contract**:
  ```ts
  // canvas-drawing-factory.ts: ArrowCfg へ第7要素 startMarker（省略時 'none'）を追加
  type ArrowCfg = [
    kind: PreviewShapeKind,
    type: DomainArrowAnnotation['arrowType'],
    dash: number[],
    end: DomainArrowAnnotation['endMarker'],
    color?: string,
    curve?: boolean,
    start?: DomainArrowAnnotation['startMarker'],
  ];
  ```
  - 振る舞い仕様・境界条件:
    1. `ARROW_DEFAULTS.route_line` は `startMarker: 'dot'`, `endMarker: 'dot'`, `dashArray: []` で `addArrow` を呼び出すこと。
    2. 他のツール（`line`, `pass`, `arrow_dash`, `arrow_wavy` 等）は従来通り `startMarker: 'none'` を維持すること。
- **Concrete Test Cases**:
  - `canvas-drawing-factory.test.ts`:
    - `case 1`: `tool: 'route_line'` の `commitDrawingShape` 呼び出しで `startMarker: 'dot'`, `endMarker: 'dot'`, `dashArray: []` で保存されること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/utils/canvas-drawing-factory.ts src/features/tactical-unified/core/utils/__tests__/canvas-drawing-factory.test.ts`

### Phase 3: 作図プレビュー・ACL 正規化・Canvas2D ラスタライザ修正
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/compiler/compile-zones.ts` (L198-L255)
  - `[MODIFY]` `src/lib/tactical/acl/arrow-normalizer.ts` (L55-L135)
  - `[MODIFY]` `src/lib/tactical/export/scene-graph-canvas2d-rasterizer.ts` (L96-L160)
  - `[ADD]` `src/lib/tactical/export/__tests__/route-line-rasterizer.test.ts` (~110 lines)
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `compileDrawingPreview` (`dp.tool === 'route_line'`): `offsetArrowEndpoints` を使って線分 `flatPointsPx` を `dotRadiusPx` 分内側へオフセットし、`startMarkerPointPx: startPx`, `endMarkerPointPx: currentPx` を設定する。
    2. `normalizeArrows`: `arrowType === 'route_line'` かつ `a.startMarker` が未指定または `'none'` かつ `endMarker === 'dot'` の過去データに対して、`startMarker` を `'dot'` へ正規化する。
    3. `renderArrow`: `endMarker === 'dot'` 時は `arrow.endMarkerPointPx ?? arrow.endPointPx`、`startMarker === 'dot'` 時は `arrow.startMarkerPointPx ?? arrow.startPointPx` を中心に `ctx.arc(..., arrow.dotRadiusPx, 0, Math.PI * 2)` を描画する。
- **Concrete Test Cases**:
  - `route-line-rasterizer.test.ts`:
    - `case 1`: `normalizeArrows` が旧データ（`arrowType: 'route_line', startMarker: 'none', endMarker: 'dot'`）を読み込んだとき `startMarker: 'dot'` へ補正すること。
    - `case 2`: `compileDrawingPreview` (`tool: 'route_line'`) の線分始点・終点が `startMarkerPointPx` / `endMarkerPointPx` から `dotRadiusPx` 分内側にあること。
    - `case 3`: `rasterizeSceneGraphToCanvas2D` で両端 `dot` の矢印を描画したとき、`arc` が `startMarkerPointPx` と `endMarkerPointPx` の両方の座標で 2 回呼ばれること。
- **Verification**:
  - `bun run ai:check src/lib/tactical/compiler/compile-zones.ts src/lib/tactical/acl/arrow-normalizer.ts src/lib/tactical/export/scene-graph-canvas2d-rasterizer.ts src/lib/tactical/export/__tests__/route-line-rasterizer.test.ts`

### Phase 4: Konva View (`ArrowObject` / `ArrowHeadNode` / `InteractionPreviewLayer` / `drag-konva-sync`) 修正
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/annotations/arrow-head-node.tsx` (L5-L58)
  - `[MODIFY]` `src/features/tactical-unified/core/components/annotations/ArrowObject.tsx` (L90-L253)
  - `[MODIFY]` `src/features/tactical-unified/core/components/InteractionPreviewLayer.tsx` (L130-L185)
  - `[MODIFY]` `src/features/tactical-unified/core/utils/drag-konva-sync.ts` (L160-L215)
- **Contract**:
  ```ts
  // arrow-head-node.tsx: 片側のみの dot 指定に対応
  export interface ArrowHeadNodeProps {
    hasStartDot: boolean;
    hasEndDot: boolean;
    startDotRef: React.RefObject<Konva.Circle | null>;
    endDotRef: React.RefObject<Konva.Circle | null>;
    startDotPx: { x: number; y: number };
    endDotPx: { x: number; y: number };
    color: string;
    strokeWidth: number;
    dotRadius: number;
  }
  ```
  - 振る舞い仕様・境界条件:
    1. `ArrowHeadNode` は `hasStartDot` が true のときのみ始点 `<Circle>`、`hasEndDot` が true のときのみ終点 `<Circle>` を描画する。
    2. `ArrowObject` は `startMarkerPointPx ?? startPointPx` と `endMarkerPointPx ?? endPointPx` を `ArrowHeadNode` へ渡し、ハンドル移動中 (`handleHandleDragMove`) も `offsetArrowEndpoints` を通じて線分を丸外周で止め、丸中心をハンドル位置へ同期する。
    3. `InteractionPreviewLayer` は `preview.startMarker === 'dot'` / `preview.endMarker === 'dot'` に応じて `startMarkerPointPx ?? startPointPx` / `endMarkerPointPx ?? endPointPx` に丸を描画する。
    4. `drag-konva-sync.ts` で選手追従矢印を更新する際、`startDotNode` / `endDotNode` には `offset.startMarkerX/Y`, `offset.endMarkerX/Y` を設定する。
- **Concrete Test Cases**:
  - Phase 5 の結合コンポーネントテストで一括検証する。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/annotations/arrow-head-node.tsx src/features/tactical-unified/core/components/annotations/ArrowObject.tsx src/features/tactical-unified/core/components/InteractionPreviewLayer.tsx src/features/tactical-unified/core/utils/drag-konva-sync.ts`

### Phase 5: RouteLine Konva 描画統合テスト
- **Target Files**:
  - `[ADD]` `src/features/tactical-unified/core/components/__tests__/route-line-rendering.test.tsx` (~130 lines)
- **Contract**:
  - `ArrowObject` と `compileArrows` を接続し、RouteLine の丸中心と線端が分離されていること、片側のみの `dot` 指定が片側だけ描画されること、デフォルト実線・オプション点線切り替えが反映されることを検証する。
- **Concrete Test Cases**:
  - `route-line-rendering.test.tsx`（内部 `vi.mock` 禁止）:
    - `case 1`: `compileArrows` 出力を `ArrowObject` に渡したとき、始点・終点の 2 つの `<Circle>` が `startMarkerPointPx` / `endMarkerPointPx` に配置され、`Arrow` の `points` 始点・終点が `dotRadiusPx` 分だけ離れていること。
    - `case 2`: `startMarker: 'none', endMarker: 'dot'` を渡したとき、`Circle` は 1 つ（終点のみ）描画されること。
    - `case 3`: `dashArray: []` なら `Arrow` の `dash` が undefined（実線）、`dashArray: [6, 4]` なら `dash` が設定されること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/__tests__/route-line-rendering.test.tsx`
