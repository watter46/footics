---
id: L1-DRAW-001
emoji: 🎨
title: 境界線のドラッグ履歴保存の最適化
status: DONE
depends_on: []
code_snapshot: 6b761bd8d5aae41d8e6f71a697d645bb41da462d
model: Gemini 3.7 Flash
effort: low
target_files:
  - src/features/tactical-unified/objects/canvas/hooks/use-boundary-box-drag.ts
  - src/features/tactical-unified/objects/canvas/components/boundary-box.tsx
  - src/features/tactical-unified/objects/canvas/components/unified-canvas.tsx
  - src/features/tactical-unified/objects/canvas/hooks/use-unified-canvas-state.ts
  - src/features/tactical-unified/stores/pitch-slice.ts
  - src/features/tactical-unified/objects/canvas/components/__tests__/boundary-box.test.tsx
  - src/features/tactical-unified/stores/__tests__/tactical-unified-store.test.ts
reference_files: []
---

# 🎨 L1-DRAW-001: 境界線のドラッグ履歴保存の最適化

## UX Impact
境界線（BoundaryBox等）をドラッグして移動させた際、Ctrl+Z（Undo）が小刻みにならず、移動の「終点」のみが保存されるようになる。

## Detailed Spec
1. `use-boundary-box-drag.ts` と `boundary-box.tsx` を修正し、`onDragMove` のタイミングでは状態の履歴保存を行わないようにする（表示のための一時的な状態更新のみにする）。
2. `onDragEnd` のタイミングでのみ、変更確定として `pitch-slice.ts` などの永続状態へ反映し、履歴として積まれるように修正する。
3. `pitch-slice.ts` で提供されているアクションの責務（一時的な描画用と永続保存用）を切り分ける。

## Acceptance Criteria
- [ ] 境界線をドラッグしても、その途中の経路が履歴に残らないこと
- [ ] ドロップした終点のみが1回の履歴として保存され、1回のUndoで元の位置に戻ること

## Verification Commands
```bash
rtk pnpm type-check:scoped src/features/tactical-unified/objects/canvas/hooks/use-boundary-box-drag.ts src/features/tactical-unified/objects/canvas/components/boundary-box.tsx src/features/tactical-unified/stores/pitch-slice.ts
rtk biome check src/features/tactical-unified/objects/canvas/hooks/use-boundary-box-drag.ts src/features/tactical-unified/objects/canvas/components/boundary-box.tsx src/features/tactical-unified/stores/pitch-slice.ts
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)

### 1. 変更内容サマリー
- `pitch-slice.ts` に履歴保存を行わない一時描画用の更新アクション `updateBoundaryBox` を追加し、既存の `setBoundaryBox`（履歴保存あり）と責務を分離
- `use-boundary-box-drag.ts` と `boundary-box.tsx` に `onCommit` コールバックを追加し、ドラッグ中（`pointermove`）は `onUpdate`（`updateBoundaryBox`）、ドラッグ終了時（`pointerup` / `pointercancel`）のみ `onCommit`（`setBoundaryBox`）を呼び出すよう実装
- `unified-canvas.tsx` で `onUpdate` と `onCommit` を連携させ、ドラッグ中の経路が履歴に残らずドロップ時の終点のみが1回の履歴として保存され1回のUndoで復元できるように修正
- 単体テスト（`boundary-box.test.tsx`, `tactical-unified-store.test.ts`）にドラッグ確定時およびUndo動作のテストを追加

### 2. 変更ファイル一覧（make done の git add 対象）
- src/features/tactical-unified/objects/canvas/hooks/use-boundary-box-drag.ts
- src/features/tactical-unified/objects/canvas/components/boundary-box.tsx
- src/features/tactical-unified/objects/canvas/components/unified-canvas.tsx
- src/features/tactical-unified/objects/canvas/hooks/use-unified-canvas-state.ts
- src/features/tactical-unified/objects/canvas/helpers/drawing-shape-commit.ts
- src/features/tactical-unified/stores/pitch-slice.ts
- src/features/tactical-unified/objects/canvas/components/__tests__/boundary-box.test.tsx
- src/features/tactical-unified/stores/__tests__/tactical-unified-store.test.ts

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
