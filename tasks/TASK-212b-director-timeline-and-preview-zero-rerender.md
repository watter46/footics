# TASK-212b: レイアウト・プレビュー・タイムライン・カメラパネルの 60fps 再レンダー根絶

- **Status**: `TODO`
- **Commit**: `perf(tactical): eliminate 60fps playback React rerenders in director timeline, split preview, and camera panel`
- **Execution Waves**:
  - Wave 1: Phase 1, Phase 2, Phase 3, Phase 4 (parallel: preview hook, split preview, director timeline, camera/timeline/canvas selectors)
  - Wave 2: Phase 5 (sequential after Wave 1: regression performance tests)
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/panels/export/use-export-preview-animation.ts,src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx,src/features/tactical-unified/panels/timeline/director-camera-timeline.tsx): usePlaybackStore\(\(s\) => .*timeMs|useStore\(playbackStore, .*timeMs`
  - `rg(src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx,src/features/tactical-unified/panels/timeline/director-camera-timeline.tsx,src/features/tactical-unified/panels/timeline/timeline-bar.tsx,src/features/tactical-unified/panels/timeline/playback-controls.tsx,src/features/tactical-unified/views/FullTacticalCanvas.tsx): useDocumentStore\(\(s\) => s\.project\)`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. レイアウト画面（`workspaceMode === 'director'`）およびエクスポート画面の Canvas2D プレビュー再生・シークバー操作・時刻表示（`0.0s`）・全体カメラピン/アクションCue選択が従来通り連動すること。
  2. `director-camera-timeline.test.tsx` のシーク操作テストおよび `use-export-preview-animation.test.ts`・`export-preview-camera-sync.test.tsx` の全ケースが PASS すること。
  3. 再生停止時（`isPlaying === false`）のカメラ数値表示（Tilt/Yaw/Zoom/Pan）と、シーク位置でのキーフレーム・Cue編集が正確に機能すること。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `useExportPreviewAnimation` は `useStore(playbackStore, (s) => Number(s.timeMs))` を廃止し、`useEffect` 内の `playbackStore.subscribe()` で外部シーク変化を検知して直接 `seek(Number(state.timeMs))` を駆動する（エコー防止用 `lastDispatchedSeekMsRef` ガードを維持）。
  2. `TacticalSplitPreviewPanel` は `playbackTimeMs` 購読を廃止し、ポインタ操作および `usePreviewWheelZoom` 内で `playbackStore.getState().timeMs` を同期参照し、必要な瞬間のみ `resolveSyntheticDirectorCamera` / `findActiveActionCue` を算出する。
  3. `DirectorCameraTimeline` は `timeLabelRef`・`sliderRef`（`defaultValue` 化）・`globalPlayheadRef`・`actionPlayheadRef` を `playbackStore.subscribe()` で直接書き換え、`DirectorGlobalTrack` / `DirectorActionTrack` から `currentTimeMs: number` props を廃止して `playheadRef` props（React 19 通常 ref、forwardRef 禁止）へ移行する。
  4. `CameraControlPanel` は `usePlaybackStore((s) => (s.isPlaying ? 0 : s.timeMs))` でボード/レイアウト両モードの再生中再レンダーを完全遮断し、スライダ・ボタン操作ハンドラ内で `Number(playbackStore.getState().timeMs)` を同期取得する。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts`
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx`
  - `src/features/tactical-unified/panels/split-preview/use-preview-wheel-zoom.ts`
  - `src/features/tactical-unified/panels/timeline/director-camera-timeline.tsx`
  - `src/features/tactical-unified/panels/timeline/director-global-track.tsx`
  - `src/features/tactical-unified/panels/timeline/director-action-track.tsx`
  - `src/features/tactical-unified/panels/right-panel/camera-control-panel.tsx`
  - `src/features/tactical-unified/panels/timeline/timeline-bar.tsx`
  - `src/features/tactical-unified/panels/timeline/playback-controls.tsx`
  - `src/features/tactical-unified/views/FullTacticalCanvas.tsx`

## 2. Implementation Phases

### Phase 1: `useExportPreviewAnimation` の `playbackStore.subscribe()` 直接同期化
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/export/use-export-preview-animation.ts` (L65-L95, L250-L280)
  - `[MODIFY]` `src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts` (必要時のみ同期確認)
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `const playbackTimeMs = useStore(playbackStore, (s) => Number(s.timeMs))` を削除する。
    2. `useEffect` 内で `playbackStore.subscribe((state, prevState) => ...)` を登録し、`!stores` の場合は購読せず、`state.timeMs === prevState.timeMs` なら即リターンする。
    3. `nextMs = Number(state.timeMs)` が `lastStoreTimeMsRef.current` と異なる場合、`lastDispatchedSeekMsRef.current` とのエコー一致（`Math.abs(nextMs - lastDispatchedSeekMsRef.current) < 1e-6`）であれば無視・リセットし、外部シークであれば `seek(nextMs)` を呼び出して Canvas2D・`timeLabelRef`・`sliderRef` を React 再レンダーなしで更新する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts`（既存テスト全 PASS・外部シーク追従確認）
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/export/use-export-preview-animation.ts src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts`

### Phase 2: `TacticalSplitPreviewPanel` & `usePreviewWheelZoom` の非リアクティブ時刻参照化
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx` (L29-L250)
  - `[MODIFY]` `src/features/tactical-unified/panels/split-preview/use-preview-wheel-zoom.ts` (L1-L100)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/stores/domain-selectors.ts`
- **Contract**:
  ```ts
  // usePreviewWheelZoom params:
  // currentTimeMs: number を削除し、以下を受け取る:
  getCurrentTimeMs: () => number;
  resolveCameraAtTime?: (timeMs: number) => {
    activeCue?: ActionCameraCue;
    resolvedCamera: PitchTransform | null;
  };
  ```
  - 振る舞い仕様・境界条件:
    1. `TacticalSplitPreviewPanel` から `usePlaybackStore((s) => Number(s.timeMs))` および `useDocumentStore((s) => s.project)` を削除し、`useTacticalStoresContext()` から `playbackStore` を取得する。
    2. `slides` / `activeSlide` / `activePhase` / `aspectRatio` / `boundaryBox` / `pitchAppearance` / `screenBackground` はそれぞれ `useDocumentStore((s) => selectDomain... )` の細粒度セレクタで購読する。
    3. `handlePointerDown` と `handlePointerUp` では `Number(playbackStore.getState().timeMs)` を同期取得し、その時刻で `resolveSyntheticDirectorCamera` を評価する（`isPlaying` が `false` の初期表示および停止時の `resolvedCamera` は静止時用に `playbackStore.getState().timeMs` をイベント内で参照するか、`activePhase?.directorCamera` の有無のみ `isDirectorCameraActive` として保持する）。
    4. `usePreviewWheelZoom` のネイティブ `wheel` リスナー内では `getCurrentTimeMs()` と `resolveCameraAtTime?.(timeMs)` を呼んで現在時刻・現在カメラ・`activeCue` を同期取得し、`upsertActionCameraCue` へ渡す。
- **Concrete Test Cases**:
  - 既存 `src/features/tactical-unified/__tests__/tactical-unified-page-modes.test.tsx` および `src/features/tactical-unified/panels/export/__tests__/export-preview-camera-sync.test.tsx` が PASS すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx src/features/tactical-unified/panels/split-preview/use-preview-wheel-zoom.ts`

### Phase 3: `DirectorCameraTimeline` & トラック群の Ref 直接駆動化
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/timeline/director-camera-timeline.tsx` (L14-L135)
  - `[MODIFY]` `src/features/tactical-unified/panels/timeline/director-global-track.tsx` (L7-L60)
  - `[MODIFY]` `src/features/tactical-unified/panels/timeline/director-action-track.tsx` (L60-L150)
  - `[MODIFY]` `src/features/tactical-unified/panels/timeline/__tests__/director-camera-timeline.test.tsx`
- **Contract**:
  ```ts
  // DirectorGlobalTrackProps / DirectorActionTrackProps:
  // currentTimeMs: number を削除し、以下に置換:
  playheadRef?: React.Ref<HTMLDivElement>;
  initialTimeMs?: number;
  ```
  - 振る舞い仕様・境界条件:
    1. `DirectorCameraTimeline`: `usePlaybackStore((s) => s.timeMs)` および `useDocumentStore((s) => s.project)` を削除し、`useDocumentStore((s) => selectDomainActivePhase(s.project, activePhaseId))` と `useTacticalStoresContext().playbackStore` を使用する。
    2. `timeLabelRef`（`<span data-testid="director-scrubber-time">`）、`sliderRef`（`<input type="range" defaultValue={...} />`）、`globalPlayheadRef`、`actionPlayheadRef` を定義し、`useEffect` 内でマウント時同期＋`playbackStore.subscribe((state, prev) => ...)` による DOM 直接更新（`textContent`, `.value`, `style.left = "${pct}%"`）を行う。
    3. `totalDurationMs` 変化時も最新値で再同期できるよう、`totalDurationMs` を依存配列に含める。
    4. `DirectorGlobalTrack` と `DirectorActionTrack` は `playheadRef` を再生ヘッド `<div>` の `ref` に渡し、初期位置のみ `initialTimeMs` で設定する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/panels/timeline/__tests__/director-camera-timeline.test.tsx`（実 Store 接続・内部 `vi.mock` 禁止）:
    - 既存テスト全 PASS に加え、`playbackStore.setTimeMs(1500)` 連続更新時に `director-scrubber-time` と再生ヘッド `style.left` が DOM 直接更新され、React `Profiler` 再レンダー回数が 0 であること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/timeline/director-camera-timeline.tsx src/features/tactical-unified/panels/timeline/director-global-track.tsx src/features/tactical-unified/panels/timeline/director-action-track.tsx src/features/tactical-unified/panels/timeline/__tests__/director-camera-timeline.test.tsx`

### Phase 4: `CameraControlPanel` 再生時完全遮断 & `TimelineBar`/`PlaybackControls`/`FullTacticalCanvas` セレクタ絞り込み
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/right-panel/camera-control-panel.tsx` (L27-L176)
  - `[MODIFY]` `src/features/tactical-unified/panels/timeline/timeline-bar.tsx` (L40-L60)
  - `[MODIFY]` `src/features/tactical-unified/panels/timeline/playback-controls.tsx` (L18-L35)
  - `[MODIFY]` `src/features/tactical-unified/views/FullTacticalCanvas.tsx` (L42-L60)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/stores/domain-selectors.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `CameraControlPanel`: `usePlaybackStore((s) => (s.isPlaying ? 0 : s.timeMs))` に統一し、`director` モード再生中の 60fps 再レンダーも完全に遮断する。全イベントハンドラ（`handleTiltChange`, `handleYawChange`, `handlePresetSelect`, `handleResetCamera`, `handleZoomChange`, `handlePanChange`）および `DirectorCueInspector` コールバック内では `Number(playbackStore.getState().timeMs)` を同期取得して渡す。
    2. `TimelineBar`, `PlaybackControls`, `FullTacticalCanvas`: `useDocumentStore((s) => s.project)` を `useDocumentStore((s) => selectDomainActivePhaseSlides(s.project, activePhaseId))` に置換する。
- **Concrete Test Cases**:
  - Phase 5 および既存 `timeline-bar.test.tsx`・`full-tactical-canvas.test.tsx` が全 PASS すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/right-panel/camera-control-panel.tsx src/features/tactical-unified/panels/timeline/timeline-bar.tsx src/features/tactical-unified/panels/timeline/playback-controls.tsx src/features/tactical-unified/views/FullTacticalCanvas.tsx`

### Phase 5: レイアウト画面・タイムライン・プレビューの 60fps ゼロ再レンダー統合テスト
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/__tests__/board-playback-performance.test.tsx`
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx`
  - `src/features/tactical-unified/panels/timeline/director-camera-timeline.tsx`
- **Contract**:
  - 実 `TacticalStoreProvider`（`workspaceMode: 'director'`）で `CameraControlPanel`・`DirectorCameraTimeline`・`TacticalSplitPreviewPanel`・`ExportPreviewPlayer` を `Profiler` 配下にマウントし、`startPlayback()` + 連続 `setTimeMs` 実行時の追加再レンダー数が 0 であることを検証する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/__tests__/board-playback-performance.test.tsx`（実 Store 接続・内部 `vi.mock` 禁止）:
    - `case 4`: `workspaceMode: 'director'` で `startPlayback()` 後に `setTimeMs` を 5 回連続実行しても、`CameraControlPanel`・`DirectorCameraTimeline`・`TacticalSplitPreviewPanel` の `Profiler` 再レンダー回数が 0 回であり、DOM `director-scrubber-time` と `director-scrubber-input` 値が最新時刻へ更新されること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/__tests__/board-playback-performance.test.tsx`
