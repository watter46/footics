# TASK-203c: ドラッグ中ゴースト軌道追従とチルト時矢印のピッチ平面投影

- **Status**: `TODO`
- **Commit**: `fix(tactical): track ghost trajectories during drag and project arrows on pitch plane`
- **Execution Waves**:
  - Wave 1: Phase 1, Phase 2 (parallel)
  - Wave 2: Phase 3, Phase 4 (parallel after Phase 1; Phase 3 must run after TASK-203b Phase 3)
- **Negative Contracts**:
  - `none`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. ボード画面（`applyPitchTransform: false`）における矢印・軌道の見た目は従来と 1px も変わらないこと（恒等投影の維持）。
  2. レイアウト画面・静止画出力・動画出力のすべてが `compileSceneGraph`（`compileArrows` / `compileTrajectories`）を共用しているため、チルト時のピッチ平面張り付き投影が全出力経路で統一的に効くこと。
  3. 選手マーカーとボール本体はビルボード（中心座標のみ投影しアイコン自体は正立・円形維持）のまま維持し、矢印・軌道・ゾーンのみピッチ平面上へ投影すること。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. ドラッグ中の実効正規化座標計算（`clampToScreenNorm(base + delta)`）を単一の純粋関数 `resolveEffectiveScreenNormPos` として切り出し、`compile-billboards.ts`、`compile-scene-graph.ts`、`PitchGroundLayer.tsx`、`ball-object.tsx` の 4 箇所すべてで共有する（重複計算・型破壊の同時回避）。
  2. `compileTrajectories` は確定済み `currPlayer.x, currPlayer.y` / `frame.slide.ball.x, y` ではなく、ドラッグ移動量適用後の実効正規化座標（`resolvedPlayer.screenNormPos` と `effBallPos`）を使って移動距離 `>= 1.0` 判定と終点座標を算出する。
  3. `compileArrows` および `computeTrajectoryPoints` は、投影前（ピッチ平面 2D ピクセル座標）で `offsetArrowEndpoints`・`generateWavyLinePoints`・`subdivideQuadraticBezier`・`trimFlatPoints` をすべて実行し、生成した全頂点と `controlHandle` を最後に `projectStagePixelWithPitchTransform` で投影する。矢尻角度 `endAngleRad` は投影後の終端セグメントから算出する。
  4. `PitchGroundLayer` の `<PlayerGhostTrajectory>` と `BallObject` の `<BallGhostTrajectory>` はどちらも `resolveEffectiveScreenNormPos` 適用後の実効座標を渡し、ドラッグ移動中（ドロップ前）から移動距離 `>= 1.0` でリアルタイムに出現・追従させる。
- **Consumers (同期更新対象)**:
  - `src/lib/tactical/compiler/compile-billboards.ts`
  - `src/lib/tactical/compiler/compile-scene-graph.ts`
  - `src/lib/tactical/compiler/compile-arrows.ts`
  - `src/features/tactical-unified/core/components/PitchGroundLayer.tsx`
  - `src/features/tactical-unified/objects/ball/components/ball-object.tsx`
  - `src/features/tactical-unified/objects/ball/components/ball-ghost-trajectory.tsx`

## 2. Implementation Phases

### Phase 1: 実効正規化座標ヘルパー共通化と軌道コンパイラの修正
- **Target Files**:
  - `[ADD]` `src/lib/tactical/compiler/effective-coordinates.ts` (~35 lines)
  - `[MODIFY]` `src/lib/tactical/compiler/compile-billboards.ts` (L65-L215)
  - `[MODIFY]` `src/lib/tactical/compiler/compile-scene-graph.ts` (computeTrajectoryPoints, compileTrajectories, L28-L215)
  - `[ADD]` `src/lib/tactical/compiler/__tests__/compile-trajectories-drag.test.ts` (~120 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/compiler/scene-graph-dto.ts` (`EphemeralDragDelta`)
  - `src/lib/types/tactical/branded.ts` (`clampToScreenNorm`, `toScreenNormPoint`)
- **Contract**:
  ```ts
  // src/lib/tactical/compiler/effective-coordinates.ts
  export function resolveEffectiveScreenNormPos(
    basePos: { readonly x: number; readonly y: number },
    entityId: string,
    activeDragDelta: EphemeralDragDelta | null | undefined,
  ): ScreenNormPoint;
  // draggedIds に entityId が含まれる場合のみ clampToScreenNorm(basePos.x + dx, 0, 100), clampToScreenNorm(basePos.y + dy, 0, 100) を返す。
  // 含まれない場合は toScreenNormPoint(basePos.x, basePos.y, false) を返す。
  ```
  - 振る舞い仕様・境界条件:
    1. `compileBillboardItems` の選手・ボール・テキスト位置計算をすべて `resolveEffectiveScreenNormPos` 呼び出しに統一する。
    2. `compileTrajectories` の選手ループでは `resolvedPlayer.screenNormPos` を使用して `Math.hypot(effPos.x - prevPlayer.x, effPos.y - prevPlayer.y) >= 1` を判定し、ボール分岐でも `resolveEffectiveScreenNormPos(frame.slide.ball, 'ball', session?.activeDragDelta)` を使用して距離判定と終点座標を算出する。
    3. `computeTrajectoryPoints` は `startRawPx`, `endRawPx`（投影前ピクセル）を受け取り、投影前平面で `arc_left`/`arc_right`/`custom` の `subdivideQuadraticBezier` を行い、得られた全頂点ペア `(x, y)` を `projectStagePixelWithPitchTransform` で投影する。
- **Concrete Test Cases**:
  - `src/lib/tactical/compiler/__tests__/compile-trajectories-drag.test.ts`（純粋関数 I/O、内部 `vi.mock` 禁止）:
    - `case 1`: 前スライドと同座標の選手またはボールに対し、`activeDragDelta` で `dx = 10` を与えると `compileSceneGraph` が `trajectories` を生成し、終点が移動先と一致する。
    - `case 2`: `pitchTransform.tilt = 25` かつ `trajectory.type = 'arc_left'` のとき、軌道の中間頂点が投影前平面でオフセット生成された後に 3D 投影される。
- **Verification**:
  - `bun run ai:check src/lib/tactical/compiler/effective-coordinates.ts src/lib/tactical/compiler/compile-billboards.ts src/lib/tactical/compiler/compile-scene-graph.ts src/lib/tactical/compiler/__tests__/compile-trajectories-drag.test.ts`

### Phase 2: チルト時の矢印ピッチ平面張り付き投影 (`compileArrows`)
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/compiler/compile-arrows.ts` (compileArrows, L69-L260)
  - `[ADD]` `src/lib/tactical/compiler/__tests__/compile-arrows-tilt.test.ts` (~130 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/compiler/__tests__/scene-compiler.test.ts`
  - `src/lib/tactical/engine/projection-3d.ts` (`projectStagePixelWithPitchTransform`)
  - `src/lib/tactical/compiler/geometry-primitives.ts`
- **Contract**:
  ```ts
  // compileArrows の計算パイプライン順:
  // 1. startRawPx / endRawPx / cpRawPx を投影前座標で算出:
  //    - sourcePlayer あり: screenNormToStagePixel(sourcePlayer.screenNormPos, viewport)
  //    - sourcePlayer なし: screenNormToStagePixel(toScreenNormPoint(basePt.x + aDx, basePt.y + aDy, false), viewport)
  //    - targetPlayer / cp も同様に投影前ピクセル座標を算出
  // 2. 投影前座標で offsetArrowEndpoints -> (generateWavyLinePoints | subdivideQuadraticBezier | straight) -> trimFlatPoints を実行
  // 3. flatPointsPx の全頂点ペア (x, y) を projectStagePixelWithPitchTransform(..., viewport, pitchTransform) で投影
  // 4. controlHandleRawPx (!isWavy && cpRawPx) も同様に投影し controlHandlePx を生成
  // 5. 投影後の flatPointsPx から calculateLastSegmentAngle(projectedFlatPointsPx) で endAngleRad、先頭・末尾で startPointPx / endPointPx を算出
  ```
  - 振る舞い仕様・境界条件:
    1. `pitchTransform` が未設定または恒等（`applyPitchTransform: false`）のときは従来の 2D 座標と厳密一致すること。
    2. チルト（例: `tilt: 25`）かつパン/カメラ移動時に、波線矢印（`arrowType: 'dribble'`）の波の頂点間隔が投影後スクリーン上ではなくピッチ平面上の幾何学に固定され、全頂点がピッチ面へ投影されること。
    3. 既存の `scene-compiler.test.ts`（特に test 6, 7, 8）が全 PASS すること。
- **Concrete Test Cases**:
  - `src/lib/tactical/compiler/__tests__/compile-arrows-tilt.test.ts`（純粋関数 I/O、内部 `vi.mock` 禁止）:
    - `case 1`: `tilt = 25`, `arrowType = 'dribble'` のとき、投影前の `generateWavyLinePoints` の各頂点を `projectStagePixelWithPitchTransform` した座標と `compileArrows` 出力 `flatPointsPx` が一致する。
    - `case 2`: `tilt = 25`, `curveType = 'curved'`（`controlPoint` 指定）で `controlHandlePx` が投影後曲線の中央頂点（`t = 0.5`）と一致し、`endAngleRad` が投影後末尾セグメント角度と一致する。
    - `case 3`: `sourcePlayerId` 付き矢印で `activeDragDelta` 適用＋`tilt = 25` のとき、始点が選手の投影後座標方向に追従し終点は固定される。
- **Verification**:
  - `bun run ai:check src/lib/tactical/compiler/compile-arrows.ts src/lib/tactical/compiler/__tests__/compile-arrows-tilt.test.ts`

### Phase 3: 選手ドラッグ中のリアルタイムゴースト軌道・追従矢印
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/PitchGroundLayer.tsx` (L60-L120, L245-L285)
  - `[ADD]` `src/features/tactical-unified/core/components/__tests__/pitch-ground-drag-ghost.test.tsx` (~120 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/compiler/effective-coordinates.ts` (`resolveEffectiveScreenNormPos`)
  - `src/features/tactical-unified/objects/player/components/player-ghost-trajectory.tsx`
- **Contract**:
  ```ts
  // PitchGroundLayer 内の PlayerGhostTrajectory 描画仕様:
  // activeDragDelta = useSessionStore((s) => s.activeDragDelta)
  // 各 visibleMarkers の marker について:
  //   const effPos = resolveEffectiveScreenNormPos(marker, marker.id, activeDragDelta);
  //   const isDragged = Boolean(activeDragDelta?.entityIds.includes(marker.id));
  //   if (!selectedIds.includes(marker.id) && !isDragged) continue;
  //   if (!prevPlayer || Math.hypot(effPos.x - prevPlayer.x, effPos.y - prevPlayer.y) < 1.0) continue;
  //   const effMarker = { ...marker, x: effPos.x, y: effPos.y };
  //   <PlayerGhostTrajectory player={effMarker} ... />
  ```
  - 振る舞い仕様・境界条件:
    1. 前スライドと同位置にある選手を選択・ドラッグ開始し、`activeDragDelta` によって距離 `>= 1.0` になった瞬間にドロップ前でも `<PlayerGhostTrajectory>` が出現・追従する。
    2. ドラッグ終了（`activeDragDelta === null`）または移動距離 `< 1.0` の場合は表示しない。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/components/__tests__/pitch-ground-drag-ghost.test.tsx`（実 `TacticalStoreProvider` + Konva Stage 接続、内部 `vi.mock` 禁止）:
    - `case 1`: スライド1・2で同位置 `(50, 50)` の選手に対し、`activeDragDelta` で `dx = 15` をセットするとドロップ前でも `ghost-trajectory-<id>` グループが描画され、矢印終点が移動先 `(65, 50)` 相当になる。
    - `case 2`: `dx = 0.5`（距離 `< 1.0`）では描画されない。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/PitchGroundLayer.tsx src/features/tactical-unified/core/components/__tests__/pitch-ground-drag-ghost.test.tsx`

### Phase 4: ボールドラッグ中のリアルタイムゴースト軌道・追従矢印
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/objects/ball/components/ball-object.tsx` (useBallObjectState, BallObject, L29-L215)
  - `[MODIFY]` `src/features/tactical-unified/objects/ball/components/ball-ghost-trajectory.tsx` (BallGhostTrajectory, L30-L76)
  - `[MODIFY]` `src/features/tactical-unified/__tests__/tracking-arrow-and-ball-trajectory.test.ts` (L200-L245)
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/compiler/effective-coordinates.ts` (`resolveEffectiveScreenNormPos`)
  - `src/features/tactical-unified/objects/ball/hooks/use-ball-drag.ts`
- **Contract**:
  ```ts
  // useBallObjectState 内:
  // activeDragDelta = useSessionStore((s) => s.activeDragDelta)
  // effBallPos = resolveEffectiveScreenNormPos(baseBall, 'ball', activeDragDelta)
  // domainBall = { ...baseBall, x: effBallPos.x, y: effBallPos.y }
  // isBallMoved = prevBall ? Math.hypot(effBallPos.x - prevBall.x, effBallPos.y - prevBall.y) >= 1.0 : false
  // BallObject は <BallGhostTrajectory isBallMoved={prevInfo.isBallMoved} ... /> を渡す。
  // BallGhostTrajectory は (!hasPrevBall || !prevBall || !isBallMoved) のとき null を返す。
  ```
  - 振る舞い仕様・境界条件:
    1. 前スライドと同座標のボールでも、ドラッグ中（`drag.isDragging || Boolean(activeDragDelta?.entityIds.includes('ball'))`）かつ実効移動距離 `>= 1.0` になればドロップ前に `BallGhost` と `GhostTrajectoryArrow` がリアルタイム出現・追従する。
    2. `isBallMoved === false`（移動距離 `< 1.0`）のときはゴーストと追従矢印を出さない。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/__tests__/tracking-arrow-and-ball-trajectory.test.ts`（実 `TacticalStoreProvider` + Konva Stage 接続、内部 `vi.mock` 禁止）:
    - `case 1`: 前スライドと同一座標のボールに対し、`sessionStore.setActiveDragDelta({ entityIds: ['ball'], deltaScreenNormX: 12, deltaScreenNormY: 0 })` を設定して `BallObject` を描画すると `BallGhostTrajectory`（`BallGhost` と `GhostTrajectoryArrow`）が描画され、終点が実効座標になる。
    - `case 2`: 移動距離 `< 1.0` のときは `BallGhostTrajectory` が描画されない。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/objects/ball/components/ball-object.tsx src/features/tactical-unified/objects/ball/components/ball-ghost-trajectory.tsx src/features/tactical-unified/__tests__/tracking-arrow-and-ball-trajectory.test.ts`
