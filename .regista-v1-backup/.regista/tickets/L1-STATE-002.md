---
id: L1-STATE-002
emoji: 🟢
title: BoundaryBox状態管理およびピッチ追従連動ロジックの整理
status: DONE
depends_on: []

code_snapshot: 9eb891c421c769d09e6114b732d3533bf49903b9

model: Gemini 3.7 Flash
effort: medium

target_files:
  - src/lib/types/tactical-unified.ts
  - src/features/tactical-unified/stores/boundary-box-helpers.ts
  - src/features/tactical-unified/stores/pitch-slice.ts
  - src/features/tactical-unified/stores/project-slice.ts
  - src/features/tactical-unified/stores/slide-helpers.ts

reference_files: []
---

# 🟢 L1-STATE-002: BoundaryBox状態管理およびピッチ追従連動ロジックの整理

## UX Impact
通常編集時、ピッチを動かしても境界線枠が追従して表示される（視界の邪魔になる）挙動を撤廃し、デフォルトで非表示となります。

## Detailed Spec
1. `BoundaryBox` 型の `visible` プロパティのデフォルトを `false` に変更する。
2. `PitchSlice` やヘルパー関数内に存在する、ピッチ移動時に境界線を常に同期させるロジック（`isPitchBoundaryLinked` 等のフラグおよび関連アクション）を削除し、コードをクリーンにする。
3. エクスポート時用のために、現在のピッチ位置に基づいて動的にクロップ領域（AutoFitPitch）を算出・適用する基礎ロジックを整理する。

## Acceptance Criteria
- [ ] `BoundaryBox` の状態初期値が非表示 (`visible: false`) となっていること。
- [ ] ピッチ移動時の不要な境界線追従・連動ロジックが削除されていること。

## Verification Commands
```bash
rtk pnpm type-check:scoped src/lib/types/tactical-unified.ts src/features/tactical-unified/stores/boundary-box-helpers.ts src/features/tactical-unified/stores/pitch-slice.ts src/features/tactical-unified/stores/project-slice.ts src/features/tactical-unified/stores/slide-helpers.ts
rtk biome check src/lib/types/tactical-unified.ts src/features/tactical-unified/stores/boundary-box-helpers.ts src/features/tactical-unified/stores/pitch-slice.ts src/features/tactical-unified/stores/project-slice.ts src/features/tactical-unified/stores/slide-helpers.ts
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)

### 1. 変更内容サマリー
- `BoundaryBoxSchema` に `visible: z.boolean().default(false).optional()` を追加し、各デフォルト BoundaryBox 定数およびヘルパー関数に `visible: false` を設定。
- `PitchSlice` から `isPitchBoundaryLinked` フラグおよび `togglePitchBoundaryLink` アクションを削除。
- `computePitchFitBoundaryBox` の戻り値オブジェクトに `visible: false` を追加。

### 2. 変更ファイル一覧（make done の git add 対象）
- `src/lib/types/tactical-unified.ts`
- `src/features/tactical-unified/stores/boundary-box-helpers.ts`
- `src/features/tactical-unified/stores/pitch-slice.ts`

### 3. 検証結果
- [x] `pnpm type-check:scoped` パス
- [x] `rtk biome check` パス
- [x] テスト実行（対象テストがある場合）: PASS

### 4. レビュー・引継ぎ特記事項（あれば）
- なし

---

### ⚠️ Escalation & Missing Info (差し戻し時のみ記入)

- **Blocked Reason**: 
- **Missing for Scout**:
  1. 
