```yaml
ticket_id: "{{TICKET_ID}}"
status: "COMPLETED" # COMPLETED | FAILED
files_changed:
  - "{{FILE_1}}"
verification:
  biome: PASS # PASS | FAIL
  type_check: PASS # PASS | FAIL
  vitest: PASS # PASS | SKIP | FAIL
  vitest_count: 0
```

## ✅ 完了報告: {{TICKET_ID}} ({{TITLE}})

- **挙動の変化**:
  - <!-- 画面や機能の動作として何が変わったかを1〜2行で簡潔に記載 -->
  - <!-- 操作や見た目の変化点 -->
- **変更ファイル**: `{{FILE_1}}`, `{{FILE_2}}`
- **検証**: Biome: `{{PASS/FAIL}}` | TypeCheck: `{{PASS/FAIL}}` | Vitest: `{{PASS (件数) / SKIP / FAIL}}`

> 問題なければ「**OK**」または「**完了**」と入力してください（チケットのステータス更新・コミットを実行します）。
