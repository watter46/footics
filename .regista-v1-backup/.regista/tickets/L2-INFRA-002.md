---
id: L2-INFRA-002
emoji: 📋
title: チケット・ボード運用スクリプトの .agents/scripts/tickets/ への配置と内部パス修正
status: DONE
depends_on:
  - L1-INFRA-001
code_snapshot: 263275f6079c649bc27d9d0b026d06f1417a65e2
model: Gemini 3.7 Flash
effort: low
target_files:
  - .agents/scripts/tickets/list.js
  - .agents/scripts/tickets/validate.js
  - .agents/scripts/tickets/done.ts
  - .agents/scripts/tickets/sync-board.js
reference_files:
  - .agents/scripts/list-tickets.js
  - .agents/scripts/validate-tickets.js
  - .regista/scripts/ticket-done.ts
  - .agents/scripts/sync-board.js
---

# 📋 L2-INFRA-002: チケット・ボード運用スクリプトの .agents/scripts/tickets/ への配置と内部パス修正

## UX Impact
`pnpm tickets`, `pnpm tickets:validate`, `pnpm ticket:done` などのチケット運用ツールが新ディレクトリから正しく動作する。

## Detailed Spec
1. `.agents/scripts/tickets/` ディレクトリを作成し、以下を配置する:
   - `list.js` (旧 `list-tickets.js`)
   - `validate.js` (旧 `validate-tickets.js`)
   - `done.ts` (旧 `.regista/scripts/ticket-done.ts`)
   - `sync-board.js` (旧 `sync-board.js`)
   - `presenters/` (旧 `presenters/` ディレクトリ丸ごと)
2. `list.js` 内の `TICKETS_DIR` パス参照を階層の深さ（3階層）に合わせて修正するか、`path.resolve(process.cwd(), '.regista/tickets')` 基準に変更する。
3. `validate.js` 内の `TICKETS_DIR` および `ROOT_DIR` を `process.cwd()` 基準または3階層上に修正する。
4. `done.ts` 内の `validatorPath` を `path.join(rootDir, '.agents', 'scripts', 'tickets', 'validate.js')` に更新する。

## Acceptance Criteria
- [x] `.agents/scripts/tickets/` 配下に `list.js`, `validate.js`, `done.ts`, `sync-board.js`, `presenters/` が配置されている
- [x] `node .agents/scripts/tickets/list.js` が正常にチケット一覧を出力する
- [x] `node .agents/scripts/tickets/validate.js` が正常にバリデーションを実行する

## Verification Commands
```bash
node .agents/scripts/tickets/list.js
node .agents/scripts/tickets/validate.js
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)

### 1. 変更内容サマリー
- `.agents/scripts/tickets/` 配下に `list.js`, `validate.js`, `done.ts`, `sync-board.js`, `presenters/` を配置。
- `list.js` および `validate.js` の `TICKETS_DIR` / `ROOT_DIR` を新ディレクトリ階層（3階層上）に合わせた相対パスに修正。
- `done.ts` 内の `validatorPath` を `.agents/scripts/tickets/validate.js` に更新。
- `node .agents/scripts/tickets/list.js`, `node .agents/scripts/tickets/validate.js`, `node .agents/scripts/tickets/sync-board.js check` の正常動作を確認。

### 2. 変更ファイル一覧（make done の git add 対象）
- `.agents/scripts/tickets/list.js`
- `.agents/scripts/tickets/validate.js`
- `.agents/scripts/tickets/done.ts`
- `.agents/scripts/tickets/sync-board.js`
- `.agents/scripts/tickets/presenters/board-markdown-presenter.js`
- `.agents/scripts/tickets/presenters/chat-presenter.js`
- `.agents/scripts/tickets/presenters/obsidian-presenter.js`

### 3. 検証結果
- [x] `node .agents/scripts/tickets/list.js` 実行: PASS
- [x] `node .agents/scripts/tickets/validate.js` 実行: PASS

### 4. レビュー・引継ぎ特記事項（あれば）
- なし

---

### ⚠️ Escalation & Missing Info (差し戻し時のみ記入)
- **Blocked Reason**: 
- **Missing for Scout**:
  1. 
