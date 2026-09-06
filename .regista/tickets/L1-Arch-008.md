---
id: L1-Arch-008
status: DONE
emoji: 🟢 # 例: 🎨, 🔧, 🐛
title: "[Phase 1] management: entities/squad/ の垂直スライス化"
depends_on: [] # 例: ["L1-Tactical-001"]
# 【警告】以下の model と effort は絶対に省略したり、CLIツール等のデフォルトに依存してはならない。必ず明記すること。
model: Gemini 3.7 Flash # 必須: [GM発行] Gemini 3.1 Pro または Gemini 3.8 Flash | [Worker実装] Gemini 3.7 Flash 〜 3.8 Flash | [難関] Claude Sonnet 4.6 (thinking)
effort: low # 必須: low | medium | high
context_files:
  - src/features/management/components/DataManagementMenu.tsx
  - src/features/management/components/GlobalDataManagement.tsx
  - .agents/knowledge/architecture-and-guidelines.md
---

# 🟢 L1-Arch-008: [Phase 1] management: entities/squad/ の垂直スライス化

## UX Impact
マネジメント画面のエンティティが整理され、今後の機能追加が容易になる。

## Detailed Spec
1. `src/features/management/entities/squad/` と `entities/players/` を作成する。
2. `components/` 以下のファイルを責務ごとに適切に `entities/` 以下へ移動する。
3. 必要に応じて `types.ts` 等を整備し、インポートを修正する。
## Acceptance Criteria & Verification Commands
- [x] `src/features/management/entities/squad/` と `entities/players/` への垂直スライス化
- [x] 型チェック及び静的解析パス

### Verification
`rtk biome check <対象ディレクトリ>`
`pnpm type-check:scoped <変更ファイル>`
`rtk vitest run <テストファイル>` # テストがある場合
