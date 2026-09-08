---
id: L2-TACTICAL-003
emoji: 🟡
title: ピッチ操作とUI・履歴の連携統合
status: DONE
depends_on: ["L1-TACTICAL-001", "L1-TACTICAL-002"]
code_snapshot: "f9cc9359b75da82f362762167d60e476d3fac384"
model: Gemini 3.7 Flash
effort: medium
target_files:
  - src/features/tactical-unified/objects/canvas/hooks/use-canvas-pitch-pan.ts
  - src/features/tactical-unified/objects/canvas/components/unified-canvas.tsx
reference_files:
  - src/features/tactical-unified/stores/tactical-unified-store.ts
---

# 🟡 L2-TACTICAL-003: ピッチ操作とUI・履歴の連携統合

## UX Impact
ピッチドラッグ中に強調枠が正しく表示され、ドラッグ完了時に変更が履歴に保存されるようになる。

## Detailed Spec
1. `use-canvas-pitch-pan.ts` または `unified-canvas.tsx` にて、ピッチのドラッグ開始・終了を検知し、ドラッグ中フラグを `pitch-background.tsx` に渡せるように統合する。
2. ドラッグ終了時（pointerup/mouseleave等）に、`tactical-unified-store.ts` 経由で履歴保存アクション（`pushHistory`等）を呼び出すようにする。

## Acceptance Criteria
- [ ] ピッチをドラッグしている間、枠線が表示される。
- [ ] ドラッグ終了後、Ctrl+Zなどで元の位置に戻る（Undoできる）ように履歴保存が呼ばれる。

## Verification Commands
```bash
rtk pnpm type-check:scoped src/features/tactical-unified/objects/canvas/hooks/use-canvas-pitch-pan.ts src/features/tactical-unified/objects/canvas/components/unified-canvas.tsx
rtk biome check src/features/tactical-unified/objects/canvas/hooks/use-canvas-pitch-pan.ts src/features/tactical-unified/objects/canvas/components/unified-canvas.tsx
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)

### 1. 変更内容サマリー
- `use-canvas-pitch-pan.ts` でパン操作完了時（`hasMoved`）に `updatePitchTransform` の `shouldRecordHistory` に `true` を渡して履歴（Undo/Redo）に保存するよう連携。

### 2. 変更ファイル一覧（make done の git add 対象）
- `src/features/tactical-unified/objects/canvas/hooks/use-canvas-pitch-pan.ts`

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
