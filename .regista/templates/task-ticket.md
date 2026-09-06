---
id: {{TICKET_ID}}
emoji: {{EMOJI}} # 例: 🎨, 🔧, 🐛, 🚀
title: {{TITLE_JA}} # 必ず日本語で記述すること
status: TODO # TODO | IN_PROGRESS | DONE | BLOCKED
depends_on: [] # 例: ["L1-DB-001"]

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

### 1. 変更内容サマリー
- 

### 2. 検証結果
- [ ] `pnpm type-check:scoped` パス
- [ ] `rtk biome check` パス
- [ ] テスト実行（対象テストがある場合）: PASS

### 3. レビュー・引継ぎ特記事項（あれば）
- なし
