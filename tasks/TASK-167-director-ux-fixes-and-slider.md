# TASK-167: ディレクターモードUI修正・Zoom/Pan同期・動画編集風スライダー

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-08
- **Target Files**:
  - `src/features/tactical-unified/panels/timeline/director-global-track.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/director-action-track.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/__tests__/director-tracks-popover.test.tsx` (NEW)
  - `src/lib/tactical/interpolation-director.ts` (MODIFY)
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts` (MODIFY)
  - `src/lib/tactical/__tests__/interpolation-director.test.ts` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/camera-slider-field.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/camera-control-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/__tests__/camera-slider-field.test.tsx` (NEW)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. 全体ピン（◆）のポップオーバーで赤い削除ボタンをクリックした際、バックドロップに遮断されず `onDeleteKeyframe` が確実に発火し、ピンが削除されること。
- [x] 2. アクションCueブロックをクリックした際、親要素の隠蔽（`overflow: hidden`）に邪魔されずポップオーバーが表示され、赤い削除ボタン押下で `onDeleteCue` が発火しCueが削除されること。
- [x] 3. 削除ボタンのアイコンが常時赤色（`text-red-500`）、ホバー時に `text-red-400 hover:bg-red-500/10 cursor-pointer` で表示されること。
- [x] 4. 停止・編集中（`!isPlaying`）にタイムライン上のCueを選択またはCue期間内にシークした状態で、右パネルのZoom/Panスライダーを動かすと、即座にキャンバスの描画にズーム・パン値が100%反映されること。
- [x] 5. 再生中（`isPlaying === true`）は、Cueの `transitionInMs` による滑らかなイージング補間（アプローチ遷移）が正常に維持されること。
- [x] 6. スライダーのトラック背景が薄グレー（`bg-white/15`）で可動範囲が明確に視認でき、アクティブプログレスバー（`#FF8100`）および白ノブが表示されること。
- [x] 7. スライダーの数値エリアで水平ドラッグ（スクラブ）による滑らかな連続数値変更ができ、クリック/ダブルクリックで直接数値入力に切り替わること。
- [x] 8. スライダー操作中のプレビュー反映がスムーズでガクつかず、ドラッグ終了時（`pointerup`）に履歴コミット（`recordHistory`）されること。また副作用リスナーが確実にクリーンアップされること（RAII）。

## 2.5 Architectural Invariants & Why (破壊禁止の前提と設計理由)
- **Invariants (破壊禁止の不変条件と理由)**:
  1. **単一カメラ射影パイプラインの整合性**:
     - `matrix-mvp-engine.ts` および `tactical-frame-renderer.ts` の MVP 行列生成契約を維持し、停止時プレビューと再生時アニメーションの切り替えを境界内でクリーンに解決すること。
  2. **Store Provider 境界と Single Source of Truth**:
     - 右パネル・タイムライン・プレビューパネルの各コンポーネントは `useTacticalUnifiedStoreContext` を通じて `activePhase.directorCamera` を真実源とし、ホスト非依存（Level 2）を維持すること。
  3. **RAII 副作用クリーンアップ**:
     - スクラブドラッグ時の `pointermove`/`pointerup` イベントリスナーは、ドラッグ終了時およびコンポーネントのアンマウント時に必ず確実に `removeEventListener` で解除すること。
- **Consumers (呼び出し元・別画面の同期確認リスト)**:
  - `src/features/tactical-unified/panels/timeline/director-global-track.tsx` — 全体ピンのポップオーバーと削除ボタン
  - `src/features/tactical-unified/panels/timeline/director-action-track.tsx` — アクションCueの `truncate` 解除、ポップオーバーと削除ボタン
  - `src/features/tactical-unified/panels/right-panel/camera-slider-field.tsx` — 動画編集アプリ風スクラブ＆薄グレー軌道スライダー
  - `src/features/tactical-unified/panels/right-panel/camera-control-panel.tsx` — スライダー値バインドとドラッグコミット
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx` — 停止時プレビューでの Cue ターゲット値同期
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts` — 停止時のカメラ解決ロジック
  - `src/lib/tactical/interpolation-director.ts` — ディレクター合成カメラ補間

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Target Line Map
- `src/features/tactical-unified/panels/timeline/director-global-track.tsx:40-90`: グローバルキーフレームピン表示と削除ポップオーバー（Trash2ボタン）構造。
- `src/features/tactical-unified/panels/timeline/director-action-track.tsx:60-120`: アクションCueブロック（truncate, popover, Trash2ボタン）の構造。
- `src/features/tactical-unified/panels/right-panel/camera-slider-field.tsx:1-45`: CameraSliderFieldのPropsおよびスライダーUI実装。
- `src/features/tactical-unified/panels/right-panel/camera-control-panel.tsx:30-100`: CameraSliderField呼び出し、ハンドラ、コミットハンドラ。
- `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx:50-120`: 停止時（!isPlaying）のカメラ補間・directorCamera参照。
- `src/features/tactical-unified/panels/export/use-export-preview-animation.ts:70-150`: ディレクターカメラ補間・計算ロジック。
- `src/lib/tactical/interpolation-director.ts:25-60`: `resolveSyntheticDirectorCamera` および関連型・ヘルパー定義。

### 3.2 Import Specs
```ts
import { DirectorGlobalTrack } from '@/features/tactical-unified/panels/timeline/director-global-track';
import { DirectorActionTrack } from '@/features/tactical-unified/panels/timeline/director-action-track';
import { CameraSliderField } from '@/features/tactical-unified/panels/right-panel/camera-slider-field';
import { resolveSyntheticDirectorCamera } from '@/lib/tactical/interpolation-director';
```

### 3.3 Key Interfaces & Types
```ts
export interface CameraSliderFieldProps {
    id: string;
    label: string;
    ariaLabel: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    unit: string;
    minLabel: string;
    maxLabel: string;
    midLabel?: string;
    midValue?: number;
    onChange: (value: number) => void;
    onChangeEnd?: (value: number) => void; // ドラッグ終了時のコミット用
}

export interface ResolveSyntheticDirectorCameraOptions {
    isEditing?: boolean; // 停止・編集中フラグ（true の場合、アクティブ/選択Cueのターゲット値を100%即時反映）
    selectedCueId?: string | null;
}
```

---

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: タイムラインのポップオーバー表示とピン削除の修正
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/timeline/director-global-track.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/director-action-track.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/__tests__/director-tracks-popover.test.tsx` (NEW)
- **契約 (Exact Contract & Formula)**:
  1. `director-global-track.tsx`:
     - ピン要素のラッパーに付与されている `z-10` を削除、またはポップオーバー（`z-40`）と外側クリック用バックドロップ（`fixed inset-0 z-30`）の重なり階層を正しく保つ。
     - 削除ボタンをクリックした際、`e.stopPropagation()` を呼んだ上で `onDeleteKeyframe(kf.id)` を直接呼び出す。
     - 削除ボタンのクラスを `text-red-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer` に設定。
  2. `director-action-track.tsx`:
     - Cueブロック親 `div` から `truncate`（`overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`）を除去。
     - 内側のラベル `span` のみに `truncate` を付与し、はみ出しテキストを省略しつつ、親から上部に飛び出る Popover（`bottom-[calc(100%+6px)]`）がクリッピングされないようにする。
     - 削除ボタンのクリックで `e.stopPropagation()` を呼んだ上で `onDeleteCue(cue.id)` を直接呼び出す。
     - 削除ボタンのクラスを同様に `text-red-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer` に設定。
- **Testing Strategy (Concrete Test Values)**:
  - テストファイル: `src/features/tactical-unified/panels/timeline/__tests__/director-tracks-popover.test.tsx`
  - 入力値:
    - GlobalTrack: `keyframes = [{ id: 'kf-1', timeMs: 1000, tiltDeg: 20, yawDeg: 30 }]`
    - ActionTrack: `actionCues = [{ id: 'cue-1', startTimeMs: 1000, durationMs: 2000, zoom: 2.0, panX: 10, panY: 0 }]`
  - 検証:
    - ピンクリックで Popover が表示され、Trash2 ボタンをクリックしたときに `onDeleteKeyframe('kf-1')` が呼ばれること。
    - Cueクリックで Popover が DOM 上で可視表示され、Trash2 ボタンをクリックしたときに `onDeleteCue('cue-1')` が呼ばれること。
    - Trash2 ボタンに `text-red-500` および `cursor-pointer` クラスが含まれていること。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/panels/timeline/__tests__/director-tracks-popover.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/panels/timeline/` PASS
- **Worker Handoff Log**:
  - `DirectorGlobalTrack` / `DirectorActionTrack`: Popover表示時に `z-40` を付与してバックドロップ(`z-30`)のクリック遮断を解消。Cue親の `truncate` 除去でPopover表示を正常化、削除ボタンを赤色（`text-red-500`）へ統一。

---

### Phase 2: Zoom / Pan 停止時リアルタイム画面同期
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/tactical/interpolation-director.ts` (MODIFY)
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts` (MODIFY)
  - `src/lib/tactical/__tests__/interpolation-director.test.ts` (MODIFY)
- **契約 (Exact Contract & Formula)**:
  1. `interpolation-director.ts`:
     ```ts
     export function resolveSyntheticDirectorCamera(
       directorCamera: DirectorCameraConfig,
       timeMs: number,
       options?: { isEditing?: boolean; selectedCueId?: string | null }
     ): ResolvedDirectorCamera;
     ```
     - `options?.isEditing === true` の場合:
       - `timeMs` に該当する ActionCue、または `options?.selectedCueId` で指定された ActionCue が存在する場合、`t = (timeMs - cue.startTimeMs) / cue.transitionInMs` によるアプローチ補間（`t=0` で `zoom: 1.0`）を行わず、即座に Cue のターゲット値（`zoom: cue.zoom, panX: cue.panX, panY: cue.panY`）を直接カメラ姿勢へ反映する。
     - `options?.isEditing !== true`（再生時）の場合:
       - 従来の `transitionInMs`、`durationMs`、`autoReturn` に基づく滑らかなイージング補間を維持する。
  2. `tactical-split-preview-panel.tsx` & `use-export-preview-animation.ts`:
     - 停止時（`!isPlaying`）にカメラを計算・描画する際、`options: { isEditing: true, selectedCueId: selectedCueId }` を渡す。
     - これにより、Cue開始時刻（`cue.startTimeMs`）にシークして停止している状態で、右パネルで Zoom/Pan スライダーを動かしたとき、ピッチの拡大倍率およびパン座標がリアルタイムにキャンバス上に反映される。
- **Testing Strategy (Concrete Test Values)**:
  - テストファイル: `src/lib/tactical/__tests__/interpolation-director.test.ts`
  - 入力値:
    - Cue: `{ id: 'cue-1', startTimeMs: 2000, durationMs: 3000, transitionInMs: 500, zoom: 2.5, panX: 15, panY: -10 }`
    - `timeMs = 2000`（Cue開始時刻）
  - 期待出力:
    - `resolveSyntheticDirectorCamera(config, 2000, { isEditing: false })`: `zoom === 1.0, panX === 0, panY === 0`（アプローチ開始前）
    - `resolveSyntheticDirectorCamera(config, 2000, { isEditing: true })`: `zoom === 2.5, panX === 15, panY === -10`（編集ターゲット値100%反映）
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/lib/tactical/__tests__/interpolation-director.test.ts` ➔ 実装 ➔ `bun run ai:check src/lib/tactical/interpolation-director.ts src/features/tactical-unified/panels/split-preview/` PASS
- **Worker Handoff Log**:
  - `ResolveSyntheticDirectorCameraOptions` を追加。`resolveSyntheticDirectorCamera` に `isEditing` オプションを導入し、停止・編集中はイージングをバイパスしてCueターゲット値を100%即時反映。プレビュー描画パイプライン（`TacticalSplitPreviewPanel`, `useExportPreviewAnimation`）と連携完了。

---

### Phase 3: 動画編集アプリ風ハイブリッドスライダーUI刷新
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/right-panel/camera-slider-field.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/camera-control-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/__tests__/camera-slider-field.test.tsx` (NEW)
- **契約 (Exact Contract & Formula)**:
  1. `camera-slider-field.tsx`:
     - **UI視認性**:
       - スライダートラックの背景に `bg-white/15`（薄グレー）を設定し、可動範囲を明示。
       - プログレスバー（進行色）に `#FF8100`（テーマオレンジ）、つまみ（ノブ）に白円（`bg-white shadow`）を使用。
     - **数値スクラブドラッグ（Scrubbable Number Control）**:
       - 数値表示領域（またはドラッグハンドル領域）で `onPointerDown` を検知。
       - `setPointerCapture` または `window.addEventListener('pointermove', onPointerMove)` により、左右水平ドラッグでの数値スクラブを実装。
       - スクラブ計算式: `newValue = clamp(startValue + Math.round((currentX - startX) * sensitivity) * step, min, max)`。ドラッグ中は `onChange(newValue)` を即座に発火。
       - `pointerup` / `pointercancel` 時に `onChangeEnd?.(newValue)` を発火し、`removeEventListener` を確実に呼ぶ（RAII）。
     - **直接入力モード**:
       - クリックまたはダブルクリックで `<input type="number">` を表示し、Enter または blur で確定。
  2. `camera-control-panel.tsx`:
     - `onChange`: ローカルステートおよびプレビュー描画用状態を即時更新（スライダー操作中の60fps追従）。
     - `onChangeEnd`: 履歴記録（`recordHistory`）を実行。ドラッグ中の履歴肥大化を防ぎ、滑らかな操作感を保証。
- **Testing Strategy (Concrete Test Values)**:
  - テストファイル: `src/features/tactical-unified/panels/right-panel/__tests__/camera-slider-field.test.tsx`
  - 入力値:
    - `value = 1.0, min = 1.0, max = 3.0, step = 0.1`
    - 水平ドラッグ: `startX = 100`, `currentX = 150`（右に50pxドラッグ）
  - 期待出力:
    - `onChange` が連続的に呼び出され、値が増加すること（例: `1.0 -> 1.5`）。
    - ポインタを離した際、`onChangeEnd` が確定値で1回呼ばれること。
    - トラック要素が `bg-white/15` クラスを持っていること。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/panels/right-panel/__tests__/camera-slider-field.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/panels/right-panel/` PASS
- **Worker Handoff Log**:
  - `CameraSliderFieldProps` に `onChangeEnd` を追加。薄グレー（`bg-white/15`）トラックとオレンジ進行色、白ノブ、水平スクラブ＆直接入力を統合。`CameraControlPanel` で `onChangeEnd` 時に `pushHistory` を実行し、RAII解除を徹底。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-08 23:38
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. ドメイン論理 & 要件網羅性 & テスタビリティ: 数式/座標/状態遷移の整合性、受入要件の全網羅、Concrete Test Values検証、ハック排除
  - [x] 2. Invariants保護 & Consumer同期: Section 2.5 の不変条件（ちゃぶ台返し防止）遵守、別画面・呼び出し元（Consumers）の更新漏れゼロ
  - [x] 3. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 4. 設計負債 & サイレント破壊防止: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、公開シグネチャ保護、指示外変更の排除
- **Summary**:
  タイムラインPopoverのz-index階層・truncate修正、停止時プレビューのisEditingによるCueターゲット値即時反映、動画編集アプリ風の薄グレー軌道＆水平スクラブ数値スライダー（RAII解除・ドラッグ終了時pushHistoryコミット）の全8受入要件を満たし、後方互換性とConsumers同期も完全です。LGTMと判定します。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
