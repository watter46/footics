---
id: L1-Tactical-107
emoji: 📐
title: 範囲選択UIの座標ズレ修正
status: DONE
depends_on: []

code_snapshot: d454c5df4c8c602b95caaea505ccbcc28ab217fa

model: Gemini 3.7 Flash
effort: low

target_files:
  - src/features/tactical-unified/objects/canvas/components/unified-canvas.tsx

reference_files:
  - src/features/tactical-unified/objects/canvas/hooks/use-canvas-selection-box.ts
  - src/features/tactical-unified/objects/canvas/components/drawing-preview-layer.tsx
---

# 📐 L1-Tactical-107: 範囲選択UIの座標ズレ修正

## UX Impact
範囲選択時に描画されるUI（SelectionBox）がマウスポインタの位置と正確に一致し、直感的に範囲選択できるようになる。

## Detailed Spec
1. `unified-canvas.tsx` 内で、SelectionBoxプレビューが描画されるレイヤーの座標系を確認する。
2. Stage座標系の`selectionBox`が、ピッチ変位(`pitchTransformValues`)を持つGroup内にネスト描画されていることが原因であるため、SelectionBoxプレビューを絶対座標（Stage直下）などの変位を受けない階層に移動するか、座標変換を適用する。

## Acceptance Criteria
- [ ] ドラッグによる範囲選択時、選択ボックスのUIがマウスカーソルの位置から正しく描画される
- [ ] 他の描画レイヤー（ピッチ、選手、ボール等）に影響を与えない

## Verification Commands
```bash
rtk pnpm type-check:scoped src/features/tactical-unified/objects/canvas/components/unified-canvas.tsx
rtk biome check src/features/tactical-unified/objects/canvas/components/unified-canvas.tsx
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)

### 1. 変更内容サマリー
- `unified-canvas.tsx` にて、`selectionBox` プレビューを描画する `DrawingPreviewLayer` を `pitchTransformValues` 変位付きの `Group` 外（Layer直下・Stage絶対座標系）へ移動し、マウスカーソルとの座標ズレを解消

### 2. 変更ファイル一覧（make done の git add 対象）
- src/features/tactical-unified/objects/canvas/components/unified-canvas.tsx

### 3. 検証結果
- [x] `rtk pnpm type-check:scoped` パス
- [x] `rtk biome check` パス
- [x] テスト実行（対象テストがある場合）: PASS

### 4. レビュー・引継ぎ特記事項（あれば）
- なし

---

### ⚠️ Escalation & Missing Info (差し戻し時のみ記入)

- **Blocked Reason**: 
- **Missing for Scout**:
  1. 
  2. 
