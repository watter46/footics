# TASK-090: Tactical 再生アニメーションの不整合修正 (Phase 2)

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-27
- **Target Files**:
  - `src/lib/tactical/unified-interpolation.ts` (MODIFY)
  - `src/lib/tactical/interpolation-annotation.ts` (MODIFY)
  - `src/lib/tactical/interpolation-ball.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/animation-node-updater.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/tactical-animation-canvas.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/use-tactical-animation.ts` (MODIFY)
  - `src/features/tactical-unified/stores/slide-playback-slice.ts` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/slide-card.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/transition-connector.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/timeline-bar.tsx` (MODIFY)
  - `src/lib/tactical/export/renderers/ball-renderer.ts` (MODIFY)
  - `src/lib/tactical/export/renderers/arrow-renderer.ts` (MODIFY)
  - `src/lib/tactical/__tests__/unified-interpolation.test.ts` (MODIFY)
  - `src/features/tactical-unified/__tests__/tactical-animation.test.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/__tests__/animation-node-updater.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. 曲げた Arrow の補間修正:
  - シーン1とシーン2で矢印を伸ばした際、アニメーション再生中もベジェ曲線の制御点・サンプリング点群が正しく Konva ノードおよびエクスポート描画に反映され、直線に戻るバグを解消すること。
  - `isCurved` 判定（`curved`, `arc`, `controlPoint !== undefined`）を統一し、片方が直線矢印の場合でも中点から滑らかにモーフィング補間されること。
  - 波線矢印（`dribble` 等）もアニメーション再生中に適切なサンプリング点群で描画されること。
- [x] 2. 再生中のリアルタイムシーン移動 & 停止時スナップ & 終了後同期:
  - 再生中は現在再生されているシーン、およびシーン間コネクタ（遷移中）をオレンジ色の枠（`border-amber-500` / `ring-amber-500`）でリアルタイムに強調表示すること（通常シーン選択の青色枠と区別）。
  - ユーザーが停止（一時停止・ストップ）した際、停止したシーンに移動し、シーン間（遷移中）だった場合は「直後のシーン（遷移先）」にスナップ移動して画面表示・アクティブスライドを確定すること。
  - アニメーション再生が自然完了（`timeMs >= totalDurationMs`）した際、初期スライドに巻き戻らず、確実に「最後のスライド（遷移先）」のアクティブ状態およびキャンバス表示に留まること。
  - スライド遷移の境界イベント時のみ状態通知を行い、再生中の不要な React 再描画（毎フレーム再描画）を防止すること（Zero React re-render during playback 厳守）。
- [x] 3. ボール移動時の自転アニメーション:
  - スライド間でボールが移動する際、移動量（ピッチ上の移動距離）および進行方向（右移動で時計回り、左移動で反時計回り）に応じてボールが自然に回転するアニメーションを追加すること。
  - Konva キャンバス上の `BallObject` だけでなく、動画エクスポートレンダラー（`renderBall`）でも自転が反映されること。
- [x] 4. 検証パス:
  - 矢印補間・スライド同期/停止時スナップ・ボール自転に関する単体テストがすべて PASS すること。
  - 既存のテストスイート（`tactical-animation.test.ts`, `unified-interpolation.test.ts` 等）が回帰なくすべて PASS すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Arrow Render & Sampling Points
```ts
// src/features/tactical-unified/core/components/annotations/wavy-arrow-math.ts
export function getQuadraticBezierPoints(
  startX: number, startY: number,
  cpX: number, cpY: number,
  endX: number, endY: number,
  steps = 30,
): number[];

// src/features/tactical-unified/hooks/animation-node-updater.ts
// 修正対象: updateArrowNodes
// Konva.Arrow は tension:0 のため、3点ではなくサンプリング点群を渡す必要がある
```

### 3.2 Slide Playback State & Orange Highlight
```ts
// src/features/tactical-unified/stores/slide-playback-slice.ts
export interface SlidePlaybackSlice {
  isPlaying: boolean;
  playbackSlideIndex: number;
  playbackTransitionIndex: number | null; // シーン i と i+1 の遷移中は i+1、静止時は null
  // ...
}

// 停止時スナップロジック:
// 遷移中 (0 < rawT < 1) に停止した場合: nextSlideIndex (直後シーン) にスナップ
// pause 時間中または完了時に停止した場合: currentSlideIndex に留まる
```

### 3.3 Ball Rotation Calculation (Direction-aware)
```ts
// src/lib/tactical/interpolation-ball.ts
export interface InterpolatedBallState {
  x: number;
  y: number;
  visible: boolean;
  opacity: number;
  rotation?: number; // 度数法 (degrees)
}
// dx >= 0 ? 1 : -1 (右移動: 時計回り +, 左移動: 反時計回り -)
// rotation = startRotation + dir * (distance * FACTOR)
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 曲げた Arrow の補間・描画修正
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/tactical/interpolation-annotation.ts`
  - `src/features/tactical-unified/hooks/animation-node-updater.ts`
  - `src/lib/tactical/export/renderers/arrow-renderer.ts`
  - `src/features/tactical-unified/hooks/__tests__/animation-node-updater.test.ts`
- **Testing Strategy**:
  - `rtk vitest run src/features/tactical-unified/hooks/__tests__/animation-node-updater.test.ts`
- **Tasks**:
  - [x] 1. `interpolation-annotation.ts` の `interpolateArrow` で、直線 ⇄ 曲線間の中点 Lerp 補間と `curveType` 判定の頑健化を実装
  - [x] 2. `animation-node-updater.ts` の `updateArrowNodes` で、`isCurved` の判定拡張（`curved`, `arc`, `controlPoint !== undefined`）と `getQuadraticBezierPoints` / `getWavyPoints` によるサンプリング点群の適用
  - [x] 3. `arrow-renderer.ts` のエクスポート描画で `controlPoint` / `curveType` の判定整合性を確保
  - [x] 4. 単体テストを追加し、アニメーション再生中の矢印がベジェ曲線サンプリング配列で更新されることを検証

**Worker Handoff Log**:
- 直線 ⇄ 曲線矢印の補間は直線側の中点を暗黙の制御点として lerp し、再生中は `getQuadraticBezierPoints` / `getWavyPoints` 点群サンプリングで Konva.Arrow 及び Canvas2D の滑らかな描画を実現。
- `isCurved` は `curveType === 'curved' || curveType === 'arc' || controlPoint !== undefined` を統一基準とした。

---

### Phase 2: 再生中リアルタイムシーン移動（オレンジ枠）& 停止時スナップ & 終了後同期
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/tactical/unified-interpolation.ts`
  - `src/features/tactical-unified/stores/slide-playback-slice.ts`
  - `src/features/tactical-unified/hooks/tactical-animation-canvas.ts`
  - `src/features/tactical-unified/hooks/use-tactical-animation.ts`
  - `src/features/tactical-unified/panels/timeline/slide-card.tsx`
  - `src/features/tactical-unified/panels/timeline/transition-connector.tsx`
  - `src/features/tactical-unified/panels/timeline/timeline-bar.tsx`
  - `src/features/tactical-unified/__tests__/tactical-animation.test.ts`
  - `src/lib/tactical/__tests__/unified-interpolation.test.ts`
- **Testing Strategy**:
  - `rtk vitest run src/features/tactical-unified/__tests__/tactical-animation.test.ts`
  - `rtk vitest run src/lib/tactical/__tests__/unified-interpolation.test.ts`
- **Tasks**:
  - [x] 1. `unified-interpolation.ts` の `getInterpolatedUnifiedSlideFrame` で、`timeMs >= totalDurationMs` 時およびセグメント完了時に最後のスライドインデックス（`slides.length - 1`）を返すよう修正
  - [x] 2. `slide-playback-slice.ts` に `playbackSlideIndex`, `playbackTransitionIndex` を追加し、シーン切替時のみ発火する境界通知アクションを整備
  - [x] 3. `tactical-animation-canvas.ts` の `renderFrameToCanvas` と `use-tactical-animation.ts` で、再生中のインデックス更新、および一時停止/停止時に「遷移中なら直後シーンへスナップ」する処理を実装
  - [x] 4. `SlideCard` および `TransitionConnector` に再生中オレンジ枠（`border-amber-500` / `ring-amber-500`）スタイルを適用
  - [x] 5. 再生完了後に最後のスライド（遷移先）に留まること、停止時に直後シーンへスナップすることを検証する単体テストを追加

**Worker Handoff Log**:
- `slide-playback-slice.ts` に `playbackSlideIndex`, `playbackTransitionIndex` と境界更新アクション `setPlaybackIndices` を新設。GSAP からはシーン/遷移状態の境界変化時のみ通知し Zero React re-render を徹底。
- 一時停止時は `snapToSlideOnStop` で遷移中なら直後シーンへスナップし、pause中・完了時は現シーンに留まる仕様を実装。再生制御ヘルパーはファイルサイズ上限 R8 遵守のため `tactical-playback-controls.ts` へ純粋関数として分離。

---

### Phase 3: ボール移動時の自転アニメーション実装
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/tactical/interpolation-ball.ts`
  - `src/lib/tactical/unified-interpolation.ts`
  - `src/features/tactical-unified/hooks/animation-node-updater.ts`
  - `src/lib/tactical/export/renderers/ball-renderer.ts`
  - `src/features/tactical-unified/hooks/__tests__/animation-node-updater.test.ts`
  - `src/lib/tactical/__tests__/unified-interpolation.test.ts`
- **Testing Strategy**:
  - `rtk vitest run src/features/tactical-unified/hooks/__tests__/animation-node-updater.test.ts`
  - `rtk vitest run src/lib/tactical/__tests__/unified-interpolation.test.ts`
- **Tasks**:
  - [x] 1. `InterpolatedBallState` に `rotation?: number` を定義し、`interpolateBall` 内でボール移動量と進行方向（右移動で時計回り、左移動で反時計回り）に基づく自転角度を算出
  - [x] 2. `animation-node-updater.ts` の `updateBallNode` で `registry.ballNode.rotation(ball.rotation)` を反映
  - [x] 3. `ball-renderer.ts` の Canvas2D 描画で `ctx.rotate` による自転描画を実装
  - [x] 4. ボール自転角度の計算および Konva / Canvas2D への反映を検証するテストを追加

**Worker Handoff Log**:
- `interpolateBall` に `BALL_ROTATION_FACTOR = 7.2` と進行方向（右移動: +, 左移動: -）に応じた自転角度（度数法 degrees）の計算を実装し、`calculateAccumulatedBallRotation` でスライド間の角度をシームレスに累積。
- `updateBallNode` で Konva ノードの `.rotation(ball.rotation ?? 0)` を直接更新し、`renderBall` で中心 `(bx, by)` 周りの `ctx.rotate` による自転描画を両立。

---

### Phase 4: 全体結合検証 & リグレッション確認
- **Worker Model**: `flash`
- **対象ファイル**:
  - 上記全対象ファイル
- **Testing Strategy**:
  - `bun run ai:check`
  - `rtk vitest run src/features/tactical-unified/ src/lib/tactical/`
- **Tasks**:
  - [x] 1. 全体テストの実行と型チェック・Lintチェックのクリア
  - [x] 2. コミット実行（`bun run ai:commit`）

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-27 18:25
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII
  - [x] 3. 設計負債 & 拡張性
  - [x] 4. サイレント破壊 & 既存保護
- **Summary**:
  曲げ矢印のベジェ点群サンプリング補間、再生中のオレンジ枠強調・停止時直後スナップ・終了後同期、ボール移動時の方向連動自転（Konva・Canvas2Dエクスポート両対応）が品質高く実装されています。境界通知による Zero React re-render や、再生制御モジュール切り出し（`tactical-playback-controls.ts`）による 250 行制限遵守など、4大定性監査の全項目を完全にクリアしています。

## 6. Rejections / Additional Tasks (不可逆修正欄)
- 特になし
