---
id: L1-Data-002
emoji: 🔴
title: 時間帯別ピッチ上選手とフォーメーションの算出ロジック実装
status: DONE
depends_on: ["L1-Knowledge-001"]
model: Gemini 3.7 Flash
effort: medium
context_files:
  - src/types/index.ts
  - src/lib/data/
---

# 🔴 L1-Data-002: 時間帯別ピッチ上選手とフォーメーションの算出ロジック実装

## UX Impact
指定した時間（分）にピッチに立っていた22人の選手と、そのチームのフォーメーションが正確に特定できるようになる。

## Detailed Spec
1. `src/lib/data/formation-utils.ts` (新規作成) に、`getFormationAndPlayersAtMinute(matchData: ClubMatchRoot, minute: number)` のような算出ロジックを実装する。
2. ロジックは、WhoScoredの `formations` 配列の `startMinuteExpanded` および `endMinuteExpanded` を用いて、指定した `minute`（または `expandedMinute`）に有効なフォーメーションと `playerIds` を特定する。
3. `tests/data/formation-utils.test.ts` を作成し、Vitest でロジックの単体テストを記述する。モックデータを用いて境界値（交代の瞬間など）のテストを含める。

## Acceptance Criteria & Verification Commands
- [x] `getFormationAndPlayersAtMinute` 関数が実装され、エクスポートされている。
- [x] 交代時や前後半の切り替わりなど、境界値を考慮したテストがPassする。

### Verification
`rtk biome check src/lib/data/formation-utils.ts tests/data/formation-utils.test.ts`
`rtk pnpm type-check:scoped src/lib/data/formation-utils.ts tests/data/formation-utils.test.ts`
`rtk vitest run tests/data/formation-utils.test.ts`
