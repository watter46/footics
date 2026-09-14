---
id: L1-TACTICAL-002
emoji: 🟢
title: ピッチのドラッグ選択強調枠UIの追加
status: DONE
depends_on: []
code_snapshot: "f9cc9359b75da82f362762167d60e476d3fac384"
model: Gemini 3.7 Flash
effort: low
target_files:
  - src/features/tactical-unified/objects/pitch/components/pitch-background.tsx
reference_files:
  - src/lib/types/tactical-unified.ts
---

# 🟢 L1-TACTICAL-002: ピッチのドラッグ選択強調枠UIの追加

## UX Impact
ピッチをドラッグしている時に、オブジェクトと同様の強調枠（選択枠）が表示され、操作中であることが視覚的にわかりやすくなる。

## Detailed Spec
1. `pitch-background.tsx` コンポーネントにて、ピッチがドラッグ中（または選択中）であることを示す props または状態を受け取るようにする。
2. ドラッグ中（選択中）の場合、ピッチの境界線に沿ってオブジェクト同様の強調枠（ストロークやボーダー）を描画する。

## Acceptance Criteria
- [x] ドラッグ中状態を受け取り、ピッチに選択強調枠が表示される。
- [x] 他のオブジェクトの強調枠とデザインの整合性が取れていること。

## Verification Commands
```bash
rtk pnpm type-check:scoped src/features/tactical-unified/objects/pitch/components/pitch-background.tsx
rtk biome check src/features/tactical-unified/objects/pitch/components/pitch-background.tsx
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)

### 1. 変更内容サマリー
- `PitchBackground` コンポーネントにドラッグ状態（`isDragging`）の管理を追加。
- ドラッグ開始時（`onDragStart`）に `isDragging` を `true` にし、ドラッグ終了時（`onDragEnd`）に `false` へリセットするハンドラを追加。
- ドラッグ中にピッチ境界線（`pitch` または `image` 背景）に沿って青い強調破線枠（`stroke="#38bdf8"`、`dash={[6, 4]}`、グローシャドウ）を描画する `Rect` を追加。

### 2. 変更ファイル一覧（make done の git add 対象）
- `src/features/tactical-unified/objects/pitch/components/pitch-background.tsx`

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
