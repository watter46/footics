# TASK-204: レイアウト画面のカメラ操作後に描画が初期位置へ戻る時刻同期バグ修正

- **Status**: `DONE`
- **Commit**: `fix(tactical): sync export preview initial time with playbackStore and stabilize director camera options`
- **Execution Waves**:
  - Wave 1: Phase 1 (sequential foundation)
  - Wave 2: Phase 2 (sequential after Wave 1)
  - Wave 3: Phase 3 (sequential after Wave 2)
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/panels/export/use-export-preview-animation.ts): useRef<number>\(playbackTimeMs\)`
  - `rg(src/features/tactical-unified/panels/split-preview/__tests__/layout-camera-time-sync.test.tsx): vi\.mock`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. レイアウト画面（`TacticalSplitPreviewPanel`）とエクスポート画面（`ExportPreviewPlayer`）は `useExportPreviewAnimation` を共有するため、初期時刻同期および停止中・再生中の再描画契約は両画面および非 `TacticalStoresContext` 環境（フォールバックなし単体利用時 `initialTimeMs = 0`）でも破綻しないこと。
  2. カメラの傾き・向き・ズーム・パンの正本は `DocumentStore` 内の `directorCamera` および `slide.pitchTransform` であり、プレビュー描画時刻の正本は `PlaybackStore.timeMs` と一致すること。
  3. ボード画面のズーム・パン禁止（`useCanvasPointerInteraction`）や他の描画パイプラインは変更しないこと。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `useAnimationFrameLoop` の第4引数に `initialTimeMs: number` を必須引数として導入し、`currentTimeRef` を `initialTimeMs` で初期化する。呼び出し元が1箇所（`useExportPreviewAnimation`）のみのため、省略可能な旧挙動を残さず全呼び出し元で明示渡す。
  2. `useAnimationFrameLoop` 内の重複描画エフェクト `useEffect(() => { onFrame(currentTimeRef.current); }, [onFrame])` は廃止し、静止時・パラメータ変更時のフレーム描画責務を `useExportPreviewAnimation` 側の単一 `useEffect` に一本化する。
  3. `useExportPreviewAnimation` はマウント時に `stores ? Number(playbackStore.getState().timeMs) : 0` を取得し、`currentTimeMsRef` と `useAnimationFrameLoop` 双方をその初期時刻で初期化する。`lastStoreTimeMsRef` によりマウント直後の時刻同期を誤ってスキップし `0ms` に置き去りにするバグを排除する。
  4. `effectiveDirectorCameraOptions`（`useExportPreviewAnimation`）および `directorCameraOptions`（`TacticalSplitPreviewPanel`）は `useMemo` でプリミティブ値依存に安定化し、ドラッグ終了時等の不要な `drawFrame` 再生成と二重描画を防ぐ。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/panels/export/use-animation-frame-loop.ts`
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts`
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx`

## 2. Implementation Phases

### Phase 1: `useAnimationFrameLoop` の初期時刻導入と重複エフェクト廃止
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/export/use-animation-frame-loop.ts` (~60 lines)
  - `[ADD]` `src/features/tactical-unified/panels/export/__tests__/use-animation-frame-loop.test.ts` (~85 lines)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts`
- **Contract**:
  ```ts
  export function useAnimationFrameLoop(
    isPlaying: boolean,
    totalDurationMs: number,
    onFrame: (timeMs: number) => void,
    initialTimeMs: number,
  ): { seek: (time: number) => void };
  ```
  - 振る舞い仕様・境界条件:
    1. `currentTimeRef` は `useRef<number>(initialTimeMs)` で初期化する。
    2. `useEffect(() => { onFrame(currentTimeRef.current); }, [onFrame])` を削除し、`onFrame` 参照更新のたびに `isPlaying` 状態や親のエフェクトと競合して二重描画・`0ms` 上書きを起こさないようにする。
    3. `seek(time)` 呼び出し時は `currentTimeRef.current = time` と `startTimeRef.current = null` を更新して `onFrame(time)` を1回呼ぶ。
    4. `isPlaying === true` 時は `requestAnimationFrame` ループが `currentTimeRef.current`（= `initialTimeMs` または直前の `seek` 時刻）から連続して時間を進める。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/panels/export/__tests__/use-animation-frame-loop.test.ts`（純粋フック単体テスト・内部 `vi.mock` 禁止）:
    - `case 1`: `initialTimeMs = 1500` でマウントしたとき、無用な `onFrame(0)` が自動発火せず、`seek(2200)` で `onFrame(2200)` が呼ばれること。
    - `case 2`: `initialTimeMs = 1500`, `isPlaying = true` で再生開始したとき、最初の `rAF` 進行が `0ms` ではなく `1500ms + elapsed` から進むこと。
    - `case 3`: `onFrame` コールバックが再レンダーで差し替わっても、停止中に勝手に `onFrame` が再実行されないこと。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/export/use-animation-frame-loop.ts src/features/tactical-unified/panels/export/__tests__/use-animation-frame-loop.test.ts`

### Phase 2: `useExportPreviewAnimation` の初期時刻同期とオプション安定化
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/export/use-export-preview-animation.ts` (`useExportPreviewAnimation`, L42-L262)
  - `[MODIFY]` `src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts` (末尾へテストケース追加)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/panels/export/use-animation-frame-loop.ts`
  - `src/features/tactical-unified/stores/playback-store.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `const initialPlaybackTimeMs = stores ? Number(playbackStore.getState().timeMs) : 0;` を算出し、`currentTimeMsRef = useRef<number>(initialPlaybackTimeMs)` および `useAnimationFrameLoop(effectiveIsPlaying, totalDurationMs, drawFrame, initialPlaybackTimeMs)` の双方へ渡す。
    2. `effectiveDirectorCameraOptions` は `directorCameraOptions?.isEditing ?? !effectiveIsPlaying` と `directorCameraOptions?.selectedCueId` に依存する `useMemo` で安定化し、呼び出し元がインラインオブジェクトを渡しても `drawFrame` が不要に再生成されないようにする。
    3. 描画エフェクト（L196）は `if (!effectiveIsPlaying || !hasRenderedInitialRef.current)`（または初回マウント時のみ `effectiveIsPlaying` でも1フレーム描く）として、`useAnimationFrameLoop` 側の削除に伴い `externalIsPlaying: true` の初期マウント時も即座に初回フレームを描画し、停止中はパラメータ変化ごとに `currentTimeMsRef.current` で1回だけ再描画する。
    4. `lastStoreTimeMsRef` によるストア時刻同期は `initialPlaybackTimeMs` で整合させ、ストア側 `playbackTimeMs` が外部から変化した際は確実に `seek(playbackTimeMs)` を呼ぶ。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts`:
    - `case 1`: `createPlaybackStore(toMilliseconds(1800))` を `TacticalStoreProvider` で渡して初期マウントした際、`renderTacticalPhaseFrameToCanvas` が初回から `timeMs: 1800` で呼ばれること（`timeMs: 0` で呼ばれないこと）。
    - `case 2`: `playbackTimeMs = 1800` かつ `directorCameraOptions` に毎回新オブジェクト `{ isEditing: true }` を渡して `pitchTransform` を変更→解除した際も、`timeMs: 1800` のまま再描画され `0ms` に戻らないこと。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/export/use-export-preview-animation.ts src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts`

### Phase 3: `TacticalSplitPreviewPanel` のメモ化とレイアウト画面時刻同期統合テスト
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx` (L3, L119)
  - `[ADD]` `src/features/tactical-unified/panels/split-preview/__tests__/layout-camera-time-sync.test.tsx` (~130 lines)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts`
  - `src/lib/tactical/export/tactical-phase-frame-renderer.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `TacticalSplitPreviewPanel` の未使用 `useEffect` import を削除する。
    2. `useExportPreviewAnimation` へ渡す `directorCameraOptions` を `useMemo(() => ({ isEditing: !isPlaying }), [isPlaying])` でメモ化する。
    3. スライド2以降（`playbackTimeMs > 150ms`）が選択された状態でレイアウト画面を開き、カメラ操作（Orbit ドラッグ / Shift+ドラッグ Pan / ホイール Zoom）を確定した直後も、描画時刻が `playbackTimeMs` のまま維持され、更新後のカメラ角度・位置で描画されること。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/panels/split-preview/__tests__/layout-camera-time-sync.test.tsx`（実 `TacticalStoreProvider` 接続・内部 `vi.mock` 禁止・`vi.spyOn(frameRenderer, 'renderTacticalPhaseFrameToCanvas')` 使用）:
    - `case 1`: スライド2件（各 `transitionDurationMs: 1000, pauseMs: 500`）と `playbackStore = createPlaybackStore(toMilliseconds(1500))` で `TacticalSplitPreviewPanel` をマウントし、左ドラッグ（Orbit）で `pointerDown` -> `pointerMove` -> `pointerUp` を実行した直後、最終 `renderTacticalPhaseFrameToCanvas` 呼び出しが `timeMs: 1500` かつ `directorCamera.globalKeyframes` に `timeMs: 1500` の新角度が反映されていること（`0ms` の初期角度に戻らないこと）。
    - `case 2`: 同条件（`playbackTimeMs = 1500`）で Shift+ドラッグ（Pan）を確定した直後およびホイールズーム直後も、最終描画が `timeMs: 1500` かつ更新された `panX`/`panY`/`zoom` を含む `directorCamera.actionCues` で描画されること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx src/features/tactical-unified/panels/split-preview/__tests__/layout-camera-time-sync.test.tsx`
