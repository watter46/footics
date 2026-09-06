---
id: L2-Arch-004
emoji: 🟡 # 例: 🎨, 🔧, 🐛
title: "[Phase 2] tactical-unified: objects/ball/ の垂直スライス化"
depends_on: ["L1-Arch-003"] # 例: ["L1-Tactical-001"]
# 【警告】以下の model と effort は絶対に省略したり、CLIツール等のデフォルトに依存してはならない。必ず明記すること。
model: Gemini 3.7 Flash # 必須: [GM発行] Gemini 3.1 Pro または Gemini 3.8 Flash | [Worker実装] Gemini 3.7 Flash 〜 3.8 Flash | [難関] Claude Sonnet 4.6 (thinking)
effort: low # 必須: low | medium | high
status: DONE
context_files:
  - src/features/tactical-unified/objects/ball/
  - src/features/tactical-unified/components/canvas/unified-canvas.tsx
---

# 🟡 L2-Arch-004: [Phase 2] tactical-unified: objects/ball/ の垂直スライス化

## UX Impact
ボールオブジェクトが垂直スライス化され、保守性が向上する。

## Detailed Spec
1. `src/features/tactical-unified/objects/ball/` を作成し4要素（components, hooks, types.ts, index.ts）を配置する。
2. `ball-object.tsx` 等を移動・分割（`ball-ghost.tsx`, `ball-onionskin.tsx`, `ball-visual.tsx`, `ball-ghost-trajectory.tsx`）する。
3. `unified-canvas.tsx` のインポートを `../../objects/ball` に更新する。

## Acceptance Criteria & Verification Commands
- [x] `src/features/tactical-unified/objects/ball/` に `components/`, `hooks/`, `types.ts`, `index.ts` の4要素が配置されている
- [x] ボールオブジェクト関連のコンポーネント・フックが適切に分割配置されている
- [x] `unified-canvas.tsx` のインポートパスが `objects/ball` 経由に更新されている
- [x] Biome チェック、スコープ付き型チェック、Vitest テストがパスしている

### Verification
```bash
rtk biome check src/features/tactical-unified/objects/ball/
rtk pnpm type-check:scoped src/features/tactical-unified/objects/ball/index.ts src/features/tactical-unified/components/canvas/unified-canvas.tsx
rtk vitest run src/features/tactical-unified/components/__tests__/tracking-arrow-and-ball-trajectory.test.ts
```
