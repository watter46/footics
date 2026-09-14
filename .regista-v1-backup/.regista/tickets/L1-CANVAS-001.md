---
id: L1-CANVAS-001
status: DONE
emoji: 🐛
title: Playerマーカードラッグ機能の修正
depends_on: []
model: Gemini 3.7 Flash
effort: low
context_files:
  - src/features/tactical-unified/objects/canvas/hooks/use-node-position-transition.ts
---

# 🐛 L1-CANVAS-001: Playerマーカードラッグ機能の修正

## UX Impact
Playerマーカーをドラッグした際、元の位置に引き戻されず、ポインターに追従してスムーズに移動できるようになる。

## Detailed Spec
1. `use-node-position-transition.ts` において、`isDragging()` が true の場合の処理を修正する。
2. 現在は `node.position({ x, y })` でストアの古い位置に強制上書きしているため、この行を削除し、ドラッグ中は `node.position()` を更新しないようにする。
3. これにより、Konvaネイティブのドラッグ機能が阻害されず、Playerのドラッグが可能になる。

## Acceptance Criteria & Verification Commands
- [ ] Playerマーカーがドラッグ中に正常に追従すること。
- [ ] ドラッグ終了後に新しい位置がストアに反映されること。

### Verification
`rtk biome check src/features/tactical-unified/objects/canvas/hooks/use-node-position-transition.ts`
`rtk pnpm type-check:scoped src/features/tactical-unified/objects/canvas/hooks/use-node-position-transition.ts`
