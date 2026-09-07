---
id: L2-DOCS-001
emoji: 📝
title: AGENTS.md セクション5 CLIフロー方式へ改訂
status: DONE # TODO | IN_PROGRESS | DONE | BLOCKED
depends_on: ["L1-CLI-001", "L1-CLI-002"]

# コードのスナップショット（Ticket Freshness Guard用 - 絶対省略禁止）
code_snapshot: 7b09162c6625005af32b1a31a73b5b3980cc0120 # チケット発行時のgit hash

# 推奨実行環境（ホワイトリストから選定）
model: Gemini 3.8 Flash # [GM発行] Gemini 3.1 Pro / Gemini 3.8 Flash | [Worker実装] Gemini 3.7 Flash 〜 3.8 Flash | [難関] Claude Sonnet 4.6 (thinking)
effort: medium # low | medium | high

# 変更対象ファイル（1〜3ファイル以内の極小AAWU単位）
target_files:
  - AGENTS.md

# 参照専用ファイル（Workerが探索でトークンを浪費するのを防ぐためのヒント）
reference_files:
  - .regista/scripts/ticket-done.ts
  - .regista/templates/task-ticket.md
---


# 📝 L2-DOCS-001: AGENTS.md セクション5 CLIフロー方式へ改訂

## UX Impact
WorkerがAGENTS.mdを読むと、完了時は `make done <ID>` を案内するだけで良いと明確に理解できるようになる

## Detailed Spec
1. AGENTS.mdの `## 5. 完了事務作業の分離 (The Closure Agent Protocol)` セクション全体を以下の内容に**置換**する（他のセクションは一切変更しない）
2. 正確な変更範囲: `## 5.` で始まる行から、次の `## 6.` の直前まで（現在のL100〜L110付近。実際の行番号はWorkerが確認すること）
3. 新しいセクション5の内容:
   ```
   ## 5. 完了事務作業のCLI実行方式 (CLI-First Closure Protocol)
   実装Workerは、チケット完了時のコミット・ステータス更新を **CLI ツール (`make done`) に完全委譲** する。サブエージェントの呼び出しは不要。
   
   ### Worker Write-back プロトコル (MANDATORY)
   実装Workerは作業完了時に以下を **必ず** 実行すること：
   1. チケットの `status` を `DONE` に更新する。
   2. `## 📝 Implementation & Write-back Log` セクションに実際の変更内容・検証結果を記入する（テンプレートの空欄のまま放置は禁止）。
   3. `rtk pnpm tickets:validate` を実行し、Write-backの完全性をセルフ検証する。
   4. チャットに以下の1行を出力して**即座に終了する**（コミット処理は行わない）:
      ```
      ✅ 実装完了。オーナーは `make done {チケットID}` でコミットしてください。
      ```
   ```
4. **変更してはならない箇所**: Pure Orchestration, State Machine, Scout委譲, DAG, Worker Fail-Fast, Conversation Slicing, Silent Execution, TSFDD, Oracle Layer, Contract Registry, Worker Escalation, Ticket Freshness Guard, Quality Ratchet, Compact Protocol, Observability First の各セクション（セクション1〜4, 6〜9）

## Acceptance Criteria
- [ ] AGENTS.md のセクション5がCLI方式に書き換わっている
- [ ] 'サブエージェント' 'self' 'regista-gm' 'OK/完了' の合図という記述がセクション5から消えている
- [ ] `make done <ID>` の案内が新セクション5に明記されている
- [ ] 他のセクション（1〜4, 6〜9）は一切変更されていない

## Verification Commands
<!-- Workerが完了時に実行するピンポイント検証コマンド（全体実行は厳禁） -->
```bash
rtk grep 'make done' AGENTS.md
rtk grep 'サブエージェント' AGENTS.md
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)
<!-- Workerは作業完了後、以下を記入して status を DONE に更新すること -->
<!-- 差し戻し（Level 3 Escalation）の場合は status を BLOCKED に更新し、Escalationセクションを記入すること -->

### 1. 変更内容サマリー
- AGENTS.md のセクション5を「5. 完了事務作業のCLI実行方式 (CLI-First Closure Protocol)」に置換
- サブエージェント委譲や手動合図のフローを廃止し、`make done {チケットID}` の案内とWorker Write-backプロトコルに更新

### 2. 検証結果
- [x] `rtk grep 'make done' AGENTS.md` パス (2箇所ヒット)
- [x] `rtk grep 'サブエージェント' AGENTS.md` パス (セクション5内から除去確認)
- [x] `rtk git diff AGENTS.md` でセクション5以外の変更がないことを確認

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
