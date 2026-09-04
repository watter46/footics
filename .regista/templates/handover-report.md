## 🔄 引継ぎ完了: {{TICKET_ID}} ({{TITLE}})

これまでの対話内容・確定仕様・実装状況を要約し、引継ぎドキュメントを保存しました。
新しいチャットを開き、下記のプロンプトをそのまま貼り付けて作業を再開してください。

- **チケットID**: `{{TICKET_ID}}`
- **引継ぎファイル**: [{{TICKET_ID}}-handoff.md](file://{{ABSOLUTE_PATH}})
- **手詰まり・引継ぎ理由**: {{REASON}}
- **推奨モデル**: {{RECOMMENDED_MODEL}} <!-- 手詰まり解消時は Gemini 3.8 Flash (High) または Gemini 3.1 Pro を推奨 -->

---

### 📋 新規チャット用プロンプト (コピーして別チャットに貼り付けてください)

```markdown
現在、Footicsのタスク「{{TITLE}}」の実装を進めています。
前回のチャットで仕様調整と途中実装を行い、手詰まり・コンテキスト圧迫を防止するため新規チャットへ引き継ぎました。

### 前提コンテキスト
- **対象チケット**: {{TICKET_ID}} ({{TITLE}})
- **引継ぎサマリーファイル**: file://{{ABSOLUTE_PATH}}
- **関連ファイル**:
  - {{CONTEXT_FILE_1}}
  - {{CONTEXT_FILE_2}}

### 確定した仕様・前提概念
1. {{CONFIRMED_SPEC_1}}
2. {{CONFIRMED_SPEC_2}}

### 現在の実装状況と検証状態
- 実装状況: {{IMPLEMENTATION_STATUS_SUMMARY}}
- 検証: Biome: `{{PASS/FAIL}}` | TypeCheck: `{{PASS/FAIL}}` | Vitest: `{{PASS/FAIL}}`

### 次に着手してほしいこと
1. {{NEXT_ACTION_1}}
2. {{NEXT_ACTION_2}}

まずは上記引継ぎサマリーファイル (file://{{ABSOLUTE_PATH}}) と関連コードを確認した上で、実装・修正作業を再開してください。
```
