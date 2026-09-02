---
id: L1-Tactical-001
title: 右パネルの開閉状態とスマート切替（Store層）
status: TODO
depends_on: []
model: Gemini 3.8 Flash
effort: low
context_files:
  - src/stores/tactical-unified-store.ts
  - src/components/features/tactical-unified/right-panel/right-panel.tsx
---

# L1-Tactical-001: 右パネルの開閉状態とスマート切替（Store層）

## UX Impact
右パネルが常時表示される圧迫感を解消し、ユーザーが必要な時だけ展開できる（普段は閉じておく）ようにすることで、キャンバス領域を大幅に拡大する。また、画像を読み込んだ際は自動でパネルが閉じる（スマート切替）ことで、邪魔なUIを意識せずにアノテーション作業に集中できる。

## Detailed Spec
1. `tactical-unified-store.ts` の `panels` ステートに `isRightPanelOpen: boolean`（初期値 `false`）を追加。
2. `toggleRightPanel`, `setRightPanelOpen` アクションを追加。
3. 画像読み込み時（`setImageBackground`等）に、自動的に `isRightPanelOpen` を `false` にするスマート切替ロジックを追加。
4. `right-panel.tsx` に開閉のUIを実装する。
   - `isRightPanelOpen` が `false` の時は、幅を 48px 程度（アイコンレール）にし、タブアイコンのみが縦に並ぶミニマルな表示にする。
   - アイコンをクリックすると `isRightPanelOpen` が `true` になり、幅 340px に展開されて詳細パネルが表示される。
   - 展開時、パネル上部や境界に「閉じる（Collapse）」ボタンまたはトグルボタンを配置する。

## Acceptance Criteria & Verification Commands
- [ ] Zustandストアに右パネルの開閉状態が定義されている。
- [ ] 右パネルが幅48pxの折りたたみ状態と、幅340pxの展開状態を切り替えられる。
- [ ] 背景を画像モードに切り替えた時、自動で右パネルが閉じる。
- [ ] アニメーション（幅のtransition等）がスムーズに動く。

### Verification
`rtk biome check src/components/features/tactical-unified/right-panel`
`pnpm type-check:scoped src/stores/tactical-unified-store.ts`
