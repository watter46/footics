# TASK-173: 戦術ボード 矢印描画・エフェクト伸長・再生状態の整合性改修

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-10
- **Target Files**:
  - `src/features/tactical-unified/core/components/annotations/arrow-geometry.ts` (MODIFY)
  - `src/lib/tactical/effect-geometry.ts` (MODIFY)
  - `src/lib/tactical/__tests__/effect-geometry.test.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/DrawingPreviewLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/annotations/arrow-line-node.tsx` (MODIFY)
  - `src/features/tactical-unified/hooks/animation-node-updater.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/__tests__/animation-node-updater.test.ts` (MODIFY)
  - `src/lib/tactical/export/renderers/arrow-renderer.ts` (MODIFY)
  - `src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/use-tactical-animation.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/tactical-playback-controls.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. **矢印サイズ・太さの基準統一**:
  - 基準幅 1200px をスケール基準（`scale = width / 1200`）とし、ドラッグ配置プレビュー・静止配置時・アニメーション再生時・エクスポート描画の4フェーズで同一の `computeArrowDimensions` 関数から太さ（`strokeWidth`）、先端サイズ（`pointerLength`, `pointerWidth`）、円端点半径（`dotRadius`）を算出すること。
  - ドラッグ中と配置後で矢印の太さや先端サイズが急変しないこと。
- [x] 2. **波線矢印（Dribble）伸長中の先端暴れ解消**:
  - 波線矢印の伸長中（`0 < progress < 1`），矢印先端の向き（`tipAngle`）を正弦波の微小接線ではなく「始点から終点に向かう主進行ベクトル」に固定すること。
  - Konva.Arrow 向けにも末尾セグメントが主進行方向を向くよう調整し、Konva とエクスポート双方で先端が上下に首振りせず滑らかに前進すること。
- [x] 3. **DOM描画とエクスポート描画の完全一致化**:
  - エクスポート描画（`arrow-renderer.ts`）における矢印先端の二重描画（`ctx.stroke()`）を廃止し、DOM同様に `ctx.fill()` のみに統一すること。
  - 端点オフセット計算に `applyDotOffsets` を共通適用し、円マーカーとの隙間と半径比率を一致させること。
- [x] 4. **再生開始時のチラつき根絶**:
  - `playAnimation` 実行時、GSAP タイムラインの初回非同期更新を待たずに、同期的に 0ms（伸長0%）フレームを描画適用し、100%伸長済み矢印の一瞬の映り込みを物理的に排除すること。
- [x] 5. **再生後（停止・一時停止・完了）の状態完全復元**:
  - 再生完了時および停止時に `setIsPlaying(false)` に切り替えた後、静止画基準状態（`progress: 1.0`, `opacity: 1.0`, `visible: true`）を同期描画で Konva ノードに適用すること。
  - React側（`arrow-line-node.tsx`）で `opacity={arrow.opacity ?? 1}` を明示バインドし、エフェクトによる半透明・非表示が静止画編集モードに残留しないこと。

## 2.5 Architectural Invariants & Why (破壊禁止の前提と設計理由)
- **Invariants (破壊禁止の不変条件と理由)**:
  1. **単一幾何計算源 (Single Geometry Source)**: 矢印の線幅・先端サイズ・端点オフセット・トリミング角度の計算ロジックは必ず共通関数（`computeArrowDimensions`, `applyDotOffsets`, `trimRenderPoints`）から導出し、各描画層でインラインの独自計算を行わないこと（描画差異の再発防止）。
  2. **ステートレス再生 (Zero Residual State)**: アニメーション再生は Konva ノードを命令的に書き換えるが、再生終了（停止・一時停止・終端到達）後は必ず静止画基準値（`progress: 1.0`, `opacity: 1.0`, `visible: true`）に完全復元し、後続の編集操作を破壊しないこと。
- **Consumers (呼び出し元・別画面の同期確認リスト)**:
  - `src/features/tactical-unified/core/components/DrawingPreviewLayer.tsx` — ドラッグ中描画のスケール整合
  - `src/features/tactical-unified/core/components/annotations/arrow-line-node.tsx` — 静止画表示と props.opacity バインド
  - `src/features/tactical-unified/hooks/animation-node-updater.ts` — 再生中ノード更新の線幅スケール適用
  - `src/lib/tactical/export/renderers/arrow-renderer.ts` — 動画書き出し時の描画完全一致
  - `src/features/tactical-unified/hooks/use-tactical-animation.ts` — 再生開始・終了ライフサイクル

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
// 幾何計算モジュール
import {
  computeArrowDimensions,
  applyDotOffsets,
} from '@/features/tactical-unified/core/components/annotations/arrow-geometry';
import { trimRenderPoints } from '@/lib/tactical/effect-geometry';
```

### 3.2 Key Interfaces & Types
```ts
export interface ArrowDimensions {
  scale: number;
  strokeWidth: number;
  pointerLength: number;
  pointerWidth: number;
  dotRadius: number;
}

export function computeArrowDimensions(
  stageWidth: number,
  baseStrokeWidth = 3,
): ArrowDimensions {
  const scale = stageWidth > 0 ? stageWidth / 1200 : 1;
  const strokeWidth = Math.max(2, Math.round(baseStrokeWidth * scale));
  const pointerLength = Math.max(8, Math.round(15 * scale));
  const pointerWidth = Math.max(8, Math.round(15 * scale));
  const dotRadius = Math.max(5 * scale, strokeWidth * 1.6);
  return { scale, strokeWidth, pointerLength, pointerWidth, dotRadius };
}
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```ts
// 波線矢印の主進行方向角度の算出
const mainAngle = Math.atan2(
  points[points.length - 1].y - points[0].y,
  points[points.length - 1].x - points[0].x,
);
```

---

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 矢印サイズ計算基盤の一元化 & 波線矢印の先端平滑化
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/core/components/annotations/arrow-geometry.ts` (MODIFY)
  - `src/lib/tactical/effect-geometry.ts` (MODIFY)
  - `src/lib/tactical/__tests__/effect-geometry.test.ts` (MODIFY)
- **契約 (Exact Contract & Formula)**:
  1. `arrow-geometry.ts` に `computeArrowDimensions(stageWidth: number, baseStrokeWidth = 3): ArrowDimensions` を追加し export。
     - `scale = stageWidth > 0 ? stageWidth / 1200 : 1`
     - `strokeWidth = Math.max(2, Math.round(baseStrokeWidth * scale))`
     - `pointerLength = Math.max(8, Math.round(15 * scale))`
     - `pointerWidth = Math.max(8, Math.round(15 * scale))`
     - `dotRadius = Math.max(5 * scale, strokeWidth * 1.6)`
  2. `effect-geometry.ts` の `trimRenderPoints(points: NormalizedPoint[], progress: number, isWavy = false): TrimmedPointsResult` を拡張：
     - `isWavy === true` の場合、先端角度 `tipAngle` に局所接線角度ではなく、点列全体の主進行方向 `Math.atan2(points[points.length - 1].y - points[0].y, points[points.length - 1].x - points[0].x)` を代入。
     - Konva.Arrow 向けに、`trimmedPoints` の末尾2点が主進行方向の角度を向くように、末尾から1つ前の点を `lastPt` から主進行方向の逆向きに微小距離（0.1px）オフセットした座標にする（Konva 内部の自動角度計算が暴れるのを防止）。
- **Testing Strategy (Concrete Test Values)**:
  - `src/lib/tactical/__tests__/effect-geometry.test.ts` にテスト追加:
    - 入力: `points = getWavyPoints(0, 0, 100, 0)`（水平な波線矢印）, `progress = 0.5`, `isWavy = true`
    - 期待値: `tipAngle` が 0（±0.01 rad 以内。上下に首振りしないこと）。
    - 入力: `computeArrowDimensions(1200, 3)` ➔ 期待値: `{ scale: 1, strokeWidth: 3, pointerLength: 15, pointerWidth: 15, dotRadius: 5 }`
    - 入力: `computeArrowDimensions(600, 3)` ➔ 期待値: `{ scale: 0.5, strokeWidth: 2, pointerLength: 8, pointerWidth: 8, dotRadius: 3.2 }`
- **Tasks**:
  - [x] 1. TDD テスト作成・実装: `bun test src/lib/tactical/__tests__/effect-geometry.test.ts` PASS
  - [x] 2. 型チェック・Lint: `bun run ai:check src/features/tactical-unified/core/components/annotations/arrow-geometry.ts src/lib/tactical/effect-geometry.ts` PASS
- **Worker Handoff Log**:
  - `computeArrowDimensions` / `ArrowDimensions` を `arrow-geometry.ts` より export。`trimRenderPoints` に `isWavy` 引数を追加し、`isWavy === true` 時に先端角度を主進行ベクトルに固定し末尾直前点を逆向きに0.1pxオフセット。

---

### Phase 2: キャンバスDOM & エクスポート描画の完全統一
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/core/components/DrawingPreviewLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/annotations/arrow-line-node.tsx` (MODIFY)
  - `src/features/tactical-unified/hooks/animation-node-updater.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/__tests__/animation-node-updater.test.ts` (MODIFY)
  - `src/lib/tactical/export/renderers/arrow-renderer.ts` (MODIFY)
  - `src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts` (MODIFY)
- **契約 (Exact Contract & Formula)**:
  1. `DrawingPreviewLayer.tsx`:
     - `computeArrowDimensions(width, strokeWidth)` を呼び出して `scaledStrokeWidth`, `pointerLength`, `pointerWidth` を取得し、KonvaArrow に適用。
  2. `arrow-line-node.tsx`:
     - `scale = width / 600` の独自計算を廃止し、`computeArrowDimensions(width, arrow.strokeWidth)` を使用。
     - `<Arrow ... opacity={arrow.opacity ?? 1} />` を明示渡しして React state と同期。
  3. `animation-node-updater.ts`:
     - `updateArrowNodes`: `computeArrowDimensions(stageWidth, aState.strokeWidth)` を呼び出し、`arrowEntry.node.strokeWidth(strokeWidth)` を適用（静止時と同じ太さ！）。
     - 波線矢印のトリミング時に `trimRenderPoints(ptsList, clampedProgress, isWavy)` を呼び出す。
  4. `arrow-renderer.ts`:
     - `scale = w / 600` の独自計算を廃止し、`computeArrowDimensions(w, a.strokeWidth)` を使用。
     - 矢印先端の描画で `ctx.stroke()` を削除し、`ctx.fill()` のみ実行（二重線幅の肥大化を根絶）。
     - `dotRadius` も `computeArrowDimensions` から取得。
- **Testing Strategy (Concrete Test Values)**:
  - `src/features/tactical-unified/hooks/__tests__/animation-node-updater.test.ts`:
    - `updateArrowNodes` 実行時に `arrowNode.strokeWidth()` が `computeArrowDimensions` でスケールされた太さに一致することを検証。
  - `src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts`:
    - 矢印エクスポート描画の既存テストが PASS し、先端描画で `ctx.fill` が呼ばれ `ctx.stroke` が呼ばれないことをスパイ検証。
- **Tasks**:
  - [x] 1. TDD 実装 & 既存テスト修正: `bun run ai:check src/features/tactical-unified/hooks/animation-node-updater.ts src/lib/tactical/export/renderers/arrow-renderer.ts` PASS
  - [x] 2. DrawingPreviewLayer & arrow-line-node の接続: `bun run ai:check src/features/tactical-unified/core/components/DrawingPreviewLayer.tsx src/features/tactical-unified/core/components/annotations/arrow-line-node.tsx` PASS
- **Worker Handoff Log**:
  - DrawingPreviewLayer / arrow-line-node / animation-node-updater / arrow-renderer を `computeArrowDimensions` に統合し、先端二重 stroke 廃止・applyDotOffsets 共通化・opacity バインドを完了。

---

### Phase 3: 再生ライフサイクルのチラつき根絶 & 停止時状態復元
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/hooks/use-tactical-animation.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/tactical-playback-controls.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/tactical-animation-canvas.ts` (MODIFY)
- **契約 (Exact Contract & Formula)**:
  1. `use-tactical-animation.ts`:
     - `playAnimation`: GSAPタイムライン起動前（`tl.play()` 直前）に同期的に `applyFrameToCanvas(0, options?.nodesRegistryRef?.current, dims.width, dims.height, true, dims.x, dims.y)` を実行（初回フレームのチラつきを根絶）。
     - `onComplete`: `setIsPlaying(false)` を呼んだ直後に同期的に `applyFrameToCanvas(totalDurationMs, ... synchronous = true)` を実行。
  2. `tactical-animation-canvas.ts`:
     - `renderFrameToCanvas`: `!isPlaying` の場合、すべての `effectArrows` に `progress = 1.0`, `opacity = 1.0`, `visible = true` を設定して `updateArrowNodes` を呼ぶ。また、プレイヤーの `rippleRings` も確実に `visible(false)` にする。
  3. `tactical-playback-controls.ts`:
     - `stopPlayback`, `pausePlayback`, `snapToSlideOnStop`: `setIsPlaying(false)` に更新した後、静止画フレームを同期描画して、半透明・非表示・エフェクトが残留しないことを保証する。
- **Testing Strategy (Concrete Test Values)**:
  - `src/features/tactical-unified/__tests__/tactical-animation.test.ts` (または関連テスト):
    - `playAnimation` 呼び出し直後に 0ms フレームが同期適用されることを検証。
    - `stopPlayback` / `pausePlayback` 完了時にノードの `opacity` が 1 に戻ることを検証。
- **Tasks**:
  - [x] 1. ライフサイクル実装: `bun run ai:check src/features/tactical-unified/hooks/use-tactical-animation.ts src/features/tactical-unified/hooks/tactical-playback-controls.ts src/features/tactical-unified/hooks/tactical-animation-canvas.ts` PASS
- **Worker Handoff Log**:
  - playAnimation 開始時に 0ms フレームを同期描画し、onComplete / stopPlayback / pausePlayback / snapToSlideOnStop では setIsPlaying(false) 直後に同期描画（synchronous = true）を実行して effectArrows（progress: 1.0, opacity: 1.0, visible: true）と rippleRings の非表示復元を完了。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-10 02:08
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. ドメイン論理 & 要件網羅性 & テスタビリティ: 矢印サイズ・太さの基準統一、波線先端の主進行方向固定、エクスポートの二重stroke廃止、0ms先行描画、停止時完全復元が網羅されているか
  - [x] 2. Invariants保護 & Consumer同期: 単一幾何計算源（computeArrowDimensions）とステートレス再生が保護され、全呼び出し元が同期されているか
  - [x] 3. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、初期フレームのチラつき根絶、アニメーション停止時のクリーンアップが正しく動作しているか
  - [x] 4. 設計負債 & サイレント破壊防止: 既存の矢印移動・ドラッグ操作・ベジェ曲線への悪影響がないか
- **Summary**:
  矢印寸法計算の単一源（`computeArrowDimensions`）化、波線先端角度の主進行ベクトル固定、エクスポート先端二重描画廃止、再生開始時同期0ms描画によるZero-Flicker、停止時ステートレス復元、および Fix 1（1200px新基準スケールと0.5縮小スケールのdashArray検証）がすべて厳格に満たされていることを確認しLGTMとします。

## 6. Rejections / Additional Tasks (不可逆修正欄)
### Fix 1: animation-node-updater.test.ts の dashArray アサーション修正
- **Status**: `DONE`
- **対象ファイル**:
  - `src/features/tactical-unified/hooks/__tests__/animation-node-updater.test.ts`
  - 必要に応じて `src/features/tactical-unified/hooks/animation-node-updater.ts`
- **内容**:
  `it('renderArrows applies custom dashArray or defaults for pass/defend arrows')` で `dash()` の引数期待値不一致エラー（`expected "vi.fn()" to be called with arguments: [ [ 12, 4 ] ]`）が発生。
  `computeArrowDimensions` 導入や `scale` の変更に伴う dash スケール計算（またはモック・テスト期待値）の整合性を修正し、`bun run ai:check src/features/tactical-unified/hooks/__tests__/animation-node-updater.test.ts` を PASS させること。
- **Worker Handoff Log**:
  - `animation-node-updater.test.ts` の `mockRenderContext` を新基準幅 `w: 1200`（`scale = 1`）に更新して `[12, 4]` および `[8, 5]` を検証し、加えて `w: 600`（`scale = 0.5`）での縮小スケール `[6, 2]` を検証するテストを追加して `ai:check` 全PASSを確認。
- **Reviewer Assessment**: `LGTM` (2026-11-10 02:08)
- **Audit Note**:
  新基準幅 1200px におけるベースライン dashArray（`[12, 4]`, `[8, 5]`）と `w: 600` での半減縮小スケール（`[6, 2]`）の双方が厳密にアサートされており、単一幾何計算源（`computeArrowDimensions`）のスケール導出不変条件と完全に合致しています。
