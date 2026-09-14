---
id: L3-Tactical-022
title: ヘッダーUIのアスペクト比4種セレクター展開と境界線ツールバー・HUD連携
status: DONE
depends_on:
  - L2-Tactical-020
  - L2-Tactical-021
model: Gemini 3.8 Flash
effort: medium
context_files:
  - src/components/features/tactical-unified/top-header.tsx
  - src/components/features/tactical-unified/canvas/unified-canvas.tsx
  - src/components/features/tactical-unified/toolbar/boundary-box-hud.tsx
---

# L3-Tactical-022: ヘッダーUIのアスペクト比4種セレクター展開と境界線ツールバー・HUD連携

## UX Impact
ヘッダー中央のトグルが `16:9` / `9:16` / `4:5` / `1:1` の4タブUIに刷新され、ワンクリックでピッチ比率と境界線が即座に切り替わり、四方のポインタで直感的に調整できる統合操作体験を提供する。

## Detailed Spec
1. **トップヘッダーのアスペクト比UI刷新 (`src/components/features/tactical-unified/top-header.tsx`)**:
   - 既存の「16:9 / 9:16」2値トグルを、4つのアスペクト比（`16:9`, `9:16`, `4:5`, `1:1`）を切り替え可能なセグメントコントロール／タブUIに置き換え。
   - アイコンまたはアスペクト比表記（16:9 / 9:16 / 4:5 / 1:1）をすっきり美しく配置。
2. **キャンバス・コンテナの追従 (`unified-canvas.tsx`)**:
   - 選択された比率（16:9, 9:16, 4:5, 1:1）に応じてキャンバスの縦横比コンテナが滑らかに追従・リサイズ。
3. **境界線HUD / ツールバー連携 (`boundary-box-hud.tsx` 等)**:
   - 境界線HUD内でも現在の比率表示が正しく反映され、ポインタ調整とのハイブリッド操作がスムーズに行えることを確認。

## Acceptance Criteria & Verification Commands
- [ ] ヘッダーに `16:9`, `9:16`, `4:5`, `1:1` の4つのタブが表示され、クリックで切り替えられること。
- [ ] 切り替え時にキャンバスおよびピッチが即座に比率通り変化し、境界線も自動フィットすること。
- [ ] 境界線の四方ポインタをドラッグしてサイズ調整できること。

### Verification
`rtk biome check src/components/features/tactical-unified/top-header.tsx`
`pnpm type-check:scoped src/components/features/tactical-unified/top-header.tsx`
