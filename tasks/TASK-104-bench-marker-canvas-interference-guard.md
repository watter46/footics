# TASK-104: ベンチマーカーとメインキャンバスの干渉防止

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-29
- **Target Files**:
  - `src/features/tactical-unified/core/components/hud/hud-targets.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/ContextHud.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/player-ghost-trajectory-list.tsx` (MODIFY)
  - `src/features/tactical-unified/__tests__/pitch-bench-transition.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. **HUD 表示干渉防止**:
  - `resolveHudTarget` および `ContextHud` において、`area === 'bench'` の選手が選択された場合はメインキャンバス上に HUD を表示しないこと（`null` を返却）。
- [x] 2. **ゴースト軌道誤発動防止**:
  - `PlayerGhostTrajectoryList` において、`area === 'bench'` の選手はゴースト軌道の描画対象から除外し、キャンバス上に不自然な線やマーカーが出ないこと。
- [x] 3. **単体テストと検証**:
  - `pitch-bench-transition.test.ts` にテストを追加し、PASS すること。

## 3. Context Snippets (型定義・既存コード・設計原則)
```typescript
// hud-targets.ts: resolveHudTarget
if (selected.kind === 'player') {
  const player = data.markers.find((p) => p.id === selected.id);
  if (player?.area === 'bench') return null;
  return player ? resolvePlayerTarget(player, offset, nodesRegistryRef) : null;
}
```

## 4. Implementation Phases

### Phase 1: ベンチマーカーとメインキャンバスの干渉防止
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/core/components/hud/hud-targets.ts`
  - `src/features/tactical-unified/core/components/ContextHud.tsx`
  - `src/features/tactical-unified/core/components/player-ghost-trajectory-list.tsx`
  - `src/features/tactical-unified/__tests__/pitch-bench-transition.test.ts`
- **Tasks**:
  - [x] 1. テスト作成（RED確認）
  - [x] 2. `hud-targets.ts`, `ContextHud.tsx`, `player-ghost-trajectory-list.tsx` を修正（GREEN）
  - [x] 3. 検証実行（`bun run ai:check` PASS）
- **Worker Handoff Log**:
  - `resolveHudTarget`: `player.area === 'bench'` で `null` を返却。
  - `ContextHud`: 選択マーカーが `area === 'bench'` の場合に `null` を返却。
  - `PlayerGhostTrajectoryList`: `marker.area === 'bench'` の場合に `null` を返却。
  - 単体テスト全12件PASS。

---

## 5. Reviewer Assessment (コード差分監査基準)
- **Reviewer Model**: `pro`
- **Decision**: `LGTM`
- **Reviewed At**: 2026-10-29 01:10
- **Summary**: ベンチ選手の選択時およびゴースト軌道生成時におけるメインキャンバスへの干渉・誤作動が確実に防止されたことを確認。
- **Audit Checklist**:
  - [x] 1. **要件合致**: ベンチ選手でメインHUDが表示されず、ゴースト軌道も発動しないか。
  - [x] 2. **既存機能無欠陥**: ピッチ上の選手のHUD表示やゴースト軌道が正常に動作するか。
