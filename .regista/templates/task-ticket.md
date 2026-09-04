---
id: {{TICKET_ID}}
emoji: {{EMOJI}} # 例: 🎨, 🔧, 🐛
title: {{TITLE_JA}} # 必ず日本語で記述すること
depends_on: [] # 例: ["L1-Tactical-001"]
model: {{RECOMMENDED_MODEL}} # 必須: [GM発行] Gemini 3.1 Pro または Gemini 3.8 Flash | [Worker実装] Gemini 3.7 Flash 〜 3.8 Flash | [難関] Claude Sonnet 4.6 (thinking)
effort: {{RECOMMENDED_EFFORT}} # 必須: low | medium | high
context_files:
  - {{CONTEXT_FILE_1}}
---

# {{EMOJI}} {{TICKET_ID}}: {{TITLE_JA}}

## UX Impact
<!-- ユーザー目線での挙動や操作体験がどう変わるかを1〜2行で簡潔に記述 -->

## Detailed Spec
<!-- 1〜3ファイル以内で収まる極小AAWU単位の具体的実装要件 -->
1. 
2. 
3. 

## Acceptance Criteria & Verification Commands
- [ ] <!-- 受入基準1 -->
- [ ] <!-- 受入基準2 -->

### Verification
`rtk biome check <対象ディレクトリ>`
`pnpm type-check:scoped <変更ファイル>`
`rtk vitest run <テストファイル>` # テストがある場合
