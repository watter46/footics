---
id: L1-Tactical-050
emoji: 🔧
title: 境界線ドラッグ時の即時保存抑止とドロップ時コミット化
status: DONE
depends_on: []
code_snapshot: 9d7d459ef3829447e4a3504ef9ba100b838aefea
model: Gemini 3.7 Flash
effort: medium
target_files:
  - src/features/tactical-unified/objects/canvas/components/boundary-box.tsx
  - src/features/tactical-unified/objects/canvas/hooks/use-boundary-box-drag.ts
  - src/features/tactical-unified/objects/canvas/components/__tests__/boundary-box.test.tsx
reference_files:
  - src/lib/types/tactical-unified.ts
---

# 🔧 L1-Tactical-050: 境界線ドラッグ時の即時保存抑止とドロップ時コミット化

## UX Impact
境界線をドラッグ移動・リサイズしている最中に不必要なオートセーブ処理が走らなくなり、ドラッグを離した（ドロップした）タイミングでのみ保存されるようになる。

## Detailed Spec
1. 現状の問題点: `useBoundaryBoxDrag` の `attachDragListeners` 内で、`pointermove` ごとに `onUpdate(updated)` が呼ばれており、これが親（Zustandストア）の `updateBoundaryBox` を呼び出して `isDirty: true` を毎フレーム立てるため、ドラッグ中にオートセーブが即時誘発されている。
2. `useBoundaryBoxDrag.ts` の改善: ドラッグ中（PointerMove）はローカル描画用更新コールバック（または `onUpdate` の用途見直し）を行い、ドラッグ終了時（PointerUp/Cancel）の `onEnd` で `onCommit(latestBox)` を確実に呼び出す。
3. `boundary-box.tsx` の改善: ドラッグ中の一時的な座標・サイズをコンポーネント内ローカルstate（例: `dragBox`）で管理してUIをスムーズに描画し、ドラッグ終了時の `onCommit`（またはドラッグ完了後のハンドラ）でのみ親の `onUpdate`（または `onCommit`）を発行してストアに反映させる。親の `unified-canvas.tsx` を変更せず `boundary-box.tsx` と `use-boundary-box-drag.ts` 内でドラッグ中と確定時の責務を分離する。
4. 関数シグネチャ抜粋:
```ts
// use-boundary-box-drag.ts
interface UseBoundaryBoxDragParams {
  box: BoundaryBoxType;
  baseRect: { x: number; y: number; width: number; height: number };
  pxX: number;
  pxY: number;
  pxW: number;
  pxH: number;
  onUpdate: (box: BoundaryBoxType) => void;
  onCommit?: (box: BoundaryBoxType) => void;
}
```
5. テスト更新: `boundary-box.test.tsx` にドラッグ操作中（pointermove）にはコミットハンドラが呼ばれず、pointerup時に最終座標で確定保存されることを検証するテストを追加する。

## Acceptance Criteria
- [x] 境界線のドラッグ中（枠線移動および4隅リサイズ中）にストアの保存処理（isDirty発火）が走らないこと
- [x] ドラッグして手を離した（PointerUp/End）タイミングで最終的な位置・サイズが正しく確定・保存されること
- [x] 既存の `boundary-box.test.tsx` のテストがすべてPASSすること

## Verification Commands
```bash
rtk vitest run src/features/tactical-unified/objects/canvas/components/__tests__/boundary-box.test.tsx
rtk pnpm type-check:scoped src/features/tactical-unified/objects/canvas/components/boundary-box.tsx src/features/tactical-unified/objects/canvas/hooks/use-boundary-box-drag.ts
rtk biome check src/features/tactical-unified/objects/canvas/components/boundary-box.tsx src/features/tactical-unified/objects/canvas/hooks/use-boundary-box-drag.ts
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)

### 1. 変更内容サマリー
- `boundary-box.tsx`:
  - `dragBox` ローカルstate (`React.useState<BoundaryBoxType | null>(null)`) を追加。
  - ドラッグ中（`handleDragUpdate`）はローカル state のみを更新し、親への `onUpdate` 発火を抑止。
  - ドラッグ確定時（`handleDragCommit`）に `dragBox` をクリアし、親の `(onCommit ?? onUpdate)?.(finalBox)` を1度だけ呼び出すように修正。
- `boundary-box.test.tsx`:
  - ドラッグ中（pointermove）に親の `onUpdate` / `onCommit` が呼ばれず、ドラッグ終了時（pointerup）にのみコミットされることを検証するテストに更新。
  - `onCommit` 未指定時に `onUpdate` へフォールバックして確定されるテストケースを追加。

### 2. 変更ファイル一覧（make done の git add 対象）
- `src/features/tactical-unified/objects/canvas/components/boundary-box.tsx`
- `src/features/tactical-unified/objects/canvas/components/__tests__/boundary-box.test.tsx`

### 3. 検証結果
- [x] `pnpm type-check:scoped` パス
- [x] `rtk biome check` パス
- [x] テスト実行（対象テストがある場合）: PASS (`boundary-box.test.tsx` 6件PASS, `tactical-unified` 全211件PASS)

### 4. レビュー・引継ぎ特記事項（あれば）
- なし

---

### ⚠️ Escalation & Missing Info (差し戻し時のみ記入)

- **Blocked Reason**: 
- **Missing for Scout**:
  1. 
  2. 
