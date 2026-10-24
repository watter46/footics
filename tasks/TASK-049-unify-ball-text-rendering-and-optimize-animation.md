# TASK-049: unify-ball-text-rendering-and-optimize-animation

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-24
- **Target Files**:
  - `src/lib/tactical/export/tactical-frame-renderer.ts` (MODIFY)
  - `src/features/tactical-unified/objects/player/components/player-marker-circle.tsx` (MODIFY)
  - `src/features/tactical-unified/objects/player/components/player-marker-ring.tsx` (MODIFY)
  - `src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/__tests__/player-marker-item.test.tsx` (MODIFY)
  - `src/lib/tactical/trajectory.ts` (MODIFY)
  - `src/lib/tactical/unified-interpolation.ts` (MODIFY)
  - `src/features/tactical-unified/stores/slide-helpers.ts` (MODIFY)
  - `src/lib/tactical/__tests__/trajectory.test.ts` (MODIFY)
  - `src/features/tactical-unified/__tests__/timeline-slide-operations.test.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/PitchGroundLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/PlayerMarkerItem.tsx` (MODIFY)
  - `src/features/tactical-unified/objects/ball/components/ball-object.tsx` (MODIFY)
  - `src/features/tactical-unified/adapters/tactical-canvas-store-adapter.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/__tests__/clean-render.test.tsx` (MODIFY)
  - `src/features/tactical-unified/adapters/__tests__/tactical-canvas-store-adapter.test.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-preview-player.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-modal-body.tsx` (MODIFY)
  - `src/features/tactical-unified/stores/slide-crud-slice.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/use-tactical-auto-save.ts` (MODIFY)
  - `src/features/tactical-unified/__tests__/video-export.test.ts` (MODIFY)
  - `src/features/tactical-unified/stores/__tests__/slide-slices.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. Exportボール描画の3D完全統一 & Path2D事前キャッシュ: `tactical-frame-renderer.ts` のボール描画を `SOCCER_BALL_SVG` と同一の立体デザイン（球面ラジアルグラデーション、15本のシームライン、中央正五角形＋外周5箇所の黒パッチ、光沢ハイライト楕円、半径比率 `Math.min(w, h) * 0.022`）に統一し、`MARKER_PATHS`・`SPOTLIGHT_BEAM_PATH`・ボール外周パッチの `Path2D` をモジュールスコープで事前キャッシュすること。
- [x] 2. マーカー内背番号テキストの視覚中央配置: `tactical-frame-renderer.ts` では `ctx.measureText` の `actualBoundingBoxLeft` / `actualBoundingBoxRight` から視覚中心オフセット `px - (right - left) / 2` を補正して描画し、UI側の `PlayerMarkerCircle` / `PlayerMarkerRing` では `height={radius * 2}`・`verticalAlign="middle"`・共通フォント指定により上下左右の中央配置を統一すること。
- [x] 3. ゴースト軌道（同座標時）の往復バグ根絶 & 補間ペア照合キャッシュ: `createSlideForMode`（`'object-free'`）で新スライド作成時に選手・ボールの `trajectory: undefined` をリセットし、`getBezierControlPoint` および `calculateBezierPoint` で始点と終点の距離が `0.1` 未満の場合は制御点を無視して `{ x: p1.x, y: p1.y }` を返し、`matchSlidePlayers` に `WeakMap` キャッシュを導入すること。
- [x] 4. UIドラッグ & アニメーション再生ラグ解消: `PitchGroundLayer` のゴースト表示条件から `!isDragging` を除去し移動距離 `>= 1` の選択選手のみ描画すること。`BallObject` の `useNodePositionTransition` に `disabled: Boolean(cleanRender)` を渡し、`PlayerMarkerItem` の `React.memo` 化・`BillboardObjectLayer` の `useMemo` 化・`tactical-canvas-store-adapter.ts` の参照キャッシュ化を実装すること。
- [x] 5. Exportプレビューの手動再生開始・Morphing設定連動 & 再生中ストア軽量化: `ExportPreviewPlayer` の初期状態を停止（`isPlaying = false`）にして再生ボタン押下時のみ再生させ、`ExportModalBody` で `video` タブの `morphing` 設定を `applySlideTimelineOverrides` でプレビューへ即時反映すること。また `setActiveSlide` で背景未変更時は `project` 参照を維持し、再生中（`isPlaying === true`）は自動保存をスキップすること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { applySlideTimelineOverrides } from '@/lib/tactical/export/tactical-video-exporter';
import { calculateBezierPoint, getBezierControlPoint } from '@/lib/tactical/trajectory';
import { matchSlidePlayers } from '@/lib/tactical/unified-interpolation';
```

### 3.2 Key Interfaces & Types
```ts
// tactical-frame-renderer.ts: 視覚中央X座標補正ヘルパー
function getOpticalCenterX(ctx: AnyCanvasRenderingContext2D, text: string, px: number): number;
```

### 3.3 Implementation Notes & Gotchas
```ts
// 1. Path2D は SSR / Vitest 環境で未定義の場合があるため `typeof Path2D !== 'undefined'` ガード付きでモジュールキャッシュを生成する。
// 2. ctx.createRadialGradient もモック環境で未実装の場合があるため `typeof ctx.createRadialGradient === 'function'` ガードを設け、フォールバック色 (#ffffff / #0f172a) を設定する。
// 3. ExportModalBody で ExportPreviewPlayer に渡す slides は activeTab === 'video' の場合 applySlideTimelineOverrides で transitionDurationMs / pauseMs / easing を適用する。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: Exportボール3D描画統一・背番号の視覚中央配置・Path2Dキャッシュ化
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/tactical/export/tactical-frame-renderer.ts`
  - `src/features/tactical-unified/objects/player/components/player-marker-circle.tsx`
  - `src/features/tactical-unified/objects/player/components/player-marker-ring.tsx`
  - `src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts`
  - `src/features/tactical-unified/core/components/__tests__/player-marker-item.test.tsx`
- **契約 (Interface)**:
  ```ts
  // 1. tactical-frame-renderer.ts:
  //    - ballRadius = Math.max(8, Math.round(Math.min(w, h) * 0.022))
  //    - 100x100 viewBox スケール変換で SOCCER_BALL_SVG の球体グラデーション・15シーム線・中央五角形・外周5パッチ・ハイライト楕円を描画
  //    - getOpticalCenterX(ctx, p.shirtNo, px) で actualBoundingBoxLeft/Right の差分を補正して fillText
  // 2. player-marker-circle.tsx / player-marker-ring.tsx:
  //    - Text に height={radius * 2}, verticalAlign="middle", y={-radius} (ringは y={-radius * 1.1}), fontFamily を設定
  ```
- **Testing Strategy**:
  - `tactical-frame-renderer.test.ts` & `player-marker-item.test.tsx`: ボール描画でシーム線と五角形パッチが描画されること、`actualBoundingBoxLeft/Right` 非対称時に `fillText` のX座標が視覚中央へ補正されること、UIマーカーのTextが中央配置属性を持つことを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts` ➔ 実装 ➔ `bun run ai:check src/lib/tactical/export/tactical-frame-renderer.ts src/features/tactical-unified/objects/player/components/player-marker-circle.tsx` PASS
- **Worker Handoff Log**:
  - export: `getOpticalCenterX`, `SOCCER_BALL_PATCH_PATHS`, `SOCCER_BALL_SEAM_LINES` を配備。Path2Dキャッシュ化と `createRadialGradient`/`rotate` ガードによりSSR・モック環境耐性を担保。

---

### Phase 2: ゴースト軌道（同座標時）の往復バグ根絶 & 補間ペア照合のWeakMapキャッシュ化
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/tactical/trajectory.ts`
  - `src/lib/tactical/unified-interpolation.ts`
  - `src/features/tactical-unified/stores/slide-helpers.ts`
  - `src/lib/tactical/__tests__/trajectory.test.ts`
  - `src/features/tactical-unified/__tests__/timeline-slide-operations.test.ts`
- **契約 (Interface)**:
  ```ts
  // 1. trajectory.ts:
  //    getBezierControlPoint / calculateBezierPoint の先頭で Math.hypot(p1.x - p0.x, p1.y - p0.y) < 0.1 の場合は { x: p1.x, y: p1.y } を即返却
  // 2. slide-helpers.ts (createSlideForMode):
  //    'object-free' 時に clonedPlayers の各要素へ trajectory: undefined、ball にも trajectory: undefined を設定
  // 3. unified-interpolation.ts:
  //    matchSlidePlayers に WeakMap<Player[], WeakMap<Player[], MatchedPlayerPair[]>> キャッシュを導入
  ```
- **Testing Strategy**:
  - `trajectory.test.ts` & `timeline-slide-operations.test.ts`: `p0` と `p1` が同座標のとき `custom` の `controlPoint` が残っていても `t=0.5` で座標が動かないこと、`addSlide`（object-free）で前のスライドの `trajectory` がリセットされることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/lib/tactical/__tests__/trajectory.test.ts` ➔ 実装 ➔ `bun run ai:check src/lib/tactical/trajectory.ts src/lib/tactical/unified-interpolation.ts src/features/tactical-unified/stores/slide-helpers.ts` PASS
- **Worker Handoff Log**:
  - trajectory同座標時の即時返却（距離<0.1）とWeakMap二重参照キャッシュ（playerMatchCache）を配備。createSlideForMode('object-free')でplayer/ballのtrajectoryをリセット。

---

### Phase 3: UIドラッグ・キャンバス再描画・アニメーション再生ラグの解消
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/core/components/PitchGroundLayer.tsx`
  - `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx`
  - `src/features/tactical-unified/core/components/PlayerMarkerItem.tsx`
  - `src/features/tactical-unified/objects/ball/components/ball-object.tsx`
  - `src/features/tactical-unified/adapters/tactical-canvas-store-adapter.ts`
  - `src/features/tactical-unified/core/components/__tests__/clean-render.test.tsx`
  - `src/features/tactical-unified/adapters/__tests__/tactical-canvas-store-adapter.test.ts`
- **契約 (Interface)**:
  ```ts
  // 1. PitchGroundLayer.tsx:
  //    ゴースト描画条件を `selectedIds.includes(marker.id)` かつ `Math.hypot(marker.x - prevPlayer.x, marker.y - prevPlayer.y) >= 1` に限定（`!isDragging` を削除）
  // 2. ball-object.tsx:
  //    useNodePositionTransition({ nodeRef: ballGroupRef, x: px, y: py, disabled: Boolean(cleanRender) })
  // 3. PlayerMarkerItem.tsx & BillboardObjectLayer.tsx:
  //    PlayerMarkerItem を React.memo 化し、BillboardObjectLayer の sortedItems を useMemo 化
  // 4. tactical-canvas-store-adapter.ts:
  //    selectedIds / annotations / capabilities / history / アクション関数群の参照をキャッシュし、setState で値未変更時は updateAndNotify をスキップ
  ```
- **Testing Strategy**:
  - `clean-render.test.tsx` & `tactical-canvas-store-adapter.test.ts`: `cleanRender=true` 時にボールの `Konva.Tween` が発火しないこと、無関係な状態更新時に `selectedIds` / `annotations` の参照が維持されること、同じ `isDragging` 値での `setState` が通知をスキップすることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/adapters/__tests__/tactical-canvas-store-adapter.test.ts` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/adapters/tactical-canvas-store-adapter.ts src/features/tactical-unified/core/components/PitchGroundLayer.tsx src/features/tactical-unified/objects/ball/components/ball-object.tsx` PASS
- **Worker Handoff Log**:
  - tactical-canvas-store-adapter の selectedIds/annotations/capabilities/history/actions 参照キャッシュ化および setState 同値時通知スキップを配備。BallObject の cleanRender 時 disabled 注入、PlayerMarkerItem の React.memo 化、BillboardObjectLayer の sortedItems useMemo 化、PitchGroundLayer ゴースト条件最適化（!isDragging 除去 & 距離 >= 1）を完了。

---

### Phase 4: Exportプレビューの手動再生開始・Morphing設定連動 & 再生中ストア軽量化
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/export/export-preview-player.tsx`
  - `src/features/tactical-unified/panels/export/export-modal-body.tsx`
  - `src/features/tactical-unified/stores/slide-crud-slice.ts`
  - `src/features/tactical-unified/hooks/use-tactical-auto-save.ts`
  - `src/features/tactical-unified/__tests__/video-export.test.ts`
  - `src/features/tactical-unified/stores/__tests__/slide-slices.test.ts`
- **契約 (Interface)**:
  ```ts
  // 1. export-preview-player.tsx:
  //    useExportPreviewAnimation 内の初期状態を `useState(false)`（停止状態・先頭フレーム表示）に変更し、Playボタン押下で再生開始
  // 2. export-modal-body.tsx:
  //    activeTab === 'video' の場合、applySlideTimelineOverrides で morphing 設定（transitionSec, pauseSec, selectedEasing）を適用した slides を ExportPreviewPlayer に渡す
  // 3. slide-crud-slice.ts & use-tactical-auto-save.ts:
  //    setActiveSlide で背景種別・背景URLが同一の場合は `project: s.project` のまま参照を維持し、useTacticalAutoSave は `isPlaying === true` の間デバウンス保存をスキップ
  ```
- **Testing Strategy**:
  - `video-export.test.ts` & `slide-slices.test.ts`: `ExportPreviewPlayer` の初期状態が一時停止（Playボタン表示）でありクリックで再生に切り替わること、`setActiveSlide` で背景が同じ場合に `project` オブジェクト参照が再生成されないことを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/stores/__tests__/slide-slices.test.ts` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/panels/export/export-preview-player.tsx src/features/tactical-unified/panels/export/export-modal-body.tsx src/features/tactical-unified/stores/slide-crud-slice.ts` PASS
- **Worker Handoff Log**:
  - ExportPreviewPlayerの初期isPlayingをfalse化、ExportModalBodyでvideoタブ時applySlideTimelineOverrides適用。setActiveSlideの背景同値時project参照維持とuseTacticalAutoSaveのisPlayingスキップを配備。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-24 18:30
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  Exportボールの3D完全統一・Path2Dキャッシュ化、背番号の視覚中央配置、微小距離ベジェ往復バグ防止およびWeakMapキャッシュ、ドラッグ中ゴースト描画・Tween停止等のラグ解消、プレビュー初期停止・Morphing連動・再生中オートセーブ抑制まで、4大定性監査（6大設計品質原則）を完璧にクリア。テストも充実しており承認。

## 6. Rejections / Additional Tasks (不可逆修正欄)
