# TASK-198b: PlayerMarkerItem / PlayerConnectLines / Drag ハンドラ Dumb View 化 & テスト移行

- **Status**: `DONE`
- **Commit**: `refactor(tactical): convert PlayerMarkerItem, PlayerConnectLines, and marker drag handlers to SceneGraph and SessionStore`
- **Execution Waves**:
  - Wave 1 (並列): Phase 1 (`PlayerMarkerItem` + `squad-bench-canvas` + `player-marker-ring-fade.test.tsx`), Phase 2 (`PlayerConnectLines` + `use-marker-drag-handlers` + `core/index.ts` + `[DELETE] use-node-position-transition`)
  - Wave 2 (並列, Wave 1 後): Phase 3 (`player-marker-item.test.tsx`), Phase 4 (`player-connect-lines.test.tsx`)
- **Negative Contracts**:
  - `absent: src/features/tactical-unified/core/hooks/use-node-position-transition.ts`
  - `rg(src/features/tactical-unified/core/components/PlayerMarkerItem.tsx,src/features/tactical-unified/core/components/PlayerConnectLines.tsx): \bgetMarkerBoundaryPoint\b|\bgroupRef\.current\.position\b`
  - `rg(src/features/tactical-unified/core/components/use-marker-drag-handlers.ts): \bnode\.position\b`
  - `rg(src/features/tactical-unified/core/components/__tests__/player-connect-lines.test.tsx): \buseCanvasStore\b|\bCanvasStoreContext\b|\bcreateCanvasStore\b`

---

## 1. Architectural Invariants & Design Decisions

- **Invariants (壊してはいけない前提条件)**:
  1. Konva 選手マーカーおよび連結線において、React props 外からの命令的 `node.position()` / `groupRef.current.position()` 書き換えと、コンポーネント内での境界・座標・半径フォールバック計算を全面禁止する。
  2. 複数選択選手の同時ドラッグ移動中は `SessionStore.setActiveDragDelta({ entityIds, deltaScreenNormX, deltaScreenNormY })` のみを更新し、`compileSceneGraph` ➔ `ResolvedBillboardPlayerItem.positionPx` 経由で全選択選手・連結線・追従矢印を一斉にリアクティブ再描画させる（`DocumentStore` と Undo 履歴を汚染しない）。
  3. ベンチ側キャンバス（`SquadBenchCanvas`）でも同一の `PlayerMarkerItem` を共用するため、`DomainPlayer` から最小の `ResolvedBillboardPlayerItem` を生成する純粋ヘルパーを用いて `resolvedPlayer` 必須契約を満たす。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `PlayerMarkerItem` は `resolvedPlayer: ResolvedBillboardPlayerItem` を必須 props とし、`useEffect` での `groupRef.current.position(...)` 命令復元と `baseDim * 0.032 ...` 半径フォールバックを完全撤去する（`x={resolvedPlayer.positionPx.x}`, `y={resolvedPlayer.positionPx.y}`, `radius={resolvedPlayer.radiusPx}`, `opacity={resolvedPlayer.opacity}`, `visible={resolvedPlayer.visible}` のみ使用）。
  2. `PlayerConnectLines` は `resolvedConnectLines: readonly ResolvedConnectLinePrimitive[]` を必須 props とし、旧 `markers` ループおよび `getMarkerBoundaryPoint` フォールバック分岐を削除する。
  3. `useMarkerDragHandlers` は複数選択時の `reg?.playerNodes.get(id)?.position(...)` 命令操作を削除し、単一/複数問わず `sessionStore.getState().setActiveDragDelta` を更新する。ドラッグ終了時は `setActiveDragDelta(null)` 後に `updateMarker` / `updateMarkers` / `moveMarkerToBench` のみを呼ぶ。
  4. `use-node-position-transition.ts` を `[DELETE]` し、`core/index.ts` から `useNodePositionTransition` export を削除する。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/core/components/PlayerMarkerItem.tsx`
  - `src/features/tactical-unified/panels/right-panel/squad-bench-canvas.tsx`
  - `src/features/tactical-unified/objects/player/components/__tests__/player-marker-ring-fade.test.tsx`
  - `src/features/tactical-unified/core/components/PlayerConnectLines.tsx`
  - `src/features/tactical-unified/core/components/use-marker-drag-handlers.ts`
  - `src/features/tactical-unified/core/index.ts`
  - `src/features/tactical-unified/core/components/__tests__/player-marker-item.test.tsx`
  - `src/features/tactical-unified/core/components/__tests__/player-connect-lines.test.tsx`

---

## 2. Implementation Phases

### Phase 1: PlayerMarkerItem Dumb View 化 & SquadBenchCanvas 整合

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/PlayerMarkerItem.tsx` (199 lines)
  - `[MODIFY]` `src/features/tactical-unified/panels/right-panel/squad-bench-canvas.tsx` (87 lines)
  - `[MODIFY]` `src/features/tactical-unified/objects/player/components/__tests__/player-marker-ring-fade.test.tsx` (187 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/compiler/scene-graph-dto.ts`
  - `src/features/tactical-unified/core/components/billboard-item-node.tsx`
- **Contract**:
  ```ts
  export interface PlayerMarkerItemProps {
    marker: PitchPlayer | DomainPlayer;
    width: number;
    height: number;
    baseDim: number;
    markerMode: string;
    isSelected: boolean;
    isInteractive: boolean;
    cleanRender?: boolean;
    connectingPlayerId: string | null;
    nodesRegistryRef?: MutableRefObject<unknown>;
    aspectRatio?: AspectRatio;
    onDragStart: (e: KonvaEventObject<DragEvent>, markerId: string) => void;
    onDragMove: (e: KonvaEventObject<DragEvent>, markerId: string) => void;
    onDragEnd: (e: KonvaEventObject<DragEvent>, marker: PitchPlayer | DomainPlayer) => void;
    onClick: (markerId: string, isShift: boolean) => void;
    onUpdateVisionCone: (patch: Record<string, unknown>) => void;
    resolvedPlayer: ResolvedBillboardPlayerItem;
  }
  ```
  - 振る舞い仕様・境界条件:
    1. `PlayerMarkerItem`: `resolvedPlayer` を必須化し、`useEffect` による `groupRef.current.position(...)` 書き換えと未解決フォールバック式（`(marker.x / 100) * width`、`baseDim * 0.032 ...`）を削除する。座標・半径・透明度・可視性（`visible={resolvedPlayer.visible}`）はすべて `resolvedPlayer` から直接設定する。
    2. `squad-bench-canvas.tsx`: `DomainPlayer` からベンチ描画用の `ResolvedBillboardPlayerItem`（`positionPx: toStagePixelPoint((player.x / 100) * canvasWidth, (player.y / 100) * BASE_BENCH_HEIGHT)`, `radiusPx: canvasWidth * 0.032 * (player.style?.sizeScale ?? 1)`, `depthSortKey: 0`, `opacity: 1`, `visible: true`, `selected: selectedIds.includes(player.id)`, `rippleRingsPx: []`）を純粋ヘルパーで構築して `PlayerMarkerItem` へ渡す。
    3. `player-marker-ring-fade.test.tsx`: `PlayerMarkerItem` テストケースへ有効な `resolvedPlayer` を渡す。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/objects/player/components/__tests__/player-marker-ring-fade.test.tsx`: `ring-fade` 指定時に `PlayerMarkerRingFade` の `Ellipse` が描画されること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/PlayerMarkerItem.tsx src/features/tactical-unified/panels/right-panel/squad-bench-canvas.tsx src/features/tactical-unified/objects/player/components/__tests__/player-marker-ring-fade.test.tsx`

### Phase 2: PlayerConnectLines / Drag ハンドラ純化 & useNodePositionTransition 削除

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/PlayerConnectLines.tsx` (218 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/components/PitchGroundLayer.tsx` (290 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/components/use-marker-drag-handlers.ts` (266 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/index.ts` (185 lines)
  - `[DELETE]` `src/features/tactical-unified/core/hooks/use-node-position-transition.ts`
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/compiler/scene-graph-dto.ts`
  - `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx`
- **Contract**:
  ```ts
  export interface PlayerConnectLinesProps {
    selectedIds: readonly string[];
    isInteractive: boolean;
    connectLineNodesRef: MutableRefObject<Map<string, Konva.Line>>;
    onSelectConnectLine: (id: string, parentPlayerId: string) => void;
    resolvedConnectLines: readonly ResolvedConnectLinePrimitive[];
  }
  ```
  - 振る舞い仕様・境界条件:
    1. `PlayerConnectLines`: `markers`, `width`, `height` props と旧 `getMarkerBoundaryPoint` フォールバック計算を完全削除し、`PitchGroundLayer.tsx` の `<PlayerConnectLines>` 呼び出しからも `markers`, `width`, `height` 渡しを削除する。
    2. `useMarkerDragHandlers`: 複数選択ドラッグ中の `for (const [id, initial] of multi.markers.entries()) { node.position(...) }` 命令的操作を完全撤去し、単一・複数ともに `tacticalStores.sessionStore.getState().setActiveDragDelta({ entityIds, deltaScreenNormX, deltaScreenNormY })` のみを発行する。
    3. `core/index.ts`: `useNodePositionTransition` と `UseNodePositionTransitionOptions` の export を削除し、`use-node-position-transition.ts` を `[DELETE]` する。
- **Concrete Test Cases**:
  - `PlayerConnectLines` テストは Phase 4 で更新・検証する。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/PlayerConnectLines.tsx src/features/tactical-unified/core/components/PitchGroundLayer.tsx src/features/tactical-unified/core/components/use-marker-drag-handlers.ts src/features/tactical-unified/core/index.ts`

### Phase 3: player-marker-item.test.tsx 移行

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/__tests__/player-marker-item.test.tsx` (445 lines)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/components/PlayerMarkerItem.tsx`
  - `src/lib/tactical/compiler/scene-graph-dto.ts`
- **Contract**:
  - 全 `PlayerMarkerItem` テストケースで必須 `resolvedPlayer: ResolvedBillboardPlayerItem` を渡すように更新し、旧命令的 `groupRef.current.position` 復元テストがあれば `resolvedPlayer.positionPx` 変更に追従する Dumb View 検証へ置換する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/components/__tests__/player-marker-item.test.tsx`:
    - 2D 円 / 3D リング / 視野角 / スポットライト / ドラッグ・クリック・`resolvedPlayer.positionPx` 更新追従。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/__tests__/player-marker-item.test.tsx`

### Phase 4: player-connect-lines.test.tsx 移行

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/__tests__/player-connect-lines.test.tsx` (313 lines)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/components/PlayerConnectLines.tsx`
  - `src/lib/tactical/compiler/compile-arrows.ts`
- **Contract**:
  - `CanvasStoreContext` / `createCanvasStore` / `useCanvasStore` 依存を撤去し、`resolvedConnectLines: ResolvedConnectLinePrimitive[]` を渡す Dumb View テストと `compileConnectLines` 純粋関数 I/O テストへ統合する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/components/__tests__/player-connect-lines.test.tsx`:
    - `resolvedConnectLines` の線座標・色・破線・選択ハイライト・クリック選択コールバック検証。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/__tests__/player-connect-lines.test.tsx`
