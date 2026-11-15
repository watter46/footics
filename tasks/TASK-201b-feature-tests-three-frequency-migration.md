# TASK-201b: `tactical-unified/__tests__/*` 機能結合テスト群の 3-frequency store 移行

- **Status**: `TODO`
- **Assign**: `worker`
- **Commit**: `test(tactical-unified): migrate tactical feature test suites to three-frequency stores and engine helpers`
- **Execution Waves**:
  - Wave 1 (並列): Phase 1 (`onion-skinning.test.ts` + `benchmark-presets.test.ts` + `tracking-arrow-and-ball-trajectory.test.ts`), Phase 2 (`undo-redo-history.test.ts` + `pitch-zoom-pan.test.ts`), Phase 3 (`zone-features.test.ts` + `pitch-tilt-store.test.ts`), Phase 4 (`multi-player-drag.test.ts` 1+1), Phase 5 (`timeline-slide-operations.test.ts` 1+1)
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/__tests__/): useTacticalUnifiedStore|tactical-unified-store|unified-interpolation|interpolation-annotation`

---

## 1. Architectural Invariants & Design Decisions

- **Invariants (壊してはいけない前提条件)**:
  1. `src/features/tactical-unified/__tests__/*` の機能テストはすべて `createDocumentStore`・`createSessionStore`・`createPlaybackStore`・`domain-selectors`・`engine/` の実モジュールを直接実行して検証し、内部ストアやドメイン関数の `vi.mock` を禁止する。
  2. 旧 `useTacticalUnifiedStore` のメソッド呼び出しを 3-frequency store の `dispatch` / `dispatchSlide` / `sessionStore` アクション / `playbackStore` アクションへ 1:1 対応させて仕様網羅性を維持する。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `>300 lines` のテストファイル（`multi-player-drag.test.ts` 360L、`timeline-slide-operations.test.ts` 400L）は `1+1` ルールに従い単独 Phase へ分離する。
  2. 補間テストが含まれていた `tracking-arrow-and-ball-trajectory.test.ts`（`interpolateBall`）および `zone-features.test.ts`（`interpolateZone`）はそれぞれ `evaluateTimelineFrame`（`@/lib/tactical/engine/timeline-evaluator`）および `interpolateZones`（`@/lib/tactical/engine/slide-entity-interpolators`）を直接テストする。
- **Consumers (同期更新対象)**:
  - `onion-skinning.test.ts`, `benchmark-presets.test.ts`, `tracking-arrow-and-ball-trajectory.test.ts`, `undo-redo-history.test.ts`, `pitch-zoom-pan.test.ts`, `zone-features.test.ts`, `pitch-tilt-store.test.ts`, `multi-player-drag.test.ts`, `timeline-slide-operations.test.ts`

---

## 2. Implementation Phases

### Phase 1: `onion-skinning`・`benchmark-presets`・`tracking-arrow-and-ball-trajectory` の移行

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/__tests__/onion-skinning.test.ts` (163 lines)
  - `[MODIFY]` `src/features/tactical-unified/__tests__/benchmark-presets.test.ts` (78 lines)
  - `[MODIFY]` `src/features/tactical-unified/__tests__/tracking-arrow-and-ball-trajectory.test.ts` (164 lines)
- **Contract & Concrete Test Cases**:
  1. `onion-skinning.test.ts`: `createDocumentStore` + `selectDomainPreviousSlide` + `compileSceneGraph(..., prevSlide)` で前スライド未存在時・並べ替え時・オニオンスキン選手/ボール解決を検証する。
  2. `benchmark-presets.test.ts`: `calculateUnifiedTotalDuration` のインポート元を `@/lib/tactical/engine/director-camera` へ切り替える。
  3. `tracking-arrow-and-ball-trajectory.test.ts`: `useTacticalUnifiedStore`・`interpolateBall` を `createDocumentStore` + `evaluateTimelineFrame` へ移行し、ボール軌道更新・ベジェ補間移動・`FLIP_SIDES` 反転を検証する。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/__tests__/onion-skinning.test.ts src/features/tactical-unified/__tests__/benchmark-presets.test.ts src/features/tactical-unified/__tests__/tracking-arrow-and-ball-trajectory.test.ts`

---

### Phase 2: `undo-redo-history` と `pitch-zoom-pan` の 3-frequency store 移行

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/__tests__/undo-redo-history.test.ts` (285 lines)
  - `[MODIFY]` `src/features/tactical-unified/__tests__/pitch-zoom-pan.test.ts` (218 lines)
- **Contract & Concrete Test Cases**:
  1. `undo-redo-history.test.ts`: `createDocumentStore` の `past`/`future`・`undo()`/`redo()` で選手・アノテーション・フォーメーション/反転・スライド追加削除・50件上限・確定時 `future` クリアを検証する。
  2. `pitch-zoom-pan.test.ts`: `createDocumentStore` で `pitchTransform`（`isLocked`, `panX`, `panY`, `zoom`）・`boundaryBox` 非干渉・スライド複製保持・座標逆変換・ポインタ固定ズーム・Marquee 選択ボックス判定を検証する。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/__tests__/undo-redo-history.test.ts src/features/tactical-unified/__tests__/pitch-zoom-pan.test.ts`

---

### Phase 3: `zone-features` と `pitch-tilt-store` の移行

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/__tests__/zone-features.test.ts` (220 lines)
  - `[MODIFY]` `src/features/tactical-unified/__tests__/pitch-tilt-store.test.ts` (151 lines)
- **Contract & Concrete Test Cases**:
  1. `zone-features.test.ts`: `useTacticalUnifiedStore` を `createDocumentStore` に、旧 `interpolateZone` テストを `@/lib/tactical/engine/slide-entity-interpolators` の `interpolateZones` に置換する。
  2. `pitch-tilt-store.test.ts`: `useTacticalUnifiedStore` を `createDocumentStore` に置換し、`tilt` / `yaw` 更新・センターリセット（`yaw=0` 等ドメイン既定値確認）・`boundaryBox` 非干渉・`CLONE_SLIDE` 引継ぎを検証する。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/__tests__/zone-features.test.ts src/features/tactical-unified/__tests__/pitch-tilt-store.test.ts`

---

### Phase 4: `multi-player-drag.test.ts` の 1+1 移行

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/__tests__/multi-player-drag.test.ts` (360 lines)
- **Contract & Concrete Test Cases**:
  - `createDocumentStore` + `createSessionStore` + ドメインマルチ選手移動コマンド/アクションを使用し、複数選手同時移動・セーフティ境界(-100〜200%)・接続パス矢印両端追従・非接続要素維持・空配列ガード・複数選択/範囲選択（Shift 追加）を検証する。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/__tests__/multi-player-drag.test.ts`

---

### Phase 5: `timeline-slide-operations.test.ts` の 1+1 移行

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/__tests__/timeline-slide-operations.test.ts` (400 lines)
- **Contract & Concrete Test Cases**:
  - `createDocumentStore` + `createPlaybackStore` + `createSessionStore` を使用し、`ADD_SLIDE`（object-free / full / blank モード）、`CLONE_SLIDE`（trajectory リセット・背景/外観維持）、`REORDER_SLIDES`、再生トグル・停止の全ケースを検証する。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/__tests__/timeline-slide-operations.test.ts`
