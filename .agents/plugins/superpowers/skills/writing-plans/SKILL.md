---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code
---

# Writing Plans (実装計画立案スキル)

## 概要 (Overview)

要件・仕様から詳細な実装計画（タスクリスト）を作成するためのスキルです。
エンジニア（ワーカーエージェント）が迷わず・推論による手戻りなく実装作業に集中できるよう、対象ファイル、関数シグネチャ、テストケース、検証手順を極小粒度で規定します。
Footicsの「極限のトークン最適化」「3層分離パイプライン（Planner → Worker → Reviewer）」の設計思想に基づいています。

**開始時の宣言:** `📝 実装計画（TASKファイル）の作成を開始します。`

## 計画の保存先 (Output Location)

計画ファイルは必ず以下の単一の真実源（Single Source of Truth）に保存します：
- 保存先: `tasks/TASK-<連番>-<feature-name>.md` (例: `tasks/TASK-001-player-marker.md`)

## 事前探索プロトコル (Exploration Protocol)

計画立案に必要な既存コードベースの調査には、以下の Antigravity CLI ツールおよび `rtk` ラッパーを厳格に使用します：
1. **全体像・配置把握**: まず `.agents/.cache/repo_map.txt` (無ければ `make map`) を確認
2. **対象絞り込み**: `rtk git ls-files -c -o --exclude-standard "<パターン>"`
3. **行・構造特定**: `rtk grep -n "<キーワード>"` または `ast-grep`
4. **精読・確認**: `view_file` (StartLine / EndLine 指定) または `rtk read`
※ 生の `ls`, `cat`, `grep`, `find`, `tree` などの直接実行は Hook により自動書き換えまたは遮断されます。

## タスクの分割粒度 (Task Right-Sizing)

各ステップは、Worker が推論なしで実行できる「1つのアクションと検証可能な結果」の最小単位に分割します：
- 「失敗するテストを書く (RED)」
- 「テストを実行して期待通りの失敗を確認する」
- 「テストをパスさせる最小限のコードを実装する (GREEN)」
- 「スコープ付きテスト (`agent:check-worker`) を実行して PASS を確認する」

## TASK-*.md フォーマット

タスクファイルは以下の正式テンプレートに**厳密に準拠**して生成してください：

```markdown
# TASK-XXX: [タスクのタイトル]

## 1. Metadata
- **Status**: `TODO` | `IN_PROGRESS` | `IN_REVIEW` | `REJECTED` | `DONE`
- **Created**: YYYY-MM-DD
- **Target**: `src/features/...` 等の主要対象スコープ

## 2. Requirements (要件)
<!-- Reviewerはこの要件が満たされているかを厳密に審査する -->
- [要件1: 明確かつ客観的に検証可能な振る舞い]
- [要件2: 型定義や制約事項]

## 3. Testing Strategy (Worker用テスト実装指示)
<!-- 抽象的な指示は厳禁。Workerが推論なしでテストを書けるよう、具体的なファイルパスとテストケースを明記すること -->
- **対象テストファイル**: `src/.../__tests__/feature.test.ts`
- **テストケース**:
  1. `should return ... when ...`
  2. `should throw error when ...`

## 4. Implementation Steps (Worker 実装手順)
<!-- 抽象的な指示は厳禁。具体的にどのファイルをどう作成・修正するか記載すること -->
### Phase 1: [フェーズ名]
- [ ] 1. **[対象ファイルパス]**: [具体的な修正内容・関数シグネチャ]
- [ ] 2. **[対象ファイルパス]**: [具体的な修正内容]

## 5. Worker Verification (Worker 自己検証)
- [ ] すべての Testing Strategy に基づきテストを書き、失敗(RED)を確認してから実装(GREEN)したこと
- [ ] すべての Implementation Steps が完了していること
- [ ] `pnpm run agent:check-worker <対象ファイル>` がエラーなく(exit code 0) PASS すること

## 6. Reviewer Checklist (Reviewer 審査基準)
- [ ] `pnpm run agent:check-reviewer <対象ファイル>` が PASS すること
- [ ] Requirements (要件) が漏れなく実装されていること
- [ ] 余計なファイルの削除や、意図しないアーキテクチャの破壊がないこと
- [ ] エラーハンドリングや型定義が適切であること

---

## 7. Rejections / Additional Tasks (差し戻し記録)
### Rejection 1 (YYYY-MM-DD)
**理由**: [エラーの内容や要件漏れの理由]
**追加手順 (Additional Tasks)**:
- [ ] 1. [修正すべきファイルと内容]
```

## Planner 最終出力フォーマット

計画（`tasks/TASK-*.md`）の保存が完了したら、チャットへの最終出力を以下の**定型フォーマット**で出力し、ターンを終了してください：

```markdown
📝 **[PLANNING COMPLETE]**
タスクファイルを生成しました。Workerにハンドオフします。
- **Task**: [TASK-<feature-name>.md](file:///path/to/tasks/TASK-<feature-name>.md)
- **Target**: `対象となる主なファイルパス`
```
