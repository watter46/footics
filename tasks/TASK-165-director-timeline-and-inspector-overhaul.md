# TASK-165: ディレクターモードタイムライン整列・右パネルインスペクター化・再生連動・旧カメラ移動撤廃

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-08
- **Target Files**:
  - `src/features/tactical-unified/panels/right-panel/camera-control-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/__tests__/camera-control-panel.test.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/playback-controls.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/timeline-bar.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/director-camera-timeline.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/director-global-track.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/director-action-track.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/__tests__/director-camera-timeline.test.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/batch-transition-popover.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/slide-transition-popover.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/transition-connector.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/__tests__/slide-transition-popover.test.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/__tests__/transition-connector.test.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/camera-transition-section.tsx` (DELETE)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. **右パネルのディレクターカメラ連携**: `workspaceMode === 'director'` 時、`CameraControlPanel` が `directorCamera`（全体ピン＋アクションCue）の現在シーク位置（`playbackSeekTimeMs ?? 0`）の姿勢値（`resolveSyntheticDirectorCamera`）をスライダー（Tilt/Yaw/Zoom/Pan）および数値表示に双方向バインドすること。
- [x] 2. **リアルタイム更新＆レンダリング**: 右パネルでの Tilt/Yaw スライダー操作・数値変更・プリセットクリックで `upsertGlobalCameraKeyframe(currentTimeMs, ...)` が即座に発火し、Zoom/Pan スライダー操作・数値変更で `upsertActionCameraCue(currentTimeMs, ...)` が即座に発火して、3Dキャンバスがリアルタイムに即座にズーム・回転再描画されること。
- [x] 3. **アクション詳細インスペクター**: 右パネル内に、現在選択中（または現在シーク位置）のアクションCueに対する演出秒数チップ（0.5s/1.0s/2.0s/3.0s）、`autoReturn`（自動復帰）トグル、削除ボタンが表示・操作可能であること。
- [x] 4. **タイムラインのフル幅化**: `workspaceMode === 'director'` のとき、左側 `PlaybackControls` から Scene カウンターおよび Total 秒数表示を非表示にし、右側 `TimelineBar` から「一括設定」ボタンおよび「L-Click Add Scene / R-Click Duplicate」ヒントを非表示にして、中央タイムラインが横幅をフルに活用できること。
- [x] 5. **3段縦一列完全同幅化**: `DirectorCameraTimeline` 内の上段（シークバー）、中段（全体カメラトラック）、下段（アクションカメラトラック）が、同一のグリッド構造（左列: `w-14` 固定幅ラベル、中央列: `flex-1` の時間軸 0%〜100% トラック）で統一され、縦一列に左右端がピクセル単位で完全に揃うこと。
- [x] 6. **アクション重複サブレーン展開**: 同一区間に複数のアクションCue（Zoom/Pan）が存在する場合、`DirectorActionTrack` が自動的にサブレーン（縦の段組み）を生成し、重なり合うブロックを段違いで表示して個別選択・シーク可能にすること。
- [x] 7. **再生中のシークバー自動追従**: アニメーション再生中（`isPlaying === true`）、キャンバスの進行時間 `timeMs` に合わせてタイムラインの再生ヘッド位置（`playbackSeekTimeMs` またはタイムライン表示）が滑らかに右へ進み、停止時にその位置で止まること。
- [x] 8. **旧カメラ移動仕様の完全撤廃**: `BatchTransitionPopover`, `SlideTransitionPopover`, `TransitionConnector` から旧仕様のカメラ移動設定（`cameraTransitionMode`, `cameraDurationMs`）および CAM バッジ表示を完全消去し、`camera-transition-section.tsx` を削除すること（ボード画面のトランジション時間・イージング・一括設定機能はそのまま維持）。

## 2.5 Architectural Invariants & Why (破壊禁止の前提と設計理由)
<!-- ちゃぶ台返し防止の前提条件と、影響を受ける呼び出し元（Consumers）の同期確認リストを明記する -->
- **Invariants (破壊禁止の不変条件と理由)**:
  1. **単一カメラ射影パイプラインの維持**: 描画・書き出しエンジン（`tactical-frame-renderer.ts`, `matrix-mvp-engine.ts`）に渡す姿勢データは単一の `InterpolatedPitchTransformState` を維持し、合成解決は補間層（`interpolation-director.ts` / `resolveSyntheticDirectorCamera`）で完結させること。
  2. **Store Provider 境界と Single Source of Truth (Level 2 / Level 3)**: 右パネル・タイムライン・キャンバスはすべて `useTacticalUnifiedStoreContext` を介して `activePhase.directorCamera` を真実源として読み書きし、グローバルシングルトンの直呼び出しを禁止する。
  3. **再生ループのパフォーマンス (60fps 維持)**: 再生中のタイムライン追従において、過剰な重い再レンダリングループを起こさず、キャンバスの 60fps 描画を阻害しないこと。
- **Consumers (呼び出し元・別画面の同期確認リスト)**:
  - `src/features/tactical-unified/panels/right-panel/camera-control-panel.tsx`: `workspaceMode === 'director'` 時は `directorCamera`（`upsertGlobalCameraKeyframe`, `upsertActionCameraCue`）を更新し、`workspaceMode === 'board'` 時は従来通り `activeSlide.pitchTransform` を更新する。
  - `src/features/tactical-unified/panels/timeline/playback-controls.tsx`: `workspaceMode === 'director'` のとき、再生・一時停止ボタンのみを左端に表示。
  - `src/features/tactical-unified/panels/timeline/timeline-bar.tsx`: `workspaceMode === 'director'` のとき、右側の一括設定およびショートカットヒントを非表示。
  - `src/features/tactical-unified/panels/timeline/director-camera-timeline.tsx`, `director-global-track.tsx`, `director-action-track.tsx`: トラック幅を同一の `flex-1` コンテナで縦一列に配置し、右側のボタン類による幅の不整合を解消。
  - `src/features/tactical-unified/panels/timeline/batch-transition-popover.tsx`, `slide-transition-popover.tsx`, `transition-connector.tsx`: 旧カメラ移動関連のプロパティ参照をクリーンアップ。

## 3. Context Snippets (参照コード・型定義・import)
<!-- Workerが自律探索（Read/Grep）を行わずに実装できるよう、必要な文脈を過不足なく事前注入する -->

### 3.1 Import Specs
```ts
// Store Context & Selectors
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import {
  selectActivePhase,
  selectActivePhaseSlides,
  selectActiveSlide,
} from '@/features/tactical-unified/stores/tactical-unified-selectors';

// Types
import type { ActionCameraCue, GlobalCameraKeyframe, DirectorCameraTrack } from '@/lib/types/tactical-unified';

// Camera Interpolation & Resolution
import {
  calculateUnifiedTotalDuration,
  hasActiveDirectorCameraTrack,
  resolveSyntheticDirectorCamera,
} from '@/lib/tactical/unified-interpolation';
```

### 3.2 Key Interfaces & Formulas
```ts
// サブレーン（段組み）割り当てアルゴリズム（重複検知）
export function layoutActionCuesIntoLanes(cues: ActionCameraCue[]): ActionCameraCue[][] {
  const sorted = [...cues].sort((a, b) => a.startTimeMs - b.startTimeMs);
  const lanes: ActionCameraCue[][] = [];

  for (const cue of sorted) {
    let placed = false;
    const cueEnd = cue.startTimeMs + (cue.durationMs ?? 1000);
    for (let i = 0; i < lanes.length; i++) {
      const lastCue = lanes[i][lanes[i].length - 1];
      const lastEnd = lastCue.startTimeMs + (lastCue.durationMs ?? 1000);
      if (cue.startTimeMs >= lastEnd) {
        lanes[i].push(cue);
        placed = true;
        break;
      }
    }
    if (!placed) {
      lanes.push([cue]);
    }
  }
  return lanes;
}
```

---

## 4. Implementation Phases (Worker 実装手順)
<!-- 1〜4ファイルは1 Phase一括、5ファイル以上は1 Phase最大4ファイル（テスト含め6ファイル）以下に分割、15ファイル超は連番タスク（TASK-XXXa, TASK-XXXb）に分割 -->

### Phase 1: 右パネル（CameraControlPanel）のディレクターカメラ・インスペクター化＆リアルタイム同期
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/right-panel/camera-control-panel.tsx`
  - `src/features/tactical-unified/panels/right-panel/__tests__/camera-control-panel.test.tsx`
- **契約 (Exact Contract & Formula)**:
  1. **コンポーネント配置**: Level 2 / Level 3 Domain UI パネル。
  2. **取得する状態・アクション**:
     - `workspaceMode = useTacticalUnifiedStoreContext((s) => s.workspaceMode)`
     - `playbackSeekTimeMs = useTacticalUnifiedStoreContext((s) => s.playbackSeekTimeMs)`
     - `activePhase = useTacticalUnifiedStoreContext(selectActivePhase)`
     - `activeSlide = useTacticalUnifiedStoreContext(selectActiveSlide)`
     - `activeSlideId = useTacticalUnifiedStoreContext((s) => s.activeSlideId)`
     - `upsertGlobalCameraKeyframe = useTacticalUnifiedStoreContext((s) => s.upsertGlobalCameraKeyframe)`
     - `upsertActionCameraCue = useTacticalUnifiedStoreContext((s) => s.upsertActionCameraCue)`
     - `deleteActionCameraCue = useTacticalUnifiedStoreContext((s) => s.deleteActionCameraCue)`
     - `updatePitchTransform = useTacticalUnifiedStoreContext((s) => s.updatePitchTransform)`
  3. **表示値の計算**:
     - `currentTimeMs = playbackSeekTimeMs ?? 0`
     - `const isDirectorMode = workspaceMode === 'director';`
     - `directorCamera = activePhase?.directorCamera;`
     - `isDirectorMode` のとき、現在のカメラ値は `hasActiveDirectorCameraTrack(directorCamera) ? resolveSyntheticDirectorCamera(directorCamera, currentTimeMs) : (activeSlide?.pitchTransform ?? { tilt: 0, yaw: 90, zoom: 1, panX: 0, panY: 0 })` から取得する。
     - `isDirectorMode === false` のときは従来通り `activeSlide?.pitchTransform` を参照。
  4. **操作時のハンドラ分岐**:
     - **Tilt 変更 (`handleTiltChange(value)`)**:
       - `clamped = Math.max(0, Math.min(65, value))`
       - `isDirectorMode` なら `upsertGlobalCameraKeyframe(currentTimeMs, { tilt: clamped })` を発火し、後方互換で `if (activeSlideId) updatePitchTransform(activeSlideId, { tilt: clamped })` も呼ぶ。
       - ボードモードなら従来通り `updatePitchTransform(activeSlideId, { tilt: clamped })`。
     - **Yaw 変更 (`handleYawChange(value)`)**:
       - `clamped = ((value % 360) + 360) % 360`
       - `isDirectorMode` なら `upsertGlobalCameraKeyframe(currentTimeMs, { yaw: clamped })` を発火し、後方互換で `updatePitchTransform` も呼ぶ。
       - ボードモードなら従来通り `updatePitchTransform`。
     - **プリセットクリック**:
       - `isDirectorMode` なら `upsertGlobalCameraKeyframe(currentTimeMs, { tilt: preset.tilt, yaw: preset.yaw })` を発火。
       - ボードモードなら従来通り `updatePitchTransform`。
     - **Reset クリック**:
       - `isDirectorMode` なら `upsertGlobalCameraKeyframe(currentTimeMs, { tilt: 0, yaw: 90 })` および `upsertActionCameraCue(currentTimeMs, { zoom: 1, panX: 0, panY: 0 })` を発火。
     - **Zoom コントロール（新規追加）**:
       - スライダー (`min={0.4}`, `max={3.0}`, `step={0.05}`) & 数値入力。
       - 変更時、`isDirectorMode` なら `upsertActionCameraCue(currentTimeMs, { zoom: value, panX: currentPanX, panY: currentPanY })` を発火。
       - ボードモードなら `updatePitchTransform(activeSlideId, { zoom: value })`。
     - **PanX / PanY コントロール**:
       - 数値微調整またはリセットボタン。
       - 変更時、`isDirectorMode` なら `upsertActionCameraCue(currentTimeMs, { panX: valueX, panY: valueY, zoom: currentZoom })` を発火。
     - **ディレクターモード専用アクションCue詳細セクション**:
       - 現在シーク時刻が該当するCue（または直近選択中のCue）が存在する場合、右パネル内に以下を表示:
         - 秒数チップ: `0.5s`, `1.0s`, `2.0s`, `3.0s` (`upsertActionCameraCue(cue.startTimeMs, { durationMs }, cue.id)`)
         - 「自動で戻る (`autoReturn`)」トグル (`upsertActionCameraCue(cue.startTimeMs, { autoReturn: !cue.autoReturn }, cue.id)`)
         - 「アクション削除」ボタン (`deleteActionCameraCue(cue.id)`)
- **Testing Strategy (Concrete Test Values)**:
  - テストファイル: `src/features/tactical-unified/panels/right-panel/__tests__/camera-control-panel.test.tsx`
  - 検証ケース:
    1. `workspaceMode: 'director'`, `playbackSeekTimeMs: 1500` のとき、Tiltスライダーを `30` に変更すると `upsertGlobalCameraKeyframe(1500, { tilt: 30 })` が呼ばれること。
    2. `workspaceMode: 'director'`, `playbackSeekTimeMs: 2000` のとき、Zoomスライダーを `2.0` に変更すると `upsertActionCameraCue(2000, expect.objectContaining({ zoom: 2.0 }))` が呼ばれること。
    3. `workspaceMode: 'director'` でプリセットボタン（俯瞰: `tilt: 0, yaw: 90`）をクリックしたとき、`upsertGlobalCameraKeyframe` が現在シーク時刻で呼ばれること。
    4. `workspaceMode: 'board'` のときは従来通り `updatePitchTransform` が呼ばれること。
- **Tasks**:
  - [x] 1. TDD実装: `camera-control-panel.test.tsx` にテスト追加（RED） ➔ `camera-control-panel.tsx` を実装（GREEN） ➔ `bun run ai:check src/features/tactical-unified/panels/right-panel/camera-control-panel.tsx src/features/tactical-unified/panels/right-panel/__tests__/camera-control-panel.test.tsx` PASS
- **Worker Handoff Log**:
  - `CameraControlPanel` をディレクターカメラ（全体ピン/アクションCue）とリアルタイム双方向同期化。単一責任分離として `DirectorCueInspector` (`findActiveActionCue`), `CameraSliderField`, `CameraPanControl` を新設。

---

### Phase 2: タイムラインのフル幅化・3段完全整列＆アクション重複サブレーン展開
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/timeline/playback-controls.tsx`
  - `src/features/tactical-unified/panels/timeline/timeline-bar.tsx`
  - `src/features/tactical-unified/panels/timeline/director-camera-timeline.tsx`
  - `src/features/tactical-unified/panels/timeline/director-global-track.tsx`
  - `src/features/tactical-unified/panels/timeline/director-action-track.tsx`
  - `src/features/tactical-unified/panels/timeline/__tests__/director-camera-timeline.test.tsx`
- **契約 (Exact Contract & Formula)**:
  1. **`playback-controls.tsx`**:
     - `const workspaceMode = useTacticalUnifiedStoreContext((s) => s.workspaceMode);`
     - `workspaceMode === 'director'` のとき、Scene カウンターおよび Total 秒数表示（行58-69の `<div className="flex flex-col ...">`）を描画せず、再生/一時停止ボタンのみを描画する。
  2. **`timeline-bar.tsx`**:
     - `workspaceMode === 'director'` のとき、右側の「一括設定」ボタン（行237-253）および操作ヒント（行255-268）を描画しない（中央の `<DirectorCameraTimeline />` が右端まで `flex-1` で拡張される）。
  3. **3段縦一列完全同幅化 (`director-camera-timeline.tsx`)**:
     - ルートコンテナ: `<div data-testid="director-camera-timeline" className="flex flex-col gap-1.5 flex-1 min-w-0 py-1 select-none justify-center">`
     - **上段（シークバー）**:
       - 左ラベル: `<span data-testid="director-scrubber-time" className="text-[9px] font-mono text-[#A1A1AA] shrink-0 w-14 text-right">{(currentTimeMs / 1000).toFixed(1)}s</span>`
       - 中央トラック: `<div className="relative flex-1 h-5 flex items-center"><input type="range" data-testid="director-scrubber-input" min={0} max={totalDurationMs} step={50} value={Math.round(currentTimeMs)} onChange={(e) => seekTo(Number(e.target.value))} className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FF8100]" /></div>`
       - 右側の余計な追加ボタン・削除ボタンを全廃（キャンバス操作または右パネルで自動・直接編集）。
     - **中段（全体カメラトラック）**:
       - 左ラベル: `<span className="text-[9px] font-mono text-[#60A5FA]/80 shrink-0 w-14 text-right">全体</span>`
       - 中央トラック: `DirectorGlobalTrack`（コンテナ `relative flex-1 h-5 bg-[#0D0D0E] rounded border border-white/[0.07] overflow-hidden`）
     - **下段（アクションカメラトラック）**:
       - 左ラベル: `<span className="text-[9px] font-mono text-[#FF8100]/80 shrink-0 w-14 text-right">アクション</span>`
       - 中央トラック: `DirectorActionTrack`（コンテナ `relative flex-1 bg-[#0D0D0E] rounded border border-white/[0.07] overflow-hidden`）
       - トラック右側の秒数チップ・自動で戻る・削除ボタンのインライン展開を廃止（右パネルへ完全移行）。
     - これにより、上・中・下の中央トラックコンテナはすべて左オフセット `w-14` + `gap-2` で揃い、右端まで寸分違わず同じ横幅になる。
  4. **サブレーン（段組み）自動展開 (`director-action-track.tsx`)**:
     - `layoutActionCuesIntoLanes(actionCues)` を呼び出して `lanes: ActionCameraCue[][]` を生成。
     - レーン数が 1 の場合はトラック高さ `h-6`、2以上の場合は `h-[calc(1.5rem*${lanes.length})]`（各レーン `h-5`）で縦に並べる。
     - 各レーン内でブロックを配置し、重なり合う Cue を段違いで完全に視覚化・クリック選択可能にする。
- **Testing Strategy (Concrete Test Values)**:
  - テストファイル: `src/features/tactical-unified/panels/timeline/__tests__/director-camera-timeline.test.tsx`
  - 検証ケース:
    1. 上段シークバー、中段全体トラック、下段アクショントラックのラベル幅がすべて `w-14` で統一されていること。
    2. 重複する2つのアクションCue（例: Cue 1: `startTimeMs: 1000, durationMs: 2000`, Cue 2: `startTimeMs: 2000, durationMs: 1000`）があるとき、サブレーンが2段生成され、各ブロックが異なる縦位置にレンダリングされること。
    3. `workspaceMode === 'director'` のとき、右側の一括設定ボタンとショートカットヒントが非表示になっていること。
- **Tasks**:
  - [x] 1. TDD実装: `director-camera-timeline.test.tsx` にテスト追加（RED） ➔ `playback-controls.tsx`, `timeline-bar.tsx`, `director-camera-timeline.tsx`, `director-global-track.tsx`, `director-action-track.tsx` を実装（GREEN） ➔ `bun run ai:check src/features/tactical-unified/panels/timeline/playback-controls.tsx src/features/tactical-unified/panels/timeline/timeline-bar.tsx src/features/tactical-unified/panels/timeline/director-camera-timeline.tsx src/features/tactical-unified/panels/timeline/director-global-track.tsx src/features/tactical-unified/panels/timeline/director-action-track.tsx src/features/tactical-unified/panels/timeline/__tests__/director-camera-timeline.test.tsx` PASS
- **Worker Handoff Log**:
  - `layoutActionCuesIntoLanes` を `director-action-track.tsx` から export。重複する Cue 区間は自動でサブレーン（段組み）展開され、全3段のトラックは `w-14` + `flex-1` で縦一列完全同幅化。

---

### Phase 3: 再生ループとシークバーの自動追従連動＆旧カメラ移動の完全撤廃
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts`
  - `src/features/tactical-unified/panels/timeline/batch-transition-popover.tsx`
  - `src/features/tactical-unified/panels/timeline/slide-transition-popover.tsx`
  - `src/features/tactical-unified/panels/timeline/transition-connector.tsx`
  - `src/features/tactical-unified/panels/timeline/__tests__/slide-transition-popover.test.tsx`
  - `src/features/tactical-unified/panels/timeline/__tests__/transition-connector.test.tsx`
- **契約 (Exact Contract & Formula)**:
  1. **再生中のシークバー自動追従 (`use-export-preview-animation.ts`)**:
     - `seekTo = useTacticalUnifiedStoreContext((s) => s.seekTo);`
     - `workspaceMode = useTacticalUnifiedStoreContext((s) => s.workspaceMode);`
     - `useExportPreviewAnimation` の `drawFrame(timeMs)` において:
       - `if (effectiveIsPlaying && workspaceMode === 'director')`:
         - 毎フレーム Store の `playbackSeekTimeMs` を更新すると React の負荷が高まるため、直前更新時刻からの経過が `Math.abs(timeMs - lastSeekNoticeTimeRef.current) >= 60`（約16fps〜20fpsスロットル）のとき、`seekTo(timeMs)` を呼び出して Store の `playbackSeekTimeMs` を更新する。
         - アニメーション停止時（`isPlaying` が true ➔ false になった瞬間）は、最終到達時刻 `currentTimeMsRef.current` で 1 回確実に `seekTo` を呼び出す。
  2. **旧カメラ移動仕様の完全撤廃**:
     - `src/features/tactical-unified/panels/timeline/camera-transition-section.tsx` を削除する。
     - `batch-transition-popover.tsx`:
       - `CameraTransitionSection` のインポートおよび描画を削除。
       - `cameraTransitionMode`, `cameraDurationMs` の一括更新ロジックを削除（トランジション時間・イージングのみの一括設定に純化）。
     - `slide-transition-popover.tsx`:
       - `CameraTransitionSection` のインポートおよび描画を削除。
       - `cameraTransitionMode`, `cameraDurationMs` の個別更新ロジックを削除。
     - `transition-connector.tsx`:
       - `cameraBadgeText`（`CAM 10.0s`, `CAM 継続`, `CAM CUT`）の計算・表示コードを削除。
     - 既存テストファイル（`slide-transition-popover.test.tsx`, `transition-connector.test.tsx`）から、削除されたカメラ移動設定のテストケースを削除または更新する。
- **Testing Strategy (Concrete Test Values)**:
  - テストファイル: `src/features/tactical-unified/panels/timeline/__tests__/slide-transition-popover.test.tsx`, `src/features/tactical-unified/panels/timeline/__tests__/transition-connector.test.tsx`
  - 検証ケース:
    1. `BatchTransitionPopover` および `SlideTransitionPopover` を開いたとき、カメラ移動設定UIが存在せず、トランジション時間とイージングのみが設定可能であること。
    2. `TransitionConnector` に `CAM` バッジが表示されないこと。
    3. `useExportPreviewAnimation` で再生中、スロットル間隔で `seekTo` が通知され、シークバー位置が自動前進すること。
- **Tasks**:
  - [x] 1. TDD実装: テスト更新（RED） ➔ `camera-transition-section.tsx` 削除 ➔ `use-export-preview-animation.ts`, `batch-transition-popover.tsx`, `slide-transition-popover.tsx`, `transition-connector.tsx` を実装（GREEN） ➔ `bun run ai:check src/features/tactical-unified/panels/export/use-export-preview-animation.ts src/features/tactical-unified/panels/timeline/batch-transition-popover.tsx src/features/tactical-unified/panels/timeline/slide-transition-popover.tsx src/features/tactical-unified/panels/timeline/transition-connector.tsx src/features/tactical-unified/panels/timeline/__tests__/slide-transition-popover.test.tsx src/features/tactical-unified/panels/timeline/__tests__/transition-connector.test.tsx` PASS
- **Worker Handoff Log**:
  - `useExportPreviewAnimation` に director モード時の 60ms スロットル `seekTo` 自動追従および停止時通知（内部フラグによる二重シーク抑止）を実装。
  - `camera-transition-section.tsx` を削除し、`BatchTransitionPopover`, `SlideTransitionPopover`, `TransitionConnector` から旧カメラ移動UI/バッジを完全撤廃。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-08 18:12
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. ドメイン論理 & 要件網羅性 & テスタビリティ: 数式/座標/状態遷移の整合性、受入要件の全網羅、Concrete Test Values検証、ハック排除
  - [x] 2. Invariants保護 & Consumer同期: Section 2.5 の不変条件（ちゃぶ台返し防止）遵守、別画面・呼び出し元（Consumers）の更新漏れゼロ
  - [x] 3. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 4. 設計負債 & サイレント破壊防止: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、公開シグネチャ保護、指示外変更の排除
- **Summary**:
  右パネルのディレクターカメラ（全体ピン/アクションCue）リアルタイム双方向同期、重複Cueのサブレーン自動展開、3段トラック完全同幅整列、スロットル付き再生シーク追従、旧カメラ移動設定の完全撤廃をすべて確認。4大定性監査を完璧にクリア。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
