---
id: L4-CANVAS-001
emoji: 🐛
title: use-canvas-pointer-dispatcherのRaycasting依存を排除しピッチ上半分のポインタ遮断を修正
status: DONE
depends_on: ["L3-CANVAS-001"]
code_snapshot: "760c0434cb0fa355c91bb9412b239fd512cea025"
model: Claude Sonnet 4.6 (thinking)
effort: high
target_files:
  - src/features/tactical-unified/objects/canvas/hooks/use-canvas-pointer-dispatcher.ts
reference_files:
  - src/features/tactical-unified/objects/canvas/helpers/canvas-coordinates.ts
  - src/features/tactical-unified/objects/canvas/helpers/canvas-pitch-transform-helper.ts
---


# 🐛 L4-CANVAS-001: use-canvas-pointer-dispatcherのRaycasting依存を排除しピッチ上半分のポインタ遮断を修正

## UX Impact
ピッチ上半分をタップ・ドラッグできない根本原因（Raycasting null→isInsidePitch=false→イベント遮断）を解消し、チルト時も全領域でインタラクション可能にする。

## Detailed Spec
1. `resolvePointerPositions` 内（L51-90, L203-211付近）の `unprojectScreenToPitch` 呼び出しを削除する
2. 代わりに `unprojectScreenYToCssRotateX`（L3-CANVAS-001で追加）を使用し、スクリーンy座標→pitchLocalY へ変換する
3. pitchLocalY が null の場合（地平線より上）でも、`isInsidePitch = false` とするのではなく、**null の場合は pitchLocalY をクランプ（ステージ端に制限）して処理継続**させる
4. matrix-coordinates.ts の import を `use-canvas-pointer-dispatcher.ts` から完全削除する
5. stageCenterY は `stage.height() / 2`、tiltDeg/perspective はストアまたはpropsから取得（既存のパラメータ受け渡し方法を踏襲する）

## Acceptance Criteria
- [ ] `matrix-coordinates.ts` への import が消えること
- [ ] tilt=30deg でピッチ上半分をクリック/ドラッグしてもイベントが発火すること（手動確認）
- [ ] Biome / TypeCheck PASS

## Verification Commands
```bash
rtk pnpm type-check:scoped src/features/tactical-unified/objects/canvas/hooks/use-canvas-pointer-dispatcher.ts
rtk biome check src/features/tactical-unified/objects/canvas/hooks/use-canvas-pointer-dispatcher.ts
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)

### 1. 変更内容サマリー
- `matrix-coordinates.ts` への import（`CameraParams`, `NormPoint`, `unprojectScreenToPitch`）を完全削除
- `resolvePointerPositions` の tilt>0 ブランチを `unprojectScreenYToCssRotateX` ベースに全面書き換え
- `null`（地平線より上）を `pitchLocalY = 0` にクランプして処理継続（イベント遮断を解消）
- X座標は `screenToPitch` の perspective branch と同等の数式をインラインで実装
- `PitchTransform` に `perspective` フィールドが存在しないため `DEFAULT_PITCH_PERSPECTIVE` を直接使用

### 2. 変更ファイル一覧（make done の git add 対象）
- `src/features/tactical-unified/objects/canvas/hooks/use-canvas-pointer-dispatcher.ts`

### 3. 検証結果
- [x] `pnpm type-check:scoped` パス（TypeScript: No errors found）
- [x] `rtk biome check` パス（exit code 0）
- [ ] テスト実行（対象テストがある場合）: 対象ファイルなし

### 4. レビュー・引継ぎ特記事項（あれば）
- `PitchTransform` 型に `perspective` フィールドがないため `DEFAULT_PITCH_PERSPECTIVE` (1200px) 固定。将来的に per-slide perspective が必要な場合は型拡張が必要。
- tilt=0 のブランチは変更なし（既存の `getPitchAndNormPos` を使用）。


---

### ⚠️ Escalation & Missing Info (差し戻し時のみ記入)
<!-- Workerが情報不足でFail-Fast中断した場合のみ以下を記入する -->
<!-- 記入後は必ず status を BLOCKED に更新し、実装を即座に停止すること -->

- **Blocked Reason**: <!-- チケットのどの情報が不足していたか1〜2行で記述 -->
- **Missing for Scout**:
  1. <!-- Scoutが調査すべき具体的な不足情報1 -->
  2. <!-- Scoutが調査すべき具体的な不足情報2（任意）-->
