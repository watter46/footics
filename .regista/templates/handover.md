# 引継ぎサマリー: {{TICKET_ID}} ({{TITLE}})

## 1. タスク概要
- **チケットID**: `{{TICKET_ID}}`
- **ステータス**: `IN_PROGRESS` # IN_PROGRESS | DONE
- **タスク名**: {{TITLE}}
- **作業ブランチ**: `{{BRANCH}}` # 例: main
- **関連ファイル**:
  - `{{CONTEXT_FILE_1}}`
  - `{{CONTEXT_FILE_2}}`

---

## 2. 手詰まり・引継ぎの経緯 (Background & Impasse Reason)
<!-- Flash (Low) 等の実装で要件のズレや試行錯誤が重なり、コンテキスト圧迫や手詰まりが発生した原因を1〜2行で簡潔に記述 -->
- **手詰まりの原因**: {{IMPASSE_REASON}}
- **試行して破棄したアプローチ**: {{ABANDONED_APPROACH}}

---

## 3. ユーザーとの対話で確定した前提概念・確定仕様 (Confirmed Specs & Mental Models)
<!-- ユーザーとの対話を通じて明確になったメンタルモデル、UI挙動、配置制約、用語定義を箇条書きで記載 -->
### ① {{CONCEPT_1_TITLE}}
- {{CONCEPT_1_DETAIL}}

### ② {{CONCEPT_2_TITLE}}
- {{CONCEPT_2_DETAIL}}

---

## 4. 現時点の実装状況と検証結果 (Implementation & Verification)
<!-- 変更・新規作成したファイルと、その変更内容の要約 -->
1. **`{{MODIFIED_FILE_1}}`**:
   - {{MODIFICATION_DETAIL_1}}
2. **`{{MODIFIED_FILE_2}}`**:
   - {{MODIFICATION_DETAIL_2}}

### 品質検証結果
- **Biome Check**: `{{PASS/FAIL}}`
- **TypeScript (Scoped)**: `{{PASS/FAIL}}`
- **Vitest**: `{{PASS (件数) / SKIP / FAIL}}`

---

## 5. 残課題 / 次のチャットでやるべきこと (Next Steps & Action Items)
<!-- 新規チャットで具体的に着手すべき残タスク・実装ステップ -->
1. {{NEXT_STEP_1}}
2. {{NEXT_STEP_2}}

---

## 6. 新しい会話に貼り付けるプロンプト (Next Conversation Prompt)

別の会話（新規Conversation）を開き、以下のプロンプトをそのまま貼り付けて開始してください。

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
