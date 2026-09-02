---
id: L1-Tactical-004
title: 右パネル内部のUI/UX改善（情報階層の整理・アコーディオン化）
status: DONE
depends_on: []
model: Gemini 3.8 Flash
effort: medium
context_files:
  - src/components/features/tactical-unified/right-panel/formation-panel.tsx
  - src/components/features/tactical-unified/right-panel/squad-sub-panel.tsx
  - src/components/features/tactical-unified/inspector/inspector-panel.tsx
---

# L1-Tactical-004: 右パネル内部のUI/UX改善（情報階層の整理・アコーディオン化）

## UX Impact
右パネル内部に溢れていた設定項目（チームカラー、表示モード、フォーメーション一覧、スカッド、インスペクター）の縦長スクロールと認知的負荷を解消する。セクションを整理・アコーディオン化し、最もよく使うアクションがファーストビューで直感的に操作できるようにする。

## Detailed Spec
1. `formation-panel.tsx` の整理:
   - 煩雑な設定群（チームカラー/表示形式/フォーメーション選択/プリセット）を折りたたみ可能なセクション（Collapsible / Accordion）またはセグメントコントロールに整理する。
   - よく使う「フォーメーション切り替え（4-3-3, 4-2-3-1等）」を上部にコンパクトなバッジ/チップ形式でクイックアクセス可能にする。
   - チームカラーピッカーとチーム表示トグルを1行のコンパクトなツールバーにまとめる。
2. `squad-sub-panel.tsx` の整理:
   - スタメンとベンチの切り替え、ドラッグ可能な選手リストのカード表示をスリム化・見やすくする。
3. 全体の一貫したUIトーン＆マナー（余白の最適化、タイポグラフィ、Figmaライクなダークテーマの統一）。

## Acceptance Criteria & Verification Commands
- [ ] 各セクションが整理され、縦スクロールのストレスが軽減されていること。
- [ ] 主要なフォーメーションのワンタップ変更が容易に行えること。
- [ ] デザイン崩れがなく、視覚的な階層が明確であること。

### Verification
`rtk biome check src/components/features/tactical-unified/right-panel`
`pnpm type-check:scoped src/components/features/tactical-unified/right-panel/formation-panel.tsx`
