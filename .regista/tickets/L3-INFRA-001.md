---
id: L3-INFRA-001
emoji: 🚀
title: package.json / Makefile パス更新・旧ディレクトリ削除・統合動作確認
status: DONE
depends_on:
  - L2-INFRA-001
  - L2-INFRA-002
code_snapshot: 263275f6079c649bc27d9d0b026d06f1417a65e2
model: Gemini 3.7 Flash
effort: low
target_files:
  - package.json
  - Makefile
  - ORGANIZATION.md
reference_files:
  - .agents/scripts/tickets/list.js
  - .agents/scripts/tickets/validate.js
  - .agents/scripts/tickets/done.ts
---

# 🚀 L3-INFRA-001: package.json / Makefile パス更新・旧ディレクトリ削除・統合動作確認

## UX Impact
開発者およびエージェントの全CLIコマンド（`pnpm tickets`, `pnpm tickets:validate`, `pnpm ticket:done`, `make tickets`, `make done` 等）が新構成下でシームレスに機能し、旧ディレクトリが完全にクリーンアップされる。

## Detailed Spec
1. `package.json` の `scripts` を新しいスクリプト配置（`.agents/scripts/tickets/`, `.agents/scripts/dev/`）に更新する。
2. `Makefile` の `tickets`, `tickets-todo` ターゲットを `.agents/scripts/tickets/list.js` に更新する。
3. `ORGANIZATION.md` のディレクトリツリー説明を新構成に更新する。
4. 移動元の旧ディレクトリ（`scripts/`, `.regista/scripts/`, 旧 `agents/`）および不要な一時ファイルを削除する。
5. 一連のコマンド（`pnpm tickets`, `pnpm tickets:validate`, `make metrics-summary` 等）を実行してスモークテストを行う。

## Acceptance Criteria
- [ ] `package.json` の `scripts` がすべて新パスを指している
- [ ] `Makefile` の全ターゲットが動作する
- [ ] `pnpm tickets` および `pnpm tickets:validate` がエラーなく動作する
- [ ] 旧 `scripts/`, `.regista/scripts/`, `agents/` ディレクトリが削除されている

## Verification Commands
```bash
pnpm tickets
pnpm tickets:validate
make metrics-summary
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)

### 1. 変更内容サマリー
- `package.json` の `scripts` を新ディレクトリ構成（`.agents/scripts/tickets/`, `.agents/scripts/dev/`）に更新
- `Makefile` の `metrics-*`, `tickets`, `tickets-todo` ターゲットを `.agents/scripts/` 配下の新パスに更新
- `ORGANIZATION.md` のディレクトリ構造ツリーを `.agents/` / `.regista/` の最新構成に更新
- 旧 `scripts/`, `.regista/scripts/`, `agents/` および `.agents/scripts/` 直下の移動済みスクリプトを完全削除・クリーンアップ
- `pnpm tickets`, `pnpm tickets:validate`, `make metrics-summary`, `make tickets-todo`, `pnpm type-check:scoped` の正常動作を検証

### 2. 変更ファイル一覧（make done の git add 対象）
- `package.json`
- `Makefile`
- `ORGANIZATION.md`

### 3. 検証結果
- [x] `pnpm tickets`: PASS
- [x] `pnpm tickets:validate`: PASS
- [x] `make metrics-summary`: PASS

### 4. レビュー・引継ぎ特記事項（あれば）
- なし

---

### ⚠️ Escalation & Missing Info (差し戻し時のみ記入)
- **Blocked Reason**: 
- **Missing for Scout**:
  1. 
