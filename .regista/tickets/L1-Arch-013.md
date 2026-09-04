---
id: L1-Arch-013
status: DONE
emoji: 🟢
title: "tactical-unified: panels/ 配下の不足サブディレクトリ追加（dialogs, export, slides, timeline）"
depends_on: []
model: Gemini 3.7 Flash
effort: medium
context_files:
  - src/features/tactical-unified/components/dialogs/project-manager-modal.tsx
  - src/features/tactical-unified/components/export/export-modal.tsx
  - src/features/tactical-unified/components/slides/slide-strip.tsx
  - src/features/tactical-unified/components/timeline/timeline-bar.tsx
---

# 🟢 L1-Arch-013: tactical-unified: panels/ 配下の不足サブディレクトリ追加（dialogs, export, slides, timeline）

## UX Impact
アーキテクチャ規約に準拠したパネルUIの配置により、新規パネル追加時の迷いがなくなる。

## Detailed Spec
アーキテクチャ規約では、UIパネル群は `panels/` 配下に集約されると定義されている。現在 `components/` 配下に残っている以下のパネル群を `panels/` へ移動する。

1. `components/dialogs/` → `panels/dialogs/` へ移動（全ファイル）
2. `components/export/` → `panels/export/` へ移動（全ファイル）
3. `components/slides/slide-strip.tsx` → `panels/slides/` へ移動
4. `components/timeline/` → `panels/timeline/` へ移動（全ファイル・既存の `panels/timeline/` と重複する場合はマージ）
5. 各移動先に `index.ts` を作成して公開APIを定義する。
6. 移動後、参照元のインポートパスを全て更新する。

## Acceptance Criteria & Verification Commands
- [ ] `src/features/tactical-unified/panels/dialogs/` が存在し、プロジェクト管理モーダル群が入っている
- [ ] `src/features/tactical-unified/panels/export/` が存在し、エクスポートモーダル群が入っている
- [ ] `src/features/tactical-unified/panels/slides/` が存在する
- [ ] `src/features/tactical-unified/panels/timeline/` が完全に移行されている
- [ ] `components/dialogs/`, `components/export/`, `components/slides/`, `components/timeline/` が削除されている
- [ ] 型エラーがない

### Verification
`rtk biome check src/features/tactical-unified/panels/`
`rtk pnpm type-check:scoped src/features/tactical-unified/panels/dialogs/index.ts src/features/tactical-unified/panels/export/index.ts`
