---
id: L1-Arch-003
status: DONE
emoji: 🟢 # 例: 🎨, 🔧, 🐛
title: "[Phase 1] tactical-unified: objects/player/ の垂直スライス化"
depends_on: [] # 例: ["L1-Tactical-001"]
# 【警告】以下の model と effort は絶対に省略したり、CLIツール等のデフォルトに依存してはならない。必ず明記すること。
model: Gemini 3.7 Flash # 必須: [GM発行] Gemini 3.1 Pro または Gemini 3.8 Flash | [Worker実装] Gemini 3.7 Flash 〜 3.8 Flash | [難関] Claude Sonnet 4.6 (thinking)
effort: medium # 必須: low | medium | high
context_files:
  - src/features/tactical-unified/components/canvas/player-marker.tsx
  - src/features/tactical-unified/components/canvas/player-layer.tsx\n  - src/features/tactical-unified/components/canvas/unified-canvas.tsx\n  - .agents/knowledge/architecture-and-guidelines.md
---

# 🟢 L1-Arch-003: [Phase 1] tactical-unified: objects/player/ の垂直スライス化

## UX Impact
プレイヤー描画・操作ロジックが objects/player に分離され、アーキテクチャが健全化する。

## Detailed Spec
1. `src/features/tactical-unified/objects/player/` を新規作成し、`components/`, `hooks/`, `types.ts`, `index.ts` の4要素を配置する。
2. `player-marker.tsx`, `player-layer.tsx` 等のプレイヤー関連コンポーネントと依存フックを `objects/player/components/` および `hooks/` に移動する。
3. `unified-canvas.tsx` などのインポートパスを `objects/player` 経由に修正する。
## Acceptance Criteria & Verification Commands
- [x] `src/features/tactical-unified/objects/player/` 配下に `components/`, `hooks/`, `types.ts`, `index.ts` の4要素が配置されている
- [x] プレイヤー関連コンポーネント（`player-layer.tsx`, `player-marker.tsx` 等）とフック・ヘルパーが `objects/player/` 配下に移動され、旧パスのファイルが削除されている
- [x] `unified-canvas.tsx` のインポートパスが `objects/player` 経由に更新されている
- [x] scoped type-check / Biome check / Vitest 全テストがパスしている

### Verification
```
rtk biome check src/features/tactical-unified/objects/player/ src/features/tactical-unified/components/canvas/unified-canvas.tsx
rtk pnpm type-check:scoped src/features/tactical-unified/objects/player/index.ts src/features/tactical-unified/components/canvas/unified-canvas.tsx
rtk vitest run src/features/tactical-unified/
```
