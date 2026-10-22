# 引き継ぎ書: Auditor 最適化・自律稼働化プロジェクト

## 1. プロジェクト概要・背景
- **目的**: Footics プロジェクトにおけるセッション監査エージェント「Auditor」を修復・最適化し、スクリプト実行による客観的定量化と、冷徹・敵対的な論理推論（原因層の特定・改善案提示）を自律的に完遂できる体制を整える。
- **課題の起点**: セッション `c2ed8fa3-3d8b-44c6-bc2c-59b80300d362`（TASK-031）の監査において、以下のボトルネックが判明：
  1. `subagent-guard.ts` の誤爆により子エージェント（Lead Planner）から親への通信が遮断（Step 105）
  2. カスタムサブエージェント（`worker` 型）にコマンド・編集ツールが付与されず起動失敗
  3. 初代 Auditor が `run_command` を持たず、`ai:audit` スクリプトではなく手集計を行っていたため数値が不正確

---

## 2. 確定・合意済みの設計方針
- **Plan Artifact**: [`plan.md`](file:///home/watter46/.gemini/antigravity-cli/brain/2e44fdc6-0523-4965-94bd-97e86254f58e/plan.md) （ユーザー承認済み）
- **スクリプト層と推論層の厳格分離**:
  - **スクリプト層 (`ai:audit --tree`)**: ターン数、所要時間、トークン、Denials、23種の検出器（EXP-01〜10, READ-01〜10, INFRA-01〜03）による機械的判定。
  - **推論層 (Auditor)**: スクリプトが出力した Findings と異常 Step の証拠精査、原因層（Planner/Worker/Hook/Rule等）の特定、具体的改善アクションの策定。
- **冷徹・敵対的ペルソナ**:
  - 好意的解釈を排し、規約違反や無駄の割合を徹底糾弾。
  - 定量値の手集計は禁止（スクリプト結果の転記のみ）。各項目に【スクリプト実測】と【推論】のラベルを義務付け。
- **実装担当**: 親エージェント（Planner）が一貫して直接実装する（`.agents/**` は Worker のスコープ外のため）。

---

## 3. 作成済みタスクチケット一覧
1. **[`tasks/TASK-032-auditor-bootstrap-repair.md`](file:///home/watter46/src/footics/tasks/TASK-032-auditor-bootstrap-repair.md)**: 起動基盤修復（Phase 1〜4 実装完了、Phase 5 実機検証中）
2. **[`tasks/TASK-033-audit-script-foundation.md`](file:///home/watter46/src/footics/tasks/TASK-033-audit-script-foundation.md)**: audit-session 基盤拡張（Findingモデル、子セッション再帰ツリー、インフラ検出器INFRA-01〜03、--step-detail）
3. **[`tasks/TASK-034-audit-detectors-exploration.md`](file:///home/watter46/src/footics/tasks/TASK-034-audit-detectors-exploration.md)**: 探索妥当性検出器 (EXP-01〜10)
4. **[`tasks/TASK-035-audit-detectors-reading.md`](file:///home/watter46/src/footics/tasks/TASK-035-audit-detectors-reading.md)**: 読込最適性検出器 (READ-01〜10)
5. **[`tasks/TASK-036-auditor-persona-and-integration.md`](file:///home/watter46/src/footics/tasks/TASK-036-auditor-persona-and-integration.md)**: ペルソナ改修と実セッション監査統合検証

---

## 4. 現在の実装状況と検証実績 (TASK-032)

### 実装・テスト完了分 (全 108 テスト GREEN)
- **Phase 1: 役割判定の拡張** ([`agent-access-guard.ts`](file:///home/watter46/src/footics/.agents/hooks/guard/agent-access-guard.ts))
  - `type: "AUDIT_REQUEST"` を持つセッションを `auditor` ロールと判定。
  - `isChildSession()` を追加（先頭が `SYSTEM_MESSAGE` の場合は子セッションと判定）。
  - `auditor` ロールによるファイル書き込みツール呼出を全パス deny。
- **Phase 2: Auditor 専用ガード新設** ([`auditor-guard.ts`](file:///home/watter46/src/footics/.agents/hooks/guard/auditor-guard.ts))
  - `transcript*.jsonl` への直接読込（`read_file`, `cat`, `jq` 等）を物理遮断。
  - 実行可能コマンドを監査ツール群（`bun run ai:audit`, `rtk`, `git` 読取専用等）に限定。
- **Phase 3: 通信ガード誤爆の根絶** ([`subagent-guard.ts`](file:///home/watter46/src/footics/.agents/hooks/guard/subagent-guard.ts))
  - `isChildSession()` の導入により、子エージェントから親への `send_message` が親のステップ数超過で遮断されるバグを完全解消。
- **Phase 4: フック総合配線** ([`guard.ts`](file:///home/watter46/src/footics/.agents/hooks/guard.ts))
  - `evaluatePayload` の最優先ゲートとして `checkAuditorGuard` を結合。

---

## 5. 直面した技術的制約と未決定事項 (エスカレーション)

### 実機スモークテスト結果 (Phase 5)
`auditor.md` の Frontmatter に `tools: [read_file, run_command, send_message]` を記述し、`invoke_subagent(TypeName: "auditor")` を実行したところ、以下のツールしか付与されませんでした：
- 付与されたツール: `send_message`, `view_file`, `read_url_content`, `search_web`, `schedule`, `generate_image`, `manage_task`
- **結果**: `run_command` が付与されず、`ai:audit` の自律実行が不可能。

### 原因
Antigravity CLI の現仕様において、Markdown 定義カスタムエージェント（`.agents/agents/*.md`）のベースラインにはコマンド実行・書き込みツールが含まれておらず、Frontmatter 経由で `run_command` を追加付与する有効な記法が存在しません（`enable_write_tools` は YAML では無効、`tools:` はレガシーツールのオプトイン用）。

### 確定した解決策（メインコンテキスト直接 Auditor 稼働方式）
- **メインコンテキスト（親セッション）直接 Auditor 起動の採用**:
  - ユーザーが新しいチャットで `@auditor` または `type: "AUDIT_REQUEST"` を含めて ConversationID の監査を依頼した際、**その対話コンテキスト（親セッション自身）が直接 Auditor ロールとして稼働する**。
  - サブエージェント（`invoke_subagent`）は一切起動しない（不要なトークン消費とオーバーヘッドの完全排除）。
  - 今回実装したガードにより：
    1. 初回メッセージの `@auditor` / `AUDIT_REQUEST` / `ai:audit` 指定を検知して自動的にロールを `'auditor'` と判定（`USER_INPUT` であっても適用）。
    2. Auditor ロールによる `invoke_subagent` / `define_subagent` は物理遮断（deny）。
    3. ファイル編集は全拒否、生ログ直接読込は遮断、実行可能コマンドは `ai:audit` / `ai:report` 等の監査ツールに限定。
  - これにより、メインコンテキストが安全に隔離され、親エージェント自身が直接 `ai:audit --tree` 実行 → `--step-detail` 精査 → ボトルネック推論 → ユーザー報告を 1 セッションで完結させる。

---

## 6. 次のコンテキストで行うべき作業手順

1. **方針の確定**:
   - 上記の「`TypeName: "self"` + `AUDIT_REQUEST`」方式にシフトすることを合意。
   - `TASK-032` Phase 5 の完了マーク（子→親の通信開通確認済み、起動プロトコルの確定）。
2. **TASK-033 の実装**:
   - `audit-session.ts` の拡張（Finding モデル、レジストリ、再帰子ツリー走査、インフラ検出器 INFRA-01〜03、`--step-detail` 実装）。
3. **TASK-034 の実装**:
   - 探索妥当性検出器 (EXP-01〜10)。
4. **TASK-035 の実装**:
   - 読込最適性検出器 (READ-01〜10)。
5. **TASK-036 の実装と実機検証**:
   - `auditor.md` ペルソナ改修。
   - セッション `c2ed8fa3-3d8b-44c6-bc2c-59b80300d362` に対する Auditor 実機監査の完遂。
