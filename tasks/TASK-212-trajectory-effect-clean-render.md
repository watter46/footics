# TASK-212: ボード画面（cleanRender）での軌道エフェクト描画対応

- **Status**: `DONE`
- **Commit**: `fix(tactical): render TrajectoryEffectLine during cleanRender board playback`
- **Execution Waves**: Wave 1 (Phase 1)

## Negative Contracts
- `none`

## 1. Architectural Invariants & Design Decisions
- **描画境界**: 編集用ゴースト（`PitchGroundGhosts`）は `!cleanRender` 時のみ描画し、エフェクトとして有効化された `TrajectoryEffectLine` は `cleanRender=true` 時（ボード画面・イージング再生・書き出し）でも描画する。

---

### Phase 1: PitchGroundLayer の cleanRender 時 TrajectoryEffectLine 描画とテスト追加

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/PitchGroundLayer.tsx`
  - `[MODIFY]` `src/features/tactical-unified/core/components/__tests__/clean-render.test.tsx`
- **Reference Files**:
  - `src/features/tactical-unified/core/components/trajectory-effect-line.tsx`

#### Contract
1. **PitchGroundLayer.tsx**:
   - `sceneGraph.trajectories.map(...)` を囲んでいた `{!cleanRender && ...}` を外し、`cleanRender` が `true` でも `TrajectoryEffectLine` を描画する。
   - `cleanRender` が `true` の場合は `selectedIds.includes(traj.playerId)` によるスキップを行わず（`!cleanRender && selectedIds.includes(traj.playerId)`）、選択状態に関わらずエフェクト軌道を描画する。
   - `PitchGroundGhosts` は引き続き `{!cleanRender && (...)}` の条件を維持する。
2. **clean-render.test.tsx**:
   - `cleanRender={true}` かつ `trajectoryEffect.enabled === true` の選手・ボールが存在する場合に `TrajectoryEffectLine` が描画され、`PitchGroundGhosts` は描画されないことを検証するテストケースを追加する。

#### Verification
- `bun run ai:check src/features/tactical-unified/core/components/PitchGroundLayer.tsx src/features/tactical-unified/core/components/__tests__/clean-render.test.tsx`
