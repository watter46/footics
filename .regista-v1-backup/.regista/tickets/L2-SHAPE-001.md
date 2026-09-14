---
id: L2-SHAPE-001
emoji: 🔧
title: 描画シェイプの1:1固定空間セーフティリミット実装
status: DONE
depends_on:
  - L1-TYPE-001

code_snapshot: "d853f4aa03004f667948ae0e90df70ece76423ef"

model: Gemini 3.7 Flash
effort: low

target_files:
  - src/features/tactical-unified/objects/canvas/helpers/drawing-shape-commit.ts

reference_files:
  - src/lib/types/tactical-unified.ts
---

# 🔧 L2-SHAPE-001: 描画シェイプの1:1固定空間セーフティリミット実装

## UX Impact
描画シェイプ（矢印やゾーン）がキャンバス外へ突き抜けて描画可能になり、かつ無限遠にロストしなくなる

## Detailed Spec
1. `drawing-shape-commit.ts` において、座標値を1:1固定基準の3×3正方形空間（-100%〜200%）にクランプするセーフティリミットを適用する。
2. 既存のピッチ比率依存の制限がある場合はそれを削除し、-100 〜 200 の固定クランプに置き換える。

## Acceptance Criteria
- [x] 描画シェイプの座標が -100% 〜 200% の範囲に正しくクランプされること
- [x] TypeScriptの型エラーが存在しないこと

## Verification Commands
```bash
rtk pnpm type-check:scoped src/features/tactical-unified/objects/canvas/helpers/drawing-shape-commit.ts
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)
<!-- Workerは作業完了後、以下を記入して status を DONE に更新すること -->
<!-- 差し戻し（Level 3 Escalation）の場合は status を BLOCKED に更新し、Escalationセクションを記入すること -->

### 1. 変更内容サマリー
- `drawing-shape-commit.ts`: 始点・終点座標の固定クランプ（0〜100）を廃止し、3×3空間（-100〜200）のセーフティリミットへ変更。ピッチ外での描画・ワープ防止に対応。

### 2. 検証結果
- [x] `pnpm type-check:scoped` パス
- [x] `rtk biome check` パス
- [x] テスト実行（対象テストがある場合）: PASS

### 3. レビュー・引継ぎ特記事項（あれば）
- なし

---

### ⚠️ Escalation & Missing Info (差し戻し時のみ記入)
<!-- Workerが情報不足でFail-Fast中断した場合のみ以下を記入する -->
<!-- 記入後は必ず status を BLOCKED に更新し、実装を即座に停止すること -->

- **Blocked Reason**: <!-- チケットのどの情報が不足していたか1〜2行で記述 -->
- **Missing for Scout**:
  1. <!-- Scoutが調査すべき具体的な不足情報1 -->
  2. <!-- Scoutが調査すべき具体的な不足情報2（任意）-->
