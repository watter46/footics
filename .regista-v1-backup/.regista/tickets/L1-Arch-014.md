---
id: L1-Arch-014
emoji: 🟢
title: "tactical-unified: objects/pitch/ に hooks/ を追加（フック欠如の補完）"
status: DONE
depends_on: []
model: Gemini 3.7 Flash
effort: low
context_files:
  - src/features/tactical-unified/objects/pitch/index.ts
  - src/features/tactical-unified/objects/pitch/types.ts
  - src/features/tactical-unified/objects/pitch/components/pitch-background.tsx
---

# 🟢 L1-Arch-014: tactical-unified: objects/pitch/ に hooks/ を追加（フック欠如の補完）

## UX Impact
ピッチオブジェクトのサブモジュール構造が規約の4要素（`components/`, `hooks/`, `types.ts`, `index.ts`）に準拠し、将来のフック追加で迷わない。

## Detailed Spec
現在 `objects/pitch/` に `hooks/` ディレクトリが存在しない。アーキテクチャ規約では4要素が必須。

1. `src/features/tactical-unified/objects/pitch/hooks/` を作成する。
2. `hooks/index.ts` を作成する（現時点でピッチ固有のフックが存在しなければ空のエクスポートで可）。
3. ピッチ固有のロジックが他のフック（Feature レベルの `hooks/` や `stores/` 等）に散在している場合、`objects/pitch/hooks/` へ集約できないか検討し、可能なら移動する（例: ピッチパン・ズームに限定されたロジック等）。
4. `objects/pitch/index.ts` を更新して `hooks/` の公開APIを含める。

## Acceptance Criteria & Verification Commands
- [ ] `src/features/tactical-unified/objects/pitch/hooks/index.ts` が存在する
- [ ] `objects/pitch/index.ts` がフックのエクスポートを含む（またはコメントで空の旨を明記）
- [ ] 型エラーがない

### Verification
`rtk biome check src/features/tactical-unified/objects/pitch/`
`rtk pnpm type-check:scoped src/features/tactical-unified/objects/pitch/index.ts`
