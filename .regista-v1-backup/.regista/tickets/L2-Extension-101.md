---
id: L2-Extension-101
emoji: 🧩
title: Extensionディレクトリのドメイン別コロケーション適用
status: DONE
depends_on: ["L1-Tactical-101", "L1-Tactical-102"]
model: Gemini 3.8 Flash
effort: medium
context_files:
  - extension/components/
  - extension/features/
  - extension/stores/
---

# 🧩 L2-Extension-101: Extensionディレクトリのドメイン別コロケーション適用

## UX Impact
拡張機能の動作に変更はありませんが、コードがドメイン単位で整理され、機能拡張が迅速に行えるようになります。

## Detailed Spec
1. `extension/` 内に散在している `components`, `hooks`, `stores` 等を、Web本体のアーキテクチャルール（コロケーション原則）に従い、ドメインごと（`extension/features/{ドメイン名}/...` 等）に整理する。
2. 移動に伴う import パスの修正を行う。

## Acceptance Criteria & Verification Commands
- [ ] extension 直下の共通ディレクトリにあるドメイン固有コードが `features/{ドメイン}` 配下へ移動されていること。
- [ ] extension 側のビルドと Type Check が通ること。

### Verification
`rtk biome check extension/`
`pnpm --filter extension type-check`
