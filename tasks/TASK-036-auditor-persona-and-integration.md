# TASK-036: Auditor ペルソナ改修と敵対的監査の統合検証

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-22
- **Completed**: 2026-10-22
- **Depends On**: TASK-032, TASK-033, TASK-034, TASK-035
- **Executor**: Planner/self 直接実装
- **Target Files**:
  - `.agents/agents/auditor.md` (MODIFY: 本文システムプロンプト改修)
  - `.agents/skills/session-audit/SKILL.md` (MODIFY: 敵対的監査・スクリプト実測と推論の分離規約反映)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `auditor.md` のプロンプトが以下の原則を厳格に指示する構造になっている：
  - **敵対的評価 (Adversarial Audit)**: 好意的な解釈や「最終的に成功したから良し」とする妥協を排し、規約違反、無駄なターン・トークン、回避可能だった手戻りを冷徹・論理的に糾弾する。
  - **事実と推論の厳格分離**: レポート内の各記述に【スクリプト実測】と【推論】の明示的ラベルを付与する。
  - **手集計の禁止**: 定量数値（Turns, Duration, Tokens, Denials, Findings）は `bun run ai:audit` の出力を転記するのみとし、独自の手集計を行わない（例外時は「手集計」と明記）。
  - **原因層の特定と改善アクション**: 各問題点について、どのエージェント層（Planner / Worker / Scout / Reviewer / Hook / Rule / Agent定義 / Script）に原因があるかを特定し、ファイルパス付きの改善案を出力する。
  - **生ログ直接読込の禁止**: `transcript*.jsonl` への `cat`, `read_file`, `jq` を行わず、`ai:audit --steps` または `--step-detail` のみを使用する。
  - **サブエージェント起動禁止**: メインセッション直接稼働とし、`invoke_subagent` を行わない（物理ガード配線済み）。
- [x] 2. `session-audit` スキルのテンプレートが更新され、Findings 一覧、疑わしい層、改善アクションのフォーマットが整流化される。
- [x] 3. **実機統合検証**:
  - 対象セッション `c2ed8fa3-3d8b-44c6-bc2c-59b80300d362` に対し、`bun run ai:audit <id> --tree` および `--step-detail <id> <step>` による完全検証を実施。
  - 全 10 セッション、585 ターン、Hook Denials 26 件、Findings 135 件（HIGH=29, MED=55, LOW=41, INFO=10）を機械的に抽出し、Step 157, 177 等の迷走原因をピンポイントで特定できることを実証。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Auditor Prompt Template Snippet
```markdown
# Role & Philosophy
あなたは Footics プロジェクトの冷徹・論理的な敵対的セッション監査官「Auditor」です。
あなたの存在意義は、甘い評価を排除し、エージェントパイプラインの非効率、規約違反、ガード誤爆、設計負債を容赦なく暴き出すことです。
「タスクが完了した」ことは評価に値しません。「どれだけ無駄なく、規約通りに最小トークンで完遂できたか」のみを評価します。

# Workflows
1. 構造化ログの機械抽出 (bun run ai:audit <session_id> --tree)
2. スクリプト Findings と Denials の証拠精査 (bun run ai:audit --step-detail <session_id> <step>)
3. 原因層の論理特定と改善策策定
4. 親またはユーザーへの敵対的監査レポート報告
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: auditor.md システムプロンプトの改修
- **対象ファイル**: `.agents/agents/auditor.md`
- **Tasks**:
  - [x] 1. 敵対的監査人ペルソナ、サブエージェント起動禁止、スクリプト実行優先フロー、レポート形式の更新。
- **Worker Handoff Log**:
  - `auditor.md` を改修。敵対的評価原則、事実と推論の厳格分離（【スクリプト実測】/【推論】ラベル義務付け）、手集計禁止、8大原因層特定、サブエージェント起動禁止、読み取り専用制約を明記。

### Phase 2: session-audit スキル文書の改修
- **対象ファイル**: `.agents/skills/session-audit/SKILL.md`
- **Tasks**:
  - [x] 1. 検出器体系（EXP, READ, INFRA 全 23 種）、Findings 出力例、敵対的評価観点、レポートテンプレートの追記。
- **Worker Handoff Log**:
  - `session-audit/SKILL.md` を改修。`--tree` / `--step-detail` のコマンド体系、全23検出器の体系表、8大原因層（Planner/Worker/Scout/Reviewer/Hook/Rule/Agent定義/Script）、敵対的監査レポートテンプレートを整備。

### Phase 3: エンドツーエンド実機検証
- **対象ファイル**: 実機実行のみ
- **Tasks**:
  - [x] 1. `c2ed8fa3-3d8b-44c6-bc2c-59b80300d362` を対象に `bun run ai:audit --tree` および `--step-detail` を実行。
  - [x] 2. スクリプト実行結果（全 10 セッション、585 ターン、Denials 26 件、Findings 135 件）と Step 157/177 の証拠をピンポイント抽出できることを確認。
  - [x] 3. 全エージェントテスト（153 件）PASS 確認。
- **Worker Handoff Log**:
  - 実機セッション `c2ed8fa3-3d8b-44c6-bc2c-59b80300d362` の監査を実施。
  - `ai:audit --tree` により親＋子全10セッションの TREE SUMMARY および Findings (HIGH=29, MED=55, LOW=41, INFO=10) を一撃取得。
  - `--step-detail` により Step 157 (Planner edit deny) と Step 177 (define_subagent deny → worker tool 欠落 → self 再起動) の生々しい迷走証拠をピンポイントで特定。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `flash`
- **Reviewed At**: 2026-10-22
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ（ペルソナ改修・スキル更新・実機検証・全153テストPASS）
  - [x] 2. ホスト境界 & Store Provider（本タスクはエージェント基盤のため該当なし）
  - [x] 3. 設計負債 & 拡張性（23検出器がモジュール化され、Auditor は推論と原因層特定に集中）
  - [x] 4. サイレント破壊 & 既存保護（生ログ直接読込とサブエージェント起動が物理ガードで遮断）
- **Summary**:
  - Auditor 最適化・自律稼働化プロジェクトの全タスク（TASK-032〜TASK-036）が完全に完了。
