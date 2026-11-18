# TASK-208b: ゴースト軌道のリアルタイム伸長描画 & ボール軌道デフォルトOFF統一

- **Status**: `TODO`
- **Commit**: `feat(tactical): render player and ball ghost trajectories progressively during movement`
- **Execution Waves**:
  - Wave 1: Phase 1 (TimelineEvaluator の遷移元・終点・イージング進行率出力)
  - Wave 2: Phase 2 (compileTrajectories のリアルタイム伸長 & ボールデフォルトOFF化)
  - Wave 3: Phase 3 (ボード/エクスポート描画接続 & 統合テスト)
- **Negative Contracts**:
  - `rg(src/lib/tactical/compiler): Boolean\(currBall\.trajectory\)`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. スライド間の移動中、ゴースト軌道は到達後に突然出現するのではなく、選手・ボールの移動に合わせて始点から現在位置まで滑らかに伸びながら描画されること（終端点が移動中の選手・ボール座標と完全一致すること）。
  2. `trajectoryEffect?.enabled` が `true` でない限り、非選択状態の選手・ボールにはレイアウト画面・再生・エクスポートで軌道線を描画しない（`Boolean(currBall.trajectory)` だけで描画する旧分岐を完全廃止）。
  3. 到達後動作 `exitAction === 'keep'` の場合は到達後のポーズ中も全軌道を残し、`exitAction === 'auto-hide'` の場合は到達後ポーズ中に非表示とすること。
  4. 静的編集モード（`isPlaying: false`）や選択中（`selectedIds` に含まれる）は従来通り全長軌道をコンパイルすること。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `EvaluatedTimelineFrame` に `readonly easedProgress: number` と `readonly transitionSourceSlide?: DomainSlide | null`、`readonly transitionTargetSlide?: DomainSlide | null` を追加する（フォールバックなしの単一真実源）。
  2. 2 次ベジェ曲線の途中描画は、弧長トリミングではなく `subdivideQuadraticBezier(..., steps, maxT = frame.easedProgress)` のようにパラメータ `t ∈ [0, maxT]` でサンプリングすることで、補間エンジン（`calculateBezierPoint`）が算出する移動中座標と一致させる。
  3. `compileTrajectories` 内の `computeTrajectoryPoints` は `getBezierControlPointPx`（`TASK-208a` で統一）を使用し、`curveOffset` 既定値を `25` に揃える。
- **Consumers (同期更新対象)**:
  - `src/lib/tactical/engine/timeline-evaluator.ts`
  - `src/lib/tactical/compiler/geometry-primitives.ts`
  - `src/lib/tactical/compiler/compile-scene-graph.ts`
  - `src/features/tactical-unified/hooks/use-resolved-scene-graph.ts`
  - `src/lib/tactical/export/tactical-phase-frame-renderer.ts`

## 2. Implementation Phases

### Phase 1: `EvaluatedTimelineFrame` への遷移ソース・ターゲット・イージング率追加
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/engine/timeline-evaluator.ts` (L16-L40, L97-L280)
  - `[ADD]` `src/lib/tactical/__tests__/timeline-evaluator-trajectory.test.ts` (~90 lines)
- **Contract**:
  ```ts
  export interface EvaluatedTimelineFrame {
    readonly slideIndex: number;
    readonly nextSlideIndex: number;
    readonly progress: number;
    readonly easedProgress: number;
    readonly isPaused: boolean;
    readonly timeInSlideMs: number;
    readonly slide: DomainSlide;
    readonly transitionSourceSlide?: DomainSlide | null;
    readonly transitionTargetSlide?: DomainSlide | null;
    // 既存 arrowProgressMap / zoneOpacityMap / playerOpacityMap は維持
  }
  ```
  - 振る舞い仕様・境界条件:
    1. `evaluateStaticSlideFrame` および 1 スライドのみ・ポーズ中（`isPaused: true`）では `easedProgress: progress >= 1 ? 1 : 0`, `transitionSourceSlide: null`, `transitionTargetSlide: null` とする。
    2. セグメント遷移中（`elapsedInSeg >= activeSeg.pauseMs` かつ `rawT < 1`）は `easedProgress: ease`, `transitionSourceSlide: slideA`, `transitionTargetSlide: slideB` を設定する。
- **Concrete Test Cases**:
  - `timeline-evaluator-trajectory.test.ts`:
    - `case 1`: ポーズ区間（`timeMs < pauseMs`）では `isPaused: true`, `transitionSourceSlide: null` であること。
    - `case 2`: 遷移中間（例 `ease-out` の中間時刻）では `isPaused: false`, `0 < easedProgress < 1`, `transitionSourceSlide === slides[0]`, `transitionTargetSlide === slides[1]` であること。
    - `case 3`: 最終到達後は `isPaused: true`, `easedProgress: 1` であること。
- **Verification**:
  - `bun run ai:check src/lib/tactical/engine/timeline-evaluator.ts src/lib/tactical/__tests__/timeline-evaluator-trajectory.test.ts`

### Phase 2: `compileTrajectories` のリアルタイム伸長・`auto-hide`・ボール設定反映
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/compiler/geometry-primitives.ts` (L40-L60)
  - `[MODIFY]` `src/lib/tactical/compiler/compile-scene-graph.ts` (L29-L206)
  - `[ADD]` `src/lib/tactical/compiler/__tests__/realtime-trajectory-compile.test.ts` (~140 lines)
- **Contract**:
  ```ts
  // geometry-primitives.ts: maxT (0..1) までの部分2次ベジェ点列を生成
  export function subdivideQuadraticBezier(
    startX: number,
    startY: number,
    cpX: number,
    cpY: number,
    endX: number,
    endY: number,
    steps = 30,
    maxT = 1,
  ): number[];
  ```
  - 振る舞い仕様・境界条件:
    1. 遷移中（`!frame.isPaused && frame.transitionSourceSlide && frame.transitionTargetSlide`）は、`transitionSourceSlide` を始点、`transitionTargetSlide` を終点・軌道・エフェクト設定の基準とし、`trajectoryEffect?.enabled === true` なら `maxT = frame.easedProgress` で `computeTrajectoryPoints` を算出し、現在位置まで伸びる軌道を生成する（`easedProgress <= 0` ならスキップ）。
    2. ポーズ中または静的モード（`frame.isPaused` または `!frame.transitionSourceSlide`）は、`prevSlide` との間で `selectedIds.has(id)` または `trajectoryEffect?.enabled === true && trajectoryEffect.exitAction !== 'auto-hide'` の場合のみ `maxT = 1` で全長を描画する。
    3. ボールの有効判定は `currBall.trajectoryEffect?.enabled === true || selectedIds.has('ball')` に統一し、`dashArrayPx` は `currBall.trajectoryEffect?.lineStyle === 'dashed' ? [6, 4] : []`、`color` は `currBall.trajectoryEffect?.color ?? currBall.color ?? '#ffffff'` とする。
    4. `computeTrajectoryPoints` は直線（`type === 'straight'`）の途中経過でも途中座標を正確に返し、曲線時は `getBezierControlPointPx` + `subdivideQuadraticBezier(..., 30, maxT)` を用いた上で `pitchTransform` 投影を行う。
- **Concrete Test Cases**:
  - `realtime-trajectory-compile.test.ts`:
    - `case 1`: 遷移中（`easedProgress = 0.5`, `trajectoryEffect: { enabled: true }`）で、選手・ボールの軌道 `flatPointsPx` の最終座標が移動中間位置と一致し、全長の終点までは伸びていないこと。
    - `case 2`: ポーズ中かつ `exitAction: 'auto-hide'` のとき `trajectories` に含まれず、`exitAction: 'keep'` なら全長含まれること。
    - `case 3`: ボールに `trajectory: { type: 'arc_left' }` のみ設定され `trajectoryEffect` 未設定（デフォルト OFF）かつ非選択時、`trajectories` が空であること。
    - `case 4`: ボールに `trajectoryEffect: { enabled: true, lineStyle: 'dashed', color: '#ef4444' }` 設定時、指定色・点線でコンパイルされること。
- **Verification**:
  - `bun run ai:check src/lib/tactical/compiler/geometry-primitives.ts src/lib/tactical/compiler/compile-scene-graph.ts src/lib/tactical/compiler/__tests__/realtime-trajectory-compile.test.ts`

### Phase 3: ボード & レンダラーの `prevSlide` 参照整合と統合テスト
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/hooks/use-resolved-scene-graph.ts` (L75-L90)
  - `[MODIFY]` `src/lib/tactical/export/tactical-phase-frame-renderer.ts` (L260-L280)
  - `[ADD]` `src/features/tactical-unified/__tests__/realtime-trajectory-playback.test.ts` (~120 lines)
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `use-resolved-scene-graph.ts` と `tactical-phase-frame-renderer.ts` の両方で、再生中の `prevSlide` は `evaluated.slideIndex > 0 ? phase.slides[evaluated.slideIndex - 1] : null` とし、遷移中は `evaluated.transitionSourceSlide` / `transitionTargetSlide` によって `compileSceneGraph` がリアルタイム軌道を描画できるよう維持する。
    2. `tactical-phase-frame-renderer.ts` の `prevSlide` 決定式から `Math.max(0, evaluated.slideIndex - 1)` を廃し、`evaluated.slideIndex > 0 ? phase.slides[evaluated.slideIndex - 1] : null` に統一する。
- **Concrete Test Cases**:
  - `realtime-trajectory-playback.test.ts`（実 Store / `resolveSceneGraphFromState` 接続）:
    - `case 1`: スライド0 ➔ スライド1 へ遷移中の時刻（例 `pauseMs + transitionMs / 2`）で `resolveSceneGraphFromState` を呼ぶと、移動中の選手・ボール軌道が中間位置までリアルタイムに描画されていること。
    - `case 2`: スライド1 到着後のポーズ中（`exitAction: 'keep'` vs `'auto-hide'`）の軌道残存／消去が期待通り切り替わること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/hooks/use-resolved-scene-graph.ts src/lib/tactical/export/tactical-phase-frame-renderer.ts src/features/tactical-unified/__tests__/realtime-trajectory-playback.test.ts`
