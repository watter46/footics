# エージェント協調・タスク駆動開発アーキテクチャ仕様書 (Agent Architecture & Workflow Spec)

本ドキュメントは、Footics におけるエージェント設計（Planner / Worker / Reviewer）、タスクファイル運用規則、モデル選定、および直面したボトルネックの分析と今後のエージェント層改修計画をまとめた単一参照点（Single Source of Truth）です。

---

## 1. 採用されたコア決定事項 (Adopted Architecture)

### 1.1 モデル階層と役割分担
* **メインスレッド（対話・オーケストレーター）**: **`Gemini 3.8 Flash (High)`**
  * ユーザーとの対話窓口であり、Planner の役割を兼任する。
  * 事前探索、仕様策定、タスクファイル（`tasks/TASK-*.md`）の生成、HITL（人間承認）の受領、Worker/Reviewer の起動・破棄を行う。
* **Worker（実装部隊）**: **タスク・Phase 難易度に応じた動的切り替え**
  * `Model: "flash"`（Gemini 3.8 Flash Medium相当）: TDD実装、複数ファイル連携、型定義、コンポーネント実装。
  * `Model: "flash_lite"`（Gemini 3.8 Flash Low相当）: 文言修正、定数追加、軽微なCSS修正などの定型タスク。
* **Reviewer（審査官）**: **`Model: "pro"`（Gemini 3.8 Flash High充当）**
  * 自動検証コマンドおよび仕様・品質の客観的監査（Confidence 80%以上のみブロック）。

### 1.2 タスクファイル運用規則
* **配置場所**: `tasks/TASK-*.md`（`.agents/tasks/` ではない）。
* **Phase の本質定義**:
  * 開発工程（「型定義だけ」「テストだけ」）の分割ではなく、**「機能・サブシステムごとの完結した段階」**。
  * 各 Phase 内で Worker が単独で **TDD（テスト作成 ➔ 実装 ➔ スコープ検証）を一通り完結**させる。
* **Phase ごとの Worker リレー実行（直列パイプライン）**:
  1. **Phase 1**: Worker-1 起動 ➔ TDD 実装 & 検証 ➔ 完了報告 ➔ **Worker-1 を kill（コンテキスト破棄）**
  2. **Phase 2**: Worker-2 起動 ➔ 前 Phase の成果物を元に TDD 実装 ➔ 完了報告 ➔ **Worker-2 を kill**
  3. **Phase 3**: Worker-3 起動 ➔ 結合・UI 実装 ➔ 完了報告 ➔ **Worker-3 を kill**
  4. **全 Phase 完了後**: Reviewer（Flash High）を起動し、全体の総合審査。
  5. **LGTM 後**: Planner が Git コミットし、ユーザーに完了報告。

### 1.3 タスクファイル仕様（構造化フォーマット）
```markdown
# TASK-XXX: [タイトル]

## 1. Metadata
- **Status**: `TODO` | `IN_PROGRESS` | `IN_REVIEW` | `REJECTED` | `DONE`
- **Created**: YYYY-MM-DD
- **Target**: `対象スコープディレクトリ`

## 2. Requirements (要件)
- [要件1: 明確かつ客観的に検証可能な振る舞い]
- [要件2: 型定義や制約事項]

## 3. Implementation Phases (Worker 実装手順)

### Phase 1: [サブシステム名]
- **Worker Model**: `flash_lite` | `flash`
- **対象スコープ**: `src/.../types.ts`, `src/.../service.ts`
- **契約 (Interface)**:
  \`\`\`ts
  export function doSomething(param: string): Promise<Result>;
  \`\`\`
- **Testing Strategy**:
  - 対象: `src/.../__tests__/service.test.ts`
  - ケース: 入力Xに対して結果Yを返すこと、異常系でエラーハンドリングされること
- **Steps**:
  - [ ] 1. 失敗するテスト作成 (RED)
  - [ ] 2. 最小限の実装を行う (GREEN)
- **Phase Verification**:
  - [ ] `bun run agent:check-worker <対象ファイル群>` が exit code 0 で全PASS
- **Worker Handoff Log** (完了時にWorkerが1〜2行で追記):
  <!-- 確定したexportシンボル名や実装上の注意点(Gotcha)のみを記録。「〜を作成した」などの冗長な事実列挙は禁止 -->

## 4. Reviewer Checklist & Assessment

### 4.1 Automated Gates (自動検証)
- [ ] すべての Phase のチェックボックス (`- [x]`) が完了していること
- [ ] `bun run agent:check-reviewer <全変更ファイルパス>` が exit code 0 で全PASS

### 4.2 Quality & Spec Audit (仕様・品質審査)
- [ ] 要件網羅性: Requirements に記載された振る舞いが完全に実装されているか
- [ ] 変更スコープの厳守: 不要な設定変更・無関係なファイル破壊がないか
- [ ] 型・安全性の確保: any禁止、null安全
- [ ] デグレ防止: 既存機能（Footics本体側など）に副作用がないか

### 4.3 Reviewer Decision
- **Status**: `LGTM` | `REJECTED`
- **Reviewed At**: YYYY-MM-DD HH:mm
- **Reviewer Model**: `pro` (Flash High)
- **Summary**: [判定理由を1〜2行で簡潔に記載]

## 5. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
### Fix 1 (YYYY-MM-DD)
- **Worker Model**: `flash`
- **Rejection Reason**: [不合格理由]
- **Target Files**: `対象ファイルパス`
- **Required Steps**:
  - [ ] 1. [具体的な修正指示]
  - [ ] 2. `bun run agent:check-worker <ファイル>` で PASS 確認
```

---

## 2. ボトルネック調査・課題分析 (Bottleneck Investigation)

初回タスク（`TASK-001`）およびこれまでのエージェントセッションにおけるボトルネックの根本原因：

| ボトルネック要因 | 現象・影響 | 根本原因 | 改善策 |
| :--- | :--- | :--- | :--- |
| **1. チケットの責務過多（巨大化）** | 意図と異なる成果物、UIの不整合 | バグ修正、共通描画コア改修、UIリプレイスを1つのタスクに詰め込み、Flashのコンテキスト長・推論許容量を超過した | 変更ファイル目安5件以上、またはレイヤーが異なる場合は別タスク（TASK-001, 002）に分離する |
| **2. 抽象的な指示による推論迷走** | 不適切な型定義、コンポーネントの繋ぎ込みミス | 関数シグネチャ（引数・戻り値）を定義せず「トリミングを実装する」等の日本語で指示したため、Flashが自己流で推論した | タスクファイル内に TypeScript の具体的な型定義・インターフェースを明記する |
| **3. 通信・実行管理のゾンビ化** | サブエージェントの完了を親が見失う、古いエージェントのコンテキスト肥大 | 1つのWorkerを最後まで使い回し、会話履歴が数万トークンに達して推論が劣化 | PhaseごとにWorkerを新規起動し、完了報告を受けたら直ちに `kill` して破棄するリレー方式の徹底 |
| **4. 古い設定（pnpm等）の残存** | スクリプトの実行エラー、プロトコル不一致 | `.agents/plugins/superpowers/` 内のスキル・テンプレートが旧環境（pnpm前提）のまま更新されていなかった | superpowers 内のテンプレートとスクリプトを Bun/Biome/rtk 前提に同期改修する |

---

## 3. 今後のエージェント層改修計画 (Agent Layer Roadmap)

本仕様に基づき、エージェント層（`.agents/`）を改修する際の手順：

1. **エージェント定義の更新 (`.agents/agents/`)**:
   - `planner.md`: Phase ごとの Worker 起動・kill リレー手順、および新しいタスクファイルテンプレートを組み込む。
   - `worker.md`: `target_phase` 指定時の動作、Phase 内 TDD、スコープ検証、Worker Handoff Log の記述ルールを反映。
   - `reviewer.md`: Quality & Spec Audit（仕様・品質審査）と不可逆修正欄（Rejections追記）の厳格化。
2. **通信・オーケストレーション規約の改訂 (`.agents/rules/`)**:
   - `agent-communication.md`: `target_phase` を含む YAML Frontmatter プロトコルの正式化。
   - `agent-delegation.md`: Flash / Flash-Lite / Flash High の動的モデル選定とライフサイクル管理（起動即破棄）の強化。
3. **スキルテンプレートの同期 (`.agents/plugins/superpowers/skills/writing-plans/`)**:
   - `pnpm` を `bun` に置換し、新フォーマットテンプレートに統一。
