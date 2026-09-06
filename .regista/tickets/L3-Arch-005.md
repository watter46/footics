---
id: L3-Arch-005
emoji: 🟠 # 例: 🎨, 🔧, 🐛
title: "[Phase 3] tactical-unified: objects/pitch/ の垂直スライス化"
depends_on: ["L2-Arch-004"] # 例: ["L1-Tactical-001"]
# 【警告】以下の model と effort は絶対に省略したり、CLIツール等のデフォルトに依存してはならない。必ず明記すること。
model: Gemini 3.7 Flash # 必須: [GM発行] Gemini 3.1 Pro または Gemini 3.8 Flash | [Worker実装] Gemini 3.7 Flash 〜 3.8 Flash | [難関] Claude Sonnet 4.6 (thinking)
effort: low # 必須: low | medium | high
context_files:
  - src/features/tactical-unified/components/canvas/pitch-background.tsx
  - src/features/tactical-unified/components/canvas/pitch-inline-text-editor.tsx
  - src/features/tactical-unified/components/canvas/unified-canvas.tsx
status: DONE
---

# 🟠 L3-Arch-005: [Phase 3] tactical-unified: objects/pitch/ の垂直スライス化

## UX Impact
ピッチオブジェクトの責務が分離され、コードが整理される。

## Detailed Spec
1. `src/features/tactical-unified/objects/pitch/` を作成する。
2. `pitch-background.tsx` 等を移動する。
3. `unified-canvas.tsx` のインポートを更新する。
## Acceptance Criteria & Verification Commands
- [x] <!-- 受入基準1 -->
- [x] <!-- 受入基準2 -->

### Verification
`rtk biome check <対象ディレクトリ>`
`pnpm type-check:scoped <変更ファイル>`
`rtk vitest run <テストファイル>` # テストがある場合
