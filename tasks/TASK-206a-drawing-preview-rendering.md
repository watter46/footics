# TASK-206a: 作図プレビュー描画のツール別完全解決 (`compileDrawingPreview` + `InteractionPreviewLayer`)

- **Status**: `DONE`
- **Commit**: `fix(tactical): compile and render accurate tool-specific drawing previews`
- **Execution Waves**:
  - Wave 1: Phase 1 (sequential)
  - Wave 2: Phase 2, Phase 3 (parallel after Wave 1)
  - Wave 3: Phase 4 (sequential after Wave 2)
- **Negative Contracts**:
  - `absent: src/features/tactical-unified/core/components/DrawingPreviewLayer.tsx`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. `compileDrawingPreview` は `src/lib/tactical/compiler/`（Context 5）に属し、React / Konva / DOM 依存を持たない純粋関数であること。
  2. ツールバーからゾーン（矩形・楕円・多角形）・各種矢印（実線・破線・波線）・ルート線・直線を作図ドラッグ中、`InteractionPreviewLayer` は白い 2px 仮線ではなく確定後と同等の図形・色・太さ・破線・波線・先端形状でプレビュー描画すること。
  3. `cleanRender={true}` 時は `InteractionPreviewLayer` が `null` を返し、プレビューがエクスポート・再生へ混入しないこと。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `compileDrawingPreview` の第3引数に `style: { readonly color: string; readonly strokeWidth: number }` を追加し、フォールバックの古い白線専用分岐へ落ちないよう `ResolvedZonePrimitive | ResolvedArrowPrimitive | ResolvedDrawingPreview | null` を返す（`InteractionPreviewLayer` とテストを同一タスクで同期更新し、旧 2px 白線パスを残さない）。
  2. ツール別の色・破線・波線・先端記号ルールは `canvas-drawing-factory.ts`（`ARROW_DEFAULTS` と `createZoneBehavior`）と完全一致させる（`zone` / `zone-rect` / `zone_circle` / `zone-ellipse` は `#ef4444` 既定色・`opacity: 0.25`、`arrow_wavy` は `#eab308` 既定色、`route_line` は `#38bdf8` 既定色＋始終点 `dot`）。
  3. 誰からも参照されていないデッドコード `src/features/tactical-unified/core/components/DrawingPreviewLayer.tsx` は `[DELETE]` し、プレビュー描画経路を `compileDrawingPreview` ➔ `InteractionPreviewLayer` の単一パイプラインに統一する。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/core/components/InteractionPreviewLayer.tsx`
  - `src/lib/tactical/__tests__/compile-scene-graph.test.ts`
  - `src/features/tactical-unified/core/components/__tests__/canvas-stage.test.tsx`

## 2. Implementation Phases

### Phase 1: `compileDrawingPreview` のツール別完全解決化
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/compiler/compile-zones.ts` (`compileDrawingPreview`, L1-L20, L103-L125)
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/compiler/scene-graph-dto.ts`
  - `src/lib/tactical/compiler/geometry-primitives.ts`
  - `src/features/tactical-unified/core/utils/canvas-drawing-factory.ts`
- **Contract**:
  ```ts
  // src/lib/tactical/compiler/compile-zones.ts
  export type CompiledDrawingPreview =
    | ResolvedArrowPrimitive
    | ResolvedZonePrimitive
    | ResolvedDrawingPreview;

  export function compileDrawingPreview(
    drawingPreview: DrawingPreviewInput | null | undefined,
    viewport: StageViewport,
    style: { readonly color: string; readonly strokeWidth: number },
  ): CompiledDrawingPreview | null;
  ```
  - 振る舞い仕様・境界条件:
    1. `drawingPreview == null` のときは `null` を返す。
    2. **矩形/楕円ゾーン** (`zone`, `zone-rect`, `zone_circle`, `zone-ellipse`):
       - `resolvedColor = style.color && style.color !== '#ffffff' ? style.color : '#ef4444'`
       - `xPx = Math.min(startPx.x, currentPx.x)`, `yPx = Math.min(startPx.y, currentPx.y)`, `widthPx = Math.abs(currentPx.x - startPx.x)`, `heightPx = Math.abs(currentPx.y - startPx.y)`
       - `shapeType` は `'zone_circle' | 'zone-ellipse'` なら `'ellipse'`、それ以外は `'rect'`。`opacity: 0.25`, `color: resolvedColor`, `strokeColor: resolvedColor`, `strokeWidthPx: Math.max(1.5, Math.round(style.strokeWidth * scale))`, `visible: true` の `ResolvedZonePrimitive` を返す。
    3. **ポリゴンゾーン** (`polygon_zone`):
       - `polygonPoints` と（末尾が未重複なら）`currentPoint` を `screenNormToStagePixel` 変換して `flatPointsPx` とし、`shapeType: 'polygon'`, `color: resolvedColor`, `opacity: 0.25`, `strokeColor: resolvedColor`, `strokeWidthPx: 2`, `visible: true` の `ResolvedZonePrimitive` を返す。
    4. **矢印・直線系** (`line`, `route_line`, `arrow_solid`, `arrow-straight`, `pass`, `arrow`, `arrow_dash`, `arrow-curved`, `arrow_wavy`, `dribble`):
       - `computeArrowDimensions(viewport.width, style.strokeWidth)` で `strokeWidth` / `pointerLength` / `pointerWidth` / `dotRadius` を算出する。
       - 既定色フォールバック（`style.color === '#ffffff' || !style.color` 時）: `route_line` は `'#38bdf8'`、`arrow_wavy` は `'#eab308'`、その他は `style.color || '#ffffff'`。
       - `arrow_wavy` / `dribble`: `generateWavyLinePoints(startPx.x, startPx.y, currentPx.x, currentPx.y)` を `flatPointsPx` とし、`endMarker: 'arrow'`、`dashArrayPx: tool === 'dribble' ? [6, 4] : []`。
       - `arrow_dash` / `arrow-curved`: 直線 `[startPx.x, startPx.y, currentPx.x, currentPx.y]`、`dashArrayPx: [6, 4]`、`endMarker: 'arrow'`。
       - `arrow_solid` / `arrow-straight` / `pass` / `arrow`: 直線、`dashArrayPx: []`、`endMarker: 'arrow'`。
       - `route_line`: 直線、`startMarker: 'dot'`、`endMarker: 'dot'`。
       - `line`: 直線、`startMarker: 'none'`、`endMarker: 'none'`。
       - 上記以外の未知ツールのみ従来の `ResolvedDrawingPreview` を返す。
- **Concrete Test Cases**:
  - Phase 3 の `compile-scene-graph.test.ts` で検証。
- **Verification**:
  - `bun run ai:check src/lib/tactical/compiler/compile-zones.ts`

### Phase 2: `InteractionPreviewLayer` の描画対応 ＆ 旧 `DrawingPreviewLayer.tsx` 削除
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/InteractionPreviewLayer.tsx` (L1-L185)
  - `[DELETE]` `src/features/tactical-unified/core/components/DrawingPreviewLayer.tsx`
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/compiler/scene-graph-dto.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `InteractionPreviewLayer` は `useSessionStore((s) => s.color)` と `useSessionStore((s) => s.strokeWidth)` を購読し、`compileDrawingPreview(drawingPreview, { width: pw, height: ph }, { color, strokeWidth })` を呼び出す。
    2. `isZonePrimitive(preview)` の描画:
       - `ellipse`: `<Ellipse x={...} y={...} radiusX={...} radiusY={...} fill={preview.color} opacity={preview.opacity} stroke={preview.strokeColor} strokeWidth={preview.strokeWidthPx} dash={[4, 4]} listening={false} perfectDrawEnabled={false} />`
       - `rect`: `<KonvaRect x={...} y={...} width={...} height={...} fill={preview.color} opacity={preview.opacity} stroke={preview.strokeColor} strokeWidth={preview.strokeWidthPx} dash={[4, 4]} cornerRadius={4} listening={false} perfectDrawEnabled={false} />`
       - `polygon`: `<Line points={[...(preview.flatPointsPx ?? [])]} stroke={preview.strokeColor} strokeWidth={preview.strokeWidthPx} closed={false} listening={false} />`
    3. `isArrowPrimitive(preview)` の描画:
       - `preview.endMarker === 'arrow'`: `react-konva` の `<Arrow points={[...preview.flatPointsPx]} stroke={preview.color} fill={preview.color} strokeWidth={preview.strokeWidthPx} dash={...} pointerLength={preview.pointerLengthPx} pointerWidth={preview.pointerWidthPx} opacity={preview.opacity} lineCap="round" lineJoin="round" listening={false} perfectDrawEnabled={false} />`
       - `preview.endMarker === 'dot'`: `<Group listening={false}>` 内に `<Line>` と始点・終点の `<Circle radius={preview.dotRadiusPx} stroke={preview.color} strokeWidth={2} fill="transparent" />`
       - それ以外（`line`）: `<Line>`
- **Concrete Test Cases**:
  - Phase 4 の `canvas-stage.test.tsx` で検証。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/InteractionPreviewLayer.tsx`

### Phase 3: `compile-scene-graph.test.ts` のプレビュー単体テスト拡充
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/__tests__/compile-scene-graph.test.ts` (`compileDrawingPreview`, L234-L260)
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `compileDrawingPreview` 呼び出し箇所へ `{ color: '#ef4444', strokeWidth: 3 }` 等の `style` 引数を渡すよう更新し、各ツールの戻り値型と幾何値を検証する。
- **Concrete Test Cases**:
  - `src/lib/tactical/__tests__/compile-scene-graph.test.ts`（純粋関数 I/O テスト）:
    - `case 1`: `tool: 'zone'` (`(10,10) -> (30,40)` in `1000x500`) ➔ `shapeType === 'rect'`, `xPx === 100`, `yPx === 50`, `widthPx === 200`, `heightPx === 150`, `opacity === 0.25`。
    - `case 2`: `tool: 'zone_circle'` ➔ `shapeType === 'ellipse'` として同一矩形が解決される。
    - `case 3`: `tool: 'arrow_wavy'` (`color: '#ffffff'`) ➔ `endMarker === 'arrow'`, `color === '#eab308'`, `flatPointsPx.length > 4`（波線頂点）。
    - `case 4`: `tool: 'route_line'` (`color: '#ffffff'`) ➔ `startMarker === 'dot'`, `endMarker === 'dot'`, `color === '#38bdf8'`。
    - `case 5`: `compileDrawingPreview(null, viewport, { color: '#ffffff', strokeWidth: 2 })` ➔ `null`。
- **Verification**:
  - `bun run ai:check src/lib/tactical/__tests__/compile-scene-graph.test.ts`

### Phase 4: `canvas-stage.test.tsx` の `InteractionPreviewLayer` 実描画テスト更新
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/__tests__/canvas-stage.test.tsx` (L165-L270)
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `InteractionPreviewLayer` が `zone` / `zone-rect` で `Konva.Rect`、`zone_circle` で `Konva.Ellipse`、`pass` / `arrow` で `Konva.Arrow`、`route_line` で `Konva.Line` + 2個の `Konva.Circle` を実際に描画することを `TacticalStoreProvider` 接続で検証する（`Rect` と `Line` を `||` で混ぜる曖昧なアサーションを排除）。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/components/__tests__/canvas-stage.test.tsx`（実 `TacticalStoreProvider` + `Konva.Stage` 接続）:
    - `case 1`: `tool: 'zone-rect'` ➔ `stage.find('Rect').length === 1` かつ `x === 80`, `y === 45`, `width === 120`, `height === 90`（`800x450` 時）。
    - `case 2`: `tool: 'zone_circle'` ➔ `stage.find('Ellipse').length === 1`。
    - `case 3`: `tool: 'arrow'` ➔ `stage.find('Arrow').length === 1`（単なる白 `Line` にフォールバックしない）。
    - `case 4`: `tool: 'route_line'` ➔ `stage.find('Line').length === 1` かつ `stage.find('Circle').length === 2`。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/__tests__/canvas-stage.test.tsx`
