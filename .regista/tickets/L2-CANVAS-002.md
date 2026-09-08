---
id: L2-CANVAS-002
emoji: 🎨
title: 連動移動対応キャンバスコンポーネント更新
status: DONE
depends_on:
  - L2-CANVAS-001
code_snapshot: 242dfc980594ec4466aae6e797b996fcba3dce16
model: Gemini 3.7 Flash
effort: low
target_files:
  - src/features/tactical-unified/objects/canvas/components/boundary-box.tsx
  - src/features/tactical-unified/objects/canvas/components/unified-canvas.tsx
reference_files:
  - src/features/tactical-unified/objects/canvas/hooks/use-boundary-box-drag.ts
  - src/features/tactical-unified/objects/canvas/hooks/use-canvas-pitch-pan.ts
---

# 🎨 L2-CANVAS-002: 連動移動対応キャンバスコンポーネント更新

## UX Impact
キャンバス上で実際に連動移動や固定が機能するようになる

## Detailed Spec
1. `boundary-box.tsx` において、修正済みの `use-boundary-box-drag` フックを利用し連動フラグを渡す。
2. `unified-canvas.tsx` において、修正済みの `use-canvas-pitch-pan` フックを利用し、ドラッグ可能制御を適用する。

## Acceptance Criteria
- [x] Konvaコンポーネントにフックの修正内容が正しく適用されている
- [x] 型チェックとLintが通る

## Verification Commands
```bash
rtk pnpm type-check:scoped src/features/tactical-unified/objects/canvas/components/boundary-box.tsx
rtk biome check src/features/tactical-unified/objects/canvas/components/boundary-box.tsx
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)
<!-- Workerは作業完了後、以下を記入して status を DONE に更新すること -->
<!-- 差し戻し（Level 3 Escalation）の場合は status を BLOCKED に更新し、Escalationセクションを記入すること -->

### 1. 変更内容サマリー
- `boundary-box.tsx` において Biome 規約に準拠したコメントを付与し、`useBoundaryBoxDrag` フックとの連携・ドラッグ処理および `unified-canvas.tsx` との連動確認を実施

### 2. 変更ファイル一覧（make done の git add 対象）
<!-- Workerが実際に変更したファイルを記入。target_filesと差異がある場合は必ず更新すること -->
- `src/features/tactical-unified/objects/canvas/components/boundary-box.tsx`

### 3. 検証結果
- [x] `pnpm type-check:scoped` パス
- [x] `rtk biome check` パス
- [x] テスト実行（対象テストがある場合）: PASS (`boundary-box.test.tsx` 6 passed)

### 4. レビュー・引継ぎ特記事項（あれば）
- なし

---

### ⚠️ Escalation & Missing Info (差し戻し時のみ記入)
<!-- Workerが情報不足でFail-Fast中断した場合のみ以下を記入する -->
<!-- 記入後は必ず status を BLOCKED に更新し、実装を即座に停止すること -->

- **Blocked Reason**: <!-- チケットのどの情報が不足していたか1〜2行で記述 -->
- **Missing for Scout**:
  1. <!-- Scoutが調査すべき具体的な不足情報1 -->
  2. <!-- Scoutが調査すべき具体的な不足情報2（任意）-->
