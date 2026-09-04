---
id: L5-Arch-007
emoji: 🔵 # 例: 🎨, 🔧, 🐛
title: [Phase 5] tactical-unified: objects/zone/ の垂直スライス化 # 必ず日本語で記述すること
depends_on: ["L4-Arch-006"] # 例: ["L1-Tactical-001"]
# 【警告】以下の model と effort は絶対に省略したり、CLIツール等のデフォルトに依存してはならない。必ず明記すること。
model: Gemini 3.7 Flash # 必須: [GM発行] Gemini 3.1 Pro または Gemini 3.8 Flash | [Worker実装] Gemini 3.7 Flash 〜 3.8 Flash | [難関] Claude Sonnet 4.6 (thinking)
effort: low # 必須: low | medium | high
context_files:
  - src/features/tactical-unified/components/canvas/annotation-layer.tsx
  - src/features/tactical-unified/components/canvas/unified-canvas.tsx
---

# 🔵 L5-Arch-007: [Phase 5] tactical-unified: objects/zone/ の垂直スライス化

## UX Impact
ゾーン（アノテーション）描画ロジックが独立する。

## Detailed Spec
1. `src/features/tactical-unified/objects/zone/` を作成する。
2. `annotation-layer.tsx` と `annotations/` ディレクトリを移動する。
3. `unified-canvas.tsx` のインポートを更新する。
## Acceptance Criteria & Verification Commands
- [ ] <!-- 受入基準1 -->
- [ ] <!-- 受入基準2 -->

### Verification
`rtk biome check <対象ディレクトリ>`
`pnpm type-check:scoped <変更ファイル>`
`rtk vitest run <テストファイル>` # テストがある場合
