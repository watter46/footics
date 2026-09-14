---
id: L1-TYPE-001
emoji: 🔧
title: Tactical座標スキーマのピッチ外境界許容
status: DONE
depends_on: []

code_snapshot: "d853f4aa03004f667948ae0e90df70ece76423ef"

model: Gemini 3.7 Flash
effort: low

target_files:
  - src/lib/types/tactical-unified.ts

reference_files: []
---

# 🔧 L1-TYPE-001: Tactical座標スキーマのピッチ外境界許容

## UX Impact
ピッチ外（負の値、100超）の座標がエラーにならず正しく扱えるようになる

## Detailed Spec
1. `NormalizedCoordSchema` の 0〜100 制約を外し、負の値や100超（例: -100〜200など）を許容するスキーマに変更、または新しいスキーマを定義する。

## Acceptance Criteria
- [x] 負の値や100より大きい値が座標としてバリデーションを通ること
- [x] TypeScriptの型エラーが存在しないこと

## Verification Commands
```bash
rtk pnpm type-check:scoped src/lib/types/tactical-unified.ts
rtk biome check src/lib/types/tactical-unified.ts
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)
<!-- Workerは作業完了後、以下を記入して status を DONE に更新すること -->
<!-- 差し戻し（Level 3 Escalation）の場合は status を BLOCKED に更新し、Escalationセクションを記入すること -->

### 1. 変更内容サマリー
- `src/lib/types/tactical-unified.ts` の `NormalizedCoordSchema` の `.min(0).max(100)` 制約を削除し、ピッチ外の負の値や100超の座標を許容するように変更。

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
