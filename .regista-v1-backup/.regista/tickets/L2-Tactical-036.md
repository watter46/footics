---
id: L2-Tactical-036
title: formation-sub-panel.tsx & formation-panel.tsx の構成要素分割 (200行制限準拠)
status: DONE
depends_on:
  - L1-Tactical-030
model: Gemini 3.8 Flash
effort: medium
context_files:
  - src/features/tactical-unified/components/right-panel/formation-sub-panel.tsx
  - src/features/tactical-unified/components/right-panel/formation-panel.tsx
---

# L2-Tactical-036: formation-sub-panel.tsx & formation-panel.tsx の構成要素分割 (200行制限準拠)

## UX Impact
フォーメーションプリセットの切り替え・微調整UIの応答性を維持し、コンポーネント構造を健全化する。

## Detailed Spec
1. `formation-sub-panel.tsx` (805行) および `formation-panel.tsx` (754行) を分割。
   - `formation-preset-selector.tsx`: 4-3-3, 4-2-3-1 等のプリセット選択グリッド
   - `formation-team-toggle.tsx`: HOME/AWAY チーム切り替えタブ
   - `formation-custom-manager.tsx`: カスタムフォーメーション保存・読み込み
2. 各ファイルとも200行以内に抑える。

## Acceptance Criteria & Verification Commands
- [ ] すべてのファイルが200行以内であること
- [ ] フォーメーション変更・チーム切り替えが正常に機能すること

### Verification
`rtk biome check src/features/tactical-unified/components/right-panel`
`pnpm type-check:scoped src/features/tactical-unified/components/right-panel/formation-panel.tsx`
