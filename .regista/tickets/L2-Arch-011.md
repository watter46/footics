---
id: L2-Arch-011
emoji: 🟡 # 例: 🎨, 🔧, 🐛
title: [Phase 2] tactical-unified: panels/hud/ 等のスライス化 # 必ず日本語で記述すること
depends_on: ["L1-Arch-010"] # 例: ["L1-Tactical-001"]
# 【警告】以下の model と effort は絶対に省略したり、CLIツール等のデフォルトに依存してはならない。必ず明記すること。
model: Gemini 3.7 Flash # 必須: [GM発行] Gemini 3.1 Pro または Gemini 3.8 Flash | [Worker実装] Gemini 3.7 Flash 〜 3.8 Flash | [難関] Claude Sonnet 4.6 (thinking)
effort: low # 必須: low | medium | high
context_files:
  - src/features/tactical-unified/components/hud/
  - src/features/tactical-unified/components/toolbar/\n  - src/features/tactical-unified/components/tactical-unified-page.tsx
---

# 🟡 L2-Arch-011: [Phase 2] tactical-unified: panels/hud/ 等のスライス化

## UX Impact
HUDやツールバーがパネルとして独立する。

## Detailed Spec
1. `src/features/tactical-unified/panels/hud/` および `panels/toolbar/` を作成する。
2. 該当コンポーネントを移動する。
3. `tactical-unified-page.tsx` 等のインポートを更新する。
## Acceptance Criteria & Verification Commands
- [ ] <!-- 受入基準1 -->
- [ ] <!-- 受入基準2 -->

### Verification
`rtk biome check <対象ディレクトリ>`
`pnpm type-check:scoped <変更ファイル>`
`rtk vitest run <テストファイル>` # テストがある場合
