---
id: L3-Core-101
emoji: 🗃️
title: Featuresディレクトリ以外のドメインコードの移行（syntax除く）
depends_on: ["L2-Extension-101"]
model: Gemini 3.8 Flash
effort: high
context_files:
  - src/components/features/
  - src/hooks/
  - src/stores/
---

# 🗃️ L3-Core-101: Featuresディレクトリ以外のドメインコードの移行（syntax除く）

## UX Impact
プロジェクトの構造が整理され、今後の開発速度とコード品質が向上します（ユーザー影響はなし）。

## Detailed Spec
1. `src/components/features/`, `src/hooks/`, `src/stores/` 等に残っているドメイン固有のコードを `src/features/{ドメイン名}/` に移行する。
2. **例外条件:** `syntax-studio` などの `syntax` 関連ドメインのコードは、フォーマット未定のため一切移動せず現状維持（放置）とする。
3. 移動に伴う各種 import パスを修正する。

## Acceptance Criteria & Verification Commands
- [ ] syntax 以外のドメインコードが `src/features/` 以下にコロケーションされていること。
- [ ] syntax 関連コードは元の場所に残っていること。
- [ ] 移動したファイル群の Type Check と Lint が通ること。

### Verification
`rtk biome check src/`
`pnpm type-check`
