---
id: {{TICKET_ID}}
emoji: {{EMOJI}} # 例: 🎨, 🔧, 🐛, 🚀
title: {{TITLE_JA}} # 必ず日本語で記述すること
status: TODO # TODO | IN_PROGRESS | DONE | BLOCKED
depends_on: [] # 例: ["L1-DB-001"]

# コードのスナップショット（Ticket Freshness Guard用 - 絶対省略禁止）
code_snapshot: {{GIT_HASH}} # チケット発行時のgit hash（例: "abc1234"）

# 推奨実行環境（ホワイトリストから選定）
model: {{RECOMMENDED_MODEL}} # [GM発行] Gemini 3.1 Pro / Gemini 3.8 Flash | [Worker実装] Gemini 3.7 Flash 〜 3.8 Flash | [難関] Claude Sonnet 4.6 (thinking)
effort: {{RECOMMENDED_EFFORT}} # low | medium | high

# 変更対象ファイル（1〜3ファイル以内の極小AAWU単位）
target_files:
  - {{TARGET_FILE_1}} # 変更対象ファイルパス

# 参照専用ファイル（Workerが探索でトークンを浪費するのを防ぐためのヒント）
reference_files:
  - {{REFERENCE_FILE_1}} # 参照のみ（変更禁止）
---


# {{EMOJI}} {{TICKET_ID}}: {{TITLE_JA}}

## UX Impact
<!-- ユーザー目線での挙動や操作体験がどう変わるかを1〜2行で簡潔に記述 -->

## Detailed Spec
<!-- 1〜3ファイル以内で収まる具体的実装要件 -->
1. 
2. 
3. 

## Acceptance Criteria
- [ ] <!-- 受入基準1 -->
- [ ] <!-- 受入基準2 -->

## Verification Commands
<!-- Workerが完了時に実行するピンポイント検証コマンド（全体実行は厳禁） -->
```bash
pnpm type-check:scoped {{TARGET_FILE_1}}
rtk biome check {{TARGET_FILE_1}}
# rtk vitest run <テストファイル> # テストがある場合のみ
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)
<!-- Workerは作業完了後、以下を記入して status を DONE に更新すること -->
<!-- 差し戻し（Level 3 Escalation）の場合は status を BLOCKED に更新し、Escalationセクションを記入すること -->

### 1. 変更内容サマリー
- 

### 2. 変更ファイル一覧（make done の git add 対象）
<!-- Workerが実際に変更したファイルを記入。target_filesと差異がある場合は必ず更新すること -->
- `path/to/file`

### 3. 検証結果
- [ ] `pnpm type-check:scoped` パス
- [ ] `rtk biome check` パス
- [ ] テスト実行（対象テストがある場合）: PASS

### 4. レビュー・引継ぎ特記事項（あれば）
- なし

---

### ⚠️ Escalation & Missing Info (差し戻し時のみ記入)
<!-- Workerが情報不足でFail-Fast中断した場合のみ以下を記入する -->
<!-- 記入後は必ず status を BLOCKED に更新し、実装を即座に停止すること -->

- **Blocked Reason**: <!-- チケットのどの情報が不足していたか1〜2行で記述 -->
- **Missing for Scout**:
  1. <!-- Scoutが調査すべき具体的な不足情報1 -->
  2. <!-- Scoutが調査すべき具体的な不足情報2（任意）-->
