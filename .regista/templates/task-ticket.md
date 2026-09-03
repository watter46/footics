---
id: {{TICKET_ID}}
title: {{TITLE}}
status: TODO # TODO | IN_PROGRESS | DONE
depends_on: [] # 例: ["L1-Tactical-001"]
model: {{RECOMMENDED_MODEL}} # Gemini 3.8 Flash | Gemini 3.1 Pro | Claude Sonnet 4.6
effort: {{RECOMMENDED_EFFORT}} # low | medium | high
context_files:
  - {{CONTEXT_FILE_1}}
---

# {{TICKET_ID}}: {{TITLE}}

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
