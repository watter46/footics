---
id: L1-Arch-001
status: DONE
emoji: 🔴
title: "[Phase 0] tactical-unified: types/index.ts 新設・共有型の集約"
depends_on: []
model: Gemini 3.7 Flash
effort: low
context_files:
  - src/features/tactical-unified/stores/tactical-unified-store.ts
  - src/features/tactical-unified/stores/annotation-slice.ts
  - src/features/tactical-unified/stores/pitch-slice.ts
  - src/features/tactical-unified/stores/project-slice.ts
  - src/features/tactical-unified/stores/tool-slice.ts
  - src/features/tactical-unified/components/canvas/canvas-interaction-types.ts
  - .agents/knowledge/architecture-and-guidelines.md
---

# 🔴 L1-Arch-001: [Phase 0] tactical-unified: types/index.ts 新設・共有型の集約

## UX Impact
コード変更なし（型整備のみ）。エージェントが型定義を探す際の迷いがなくなり、以降の Phase のリファクタリング精度が向上する。

## Detailed Spec
1. `src/features/tactical-unified/types/index.ts` を新規作成する。
2. 以下の共有型を `stores/` や `canvas/` の各ファイルから **re-export** または **移植** して集約する:
   - Slide / Player / Arrow / Zone / Ball 等の主要エンティティ型
   - Tool 種別 enum・union 型 (`ToolType` 等)
   - Canvas インタラクション型 (`canvas-interaction-types.ts` から移植)
   - AnnotationLayer 型
3. 各元ファイルからは `import type { ... } from '../../types'` でインポートするよう更新する（循環参照が発生しないことを `rtk pnpm type-check:scoped` で確認）。

**対象ファイル（1〜3ファイル）:**
- `src/features/tactical-unified/types/index.ts` (新規)
- `src/features/tactical-unified/components/canvas/canvas-interaction-types.ts` (移植元)
- 必要に応じて import 修正（最小限）

## Acceptance Criteria & Verification Commands
- [ ] `types/index.ts` が作成され、Feature 内の主要共有型がエクスポートされている
- [ ] 循環参照が発生していない
- [ ] `canvas-interaction-types.ts` の型が `types/index.ts` から参照可能になっている

### Verification
```
rtk biome check src/features/tactical-unified/types/
rtk pnpm type-check:scoped src/features/tactical-unified/types/index.ts
```
