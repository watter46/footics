# TASK-208a: ゴースト軌道カーブ統一修正 & ボール軌道エフェクト型・UI追加

- **Status**: `TODO`
- **Commit**: `fix(tactical): fix ghost trajectory curve sync and add ball trajectory effect with color picker`
- **Execution Waves**:
  - Wave 1: Phase 1, Phase 2 (parallel)
  - Wave 2: Phase 3, Phase 4 (parallel after Wave 1)
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/objects/ball): clampToScreenNorm\(traj\.controlPoint`
  - `rg(src/lib/tactical/compiler): \?\? 15`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. ボールの `trajectoryEffect` のデフォルトは未設定（`enabled: false` 相当）とし、ボールを動かしただけでは選択解除後やレイアウト画面に軌道線を描画しない。
  2. ゴースト軌道の編集ハンドル（`GhostTrajectoryArrow`）および `BallGhostTrajectory` は、`!cleanRender && hasPrevBall && prevBall && (isSelected || isDragging)` の条件（または `syncBallDragKonvaNodes` 経由のドラッグ中表示）でのみ表示され、非選択・非ドラッグ時に勝手に点線矢印を残さない。
  3. 軌道 `type: 'custom'` の `controlPoint` は画面端外へのカーブ操作もできるよう `0..100` に強制クランプせず保持する（`UnclampedScreenNormCoordSchema` / `toScreenNormCoord` を使用）。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `getBezierControlPointPx(p0Px, p1Px, trajectory, stageSize)` を `src/lib/tactical/trajectory.ts` に新設し、`custom.controlPoint`（`0..100` 正規化座標）を `stageSize` でピクセル変換したうえで 2 次ベジェ制御点を返す。`arc_left` / `arc_right` のデフォルト `curveOffset` は `25` に統一する。
  2. `syncTrajectoryEntryKonva`（`drag-konva-sync.ts`）と `GhostTrajectoryArrow` の初期曲線算出はこの `getBezierControlPointPx` を使用し、ドラッグ中にピクセル座標と正規化座標を取り違えて制御点が左上に飛ぶ不具合を根絶する。
  3. `DomainBallStateSchema` に `trajectoryEffect: PlayerTrajectoryEffectConfigSchema.optional()` を追加し、選手・ボール共通の `PlayerTrajectoryEffectSection` に `ColorInput` による色変更機能を追加して `EffectInspectorPanel` の `'ball'` 選択時にも表示する。
- **Consumers (同期更新対象)**:
  - `src/lib/types/tactical/domain-entities.ts`
  - `src/lib/tactical/acl/annotation-normalizers.ts`
  - `src/lib/tactical/export/tactical-frame-effects.ts`
  - `src/lib/tactical/trajectory.ts`
  - `src/features/tactical-unified/core/utils/drag-konva-sync.ts`
  - `src/features/tactical-unified/objects/arrow/components/ghost-trajectory-arrow.tsx`
  - `src/features/tactical-unified/objects/arrow/hooks/use-ghost-trajectory-arrow.ts`
  - `src/features/tactical-unified/objects/ball/components/ball-ghost-trajectory.tsx`
  - `src/features/tactical-unified/objects/ball/components/ball-object.tsx`
  - `src/features/tactical-unified/panels/right-panel/player-trajectory-effect-section.tsx`
  - `src/features/tactical-unified/panels/right-panel/effect-inspector-panel.tsx`

## 2. Implementation Phases

### Phase 1: ボール軌道エフェクトのドメイン型・ACL・エフェクト判定拡張
- **Target Files**:
  - `[MODIFY]` `src/lib/types/tactical/domain-entities.ts` (L33-L42, L176-L186)
  - `[MODIFY]` `src/lib/tactical/acl/annotation-normalizers.ts` (L50-L77)
  - `[MODIFY]` `src/lib/tactical/export/tactical-frame-effects.ts` (L60-L80)
  - `[ADD]` `src/lib/tactical/__tests__/ball-trajectory-effect-acl.test.ts` (~100 lines)
- **Contract**:
  ```ts
  // domain-entities.ts:
  // 1) DomainPlayerTrajectorySchema の controlPoint は UnclampedScreenNormCoordSchema を用いた非クランプ座標を許容する
  // 2) DomainBallStateSchema へ追加:
  //    trajectoryEffect: PlayerTrajectoryEffectConfigSchema.optional(),
  ```
  - 振る舞い仕様・境界条件:
    1. `normalizeBall` は `b.trajectoryEffect` がオブジェクトの場合に `enabled`（boolean, default false）, `lineStyle`（`'solid' | 'dashed'`, default `'solid'`）, `color`（6桁HEX文字列任意）, `exitAction`（`'keep' | 'auto-hide'`, default `'keep'`）を正規化して保持する。未指定なら `undefined`（デフォルトオフ）。
    2. `normalizeBall` は `b.trajectory.controlPoint` の `x, y` を `0..100` にクランプせず `toScreenNormCoord` で保持する。
    3. `hasActiveFrameEffects` は `slide.ball?.trajectoryEffect?.enabled === true` の場合も `true` を返す。
- **Concrete Test Cases**:
  - `ball-trajectory-effect-acl.test.ts`（純粋関数 I/O テスト）:
    - `case 1`: `normalizeBall` で `trajectoryEffect` 未指定なら `undefined`、`{ enabled: true, lineStyle: 'dashed', color: '#38bdf8', exitAction: 'auto-hide' }` なら全フィールド保持されること。
    - `case 2`: `normalizeBall` で `trajectory.controlPoint` に `{ x: 50, y: -25 }` を渡してもクランプされず保持されること。
    - `case 3`: `hasActiveFrameEffects` が `ball.trajectoryEffect.enabled === true` のスライドで `true` を返すこと。
- **Verification**:
  - `bun run ai:check src/lib/types/tactical/domain-entities.ts src/lib/tactical/acl/annotation-normalizers.ts src/lib/tactical/export/tactical-frame-effects.ts src/lib/tactical/__tests__/ball-trajectory-effect-acl.test.ts`

### Phase 2: 曲線計算統一 & ドラッグ同期・ボールガイド表示条件修正
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/trajectory.ts` (L13-L80)
  - `[MODIFY]` `src/features/tactical-unified/core/utils/drag-konva-sync.ts` (L19-L68)
  - `[MODIFY]` `src/features/tactical-unified/objects/arrow/hooks/use-ghost-trajectory-arrow.ts` (L27-L188)
  - `[MODIFY]` `src/features/tactical-unified/objects/ball/components/ball-ghost-trajectory.tsx` (L31-L79)
- **Contract**:
  ```ts
  // trajectory.ts: ピクセル座標系で2次ベジェ制御点を解決する共通関数
  export function getBezierControlPointPx(
    p0Px: Point2D,
    p1Px: Point2D,
    trajectory: DomainPlayerTrajectory | undefined,
    stageSize: { width: number; height: number },
  ): Point2D;
  ```
  - 振る舞い仕様・境界条件:
    1. `getBezierControlPointPx` は `trajectory?.type === 'custom' && trajectory.controlPoint` のとき `{(cp.x / 100) * stageSize.width, (cp.y / 100) * stageSize.height}` を返す（`width/height <= 0` はフォールバックしないよう `Math.max(1, ...)`）。`arc_left` / `arc_right` は `p0Px, p1Px` のピクセル法線上で `curveOffset ?? 25` により算出する。
    2. `syncTrajectoryEntryKonva`（`drag-konva-sync.ts`）は `getBezierControlPointPx(entry.startPx, endPx, entry.trajectory, _stageSize)` を呼び出して曲線点列・ハンドル位置を更新する（`stageSize` 引数名アンダースコアを外す）。
    3. `useGhostTrajectoryArrow` は `handleDragEnd` の `controlPoint` 保存時に `toScreenNormPoint(Math.round(newNormX * 10) / 10, Math.round(newNormY * 10) / 10, false)`（非クランプ）を使用する。
    4. `BallGhostTrajectory` は `if (cleanRender || !hasPrevBall || !prevBall || (!isSelected && !isDragging)) return null;` で非選択・非ドラッグ時は何もレンダリングせず、既存の `ball-ghost-trajectory.test.tsx` を全 PASS させる。ただし非選択からの `dragmove` 対応で `ball-object.tsx` 側がドラッグ中のみ `isDragging` を伝えるか、または `Group` の `visible={Boolean((isSelected || isDragging) && isBallMoved)}` を保持してテスト期待通り非選択＆非ドラッグで `Arrow` 数 0 を満たすこと。
- **Concrete Test Cases**:
  - 既存 `ball-ghost-trajectory.test.tsx`（5テスト全 PASS）および `drag-konva-sync.test.ts` の PASS + Phase 3 統合テストで検証。
- **Verification**:
  - `bun run ai:check src/lib/tactical/trajectory.ts src/features/tactical-unified/core/utils/drag-konva-sync.ts src/features/tactical-unified/objects/arrow/hooks/use-ghost-trajectory-arrow.ts src/features/tactical-unified/objects/ball/components/ball-ghost-trajectory.tsx`

### Phase 3: `GhostTrajectoryArrow` / `BallObject` クランプ解除 & カーブ同期テスト
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/objects/arrow/components/ghost-trajectory-arrow.tsx` (L26-L70)
  - `[MODIFY]` `src/features/tactical-unified/objects/ball/components/ball-object.tsx` (L68-L169)
  - `[ADD]` `src/features/tactical-unified/__tests__/ghost-trajectory-curve.test.tsx` (~130 lines)
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `GhostTrajectoryArrow` は `getBezierControlPointPx({ x: sPxX, y: sPxY }, { x: ePxX, y: ePxY }, trajectory, stageSize)` で制御点 `cpPx` を算出し、曲線と黄色丸ハンドルを `cpPx` から統一計算する（縦横比歪みを排除）。
    2. `ball-object.tsx` の `handleUpdateTrajectory` と `baseBall.trajectory` 正規化では `clampToScreenNorm` ではなく `toScreenNormCoord` を使用し、画面外側の制御点座標を維持する。
    3. `ball-object.tsx` でドラッグ中状態（`useBallDrag` または `useSessionStore`）を反映する場合も、`BallGhostTrajectory` の非選択・非ドラッグ時非描画契約を保つ。
- **Concrete Test Cases**:
  - `ghost-trajectory-curve.test.tsx`（内部 `vi.mock` 禁止）:
    - `case 1`: `type: 'custom'`, `controlPoint: { x: 50, y: 20 }` を設定したあと `syncTrajectoryEntryKonva` で選手／ボールを `{ x: 700, y: 400 }` にドラッグ移動しても、制御点が `(600, 160)`（1200x800 ステージ基準）として正しく使われ左上に飛ばないこと。
    - `case 2`: `type: 'custom'`, `controlPoint: { x: 50, y: -15 }` の負座標を `BallObject` / `GhostTrajectoryArrow` でクランプせず保持すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/objects/arrow/components/ghost-trajectory-arrow.tsx src/features/tactical-unified/objects/ball/components/ball-object.tsx src/features/tactical-unified/__tests__/ghost-trajectory-curve.test.tsx`

### Phase 4: 右パネル軌道エフェクト UI の色変更追加 & ボール選択対応
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/right-panel/player-trajectory-effect-section.tsx` (L1-L109)
  - `[MODIFY]` `src/features/tactical-unified/panels/right-panel/effect-inspector-panel.tsx` (L135-L197)
  - `[ADD]` `src/features/tactical-unified/panels/right-panel/__tests__/ball-trajectory-inspector.test.tsx` (~130 lines)
- **Contract**:
  ```ts
  // player-trajectory-effect-section.tsx:
  // 既存 props ({ player, onUpdate }) 互換を保つか、trajectoryEffect + defaultColor を受け取り
  // 選手・ボール共用で ON/OFF・線種(実線/点線)・色(ColorInput)・到達後動作(keep/auto-hide) を編集できる
  export interface PlayerTrajectoryEffectSectionProps {
    player: { readonly trajectoryEffect?: PlayerTrajectoryEffectConfig; readonly defaultColor?: string };
    onUpdate: (patch: { trajectoryEffect?: PlayerTrajectoryEffectConfig }) => void;
  }
  ```
  - 振る舞い仕様・境界条件:
    1. `PlayerTrajectoryEffectSection` で `currentConfig.enabled === true` のとき、`ColorInput`（既存 `right-panel/color-input.tsx`）を使って軌跡カラー（`trajectoryEffect.color`、未設定時は `player.defaultColor ?? '#ffffff'`）を変更できるようにする。
    2. `EffectInspectorPanel` に `selected.kind === 'ball'` の分岐を追加し、`slide.ball` に対して `PlayerTrajectoryEffectSection` を接続し、`UPDATE_BALL` コマンド（`patch: { trajectoryEffect }`）を発行する。
- **Concrete Test Cases**:
  - `ball-trajectory-inspector.test.tsx`（実 `TacticalStoreProvider` 接続）:
    - `case 1`: 選手選択時、軌道エフェクトを ON にして色を変更すると `player.trajectoryEffect.color` がストアに保存されること。
    - `case 2`: ボール選択時、エフェクト設定パネルが表示され、初期状態が OFF であること。
    - `case 3`: ボール選択時、軌道エフェクトを ON にして線種（点線）・色（例 `#38bdf8`）・到達後動作（`auto-hide`）を変更すると `slide.ball.trajectoryEffect` が更新されること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/right-panel/player-trajectory-effect-section.tsx src/features/tactical-unified/panels/right-panel/effect-inspector-panel.tsx src/features/tactical-unified/panels/right-panel/__tests__/ball-trajectory-inspector.test.tsx`
