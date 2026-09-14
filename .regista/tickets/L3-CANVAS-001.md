---
id: L3-CANVAS-001
emoji: 🔧
title: canvas-coordinatesにCSS 3D rotateX逆変換ヘルパー関数を追加
status: DONE
depends_on: []
code_snapshot: "760c0434cb0fa355c91bb9412b239fd512cea025"
model: Gemini 3.7 Flash
effort: medium
target_files:
  - src/features/tactical-unified/objects/canvas/helpers/canvas-coordinates.ts
reference_files:
  - src/features/tactical-unified/objects/canvas/helpers/matrix-coordinates.ts
  - src/features/tactical-unified/objects/canvas/helpers/canvas-pitch-transform-helper.ts
---


# 🔧 L3-CANVAS-001: canvas-coordinatesにCSS 3D rotateX逆変換ヘルパー関数を追加

## UX Impact
チルト時のポインタ座標変換をRaycasting非依存の数学的逆変換に置き換えることで、上半分タップ不能問題の修正基盤を整える。

## Detailed Spec
1. `canvas-coordinates.ts` に以下の純粋関数を追加する（既存関数は変更禁止）:
   ```ts
   export function unprojectScreenYToCssRotateX(
     screenY: number,
     stageCenterY: number,
     tiltDeg: number,
     perspective: number = 1200
   ): number | null
   ```
   - 数学的変換式: `dy = screenY - stageCenterY`、`theta = tiltDeg * (π/180)`
   - CSS perspective 逆変換: `pitchLocalY = dy * perspective / (perspective * cos(theta) - dy * sin(theta))`
   - 分母 ≤ 0（地平線以上）の場合は `null` を返す
   - x座標は影響を受けないためx変換は不要（rotateXはX軸回転のみ）
2. tiltDeg === 0 の場合は `screenY - stageCenterY` を直接返すバイパスを設ける
3. 単体テストを `canvas-coordinates.test.ts` に追加（tilt=0/30/60deg それぞれと null 返却ケース）

## Acceptance Criteria
- [x] `unprojectScreenYToCssRotateX` が正しい逆変換値を返すこと
- [x] tiltDeg=0 で screenY - stageCenterY をそのまま返すこと
- [x] 地平線より上の座標で null を返すこと
- [x] Biome / TypeCheck / Vitest PASS

## Verification Commands
```bash
rtk pnpm type-check:scoped src/features/tactical-unified/objects/canvas/helpers/canvas-coordinates.ts
rtk biome check src/features/tactical-unified/objects/canvas/helpers/canvas-coordinates.ts
rtk vitest run src/features/tactical-unified/objects/canvas/helpers/canvas-coordinates.test.ts
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)
<!-- Workerは作業完了後、以下を記入して status を DONE に更新すること -->
<!-- 差し戻し（Level 3 Escalation）の場合は status を BLOCKED に更新し、Escalationセクションを記入すること -->

### 1. 変更内容サマリー
- `canvas-coordinates.ts` に CSS 3D rotateX + perspective の数学的逆変換ヘルパー関数 `unprojectScreenYToCssRotateX` を追加（tilt=0バイパス、地平線以上でのnull返却対応）。
- `canvas-coordinates.test.ts` に tilt=0/30/60deg および地平線超過時の単体テストを追加。

### 2. 変更ファイル一覧（make done の git add 対象）
<!-- Workerが実際に変更したファイルを記入。target_filesと差異がある場合は必ず更新すること -->
- `src/features/tactical-unified/objects/canvas/helpers/canvas-coordinates.ts`
- `src/features/tactical-unified/objects/canvas/helpers/canvas-coordinates.test.ts`

### 3. 検証結果
- [x] `pnpm type-check:scoped` パス
- [x] `rtk biome check` パス
- [x] テスト実行（対象テストがある場合）: PASS

### 4. レビュー・引継ぎ特記事項（あれば）
- なし

---

### ⚠️ Escalation & Missing Info (差し戻し時のみ記入)
<!-- Workerが情報不足でFail-Fast中断した場合のみ以下を記入する -->
<!-- 記入後は必ず status を BLOCKED に更新し、実装を即座に停止すること -->

- **Blocked Reason**: <!-- チケットのどの情報が不足していたか1〜2行で記述 -->
- **Missing for Scout**:
  1. <!-- Scoutが調査すべき具体的な不足情報1 -->
  2. <!-- Scoutが調査すべき具体的な不足情報2（任意）-->
