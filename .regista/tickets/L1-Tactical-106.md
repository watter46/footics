---
id: L1-Tactical-106
emoji: 🎾
title: ボールのドラッグ中インタラクタ非表示と選択時表示
status: DONE
depends_on: []

code_snapshot: d454c5df4c8c602b95caaea505ccbcc28ab217fa

model: Gemini 3.7 Flash
effort: low

target_files:
  - src/features/tactical-unified/objects/ball/hooks/use-ball-drag.ts
  - src/features/tactical-unified/objects/ball/components/ball-object.tsx

reference_files:
  - src/features/tactical-unified/stores/tactical-unified-store.ts
  - src/features/tactical-unified/objects/canvas/index.ts
---

# 🎾 L1-Tactical-106: ボールのドラッグ中インタラクタ非表示と選択時表示

## UX Impact
ボールのドラッグ中にインタラクタが表示されなくなり、選択されている時のみ表示されるため、視界がクリアになる。

## Detailed Spec
1. `use-ball-drag.ts` において、ドラッグ開始時の選択や終了時の選択解除処理を、PlayerMarkerの仕様と揃える。
2. `ball-object.tsx` において、ドラッグ中（`isDragging`）の判定を用いて、ドラッグ中はインタラクタUIが表示しないように制御する。
3. すでに選択されている場合のみインタラクタUIを表示する処理になっているか確認・修正する。

## Acceptance Criteria
- [ ] ボールをドラッグ中、インタラクタ（Transformer等）が表示されない
- [ ] ボールをクリック等で選択した状態の時のみインタラクタが表示される

## Verification Commands
```bash
rtk pnpm type-check:scoped src/features/tactical-unified/objects/ball/hooks/use-ball-drag.ts src/features/tactical-unified/objects/ball/components/ball-object.tsx
rtk biome check src/features/tactical-unified/objects/ball/hooks/use-ball-drag.ts src/features/tactical-unified/objects/ball/components/ball-object.tsx
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)

### 1. 変更内容サマリー
- `use-ball-drag.ts` において、ドラッグ開始時（`handleDragStart`）に実行されていた `selectObject` を削除し、ドラッグ操作によってボールが自動選択されないよう修正。
- クリック時（`handleClick`/`handleTap`）にのみボールが選択状態となり、ロックアイコン（および選択リング・関連UI）が表示されるように制御。

### 2. 変更ファイル一覧（make done の git add 対象）
- src/features/tactical-unified/objects/ball/hooks/use-ball-drag.ts
- src/features/tactical-unified/objects/ball/components/ball-object.tsx

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
