# TASK-192: BallObject と useBallDrag の 3頻度ストア + ResolvedBillboardBallItem 移行

- **Status**: `DONE`
- **Commit**: `refactor(tactical): migrate BallObject and useBallDrag to 3-frequency stores and ResolvedBillboardBallItem`
- **Execution Waves**:
  - Wave 1: Phase 1 (sequential foundation)
  - Wave 2: Phase 2, Phase 3, Phase 4 (parallel after Phase 1)
- **Negative Contracts**:
  - `absent: src/features/tactical-unified/objects/ball/hooks/ball-drag-helper.ts`
  - `rg(src/features/tactical-unified/objects/ball/): TacticalUnifiedStore|useTacticalUnifiedStoreContext|useNodePositionTransition|normToPx`
  - `rg(src/features/tactical-unified/core/components/billboard-item-node.tsx): calculatedSizeScale|defaultBaseRadius`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. ボールのドラッグ中 (`onDragMove`) は `SessionStore.setActiveDragDelta` のみ更新し、`DocumentStore` の履歴 (`past`) や `isDirty` を一切汚染しないこと。
  2. ドラッグ終了時 (`onDragEnd`) のみ `setActiveDragDelta(null)` と `dispatchSlide(activePhaseId, activeSlideId, { type: 'UPDATE_BALL', patch: { x, y } })` を実行し、座標は `clampToScreenNorm` を必ず通過させること。
  3. ゴースト軌道の再計算や `BallObject` の描画座標・半径決定に Konva ノード命令的操作 (`ghostGroupRef`, `ghostLineRef`, `node.position()`, `useNodePositionTransition`) を使わず、`ResolvedBillboardBallItem` をそのまま描画すること。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `BallObjectProps` は `resolvedBall: ResolvedBillboardBallItem` を必須とし、旧 `%` 逆算ブリッジ (`billboard-item-node.tsx` L110-L123) を撤去して `if (!resolvedBall) return null;` で直接 `BallObject` へ渡す。
  2. `useBallDrag` は `ghostGroupRef` / `ghostLineRef` / `nodesRegistryRef` / `setupBallGhostOnDragStart` を撤去し、`activeSlide.ball` の開始位置を基準に `deltaScreenNormX / deltaScreenNormY` を算出して `setActiveDragDelta({ entityIds: ['ball'], deltaScreenNormX, deltaScreenNormY })` を呼ぶ。
  3. `ball-drag-helper.ts` は `useBallDrag` 専用だったため、`computeClampedBallNormPos` 相当の純粋クランプ処理を `use-ball-drag.ts` へ統合して物理削除する。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/core/components/billboard-item-node.tsx`
  - `src/features/tactical-unified/core/components/__tests__/clean-render.test.tsx`
  - `src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx` (L474-L526)

## 2. Implementation Phases

### Phase 1: BallObject / useBallDrag / BillboardItemNode の 3頻度ストア・Dumb View 移行
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/objects/ball/types.ts` (L1-L17)
  - `[MODIFY]` `src/features/tactical-unified/objects/ball/hooks/use-ball-drag.ts` (L1-L110)
  - `[MODIFY]` `src/features/tactical-unified/objects/ball/components/ball-object.tsx` (L1-L191)
  - `[MODIFY]` `src/features/tactical-unified/core/components/billboard-item-node.tsx` (L105-L138)
  - `[DELETE]` `src/features/tactical-unified/objects/ball/hooks/ball-drag-helper.ts`
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/stores/tactical-store-provider.tsx` (`useDocumentStore`, `useSessionStore`)
  - `src/features/tactical-unified/stores/domain-selectors.ts` (`selectDomainActiveSlide`, `selectDomainPreviousSlide`)
  - `src/lib/tactical/compiler/scene-graph-dto.ts` (`ResolvedBillboardBallItem`, L86-L94)
  - `src/lib/tactical/domain/commands.ts` (`UPDATE_BALL`, L85)
- **Contract**:
  ```ts
  export interface BallObjectProps {
    ball: DomainBallState | BallState;
    resolvedBall: ResolvedBillboardBallItem;
    stageSize: { width: number; height: number };
    nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
    cleanRender?: boolean;
  }
  export function useBallDrag(props: {
    stageSize: { width: number; height: number };
  }): {
    isDragging: boolean;
    dragBoundFunc: (this: Konva.Node, pos: Konva.Vector2d) => Konva.Vector2d;
    handleDragStart: (e: KonvaEventObject<DragEvent>) => void;
    handleDragMove: (e: KonvaEventObject<DragEvent>) => void;
    handleDragEnd: (e: KonvaEventObject<DragEvent>) => void;
  };
  ```
  - 振る舞い仕様・境界条件:
    1. `ball-object.tsx`: `if (!resolvedBall.visible) return null;`。座標 `px = resolvedBall.positionPx.x`, `py = resolvedBall.positionPx.y`, 半径 `radius = resolvedBall.radiusPx` を使用し、`useNodePositionTransition` および `useEffect` での `ballGroupRef.current.position()` 書換を全撤去する。
    2. `ball-object.tsx`: `useDocumentStore` / `useSessionStore` + `selectDomainActiveSlide` / `selectDomainPreviousSlide` から `activeSlide` と `prevSlide` を取得し、軌跡更新は `dispatchSlide(activePhaseId, activeSlideId, { type: 'UPDATE_BALL', patch: { trajectory } })`、選択は `sessionStore.selectObject({ id: 'ball', kind: 'ball' }, isShift)` を呼ぶ。`prevInfo` の過去位置 px 変換には `screenNormToStagePixel` を使用する。
    3. `use-ball-drag.ts`: `onDragStart` で開始時の `activeSlide.ball` 座標を ref に保持し、`setIsDragging(true)` と `setIsHudOpen(false)` を呼ぶ。`onDragMove` で `pxToNorm` により現在位置を正規化し、`setActiveDragDelta({ entityIds: ['ball'], deltaScreenNormX, deltaScreenNormY })` を呼ぶ。`onDragEnd` で `setIsDragging(false)`, `setActiveDragDelta(null)`, `dispatchSlide(..., { type: 'UPDATE_BALL', patch: { x: clampToScreenNorm(finalX), y: clampToScreenNorm(finalY) } })` を呼ぶ。
    4. `billboard-item-node.tsx` L105-L137: `effectiveBall` の `%` 逆算ロジックを削除し、`if (!resolvedBall) return null;` の上で `<BallObject key="ball-object" ball={ball} resolvedBall={resolvedBall} ... />` を描画する。
- **Concrete Test Cases**:
  - Phase 2〜4 の各テストで網羅検証。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/objects/ball/types.ts src/features/tactical-unified/objects/ball/hooks/use-ball-drag.ts src/features/tactical-unified/objects/ball/components/ball-object.tsx src/features/tactical-unified/core/components/billboard-item-node.tsx`

### Phase 2: clean-render.test.tsx の BallObject 契約更新
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/__tests__/clean-render.test.tsx` (L219-L315)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/objects/ball/components/ball-object.tsx`
  - `src/features/tactical-unified/stores/tactical-store-provider.tsx`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. 対象ファイルは 315行のため単体 Phase とし、`BallObject` を描画する2テスト（L219-L314）を `<TacticalStoreProvider>` でラップし、`resolvedBall: ResolvedBillboardBallItem` を props として渡す。
    2. `useNodePositionTransition` / `Konva.Tween` 撤去後の仕様に合わせ、「`cleanRender=true` で `draggable={false}` かつ `BallGhostTrajectory` 非表示」「`resolvedBall.positionPx` 変更時に `Konva.Tween` が発火せず即座に新しい座標 Props へ追従する」ことを検証する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/components/__tests__/clean-render.test.tsx`（実 `TacticalStoreProvider` 接続）:
    - `case 1`: `cleanRender=true` 時は `draggable` が `false` となり、選択状態でもゴースト矢印が描画されない
    - `case 2`: `cleanRender=true` で `resolvedBall.positionPx` を変更しても `Konva.Tween` が発火せず `ballNode.position()` が新しい `positionPx` と一致する
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/__tests__/clean-render.test.tsx`

### Phase 3: five-layer-architecture.test.tsx のボール描画テスト更新
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx` (L474-L527)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/stores/tactical-store-provider.tsx`
  - `src/lib/tactical/compiler/compile-scene-graph.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. 923行ファイルのため L474-L527 のピンポイント編集のみ行う。
    2. `capabilities.hasBall` テストケース（L474-L527）を `<TacticalStoreProvider>` + `<CanvasStoreProvider>` 併用ラップ（Wave D で `CanvasStore` 撤去までの間）とし、`compileSceneGraph` で生成した `sceneGraph` を `<BillboardObjectLayer sceneGraph={sceneGraph} ... />` へ渡して `ballNode` の有無を検証する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx`:
    - `case 1`: `capabilities.hasBall: false` 時は `registryRef.current.ballNode` が `undefined`
    - `case 2`: デフォルト (`tactical-board`) + `sceneGraph` 渡し時に `registryRef.current.ballNode` が定義される
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx`

### Phase 4: BallObject / useBallDrag の 3頻度ストア結合テスト新規作成
- **Target Files**:
  - `[ADD]` `src/features/tactical-unified/objects/ball/__tests__/ball-object.test.tsx` (~120 lines)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/objects/ball/components/ball-object.tsx`
  - `src/features/tactical-unified/objects/ball/hooks/use-ball-drag.ts`
  - `src/features/tactical-unified/stores/tactical-store-provider.tsx`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. 内部 `vi.mock` を使わず、`TacticalStoreProvider` に実 `documentStore` / `sessionStore` を注入して `Stage > Layer > BallObject` をレンダリングする。
    2. `ballGroup` のクリック選択、`dragmove` 時の `sessionStore.getState().activeDragDelta` 更新（`entityIds: ['ball']`）かつ `documentStore.getState().past.length === 0`（履歴非汚染）、`dragend` 時の `activeDragDelta === null` 復帰および `documentStore` の `ball.x` / `ball.y` 更新と `past.length === 1` を検証する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/objects/ball/__tests__/ball-object.test.tsx`（実 `TacticalStoreProvider` 接続）:
    - `case 1`: `resolvedBall.visible === false` 時は Konva Group が描画されない
    - `case 2`: クリックで `sessionStore.selectedObjects` が `[{ id: 'ball', kind: 'ball' }]` になる
    - `case 3`: ドラッグ中 (`fireDragMove`) は `sessionStore.activeDragDelta.entityIds` が `['ball']` になり `documentStore.past` は空のまま
    - `case 4`: ドラッグ終了 (`fireDragEnd`) で `activeDragDelta` が `null` に戻り、`documentStore` の対象スライド `ball` 座標が更新され `past.length === 1` となる
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/objects/ball/__tests__/ball-object.test.tsx`
