---
id: L4-Arch-006
emoji: 🟣 # 例: 🎨, 🔧, 🐛
title: [Phase 4] tactical-unified: objects/arrow/ の垂直スライス化 # 必ず日本語で記述すること
depends_on: ["L3-Arch-005"] # 例: ["L1-Tactical-001"]
# 【警告】以下の model と effort は絶対に省略したり、CLIツール等のデフォルトに依存してはならない。必ず明記すること。
model: Gemini 3.7 Flash # 必須: [GM発行] Gemini 3.1 Pro または Gemini 3.8 Flash | [Worker実装] Gemini 3.7 Flash 〜 3.8 Flash | [難関] Claude Sonnet 4.6 (thinking)
effort: low # 必須: low | medium | high
context_files:
  - src/features/tactical-unified/components/canvas/ghost-trajectory-arrow.tsx
  - src/features/tactical-unified/components/canvas/unified-canvas.tsx
---

# 🟣 L4-Arch-006: [Phase 4] tactical-unified: objects/arrow/ の垂直スライス化

## UX Impact
矢印アニメーションのロジックが独立し、拡張が容易になる。

## Detailed Spec
1. `src/features/tactical-unified/objects/arrow/` を作成する。
2. `ghost-trajectory-arrow.tsx` 等を移動する。
3. `unified-canvas.tsx` のインポートを更新する。
## Acceptance Criteria & Verification Commands
- [ ] <!-- 受入基準1 -->
- [ ] <!-- 受入基準2 -->

### Verification
`rtk biome check <対象ディレクトリ>`
`pnpm type-check:scoped <変更ファイル>`
`rtk vitest run <テストファイル>` # テストがある場合
