---
id: L2-Arch-015
emoji: 🟡
title: "tactical-unified: components/ 残存ファイルの整理（page, header, common-inputs の移管）"
status: DONE
depends_on: ["L1-Arch-010", "L1-Arch-011", "L1-Arch-012", "L1-Arch-013"]
model: Gemini 3.7 Flash
effort: low
context_files:
  - src/features/tactical-unified/components/tactical-unified-page.tsx
  - src/features/tactical-unified/components/top-header.tsx
  - src/features/tactical-unified/components/common-color-input.tsx
---

# 🟡 L2-Arch-015: tactical-unified: components/ 残存ファイルの整理（page, header, common-inputs の移管）

## UX Impact
`components/` ディレクトリが完全に空になりアーキテクチャが完成する。page/headerの配置が明確になる。

## Detailed Spec
L1-Arch-010〜013 の完了後、`components/` に残るファイルを整理する:

1. **`tactical-unified-page.tsx`**: Feature全体のエントリーポイント。`src/features/tactical-unified/` 直下または `panels/` 直下（Feature page用）に移動し、用途を明確化する。
2. **`top-header.tsx`**: トップバーUIの一部として `panels/toolbar/` に統合するか、`panels/` 直下に移動する。
3. **`common-color-input.tsx`**: ドメイン非依存であれば `src/components/ui/` へ昇格、またはカラー選択が特定ドメインに依存するなら `panels/inspector/` へ移動する。
4. 移動後、`components/` ディレクトリを削除する（空になっていることを確認）。
5. 参照元のインポートパスを全て更新する。

## Acceptance Criteria & Verification Commands
- [ ] `src/features/tactical-unified/components/` ディレクトリが存在しない
- [ ] `tactical-unified-page.tsx` が適切な場所に配置されている
- [ ] `top-header.tsx` が `panels/` 配下に配置されている
- [ ] `common-color-input.tsx` が `src/components/ui/` または `panels/inspector/` に配置されている
- [ ] 型エラーがない

### Verification
`rtk biome check src/features/tactical-unified/`
`rtk pnpm type-check:scoped src/features/tactical-unified/index.ts`
