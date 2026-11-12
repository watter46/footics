# TASK-180a: 戦術ボードKonva描画コンポーネントの完全Dumb View化（SceneGraph DTO全面配線）

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-12
- **Target Files**:
  - `src/features/tactical-unified/core/components/zones/ZonePolygonNode.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/zones/ZoneShapeNode.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/PitchGroundLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/__tests__/zone-object-components.test.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/PlayerConnectLines.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/annotations/TextObject.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/__tests__/player-connect-lines.test.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/PlayerMarkerItem.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/__tests__/player-marker-item.test.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/InteractionPreviewLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/canvas-stage.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/__tests__/canvas-stage.test.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. `ZonePolygonNode` および `ZoneShapeNode` が `resolvedZone?: ResolvedZonePrimitive | null` を受け取り、`resolvedZone` がある場合は計算済みピクセル値（`xPx`, `yPx`, `widthPx`, `heightPx`, `rotationDeg`, `flatPointsPx`, `strokeWidthPx`）で描画され、`PitchGroundLayer` から `sceneGraph.zones` の各要素が渡されること。
- [x] 2. `PlayerConnectLines` が `resolvedConnectLines?: readonly ResolvedConnectLinePrimitive[] | null` を受け取り、`resolvedConnectLines` がある場合は `markers` からの座標探索をスキップして `flatPointsPx`, `color`, `strokeWidthPx`, `dashArrayPx` をそのまま描画すること。また `TextObject` が `resolvedText?: ResolvedBillboardTextItem | null` を受け取り、`positionPx`, `fontSizePx`, `opacity` を優先適用すること。
- [x] 3. `PlayerMarkerItem` が `resolvedPlayer?: ResolvedBillboardPlayerItem | null` を受け取り、`positionPx`, `radiusPx`, `opacity` を優先適用し、`BillboardObjectLayer` から `sceneGraph.connectLines` および `sceneGraph.billboardItems`（player / text / ball）が各子コンポーネントへ漏れなく配線されること。
- [x] 4. `InteractionPreviewLayer` が `sceneGraph?: ResolvedSceneGraphDTO | null` を受け取り、`sceneGraph.drawingPreview` が非 null の場合はその解決済みピクセル座標（`ResolvedArrowPrimitive` または `ResolvedZonePrimitive`）でプレビュー図形を描画し、`canvas-stage.tsx` から `sceneGraph` が渡されること。

## 2.5 Architectural Invariants & Why (破壊禁止の前提と設計理由)
<!-- ちゃぶ台返し防止の前提条件と、影響を受ける呼び出し元（Consumers）の同期確認リストを明記する -->
- **Invariants (破壊禁止の不変条件と理由)**:
  1. **Context 6 (Dumb View 原則)**: `.agents/rules/tactical-domain-architecture.md` Section 4.2 に基づき、Konva コンポーネント（Level 2 Domain UI Block）は `compileSceneGraph` が出力した `ResolvedSceneGraphDTO` の計算済みピクセル座標を画面へ転写する Dumb Rasterizer とする。
  2. **単体テストの後方互換フォールバック保護**: 既存の単体テスト等で `sceneGraph` や `resolved*` プロップが省略（`undefined` / `null`）された状態でマウントされた場合は、既存の計算値へ安全にフォールバックし、既存テストを一切破壊しないこと。
  3. **ポリゴン作成中プレビューの保護**: `ZonePolygonNode` で `props.isCreatingThis === true`（マウス追従頂点プレビュー合成中）の場合は既存の `renderPts` を維持し、確定済みポリゴンに対して `resolvedZone.flatPointsPx` を使用すること。
- **Consumers (呼び出し元・別画面の同期確認リスト)**:
  - `src/features/tactical-unified/core/components/canvas-stage.tsx` — `PitchGroundLayer`, `BillboardObjectLayer`, `InteractionPreviewLayer` の3レイヤーすべてに `sceneGraph` を渡す。
  - `src/features/tactical-unified/core/components/PitchGroundLayer.tsx` — `ZoneObject` に `resolvedZone` を渡す。
  - `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx` — `PlayerConnectLines`, `PlayerMarkerItem`, `TextObject`, Ball 描画に `sceneGraph` の各プリミティブを渡す。

## 3. Context Snippets (参照コード・型定義・import)
<!-- Workerが自律探索（Read/Grep）を行わずに実装できるよう、必要な文脈を過不足なく事前注入する -->

### 3.1 Import Specs
```ts
import type {
  ResolvedArrowPrimitive,
  ResolvedBillboardBallItem,
  ResolvedBillboardItem,
  ResolvedBillboardPlayerItem,
  ResolvedBillboardTextItem,
  ResolvedConnectLinePrimitive,
  ResolvedSceneGraphDTO,
  ResolvedZonePrimitive,
} from '@/lib/tactical/compiler/scene-graph-dto';
```

### 3.2 Key Interfaces & Types
```ts
// === src/lib/tactical/compiler/scene-graph-dto.ts ===
export interface ResolvedZonePrimitive {
  readonly id: string;
  readonly shapeType: 'rect' | 'ellipse' | 'polygon';
  readonly xPx?: StagePixel;
  readonly yPx?: StagePixel;
  readonly widthPx?: number;
  readonly heightPx?: number;
  readonly rotationDeg?: number;
  readonly flatPointsPx?: readonly number[];
  readonly color: string;
  readonly opacity: number;
  readonly strokeColor: string;
  readonly strokeOpacity: number;
  readonly strokeWidthPx: number;
  readonly visible: boolean;
  readonly selected: boolean;
}

export interface ResolvedConnectLinePrimitive {
  readonly id: string;
  readonly fromPlayerId: string;
  readonly toPlayerId: string;
  readonly flatPointsPx: readonly [number, number, number, number];
  readonly color: string;
  readonly strokeWidthPx: number;
  readonly dashArrayPx: readonly number[];
  readonly visible: boolean;
}

export interface ResolvedBillboardPlayerItem {
  readonly kind: 'player';
  readonly id: string;
  readonly positionPx: StagePixelPoint;
  readonly radiusPx: number;
  readonly depthSortKey: number;
  readonly opacity: number;
  readonly visible: boolean;
  readonly selected: boolean;
  readonly player: PitchPlayer;
  readonly rippleRingsPx: readonly {
    readonly radiusPx: number;
    readonly opacity: number;
    readonly color: string;
  }[];
  readonly visionCone?: ResolvedVisionConeDTO | null;
  readonly focus?: ResolvedPlayerFocusDTO | null;
}

export interface ResolvedBillboardBallItem {
  readonly kind: 'ball';
  readonly positionPx: StagePixelPoint;
  readonly radiusPx: number;
  readonly depthSortKey: number;
  readonly opacity: number;
  readonly visible: boolean;
  readonly color?: string;
}

export interface ResolvedBillboardTextItem {
  readonly kind: 'text';
  readonly id: string;
  readonly positionPx: StagePixelPoint;
  readonly depthSortKey: number;
  readonly content: string;
  readonly fontSizePx: number;
  readonly color: string;
  readonly bold: boolean;
  readonly italic: boolean;
  readonly opacity: number;
  readonly visible: boolean;
  readonly selected: boolean;
}

export interface ResolvedSceneGraphDTO {
  readonly viewport: StageViewport;
  readonly zones: readonly ResolvedZonePrimitive[];
  readonly arrows: readonly ResolvedArrowPrimitive[];
  readonly trajectories: readonly ResolvedTrajectoryGhost[];
  readonly connectLines: readonly ResolvedConnectLinePrimitive[];
  readonly billboardItems: readonly ResolvedBillboardItem[];
  readonly drawingPreview: ResolvedArrowPrimitive | ResolvedZonePrimitive | null;
}
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```tsx
// === src/features/tactical-unified/core/components/PitchGroundLayer.tsx:169-182 ===
const resolvedArrow =
  sceneGraph?.arrows.find((a) => a.id === arrow.id) ?? null;
return (
  <ArrowObject
    key={arrow.id}
    arrow={arrow}
    resolvedArrow={resolvedArrow}
    // ...
  />
);
```

## 4. Implementation Phases (Worker 実装手順)
<!-- 1 Phase あたりプロダクション 2〜3 ファイル以下に分割し、Worker 負荷を最小化 -->

### Phase 1: Zone 描画（`ZonePolygonNode`, `ZoneShapeNode`, `PitchGroundLayer`）の `ResolvedZonePrimitive` 駆動化
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/core/components/zones/ZonePolygonNode.tsx`, `src/features/tactical-unified/core/components/zones/ZoneShapeNode.tsx`, `src/features/tactical-unified/core/components/PitchGroundLayer.tsx`, `src/features/tactical-unified/__tests__/zone-object-components.test.ts`
- **契約 (Exact Contract & Formula)**:
  ```ts
  // 1. src/features/tactical-unified/core/components/zones/ZonePolygonNode.tsx
  export interface ZoneNodeProps {
    // 既存フィールドを維持したまま追加:
    resolvedZone?: ResolvedZonePrimitive | null;
  }
  // ZonePolygonNode 内:
  const effectivePoints =
    !props.isCreatingThis &&
    props.resolvedZone?.flatPointsPx &&
    props.resolvedZone.flatPointsPx.length >= 4
      ? [...props.resolvedZone.flatPointsPx]
      : renderPts;
  const effectiveStrokeWidth = props.resolvedZone?.strokeWidthPx ?? strokeWidth;
  // <Line points={effectivePoints} strokeWidth={isSelected ? effectiveStrokeWidth + 1 : effectiveStrokeWidth} ... />

  // 2. src/features/tactical-unified/core/components/zones/ZoneShapeNode.tsx
  const hasResolvedRect =
    props.resolvedZone != null &&
    props.resolvedZone.xPx !== undefined &&
    props.resolvedZone.yPx !== undefined &&
    props.resolvedZone.widthPx !== undefined &&
    props.resolvedZone.heightPx !== undefined;
  const effectivePxW = hasResolvedRect ? (props.resolvedZone!.widthPx as number) : pxW;
  const effectivePxH = hasResolvedRect ? (props.resolvedZone!.heightPx as number) : pxH;
  const effectiveCx = hasResolvedRect ? (props.resolvedZone!.xPx as number) + effectivePxW / 2 : cx;
  const effectiveCy = hasResolvedRect ? (props.resolvedZone!.yPx as number) + effectivePxH / 2 : cy;
  const effectiveRotation = props.resolvedZone?.rotationDeg ?? rotation;
  const effectiveStrokeWidth = props.resolvedZone?.strokeWidthPx ?? strokeWidth;
  // <Ellipse x={effectiveCx} y={effectiveCy} radiusX={effectivePxW / 2} radiusY={effectivePxH / 2} rotation={effectiveRotation} strokeWidth={isSelected ? effectiveStrokeWidth + 1 : effectiveStrokeWidth} ... />
  // <Rect x={effectiveCx} y={effectiveCy} width={effectivePxW} height={effectivePxH} offsetX={effectivePxW / 2} offsetY={effectivePxH / 2} rotation={effectiveRotation} strokeWidth={isSelected ? effectiveStrokeWidth + 1 : effectiveStrokeWidth} ... />

  // 3. src/features/tactical-unified/core/components/PitchGroundLayer.tsx
  // zones.map((zone) => ...) 内で:
  const resolvedZone = sceneGraph?.zones.find((z) => z.id === zone.id) ?? null;
  // <ZoneObject ... resolvedZone={resolvedZone} />
  ```
- **Testing Strategy (Concrete Test Values)**:
  - `src/features/tactical-unified/__tests__/zone-object-components.test.ts` に以下を追加:
    1. `ZoneShapeNode` (Rect): `resolvedZone = { id: 'z1', shapeType: 'rect', xPx: 120 as StagePixel, yPx: 80 as StagePixel, widthPx: 200, heightPx: 100, rotationDeg: 15, color: '#ef4444', opacity: 0.3, strokeColor: '#ef4444', strokeOpacity: 0.8, strokeWidthPx: 4, visible: true, selected: false }` を渡したとき、`Rect` の props が `x: 220, y: 130, width: 200, height: 100, rotation: 15, strokeWidth: 4` になること。
    2. `ZonePolygonNode`: `resolvedZone = { id: 'zp1', shapeType: 'polygon', flatPointsPx: [50, 60, 150, 60, 150, 160], color: '#3b82f6', opacity: 0.25, strokeColor: '#3b82f6', strokeOpacity: 0.8, strokeWidthPx: 3, visible: true, selected: false }` を渡したとき、`Line` の props が `points: [50, 60, 150, 60, 150, 160], strokeWidth: 3` になること。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/__tests__/zone-object-components.test.ts` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/core/components/zones/ZonePolygonNode.tsx src/features/tactical-unified/core/components/zones/ZoneShapeNode.tsx src/features/tactical-unified/core/components/PitchGroundLayer.tsx src/features/tactical-unified/__tests__/zone-object-components.test.ts` PASS
- **Worker Handoff Log**:
  - `ZoneNodeProps.resolvedZone?: ResolvedZonePrimitive | null` を追加。`ZoneShapeNode` / `ZonePolygonNode` は計算済みピクセル値（cx, cy, pxW, pxH, flatPointsPx, strokeWidthPx）を優先適用し、`ZoneObject` を経由して `PitchGroundLayer` から透過配線完了。

---

### Phase 2: 選手間接続線（`PlayerConnectLines`）とテキスト注釈（`TextObject`）の SceneGraph DTO 駆動化
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/core/components/PlayerConnectLines.tsx`, `src/features/tactical-unified/core/components/annotations/TextObject.tsx`, `src/features/tactical-unified/core/components/__tests__/player-connect-lines.test.tsx`
- **契約 (Exact Contract & Formula)**:
  ```ts
  // 1. src/features/tactical-unified/core/components/PlayerConnectLines.tsx
  export interface PlayerConnectLinesProps {
    // 既存フィールドを維持したまま追加:
    resolvedConnectLines?: readonly ResolvedConnectLinePrimitive[] | null;
  }
  // resolvedConnectLines != null の場合:
  // resolvedConnectLines.filter((cl) => cl.visible).map((cl) => {
  //   const isSelected = selectedIds.includes(cl.id);
  //   return (
  //     <Line
  //       key={cl.id}
  //       ref={(node) => { ... connectLineNodesRef 登録 ... }}
  //       points={[...cl.flatPointsPx]}
  //       stroke={isSelected ? '#60a5fa' : cl.color}
  //       strokeWidth={isSelected ? cl.strokeWidthPx + 1 : cl.strokeWidthPx}
  //       dash={cl.dashArrayPx.length > 0 ? [...cl.dashArrayPx] : undefined}
  //       opacity={isSelected ? 1 : 0.85}
  //       lineCap="round"
  //       hitStrokeWidth={16}
  //       listening={isInteractive}
  //       onClick={(e) => { e.cancelBubble = true; onSelectConnectLine(cl.id, cl.fromPlayerId); }}
  //       onTap={(e) => { e.cancelBubble = true; onSelectConnectLine(cl.id, cl.fromPlayerId); }}
  //     />
  //   );
  // })

  // 2. src/features/tactical-unified/core/components/annotations/TextObject.tsx
  export interface TextObjectProps {
    // 既存フィールドを維持したまま追加:
    resolvedText?: ResolvedBillboardTextItem | null;
  }
  // <KonvaText
  //   x={resolvedText ? resolvedText.positionPx.x : normX(text.x, width)}
  //   y={resolvedText ? resolvedText.positionPx.y : normY(text.y, height)}
  //   fontSize={resolvedText ? resolvedText.fontSizePx : text.fontSize}
  //   opacity={resolvedText ? resolvedText.opacity : 1}
  //   ...
  // />
  ```
- **Testing Strategy (Concrete Test Values)**:
  - `src/features/tactical-unified/core/components/__tests__/player-connect-lines.test.tsx` に以下を追加:
    1. `PlayerConnectLines`: `markers={[]}` でも `resolvedConnectLines={[{ id: 'cl-1', fromPlayerId: 'p1', toPlayerId: 'p2', flatPointsPx: [100, 120, 300, 240], color: '#22c55e', strokeWidthPx: 3, dashArrayPx: [8, 4], visible: true }]}` を渡したとき、`points: [100, 120, 300, 240], stroke: '#22c55e', strokeWidth: 3, dash: [8, 4]` の `Line` が描画され、クリック時に `onSelectConnectLine('cl-1', 'p1')` が呼ばれること。
    2. `TextObject`: `resolvedText={{ kind: 'text', id: 't-1', positionPx: { x: 420 as StagePixel, y: 180 as StagePixel }, depthSortKey: 180, content: 'High Press', fontSizePx: 24, color: '#ffffff', bold: true, italic: false, opacity: 0.85, visible: true, selected: false }}` を渡したとき、`x: 420, y: 180, fontSize: 24, opacity: 0.85` が適用されること。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/core/components/__tests__/player-connect-lines.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/core/components/PlayerConnectLines.tsx src/features/tactical-unified/core/components/annotations/TextObject.tsx src/features/tactical-unified/core/components/__tests__/player-connect-lines.test.tsx` PASS
- **Worker Handoff Log**:
  - `PlayerConnectLinesProps.resolvedConnectLines` と `TextObjectProps.resolvedText` を追加し、DTO 存在時は計算済みピクセル座標・スタイルを優先描画するように配線完了。

---

### Phase 3: 選手マーカー（`PlayerMarkerItem`）と `BillboardObjectLayer` の完全 SceneGraph DTO 配線
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/core/components/PlayerMarkerItem.tsx`, `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx`, `src/features/tactical-unified/core/components/__tests__/player-marker-item.test.tsx`
- **契約 (Exact Contract & Formula)**:
  ```ts
  // 1. src/features/tactical-unified/core/components/PlayerMarkerItem.tsx
  export interface PlayerMarkerItemProps {
    // 既存フィールドを維持したまま追加:
    resolvedPlayer?: ResolvedBillboardPlayerItem | null;
  }
  const effectivePx = resolvedPlayer
    ? { x: resolvedPlayer.positionPx.x, y: resolvedPlayer.positionPx.y }
    : px;
  const effectiveRadius = resolvedPlayer ? resolvedPlayer.radiusPx : radius;
  const effectiveOpacity = resolvedPlayer ? resolvedPlayer.opacity : 1;
  // ルート <Group x={effectivePx.x} y={effectivePx.y} opacity={effectiveOpacity} ...>
  // および内部の PlayerFocusSpotlight / PlayerVisionCone / PlayerMarkerRingFade / PlayerMarkerRing / PlayerMarkerCircle / PlayerMarkerLabel の radius に effectiveRadius を渡す。

  // 2. src/features/tactical-unified/core/components/BillboardObjectLayer.tsx
  // (a) <PlayerConnectLines ... resolvedConnectLines={sceneGraph?.connectLines ?? null} />
  // (b) orderedItems の描画ループ内で:
  //   - item.kind === 'player':
  //     const resolvedPlayer = sceneGraph?.billboardItems.find(
  //       (b): b is ResolvedBillboardPlayerItem => b.kind === 'player' && b.id === item.marker.id,
  //     ) ?? null;
  //     <PlayerMarkerItem ... resolvedPlayer={resolvedPlayer} />
  //   - item.kind === 'text':
  //     const resolvedText = sceneGraph?.billboardItems.find(
  //       (b): b is ResolvedBillboardTextItem => b.kind === 'text' && b.id === item.text.id,
  //     ) ?? null;
  //     <TextObject ... resolvedText={resolvedText} />
  //   - item.kind === 'ball':
  //     const resolvedBall = sceneGraph?.billboardItems.find(
  //       (b): b is ResolvedBillboardBallItem => b.kind === 'ball',
  //     ) ?? null;
  //     ball の座標・半径計算で resolvedBall があれば { x: resolvedBall.positionPx.x, y: resolvedBall.positionPx.y } と resolvedBall.radiusPx を優先使用する。
  ```
- **Testing Strategy (Concrete Test Values)**:
  - `src/features/tactical-unified/core/components/__tests__/player-marker-item.test.tsx` に以下を追加:
    1. `PlayerMarkerItem` に `resolvedPlayer={{ kind: 'player', id: 'p-1', positionPx: { x: 333 as StagePixel, y: 222 as StagePixel }, radiusPx: 28, depthSortKey: 222, opacity: 0.75, visible: true, selected: false, player: ... , rippleRingsPx: [], visionCone: null, focus: null }}` を渡したとき、ルート `Group` の `x` が `333`、`y` が `222`、`opacity` が `0.75` になり、内部マーカーの半径に `28` が適用されること。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/core/components/__tests__/player-marker-item.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/core/components/PlayerMarkerItem.tsx src/features/tactical-unified/core/components/BillboardObjectLayer.tsx src/features/tactical-unified/core/components/__tests__/player-marker-item.test.tsx` PASS
- **Worker Handoff Log**:
  - `PlayerMarkerItemProps.resolvedPlayer` を追加し計算済み座標/半径/不透明度を適用。`BillboardObjectLayer`・`BillboardItemNode` 経由で player/ball/text を配線し、実在する `PitchGroundLayer` に `resolvedConnectLines` を透過接続完了。

---

### Phase 4: 作図プレビュー層（`InteractionPreviewLayer` & `canvas-stage.tsx`）の SceneGraph `drawingPreview` 配線
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/core/components/InteractionPreviewLayer.tsx`, `src/features/tactical-unified/core/components/canvas-stage.tsx`, `src/features/tactical-unified/core/components/__tests__/canvas-stage.test.tsx`
- **契約 (Exact Contract & Formula)**:
  ```tsx
  // 1. src/features/tactical-unified/core/components/InteractionPreviewLayer.tsx
  export interface InteractionPreviewLayerProps {
    // 既存フィールドを維持したまま追加:
    sceneGraph?: ResolvedSceneGraphDTO | null;
  }
  // InteractionPreviewLayer 内:
  // sceneGraph?.drawingPreview が非 null の場合 (const preview = sceneGraph.drawingPreview):
  // - 'shapeType' in preview (ResolvedZonePrimitive) のとき:
  //   - preview.shapeType === 'ellipse':
  //     <Ellipse x={(preview.xPx ?? 0) + (preview.widthPx ?? 0) / 2} y={(preview.yPx ?? 0) + (preview.heightPx ?? 0) / 2} radiusX={(preview.widthPx ?? 0) / 2} radiusY={(preview.heightPx ?? 0) / 2} fill={preview.color} opacity={preview.opacity} stroke={preview.strokeColor} strokeWidth={preview.strokeWidthPx} listening={false} />
  //   - preview.shapeType === 'rect':
  //     <Rect x={preview.xPx ?? 0} y={preview.yPx ?? 0} width={preview.widthPx ?? 0} height={preview.heightPx ?? 0} fill={preview.color} opacity={preview.opacity} stroke={preview.strokeColor} strokeWidth={preview.strokeWidthPx} listening={false} />
  //   - preview.shapeType === 'polygon':
  //     <Line points={[...(preview.flatPointsPx ?? [])]} stroke={preview.strokeColor} strokeWidth={preview.strokeWidthPx} closed={false} listening={false} />
  // - それ以外 (ResolvedArrowPrimitive) のとき:
  //   <Line points={[...preview.flatPointsPx]} stroke={preview.color} strokeWidth={preview.strokeWidthPx} dash={preview.dashArrayPx.length > 0 ? [...preview.dashArrayPx] : undefined} opacity={preview.opacity} lineCap="round" lineJoin="round" listening={false} />
  // sceneGraph?.drawingPreview == null の場合は既存の <DrawingPreviewLayer pitchRect={pitchRect} /> にフォールバックする。

  // 2. src/features/tactical-unified/core/components/canvas-stage.tsx
  // CanvasStageInner 内の <InteractionPreviewLayer ... sceneGraph={sceneGraph} /> に sceneGraph を渡す。
  ```
- **Testing Strategy (Concrete Test Values)**:
  - `src/features/tactical-unified/core/components/__tests__/canvas-stage.test.tsx` に以下を追加:
    1. `InteractionPreviewLayer` に `sceneGraph`（`drawingPreview` に `flatPointsPx: [100, 100, 250, 200], color: '#f59e0b', strokeWidthPx: 3, dashArrayPx: [6, 4], opacity: 0.8` を持つ `ResolvedArrowPrimitive`）を渡したとき、`<Line points={[100, 100, 250, 200]} stroke="#f59e0b" strokeWidth={3} />` が描画されること。
    2. `drawingPreview` に `shapeType: 'rect', xPx: 50 as StagePixel, yPx: 60 as StagePixel, widthPx: 120, heightPx: 80, color: '#ef4444', opacity: 0.3, strokeColor: '#ef4444', strokeWidthPx: 2` を持つ `ResolvedZonePrimitive` を渡したとき、`<Rect x={50} y={60} width={120} height={80} />` が描画されること。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/core/components/__tests__/canvas-stage.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/core/components/InteractionPreviewLayer.tsx src/features/tactical-unified/core/components/canvas-stage.tsx src/features/tactical-unified/core/components/__tests__/canvas-stage.test.tsx` PASS
- **Worker Handoff Log**:
  - `InteractionPreviewLayerProps` に `sceneGraph?: PreviewSceneGraph | null` を追加。`sceneGraph.drawingPreview` の `shapeType`（ellipse/rect/polygon）および arrow 描画をサポートし、null 時は既存の `renderDrawingPreviewNode` に安全にフォールバック。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-12 16:28
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. ドメイン論理 & 要件網羅性 & テスタビリティ: 数式/座標/状態遷移の整合性、受入要件の全網羅、Concrete Test Values検証、ハック排除
  - [x] 2. Invariants保護 & Consumer同期: Section 2.5 の不変条件（ちゃぶ台返し防止）遵守、別画面・呼び出し元（Consumers）の更新漏れゼロ
  - [x] 3. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 4. 設計負債 & サイレント破壊防止: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、公開シグネチャ保護、指示外変更の排除
- **Summary**:
  `ResolvedSceneGraphDTO` による Konva レイヤー（ZonePolygon/ZoneShape, PlayerConnectLines, TextObject, PlayerMarkerItem, BallObject, InteractionPreviewLayer）の完全 Dumb View 化を確認。フォールバックによる後方互換性とポリゴン作成中プレビューの保護（Invariants）が徹底され、幽霊パイプラインやホスト境界違反のない堅牢な実装です。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
