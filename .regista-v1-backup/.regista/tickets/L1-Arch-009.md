---
id: L1-Arch-009
status: DONE
emoji: 🟢 # 例: 🎨, 🔧, 🐛
title: "[Phase 1] dashboard: widgets/ への垂直スライス化"
depends_on: [] # 例: ["L1-Tactical-001"]
# 【警告】以下の model と effort は絶対に省略したり、CLIツール等のデフォルトに依存してはならない。必ず明記すること。
model: Gemini 3.7 Flash # 必須: [GM発行] Gemini 3.1 Pro または Gemini 3.8 Flash | [Worker実装] Gemini 3.7 Flash 〜 3.8 Flash | [難関] Claude Sonnet 4.6 (thinking)
effort: medium # 必須: low | medium | high
context_files:
  - src/features/dashboard/components/Dashboard.tsx
  - .agents/knowledge/architecture-and-guidelines.md
---

# 🟢 L1-Arch-009: [Phase 1] dashboard: widgets/ への垂直スライス化

## UX Impact
巨大なDashboard.tsxが細かいWidgetに分割され、パフォーマンスと保守性が向上する。

## Detailed Spec
1. `src/features/dashboard/widgets/` を作成し、`kpi-cards/`, `team-summary/` などのサブディレクトリを切る。
2. `Dashboard.tsx` (11000 bytes) の内部コンポーネントを `widgets/` に分離する。
3. `Dashboard.tsx` はこれら Widget を配置するだけの薄いコンテナにする。
## Acceptance Criteria & Verification Commands
- [x] `src/features/dashboard/widgets/` への垂直スライス化
- [x] 型チェック及び静的解析パス

### Verification
`rtk biome check <対象ディレクトリ>`
`pnpm type-check:scoped <変更ファイル>`
`rtk vitest run <テストファイル>` # テストがある場合
