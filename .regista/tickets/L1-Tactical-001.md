---
id: L1-Tactical-001
emoji: 🔧
title: 3Dパース対応ポインター逆変換およびTransform計算の実装
status: DONE
cancelled_by: L1-3D-001  # gl-matrixアーキテクチャへの移行により廃棄
cancelled_at: 2026-09-08
depends_on: []
code_snapshot: 242dfc980594ec4466aae6e797b996fcba3dce16
model: Gemini 3.7 Flash
effort: high
target_files:
  - src/features/tactical-unified/objects/canvas/helpers/canvas-coordinates.ts
  - src/features/tactical-unified/objects/canvas/helpers/canvas-pitch-transform-helper.ts
  - src/features/tactical-unified/objects/canvas/helpers/canvas-coordinates.test.ts
  - src/features/tactical-unified/objects/canvas/helpers/index.ts
  - src/features/tactical-unified/objects/canvas/hooks/use-canvas-pointer-dispatcher.ts
  - src/features/tactical-unified/objects/canvas/hooks/use-canvas-pointer-interaction.ts
  - src/features/tactical-unified/objects/canvas/hooks/use-canvas-selection-box.ts
  - src/features/tactical-unified/objects/canvas/hooks/use-canvas-wheel-zoom.ts
  - src/features/tactical-unified/objects/canvas/hooks/use-canvas-zoom-pan.ts
  - src/features/tactical-unified/objects/canvas/components/unified-canvas.tsx
  - src/features/tactical-unified/objects/ball/components/ball-object.tsx
  - src/features/tactical-unified/objects/ball/hooks/use-ball-drag.ts
  - src/features/tactical-unified/objects/pitch/components/pitch-inline-text-editor.tsx
  - src/features/tactical-unified/__tests__/pitch-tilt-export.test.ts
reference_files:
  - src/app/test/pitch-aspect/components/pitch-stage.tsx
  - src/lib/types/tactical-unified.ts
---

# 🔧 L1-Tactical-001: 3Dパース対応ポインター逆変換およびTransform計算の実装

## UX Impact
チルト時のポインター座標ズレが解消され、正確な描画が可能になる。チルト操作時の基準点がピッチ中央となる。

## Detailed Spec
1. `canvas-coordinates.ts`: CSS 3D (rotateX)が適用されたピッチ面上のスクリーン座標を、ピッチローカル座標(2D)へ正確に逆変換するロジックを実装する（KonvaとCSS3Dのハイブリッド対応）。
2. `canvas-pitch-transform-helper.ts`: `/test/pitch-aspect` の仕様に準拠し、ピッチ幾何学中心（50% 50%）を回転中心として `translate3d(panX, panY, 0) scale(zoom) rotateX(tilt)` のCSS/Konva transform値を生成・管理するユーティリティへ改修する。

## Acceptance Criteria
- [x] `canvas-pitch-transform-helper.ts` が中心基準の3D Transformを正しく返すこと
- [x] `canvas-coordinates.ts` の座標逆変換が、チルト・パン・ズームが複合した状態でも正確に計算されること

## Verification Commands
```bash
rtk pnpm type-check:scoped src/features/tactical-unified/objects/canvas/helpers/canvas-coordinates.ts
rtk vitest run src/features/tactical-unified/objects/canvas/helpers/canvas-coordinates.test.ts
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)

### 1. 変更内容サマリー
- `canvas-pitch-transform-helper.ts`: ピッチ幾何学中心（50% 50%）を基準にズーム・パンが行われるよう `deltaX = (pitchWidth / 2) * (1 - zoom)`, `deltaY = (pitchHeight / 2) * (1 - zoom)` のオフセット補正を算出し、Konva Group の `scaleX/scaleY` を等倍 `zoom` に設定（チルトは CSS 3D に委ねる）
- `canvas-coordinates.ts`: CSS 3D Stage 内のポインタイベント用に `stageToPitch`, `pitchToStage`, `getStagePitchAndNormPos` を新設し、ブラウザによる 3D 逆射影との二重チルト適用を解消。3D Perspective（1200px）スクリーン座標変換（`pitchToScreen`, `screenToPitch`, `normToScreen`）との整合性を確立
- `use-canvas-pointer-dispatcher.ts` / `use-canvas-selection-box.ts` / `use-canvas-wheel-zoom.ts`: Stage 平面座標からの逆変換に `getStagePitchAndNormPos` / `stageToPitch` を適用し、中心基準ズーム・パン・チルト時の全域ポインタ判定および矩形選択、カーソル基準ホイールズームを整合
- `pitch-inline-text-editor.tsx`: 3D チルト時のテキストエディタ配置を `normToScreen` による 3D 射影座標に整合
- `canvas-coordinates.test.ts` / `pitch-tilt-export.test.ts`: 中心基準ズーム・パン・チルト逆変換および Stage 座標変換の網羅テスト（24テスト）を追加

### 2. 変更ファイル一覧（make done の git add 対象）
- `src/features/tactical-unified/objects/canvas/helpers/canvas-pitch-transform-helper.ts`
- `src/features/tactical-unified/objects/canvas/helpers/canvas-coordinates.ts`
- `src/features/tactical-unified/objects/canvas/helpers/canvas-coordinates.test.ts`
- `src/features/tactical-unified/objects/canvas/helpers/index.ts`
- `src/features/tactical-unified/objects/canvas/hooks/use-canvas-pointer-dispatcher.ts`
- `src/features/tactical-unified/objects/canvas/hooks/use-canvas-pointer-interaction.ts`
- `src/features/tactical-unified/objects/canvas/hooks/use-canvas-selection-box.ts`
- `src/features/tactical-unified/objects/canvas/hooks/use-canvas-wheel-zoom.ts`
- `src/features/tactical-unified/objects/canvas/hooks/use-canvas-zoom-pan.ts`
- `src/features/tactical-unified/objects/canvas/components/unified-canvas.tsx`
- `src/features/tactical-unified/objects/ball/components/ball-object.tsx`
- `src/features/tactical-unified/objects/ball/hooks/use-ball-drag.ts`
- `src/features/tactical-unified/objects/pitch/components/pitch-inline-text-editor.tsx`
- `src/features/tactical-unified/__tests__/pitch-tilt-export.test.ts`

### 3. 検証結果
- [x] `pnpm type-check:scoped` パス (TypeScript: No errors found)
- [x] `rtk biome check` パス (All checks passed, 0 errors/warnings)
- [x] 単体テスト実行: PASS (`canvas-coordinates.test.ts`: 17/17, `pitch-tilt-export.test.ts`: 7/7, 合計 24/24 PASS)

### 4. レビュー・引継ぎ特記事項（あれば）
- なし

---

### ⚠️ Escalation & Missing Info (差し戻し時のみ記入)
<!-- Workerが情報不足でFail-Fast中断した場合のみ以下を記入する -->
<!-- 記入後は必ず status を BLOCKED に更新し、実装を即座に停止すること -->

- **Blocked Reason**: gl-matrix導入による3D射影パイプライン刷新（L1-3D-001〜L3-3D-001）に全面移行のため、本チケットの手計算パッチワーク前提の実装計画を廃棄。
- **Missing for Scout**:
  1. 

