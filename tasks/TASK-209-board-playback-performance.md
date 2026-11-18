# TASK-209: ボード画面再生カクつき解消 & 再生ループ・総再生時間の一元化

- **Status**: `TODO`
- **Commit**: `perf(tactical): eliminate board playback stutter via layer isolation and render-loop deduplication`
- **Execution Waves**:
  - Wave 1: Phase 1, Phase 2 (parallel)
  - Wave 2: Phase 3 (sequential after Wave 1)
  - Wave 3: Phase 4 (sequential after Wave 2)
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/hooks/use-tactical-animation.ts): calculatePhaseTotalDuration`
  - `rg(src/features/tactical-unified/core/components/PitchGroundLayer.tsx): PitchBackgroundImage`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. ボード画面でのアニメーション再生中、選手・ボール・矢印・ゾーン・テキスト・視野角・スポットライト・リアルタイム軌跡がすべて従来通り補間描画されること。
  2. `workspaceMode === 'director'`（レイアウト画面）では `useTacticalAnimation` の `requestAnimationFrame` ループを起動せず、`useExportPreviewAnimation` の再生ループのみが時刻を進めること。
  3. ドラッグ中の `nodesRegistryRef` 経由 Konva 直接同期および操作確定時の `DocumentStore` 保存が壊れないこと。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `useTacticalAnimation` から `usePlaybackStore((s) => s.timeMs)` のリアクティブ購読を撤廃し、`PlaybackControls`（および `TimelineBar` 配下）が毎フレーム再レンダリングされるのを根絶する。総時間計算は `calculatePhaseTotalDuration` を廃止して `resolvePlaybackDurationMs(activePhase?.slides ?? [])` に統一する（`tactical-animation.test.ts` の `currentPlaybackTime` アサーションは `playbackStore.getState().timeMs` へ同期更新）。
  2. `<Stage>` 直下の背景黒 `<Rect>` と `<PitchBackgroundImage />` を独立した `React.memo` レイヤー `<PitchBackgroundLayer>` へ分離し、再生中のオブジェクト移動による毎フレーム背景キャンバス再描画をゼロにする（カメラ `pitchTransform` 変更時のみ再描画）。
  3. `PitchGroundLayer` の `buildSelectHandlerMap`・`PlayerMarkerItem` のインライン `ref` コールバック・`ArrowObject` の毎フレーム `registry.arrowNodes` 再登録 `useEffect`・`CameraControlPanel` の非レイアウト時 `timeMs` 購読を解消し、60fps 再生中の不要な再構築・メモリ割り当てを排除する。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/hooks/use-tactical-animation.ts`
  - `src/features/tactical-unified/core/components/canvas-stage.tsx`
  - `src/features/tactical-unified/core/components/PitchGroundLayer.tsx`
  - `src/features/tactical-unified/core/components/BackgroundImageLayer.tsx`
  - `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx`
  - `src/features/tactical-unified/core/components/PlayerMarkerItem.tsx`
  - `src/features/tactical-unified/core/components/annotations/ArrowObject.tsx`
  - `src/features/tactical-unified/panels/right-panel/camera-control-panel.tsx`

## 2. Implementation Phases

### Phase 1: `useTacticalAnimation` の `timeMs` 購読廃止・ループ一元化・総時間統一
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/hooks/use-tactical-animation.ts` (L1-L205)
  - `[MODIFY]` `src/features/tactical-unified/__tests__/tactical-animation.test.ts` (L240-L277)
- **Contract**:
  ```ts
  // use-tactical-animation.ts:
  // - calculatePhaseTotalDuration を廃止し resolvePlaybackDurationMs(activePhase?.slides ?? []) を使用
  // - currentPlaybackTime の usePlaybackStore((s) => s.timeMs) 購読を削除
  // - workspaceMode === 'director' 時は rAF ループを起動しない
  ```
  - 振る舞い仕様・境界条件:
    1. `useTacticalAnimation` 内で `useSessionStore((s) => s.workspaceMode)` を参照し、`workspaceMode === 'director'` の場合は `startAnimationLoop` を開始せず、既に動いていれば停止する。
    2. `usePlaybackStore((s) => s.timeMs)` を購読せず、戻り値の `currentPlaybackTime` は削除するか `playbackStore.getState().timeMs` スナップショット取得に切り替える（`PlaybackControls` は参照していないため削除し、`tactical-animation.test.ts` L250 を `playbackStore.getState().timeMs` に更新する）。
    3. `totalDurationMs` は `resolvePlaybackDurationMs(activePhase?.slides ?? [])` で算出する。
- **Concrete Test Cases**:
  - `tactical-animation.test.ts`:
    - `case 1`: 既存 5 テストが全 PASS し、再生・停止・シーク・ループリセットが期待通り動作すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/hooks/use-tactical-animation.ts src/features/tactical-unified/__tests__/tactical-animation.test.ts`

### Phase 2: 背景レイヤー分離 (`PitchBackgroundLayer`) & `PitchBackgroundImage` メモ化
- **Target Files**:
  - `[ADD]` `src/features/tactical-unified/core/components/PitchBackgroundLayer.tsx` (~55 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/components/canvas-stage.tsx` (L80-L130)
  - `[MODIFY]` `src/features/tactical-unified/core/components/PitchGroundLayer.tsx` (L179-L215)
  - `[MODIFY]` `src/features/tactical-unified/core/components/BackgroundImageLayer.tsx` (L24-L143)
- **Contract**:
  ```tsx
  // PitchBackgroundLayer.tsx:
  export interface PitchBackgroundLayerProps {
    stageSize: { width: number; height: number };
    pitchRect: PitchRectBounds;
  }
  export const PitchBackgroundLayer: React.NamedExoticComponent<PitchBackgroundLayerProps>;
  ```
  - 振る舞い仕様・境界条件:
    1. `PitchBackgroundLayer` は `<Layer id="pitch-background-layer" listening={false}>` として背景黒 `<Rect>` と `<Group x={groupTransform.x} ...><PitchBackgroundImage width={pitchRect.width} height={pitchRect.height} /></Group>` のみを描画し、`sceneGraph` を props に受け取らず `React.memo` で隔離する。
    2. `PitchBackgroundLayer` は再生時刻 `timeMs` を購読せず、`activeSlide?.pitchTransform` と `pitchRect` / `stageSize` 変化時のみ更新される。
    3. `canvas-stage.tsx` で `<Stage>` の先頭子要素として `<PitchBackgroundLayer stageSize={size} pitchRect={vRect} />` を配置し、`PitchGroundLayer` から背景 `<Rect>` と `<PitchBackgroundImage />` を削除する。
    4. `PitchBackgroundImage` を `React.memo` でラップし、親更新時の不要再評価を抑える。
- **Concrete Test Cases**:
  - Phase 4 のパフォーマンス回帰テストおよび既存 `canvas-stage.test.tsx`, `five-layer-architecture.test.tsx` で検証。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/PitchBackgroundLayer.tsx src/features/tactical-unified/core/components/canvas-stage.tsx src/features/tactical-unified/core/components/PitchGroundLayer.tsx src/features/tactical-unified/core/components/BackgroundImageLayer.tsx`

### Phase 3: 再生中の毎フレーム再生成・再登録・他パネル購読排除
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx` (L160-L296)
  - `[MODIFY]` `src/features/tactical-unified/core/components/PlayerMarkerItem.tsx` (L70-L120)
  - `[MODIFY]` `src/features/tactical-unified/core/components/annotations/ArrowObject.tsx` (L45-L95)
  - `[MODIFY]` `src/features/tactical-unified/panels/right-panel/camera-control-panel.tsx` (L25-L60)
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `PlayerMarkerItem`: `ref` コールバックをインライン生成から `useCallback`（`[marker.id, nodesRegistryRef]` 依存）へ変更し、再生毎フレームで `nodesRegistryRef.playerNodes` の delete/set が 22 回走るのを止める。また選択されていない静止時の影 (`shadowBlur={0}`) を明示維持し、描画コストを抑える。
    2. `ArrowObject`: `nodesRegistryRef.arrowNodes` 登録用 `useEffect` のうち、`resolvedArrow.startPointPx` 等を毎フレーム変わる依存配列に入れず、最新値は `useRef` 経由で同期更新するかプリミティブ数値依存かつクリーンアップなしの更新に分けて、`delete` / `set` の毎フレーム再実行を防ぐ。
    3. `BillboardObjectLayer`: `visibleItems` の各要素に渡すハンドラ参照を安定化し、不要な再メモ化破壊を防ぐ。
    4. `CameraControlPanel`: `usePlaybackStore((s) => (s.isPlaying && workspaceMode !== 'director' ? 0 : s.timeMs))` のようにボード画面時は `timeMs` 更新で再レンダリングしないようセレクタを限定する。
- **Concrete Test Cases**:
  - Phase 4 の統合テストで検証。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/BillboardObjectLayer.tsx src/features/tactical-unified/core/components/PlayerMarkerItem.tsx src/features/tactical-unified/core/components/annotations/ArrowObject.tsx src/features/tactical-unified/panels/right-panel/camera-control-panel.tsx`

### Phase 4: ボード再生パフォーマンス・モード分離回帰テスト
- **Target Files**:
  - `[ADD]` `src/features/tactical-unified/__tests__/board-playback-performance.test.tsx` (~130 lines)
- **Contract**:
  - 実 `TacticalStoreProvider` に `CanvasStage`・`PlaybackControls`・`CameraControlPanel` を接続し、再生時刻連続更新時の不要な再レンダリング抑止と、`director` モード時の `useTacticalAnimation` ループ停止を検証する。
- **Concrete Test Cases**:
  - `board-playback-performance.test.tsx`（実 Store 接続・内部 `vi.mock` 禁止）:
    - `case 1`: `board` モードで `playbackStore.setTimeMs` を連続実行しても、`PlaybackControls` および `PitchBackgroundImage` / `CameraControlPanel` の再レンダー回数が増加しないこと。
    - `case 2`: `workspaceMode: 'director'` で `playbackStore.startPlayback()` しても `useTacticalAnimation` が `requestAnimationFrame` ループを起動しないこと。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/__tests__/board-playback-performance.test.tsx`
