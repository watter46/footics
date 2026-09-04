---
id: L1-Arch-010
emoji: 🟢 # 例: 🎨, 🔧, 🐛
title: [Phase 1] tactical-unified: panels/inspector/ 等のスライス化 # 必ず日本語で記述すること
status: DONE
depends_on: [] # 例: ["L1-Tactical-001"]
# 【警告】以下の model と effort は絶対に省略したり、CLIツール等のデフォルトに依存してはならない。必ず明記すること。
model: Gemini 3.7 Flash # 必須: [GM発行] Gemini 3.1 Pro または Gemini 3.8 Flash | [Worker実装] Gemini 3.7 Flash 〜 3.8 Flash | [難関] Claude Sonnet 4.6 (thinking)
effort: medium # 必須: low | medium | high
context_files:
  - src/features/tactical-unified/components/inspector/
  - src/features/tactical-unified/components/right-panel/
  - src/features/tactical-unified/components/tactical-unified-page.tsx
---

# 🟢 L1-Arch-010: [Phase 1] tactical-unified: panels/inspector/ 等のスライス化

## UX Impact
UIパネルが独立し、Tactical画面の保守性が向上する。

## Detailed Spec
1. `src/features/tactical-unified/panels/inspector/` および `panels/right-panel/` を作成する。
2. 該当ディレクトリを `panels/` 配下に移動する。
3. `tactical-unified-page.tsx` のインポートを更新する。
## Acceptance Criteria & Verification Commands
- [x] `src/features/tactical-unified/panels/inspector/` および `panels/right-panel/` へのスライス化
- [x] `tactical-unified-page.tsx` および `index.ts` のインポート/エクスポート更新完了

### Verification
`rtk biome check <対象ディレクトリ>`
`pnpm type-check:scoped <変更ファイル>`
`rtk vitest run <テストファイル>` # テストがある場合
