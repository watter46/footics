---
id: L2-DOCS-002
emoji: 🗑️
title: 不要テンプレート削除 & GM SKILL.md更新
status: DONE # TODO | IN_PROGRESS | DONE | BLOCKED
depends_on: ["L1-CLI-001"]

# コードのスナップショット（Ticket Freshness Guard用 - 絶対省略禁止）
code_snapshot: 7b09162c6625005af32b1a31a73b5b3980cc0120 # チケット発行時のgit hash

# 推奨実行環境（ホワイトリストから選定）
model: Gemini 3.7 Flash # [GM発行] Gemini 3.1 Pro / Gemini 3.8 Flash | [Worker実装] Gemini 3.7 Flash 〜 3.8 Flash | [難関] Claude Sonnet 4.6 (thinking)
effort: low # low | medium | high

# 変更対象ファイル（1〜3ファイル以内の極小AAWU単位）
target_files:
  - .regista/templates/completion-report.md
  - .regista/templates/ticket-done-report.md
  - .agents/skills/regista-gm/SKILL.md

# 参照専用ファイル（Workerが探索でトークンを浪費するのを防ぐためのヒント）
reference_files: []
---


# 🗑️ L2-DOCS-002: 不要テンプレート削除 & GM SKILL.md更新

## UX Impact
不要なテンプレートが削除され、GM SKILL.mdのセクション8・9がCLI方式の記述に更新される

## Detailed Spec
1. `.regista/templates/completion-report.md` を削除する（`handover-report.md` は引継ぎフローで継続使用するため**削除しない**）
2. `.regista/templates/ticket-done-report.md` を削除する
3. `.agents/skills/regista-gm/SKILL.md` のセクション8（L234〜L249）の内容を以下に**置換**する:
   ```
   ### 8. チケット実装完了時のWorker完了案内フォーマット
   Workerエージェントは実装完了後、チャットに以下の**1行のみ**を出力して終了する（冗長な完了報告・ファイル一覧・実施内容まとめは厳禁）:
   ```
   ✅ 実装完了。オーナーは `make done {チケットID}` でコミットしてください。
   ```
   ```
4. セクション9（L251〜L253）を**完全削除**する（周辺の他セクション10・11には触れない）

## Acceptance Criteria
- [ ] `.regista/templates/completion-report.md` が存在しない
- [ ] `.regista/templates/ticket-done-report.md` が存在しない
- [ ] `.regista/templates/handover-report.md` は存在する（削除しない）
- [ ] GM SKILL.mdのセクション8がCLI方式の内容に更新されている
- [ ] GM SKILL.mdのセクション9が削除または統合されている

## Verification Commands
<!-- Workerが完了時に実行するピンポイント検証コマンド（全体実行は厳禁） -->
```bash
rtk find /home/watter46/src/footics/.regista/templates -name '*.md'
rtk grep 'completion-report' /home/watter46/src/footics/.agents/skills/regista-gm/SKILL.md
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)
<!-- Workerは作業完了後、以下を記入して status を DONE に更新すること -->
<!-- 差し戻し（Level 3 Escalation）の場合は status を BLOCKED に更新し、Escalationセクションを記入すること -->

### 1. 変更内容サマリー
- 不要となった `.regista/templates/completion-report.md` および `.regista/templates/ticket-done-report.md` を削除
- `.agents/skills/regista-gm/SKILL.md` のセクション8をCLI方式の1行完了案内に置換し、旧セクション9（手動コミット案内）を削除

### 2. 検証結果
- [x] `completion-report.md` / `ticket-done-report.md` 削除確認
- [x] `handover-report.md` 存続確認
- [x] `rtk grep` によるGM SKILL.md内の不要記述削除確認
- [x] `rtk pnpm tickets:validate` パス

### 3. レビュー・引継ぎ特記事項（あれば）
- なし

---

### ⚠️ Escalation & Missing Info (差し戻し時のみ記入)
<!-- Workerが情報不足でFail-Fast中断した場合のみ以下を記入する -->
<!-- 記入後は必ず status を BLOCKED に更新し、実装を即座に停止すること -->

- **Blocked Reason**: <!-- チケットのどの情報が不足していたか1〜2行で記述 -->
- **Missing for Scout**:
  1. <!-- Scoutが調査すべき具体的な不足情報1 -->
  2. <!-- Scoutが調査すべき具体的な不足情報2（任意）-->
