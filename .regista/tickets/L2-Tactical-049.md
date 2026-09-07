---
id: L2-Tactical-049
emoji: 🟡
title: ピッチアスペクト比切り替え時のピッチ・選手トランジションアニメーション実装
status: DONE
depends_on:
  - L1-Tactical-046
code_snapshot: "01e9f0d396703b0d1a144d2af921c5742b711a71"
model: Gemini 3.8 Flash
effort: medium
target_files:
  - src/features/tactical-unified/objects/canvas/components/unified-canvas.tsx
  - src/features/tactical-unified/stores/slide-aspect-helpers.ts
reference_files:
  - src/app/test/pitch-aspect/components/pitch-stage.tsx
  - src/lib/tactical/pitch-geometry.ts
---

# 🟡 L2-Tactical-049: ピッチアスペクト比切り替え時のピッチ・選手トランジションアニメーション実装

## UX Impact
アスペクト比（16:9, 9:16, 4:5, 1:1）を切り替えた際に、/test/pitch-aspect のデモのようにピッチ外枠および配置された選手マーカーがスムーズに変形・リサイズ・追従するトランジションアニメーションが再生される。

## Detailed Spec
1. /test/pitch-aspect/components/pitch-stage.tsx の実装手法（スムーズなリサイズ補間やトランジションCSS/Tween等）を参照する。
2. unified-canvas.tsx において、アスペクト比変更時にピッチ外枠およびピッチ描画領域にスムーズなサイズ・位置変更のアニメーションを適用する。
3. 配置されている選手マーカーや関連アノテーションも、ピッチ座標系の変形に合わせてスムーズに補間移動するよう連携する。
4. 1:1縦向きを含め、全アスペクト比相互の切り替えで滑らかに動作することを担保する。

## Acceptance Criteria
- [x] アスペクト比を切り替えた際、ピッチと選手が瞬間的に切り替わるのではなくスムーズなトランジションアニメーションで変形すること
- [x] /test/pitch-aspect の挙度と同様の滑らかさが得られること
- [x] 1:1（縦向き）を含む全アスペクト比相互の切り替えで正常に動作すること

## Verification Commands
```bash
pnpm type-check:scoped src/features/tactical-unified/objects/canvas/components/unified-canvas.tsx src/features/tactical-unified/stores/slide-aspect-helpers.ts
rtk biome check src/features/tactical-unified/objects/canvas/components/unified-canvas.tsx src/features/tactical-unified/stores/slide-aspect-helpers.ts
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)
<!-- Workerは作業完了後、以下を記入して status を DONE に更新すること -->

### 1. 変更内容サマリー
- `src/features/tactical-unified/stores/slide-aspect-helpers.ts` に、ピッチ矩形（`lerpPitchRect`）およびスライド内オブジェクト（選手・ボール・矢印・ゾーン・テキスト）の補間関数（`interpolateSlide`）とイージング関数（`easeOutCubic`）、およびRAFループでアニメーションを管理するカスタムフック `usePitchTransition` を実装
- アスペクト比変更時の直前状態が即時上書きされる問題を解消し、切り替え前のピッチ矩形とスライドオブジェクト座標（from）から目標状態（to）へ300msかけて滑らかに補間する `startAspectAnimation` を分離実装
- レンダリング直後（useEffect実行前）の瞬間ジャンプを防止する `isPendingTransition` 機構を導入
- `src/features/tactical-unified/objects/canvas/components/unified-canvas.tsx` に `usePitchTransition` を統合し、アスペクト比変更時に滑らかなイージングでピッチ外枠・背景および選手・ボール・アノテーション・BoundaryBoxが追従変形するトランジションアニメーションを適用

### 2. 検証結果
- [x] `pnpm type-check:scoped` パス
- [x] `rtk biome check` パス
- [x] テスト実行（対象テストがある場合）: PASS

### 3. レビュー・引継ぎ特記事項（あれば）
- アスペクト比切り替え時（16:9, 9:16, 4:5, 1:1相互）に `usePitchTransition` が300msのアニメーションを自動制御し、エクスポート中やスライド切替時は即座にスキップされるようガードされています。
