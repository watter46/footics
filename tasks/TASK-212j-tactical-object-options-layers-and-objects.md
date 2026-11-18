# TASK-212j: ObjectOptions 命名統一 (Part 2: レイヤー・オブジェクト・小型テスト)

- **Status**: `TODO`
- **Commit**: `refactor(tactical): migrate layers, objects, and small tests to ObjectOptions naming`
- **Execution Waves**:
  - Wave 1: Phase 1, Phase 2, Phase 3 (parallel)
- **Negative Contracts**:
  - `absent: src/features/tactical-unified/core/components/__tests__/context-hud-extra.test.tsx`
  - `none` (残る大型テスト更新・旧ファイル削除は `TASK-212k` / `TASK-212l` で完結)

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. 本タスクは `TASK-212i` で導入された `ObjectOptions`, `isObjectOptionsOpen`, `setIsObjectOptionsOpen`, `reopenObjectOptionsOnEnd` を各レイヤー・オブジェクトへ完全に接続する。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `PitchGroundLayer.tsx`, `BillboardObjectLayer.tsx`, `use-canvas-zone-rotation.ts`, `player-vision-cone-handles.tsx`, `zone-polygon-node.tsx`, `zone-shape-node.tsx` の呼び出し・オプション名を新名称へ統一する。
  2. `context-hud-extra.test.tsx` を `object-options-extra.test.tsx` へ移設・更新し、旧ファイルを物理削除する。
- **Consumers (同期更新対象)**:
  - `PitchGroundLayer.tsx`, `BillboardObjectLayer.tsx`, `use-canvas-zone-rotation.ts`
  - `player-vision-cone-handles.tsx`, `zone-polygon-node.tsx`, `zone-shape-node.tsx`

## 2. Implementation Phases

### Phase 1: レイヤー・回転フックの `setIsObjectOptionsOpen` 切替
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/PitchGroundLayer.tsx` (L67, L165-L179)
  - `[MODIFY]` `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx` (L65, L165-L218)
  - `[MODIFY]` `src/features/tactical-unified/core/hooks/use-canvas-zone-rotation.ts` (L37, L109-L222)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/stores/session-store.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. 3ファイルの `useSessionStore((s) => s.setIsHudOpen)` 購読と依存配列をすべて `setIsObjectOptionsOpen` へ切り替える。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/components/__tests__/use-marker-drag-handlers-hud.test.tsx`（Phase 3 と併せて実行確認）:
    - `case 1`: レイヤー経由の選択・ドラッグ時に `isObjectOptionsOpen` が期待通り更新されること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/PitchGroundLayer.tsx src/features/tactical-unified/core/components/BillboardObjectLayer.tsx src/features/tactical-unified/core/hooks/use-canvas-zone-rotation.ts`

### Phase 2: 盤面オブジェクト3ファイルの更新
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/objects/player/components/player-vision-cone-handles.tsx` (L36, L170-L268)
  - `[MODIFY]` `src/features/tactical-unified/objects/zone/components/zone-polygon-node.tsx` (reopenObjectOptionsOnEnd)
  - `[MODIFY]` `src/features/tactical-unified/objects/zone/components/zone-shape-node.tsx` (reopenObjectOptionsOnEnd)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/hooks/use-object-drag-lifecycle.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. 視野角ハンドルは `setIsObjectOptionsOpen`、ゾーン2ノードは `reopenObjectOptionsOnEnd: true` を指定する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/__tests__/zone-and-text-drag-lifecycle.test.tsx`（Phase 3 で接続確認）:
    - `case 1`: ゾーン2種のドラッグ終了後に `isObjectOptionsOpen` が `true` に復帰すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/objects/player/components/player-vision-cone-handles.tsx src/features/tactical-unified/objects/zone/components/zone-polygon-node.tsx src/features/tactical-unified/objects/zone/components/zone-shape-node.tsx`

### Phase 3: 小〜中規模テスト3件更新と `object-options-extra.test.tsx` 移設
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/__tests__/zone-and-text-drag-lifecycle.test.tsx` (isObjectOptionsOpen)
  - `[MODIFY]` `src/features/tactical-unified/core/components/__tests__/use-marker-drag-handlers-hud.test.tsx` (setIsObjectOptionsOpen, isObjectOptionsOpen)
  - `[ADD]` `src/features/tactical-unified/core/components/__tests__/object-options-extra.test.tsx` (~226 lines)
  - `[DELETE]` `src/features/tactical-unified/core/components/__tests__/context-hud-extra.test.tsx`
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/components/ObjectOptions.tsx`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `context-hud-extra.test.tsx` を `object-options-extra.test.tsx` へ移植し、`ContextHud` / `isHudOpen` 参照を `ObjectOptions` / `isObjectOptionsOpen` へ更新する。
    2. `zone-and-text-drag-lifecycle.test.tsx` と `use-marker-drag-handlers-hud.test.tsx` のアサーションを新名称へ更新する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/components/__tests__/object-options-extra.test.tsx`（実 StoreProvider 接続）:
    - `case 1`: `renderExtraHud` / `resolveExtraTarget` プラグイン拡張と `isDragging === true` 時の非表示が動作すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/__tests__/zone-and-text-drag-lifecycle.test.tsx src/features/tactical-unified/core/components/__tests__/use-marker-drag-handlers-hud.test.tsx src/features/tactical-unified/core/components/__tests__/object-options-extra.test.tsx`
