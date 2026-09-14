---
id: L1-TACTICAL-001
emoji: 🟢
title: ピッチ操作の履歴（Undo/Redo）管理への統合
status: DONE
depends_on: []
code_snapshot: "f9cc9359b75da82f362762167d60e476d3fac384"
model: Gemini 3.7 Flash
effort: low
target_files:
  - src/features/tactical-unified/stores/pitch-slice.ts
reference_files:
  - src/features/tactical-unified/stores/history-slice.ts
  - src/lib/types/tactical-unified.ts
---

# 🟢 L1-TACTICAL-001: ピッチ操作の履歴（Undo/Redo）管理への統合

## UX Impact
ピッチに対する操作（移動やズーム等）後、Ctrl+Zなどで元の状態に戻すことができるようになる。

## Detailed Spec
1. `pitch-slice.ts` 内のピッチのTransformを変更するアクション（`updatePitchTransform` や `setPitchPosition` 等）において、変更が完了したタイミングで履歴を追加できるようにする。
2. 連続するドラッグ操作などでは細かな変更毎に保存せず、ドラッグ完了時など確定したタイミングで履歴を記録できるような設計とする（必要に応じて `recordHistory` 的なものをエクスポートして呼び出すか、状態更新時に一括で処理する）。

## Acceptance Criteria
- [ ] ピッチの操作状態を管理するSliceで、操作完了をトリガーに履歴状態へ状態を保存可能になる。
- [ ] 型エラーが発生しないこと。

## Verification Commands
```bash
rtk pnpm type-check:scoped src/features/tactical-unified/stores/pitch-slice.ts
rtk biome check src/features/tactical-unified/stores/pitch-slice.ts
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)

### 1. 変更内容サマリー
- `PitchSlice` の `updatePitchTransform` アクションにオプショナルな `shouldRecordHistory` パラメータを追加し、操作完了時や確定時の履歴記録（`recordHistory`）をサポート。

### 2. 変更ファイル一覧（make done の git add 対象）
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
