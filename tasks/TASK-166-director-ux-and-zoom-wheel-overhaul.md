# TASK-166: ディレクターモードタイムラインピン削除・アクション秒数ドラッグ・ズーム補間＆ホイール改善

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-08
- **Target Files**:
  - `src/lib/tactical/interpolation-director.ts` (MODIFY)
  - `src/lib/tactical/__tests__/unified-interpolation.test.ts` (MODIFY)
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/camera-slider-field.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/director-cue-inspector.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/camera-control-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/__tests__/camera-control-panel.test.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/director-global-track.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/director-action-track.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/director-camera-timeline.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/timeline-bar.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/__tests__/director-camera-timeline.test.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. **アクションCue補間モデル是正 (±0.3問題撲滅)**: `interpolation-director.ts` において、アクションCue区間（`[cue.startTimeMs, cue.startTimeMs + cue.durationMs]`）でズームインアプローチ完了後、Cueのターゲットズーム値（`cue.zoom`）がしっかりと維持（Hold）され、Cueの開始付近でピンを選択・シークした際も設定ズームが即座に反映・描画されること。
- [x] 2. **キャンバス内ホイールズームの安定化**: `TacticalSplitPreviewPanel` において、コンテナに native wheel リスナー（`{ passive: false }`）を登録し、`e.preventDefault()` を保証すること。前面オーバーレイ（`PreviewBoundaryOverlay`）によるイベント遮断を防止し、ホイール回転で 0.4x〜3.0x の全域にスムーズにズームイン・ズームアウトできること。
- [x] 3. **Zoomスライダー目盛り・戻りやすさの正規化**: `CameraSliderField` において、1.0x（標準）ラベルが実際のパーセンテージ位置と一致し、1.0x へのスナップ/リセットが容易に行えること。また右パネル操作時に `activeCue.zoom` をダイレクトに同期し、カクつき・戻りの悪さを解消すること。
- [x] 4. **右パネルでの秒数手入力フィールド**: `DirectorCueInspector` において、従来のプリセットチップに加え、秒数を直接数値入力できる `input type="number"`（秒単位、step 0.1s、min 0.2s）を設置し、タイムラインとミリ秒単位で双方向連動すること。
- [x] 5. **タイムライン上のピン・Cue直接削除ポップオーバー**: `DirectorGlobalTrack` のピン（◆）および `DirectorActionTrack` のCueブロックをクリックした際、その直上に小さなポップオーバーを表示し、ゴミ箱アイコンからワンクリックでピンまたはCueを削除できること（外側クリックで閉じる）。
- [x] 6. **アクションCue右端リサイズドラッグ＆リアルタイム描画連動**: `DirectorActionTrack` の各Cueブロック右端にリサイズハンドルを配置し、水平ドラッグで `durationMs` をリアルタイム伸縮できること。ドラッグ中はシークバー（再生ヘッド）を右端に追従させ、キャンバス描画をリアルタイムに更新し続けること。
- [x] 7. **タイムライン横幅の適正化**: `TimelineBar` におけるディレクターモードのタイムラインコンテナに適度な余白（パディング・最大幅制約）を設定し、画面端いっぱいに張り付く圧迫感を解消すること。

## 2.5 Architectural Invariants & Why (破壊禁止の前提と設計理由)
<!-- ちゃぶ台返し防止の前提条件と、影響を受ける呼び出し元（Consumers）の同期確認リストを明記する -->
- **Invariants (破壊禁止の不変条件と理由)**:
  1. **単一カメラ射影パイプラインの整合性**: 描画・書き出しエンジン（`tactical-frame-renderer.ts`, `matrix-mvp-engine.ts`）に渡す姿勢データは単一の `InterpolatedPitchTransformState` を維持し、合成解決は補間層（`interpolation-director.ts` / `resolveSyntheticDirectorCamera`）で完結させること。
  2. **Store Provider 境界と Single Source of Truth (Level 2 / Level 3)**: 右パネル・タイムライン・プレビューパネルはすべて `useTacticalUnifiedStoreContext` を介して `activePhase.directorCamera` を真実源として読み書きし、グローバルシングルトンの直呼び出しを禁止する。
  3. **RAII 副作用クリーンアップ**: リサイズドラッグ時の `pointermove`/`pointerup` およびキャンバスの native `wheel` リスナーは、アンマウント時およびドラッグ終了時に必ず `removeEventListener` による完全な原状回復を行うこと。
- **Consumers (呼び出し元・別画面の同期確認リスト)**:
  - `src/lib/tactical/unified-interpolation.ts`: `resolveSyntheticDirectorCamera` をエクスポート・再利用しているため、シグネチャと基本戻り値の型を変更しない。
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts`: ディレクターモード再生時の自動シーク追従ロジックが変更の影響を受けないこと。
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx`: 3Dビューおよび境界線オーバーレイの描画整合性を維持。

## 3. Context Snippets (参照コード・型定義・import)
<!-- Workerが自律探索（Read/Grep）を行わずに実装できるよう、必要な文脈を過不足なく事前注入する -->

### 3.1 Import Specs
```ts
// Store Context & Types
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import type { ActionCameraCue, GlobalCameraKeyframe, DirectorCameraTrack } from '@/lib/types/tactical-unified';
import { resolveSyntheticDirectorCamera } from '@/lib/tactical/interpolation-director';
```

### 3.2 Key Formulas & Algorithms
```ts
// 1. アクションCue補間改善式 (interpolation-director.ts)
// [cue.startTimeMs, cue.startTimeMs + durationMs] の区間：
// アプローチ時間: transitionInMs = Math.min(250, moveDur * 0.3)
// - timeMs < cue.startTimeMs: 変更なし
// - timeMs < cue.startTimeMs + transitionInMs: fromZoom -> cue.zoom イージング
// - cue.startTimeMs + transitionInMs <= timeMs <= moveEnd: cue.zoom を Hold
// - moveEnd < timeMs <= returnEnd (autoReturn時): cue.zoom -> 1.0 (ベース値) イージング

// 2. リサイズドラッグ計算式 (director-action-track.tsx)
// deltaX: マウス移動量(px), trackWidth: トラック実幅(px), totalDurationMs: 全体時間(ms)
// deltaMs = (deltaX / trackWidth) * totalDurationMs
// nextDurationMs = Math.max(200, Math.round((initialDurationMs + deltaMs) / 50) * 50)
```

---

## 4. Implementation Phases (Worker 実装手順)
<!-- 1〜4ファイルは1 Phase一括、5ファイル以上は1 Phase最大4プロダクションファイル（テスト含め最大6ファイル）以下に分割、15ファイル超は連番タスク（TASK-XXXa, TASK-XXXb）に分割 -->

### Phase 1: アクションCue補間モデル是正＆キャンバスホイールズーム安定化
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/tactical/interpolation-director.ts` (MODIFY)
  - `src/lib/tactical/__tests__/unified-interpolation.test.ts` (MODIFY)
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx` (MODIFY)
- **契約 (Exact Contract & Formula)**:
  1. **`interpolation-director.ts`**:
     - `resolveSyntheticDirectorCamera(track, timeMs, _totalDurationMs)` のアクションカメラ補間ロジック（lines 66-115）を改修：
       - `const moveDur = Math.max(100, cue.durationMs ?? 1000);`
       - `const moveEnd = cue.startTimeMs + moveDur;`
       - アプローチ時間 `const transitionInMs = Math.min(250, moveDur * 0.3);`
       - `if (timeMs <= moveEnd)`:
         - `if (timeMs < cue.startTimeMs + transitionInMs)`:
           - `const rawT = Math.min(1, Math.max(0, (timeMs - cue.startTimeMs) / Math.max(1, transitionInMs)));`
           - `const easeT = applyEasing(rawT, cue.easing ?? 'ease-in-out');`
           - `zoom = fromZoom + (cue.zoom - fromZoom) * easeT;`
           - `panX = fromPanX + (cue.panX - fromPanX) * easeT;`
           - `panY = fromPanY + (cue.panY - fromPanY) * easeT;`
         - `else`:
           - `zoom = cue.zoom;`
           - `panX = cue.panX;`
           - `panY = cue.panY;`
         - `break;`
       - `else (timeMs > moveEnd)`:
         - `cue.autoReturn` 時は従来通り `holdEnd` および `returnEnd` への復帰補間を実行。
       - これにより、`timeMs === cue.startTimeMs` 直後（250ms以降）だけでなく、Cue区間中の大半でターゲットズーム倍率が確実に適用される。
  2. **`tactical-split-preview-panel.tsx`**:
     - `containerRef` に native `wheel` イベントリスナー（`{ passive: false }`）を登録し、React の JSX `onWheel` の代わりにブラウザスクロールを確実に `preventDefault()` する（`useEffect` + クリーンアップ）。
     - `PreviewBoundaryOverlay` に `pointer-events-none` を付与し（リサイズハンドル部分のみ `pointer-events-auto`）、オーバーレイ表示時もキャンバスへのホイール操作が吸い取られないようにする。
     - ホイール時のズーム計算：
       - `const currentZoom = activeCue?.zoom ?? resolvedCamera?.zoom ?? activeSlide?.pitchTransform?.zoom ?? 1;`
       - `const nextZoom = Math.max(0.4, Math.min(3.0, +(currentZoom - e.deltaY * 0.0015).toFixed(2)));`
       - `upsertActionCameraCue(currentTimeMs, { zoom: nextZoom, panX: resolvedCamera?.panX ?? 0, panY: resolvedCamera?.panY ?? 0 }, activeCue?.id);`
       - `updatePitchTransform(activeSlide.id, { zoom: nextZoom });`
- **Testing Strategy (Concrete Test Values)**:
  - テストファイル: `src/lib/tactical/__tests__/unified-interpolation.test.ts`, `src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx`
  - 検証ケース:
    1. Cue（`startTimeMs: 1000, durationMs: 2000, zoom: 2.0`）があるとき、`timeMs: 1500`（Cue区間中央）で `resolveSyntheticDirectorCamera` を呼ぶと `zoom === 2.0` であること。
    2. `timeMs: 1100`（開始後100ms）で 1.0 より大きく 2.0 未満のイージング途中の値になること。
    3. `TacticalSplitPreviewPanel` の native wheel イベントで `upsertActionCameraCue` が呼ばれ、適切なズーム値が設定されること。
- **Tasks**:
  - [x] 1. TDD実装: `unified-interpolation.test.ts` と `tactical-split-preview-panel.test.tsx` にテスト追加（RED） ➔ `interpolation-director.ts`, `tactical-split-preview-panel.tsx` 実装（GREEN） ➔ `bun run ai:check src/lib/tactical/interpolation-director.ts src/lib/tactical/__tests__/unified-interpolation.test.ts src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx` PASS
- **Worker Handoff Log**:
  - `resolveSyntheticDirectorCamera` のアクションCueアプローチ時間を `Math.min(250, moveDur * 0.3)` で完結させ、Cue区間内でターゲット値を確実にHold。
  - `TacticalSplitPreviewPanel` では `containerRef` に native wheel リスナー（`passive: false`）を登録し、`activeCue.id` を引き継ぐホイールズームとスクロール防止（RAII解除含む）を実装。

---

### Phase 2: Zoomスライダー操作感・目盛り幅正規化＆秒数数値入力連動
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/right-panel/camera-slider-field.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/director-cue-inspector.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/camera-control-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/__tests__/camera-control-panel.test.tsx` (MODIFY)
- **契約 (Exact Contract & Formula)**:
  1. **`camera-slider-field.tsx`**:
     - `midValue?: number` プロパティを追加。
     - `midValue` が指定された場合、`midLabel` の位置を `left: ${((midValue - min) / (max - min)) * 100}%` のパーセンテージスタイルでインライン配置し、中央（50%）に固定配置されるズレを解消する（例: Zoomで `min=0.4, max=3.0, midValue=1.0` の場合、`left: 23.07%`）。
     - スライダー下部に `midLabel` をクリックまたはダブルクリックして `1.0x` にリセットできるクリック可能UI（`cursor-pointer hover:text-white`）を提供。
  2. **`director-cue-inspector.tsx`**:
     - 秒数の手入力用数値フィールドを追加：
       - `<div className="flex items-center justify-between gap-2">`
       - `<span className="text-[10px] text-white/60">演出秒数:</span>`
       - `<div className="flex items-center gap-1">`
       - `<input type="number" data-testid="action-duration-input" step="0.1" min="0.2" max="10.0" value={((cue.durationMs ?? 1000) / 1000).toFixed(1)} onChange={(e) => { const val = parseFloat(e.target.value); if (!isNaN(val) && val > 0) onUpdateDuration(cue, Math.round(val * 1000)); }} className="w-16 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-right font-mono text-[11px] text-white focus:outline-none focus:border-[#FF8100]/60" />`
       - `<span className="text-white/40 text-[10px]">秒</span>`
       - `</div></div>`
       - プリセットチップ（`0.5s`, `1.0s`, `2.0s`, `3.0s`）も手入力と連動する形で下に維持。
  3. **`camera-control-panel.tsx`**:
     - `isDirectorMode && activeCue` の場合、Zoomスライダーの初期値および表示値に `activeCue.zoom` を優先バインド。
     - Zoomスライダー操作時、`activeCue` があれば `upsertActionCameraCue(currentTimeMs, { zoom: nextZoom, panX, panY }, activeCue.id)` を呼び出し、Cueのズーム値を直接更新する。
- **Testing Strategy (Concrete Test Values)**:
  - テストファイル: `src/features/tactical-unified/panels/right-panel/__tests__/camera-control-panel.test.tsx`
  - 検証ケース:
    1. `DirectorCueInspector` の秒数入力フィールドに `1.5` を入力すると、`onUpdateDuration` が `1500` で呼ばれること。
    2. `activeCue` が存在するとき、Zoomスライダーの変更で `activeCue.id` を引数に含む `upsertActionCameraCue` が呼ばれること。
- **Tasks**:
  - [x] 1. TDD実装: `camera-control-panel.test.tsx` にテスト追加（RED） ➔ `camera-slider-field.tsx`, `director-cue-inspector.tsx`, `camera-control-panel.tsx` を実装（GREEN） ➔ `bun run ai:check src/features/tactical-unified/panels/right-panel/camera-slider-field.tsx src/features/tactical-unified/panels/right-panel/director-cue-inspector.tsx src/features/tactical-unified/panels/right-panel/camera-control-panel.tsx src/features/tactical-unified/panels/right-panel/__tests__/camera-control-panel.test.tsx` PASS
- **Worker Handoff Log**:
  - `CameraSliderField` に `midValue`（比率配置＆クリックでリセット）を追加。`DirectorCueInspector` に手入力数値フィールド（`data-testid="action-duration-input"`）を設置し、`CameraControlPanel` で `activeCue` 存在時の `upsertActionCameraCue(..., cue.id)` 直接更新およびスライダー表示値の優先バインドを実装。

---

### Phase 3: ピン削除ポップオーバー・アクションCue右端リサイズドラッグ・タイムライン横幅適正化
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/timeline/director-global-track.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/director-action-track.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/director-camera-timeline.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/timeline-bar.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/__tests__/director-camera-timeline.test.tsx` (MODIFY)
- **契約 (Exact Contract & Formula)**:
  1. **ピン削除ポップオーバー (`director-global-track.tsx`)**:
     - ピン（`◆`）をクリックした際、`onSelectKeyframe(kf.id, kf.timeMs)` に加え、対象ピンの直上にフローティングポップオーバー（`data-testid={`global-pin-popover-${kf.id}`}`）を表示。
     - ポップオーバー内容: 時刻 `{(kf.timeMs / 1000).toFixed(1)}s`、Tilt/Yaw表示、およびゴミ箱ボタン（`Trash2`, `data-testid={`delete-global-pin-btn-${kf.id}`}`）。
     - ゴミ箱クリックで `onDeleteKeyframe(kf.id)` を実行しポップオーバーを閉じる。外側クリック（Backdrop / click-outside）で閉じる。
  2. **アクションCue削除ポップオーバー＆右端リサイズドラッグ (`director-action-track.tsx`)**:
     - Cueブロッククリック時、ポップオーバー（`data-testid={`action-cue-popover-${cue.id}`}`）を表示。
     - ポップオーバー内に削除ボタン（`Trash2`, `data-testid={`delete-action-cue-popover-btn-${cue.id}`}`）を設置し、ワンクリックで `onDeleteCue(cue.id)` を実行。
     - **右端リサイズドラッグ**:
       - 各Cueブロックの右端にリサイズハンドル（`<div data-testid={`action-cue-resize-handle-${cue.id}`} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-white/40 transition-colors" />`）を設置。
       - ポインターダウン（`onPointerDown`）でドラッグ開始（`e.stopPropagation()`）。
       - ドラッグ中（`pointermove`）:
         - 移動量 `deltaX` とトラック実幅 `trackWidth` から `deltaMs = (deltaX / trackWidth) * totalDurationMs` を算出。
         - `newDurationMs = Math.max(200, Math.round((initialDurationMs + deltaMs) / 50) * 50);`
         - `onUpdateDuration(cue, newDurationMs)` を発火。
         - 同時に `onSeek(cue.startTimeMs + newDurationMs)` を呼び出し、シークバー位置を追従させてキャンバスのリアルタイム描画を維持！
       - ポインターアップ（`pointerup`）でドラッグ終了（イベントリスナー解除の RAII 徹底）。
  3. **タイムライン横幅の適正化 (`timeline-bar.tsx`)**:
     - `workspaceMode === 'director'` 時、`<DirectorCameraTimeline />` を包むコンテナに `max-w-6xl mx-auto px-6 w-full` を適用。
     - 画面端いっぱいに張り付く圧迫感を解消し、中央に適度な余白を持たせて上品に配置。
- **Testing Strategy (Concrete Test Values)**:
  - テストファイル: `src/features/tactical-unified/panels/timeline/__tests__/director-camera-timeline.test.tsx`
  - 検証ケース:
    1. 全体ピン（◆）をクリックしたとき、削除ポップオーバーが表示され、削除ボタン押下で `deleteGlobalCameraKeyframe` が呼ばれること。
    2. アクションCueの右端リサイズハンドルをドラッグしたとき、`onUpdateDuration` および `seekTo` がリアルタイムに呼ばれること。
    3. `workspaceMode === 'director'` のとき、タイムラインバーに `max-w-6xl` または適正なパディングが適用されていること。
- **Tasks**:
  - [x] 1. TDD実装: `director-camera-timeline.test.tsx` にテスト追加（RED） ➔ `director-global-track.tsx`, `director-action-track.tsx`, `director-camera-timeline.tsx`, `timeline-bar.tsx` を実装（GREEN） ➔ `bun run ai:check src/features/tactical-unified/panels/timeline/director-global-track.tsx src/features/tactical-unified/panels/timeline/director-action-track.tsx src/features/tactical-unified/panels/timeline/director-camera-timeline.tsx src/features/tactical-unified/panels/timeline/timeline-bar.tsx src/features/tactical-unified/panels/timeline/__tests__/director-camera-timeline.test.tsx` PASS
- **Worker Handoff Log**:
  - 全体ピン・アクションCueクリック時のフローティング削除ポップオーバー（`Trash2`）とCue右端ドラッグによるリアルタイムリサイズ・シーク同期（RAII解除対応）を実装し、ディレクタータイムラインに `max-w-6xl` 中央揃えを適用。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-08 18:57
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. ドメイン論理 & 要件網羅性 & テスタビリティ: 数式/座標/状態遷移の整合性、受入要件の全網羅、Concrete Test Values検証、ハック排除
  - [x] 2. Invariants保護 & Consumer同期: Section 2.5 の不変条件（ちゃぶ台返し防止）遵守、別画面・呼び出し元（Consumers）の更新漏れゼロ
  - [x] 3. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 4. 設計負債 & サイレント破壊防止: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、公開シグネチャ保護、指示外変更の排除
- **Summary**:
  補間モデル（transitionInMs + Hold）による±0.3問題撲滅、native wheel によるスクロール防止＆ホイールズーム、1.0x ラベル正規化＆秒数手入力、タイムラインポップオーバー削除＆右端リサイズドラッグのリアルタイム描画連動まで、全要件とRAII・Store Provider境界が完璧に実装されています。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
