# 引継ぎサマリー: Arch-Refactor-GM (新アーキテクチャ適用のための並列実行チケット再発行)

## 1. タスク概要
- **チケットID**: `Arch-Refactor-GM`
- **タスク名**: 新アーキテクチャ適用のための並列実行チケット再発行
- **作業ブランチ**: `main`
- **関連ファイル**:
  - `.agents/knowledge/architecture-and-guidelines.md`
  - `AGENTS.md`
  - `.agents/skills/regista-gm/SKILL.md`
  - `.regista/templates/task-ticket.md`
  - `.regista/templates/board-summary.md`

---

## 2. 手詰まり・引継ぎの経緯 (Background & Impasse Reason)
- **手詰まりの原因**: 前任エージェントがDAG（依存関係）を無視してL1〜L5まで一気に並列実装を試みてコードを自動生成してしまったため、一度コミットを取り消してクリーンにした。また、チケット発行ルール（並列実行のためのレイヤー分割・ファイル重複禁止・GM実装禁止・絵文字統一）を改定した。
- **試行して破棄したアプローチ**: 単一エージェントによる全レイヤーの一括自動生成コミット（破棄済）

---

## 3. ユーザーとの対話で確定した前提概念・確定仕様 (Confirmed Specs & Mental Models)
### ① 並列実行のためのレイヤー分割 (DAG)
- レイヤー（L1, L2, L3...）は「ユーザーが別チャットで複数のWorkerエージェントを同時に並列稼働させるため」の単位である。
- **同一レイヤー内のチケット同士で、変更対象ファイルが絶対に重複してはならない**（Gitコンフリクト防止）。
- L2以降は、依存するL1チケットが完了・コミットされた後に着手する。

### ② GMの責務の完全分離
- GMはタスクを極小AAWU（1〜3ファイル単位）に分解し、`.regista/tickets/[ID].md` を発行するのみ。
- **GM自身は絶対にコードの実装・修正を行わない**。

### ③ 絵文字によるレイヤー可視化
- チャット出力（board-summary）の際、同じレイヤーのチケットIDの左には**必ず同じ色の絵文字**（例: L1は🟢、L2は🟡など）を明記する。

### ④ 適用する新アーキテクチャ規約
- `src/features/{featureName}/` 配下にドメインごとの垂直スライスを配置。
- サブディレクトリ命名仕様:
  - `tactical-unified`: `objects/` (`player/`, `arrow/`, `zone/`, `pitch/`, `ball/`, `canvas/`)
  - `match`: `panels/` (`video-player/`, `timeline/`, `memo-overlay/`, `event-logger/`)
  - `management`: `entities/` (`squad/`, `players/`, `formations/`)
  - `syntax-studio`: `sections/` (`script-editor/`, `scene-generator/`, `x-thread-preview/`)
  - `dashboard`, `national-dashboard`: `widgets/` (`national-stats/`, `team-summary/`, `kpi-cards/`)
- 自己完結4要素: `components/`, `hooks/`, `types.ts`, `index.ts`
- Feature間の直接 import 禁止。

---

## 4. 現時点の実装状況と検証結果 (Implementation & Verification)
1. **`AGENTS.md`**:
   - 並列実行の担保、ファイル重複禁止、GMの実装禁止、絵文字可視化ルールを反映完了。
2. **`.agents/skills/regista-gm/SKILL.md`**:
   - 同上ルールの追記完了。
3. **不要コミットの取り消し**:
   - `git reset --hard 7acae12ea006c3eefe21bfc34482a74e9a92fe3b` によりクリーンな状態に復帰済。

### 品質検証結果
- **TypeScript (Scoped)**: `PASS`
- **Biome Check**: `PASS`

---

## 5. 残課題 / 次のチャットでやるべきこと (Next Steps & Action Items)
1. 新アーキテクチャ移行計画を精査し、並列実行可能な **L1 レイヤー**（ファイル被りのない独立チケット群）から順にチケットを発行する（`.regista/tickets/`）。
2. 発行したチケット一覧を `board-summary.md` テンプレートに準拠してチャットに出力する。
3. GMとしてコード実装は行わず、チケット出力完了の時点で待機する。

---

## 6. 新しい会話に貼り付けるプロンプト (Next Conversation Prompt)

別の会話（新規Conversation）を開き、以下のプロンプトをそのまま貼り付けて開始してください。

```markdown
現在、Footicsの新アーキテクチャ移行（垂直スライス・ドメイン別サブディレクトリ構造へのリファクタリング）を進めるため、GMとしてチケット発行を行ってください。

### 前提コンテキスト
- **対象チケット**: Arch-Refactor-GM (新アーキテクチャ適用のための並列実行チケット再発行)
- **引継ぎサマリーファイル**: file:///home/watter46/src/footics/.regista/handover/Arch-Refactor-GM-handover.md
- **参照規約**:
  - file:///home/watter46/src/footics/.agents/knowledge/architecture-and-guidelines.md
  - file:///home/watter46/src/footics/AGENTS.md
  - file:///home/watter46/src/footics/.agents/skills/regista-gm/SKILL.md

### 確定したルール・前提概念
1. **並列実行の担保**: 同一レイヤー（L1等）内のチケットは、ユーザーが別チャットで同時に並列実行するため、変更対象ファイルが絶対に重複しないよう厳密に分割すること。
2. **GMの実装絶対禁止**: あなた（GM）はタスク分解とチケット（.regista/tickets/*.md）の発行のみを行い、コードの実装・修正は絶対に開始しないこと。
3. **絵文字によるレイヤー可視化**: チャット出力時、同じレイヤーのチケットIDの左には必ず同じ色の絵文字（例: L1は🟢、L2は🟡等）を明記すること。
4. **出力の完全テンプレート化**: チャットへの報告は .regista/templates/board-summary.md に準拠したテーブルのみを出力すること。

### 次に着手してほしいこと
1. 現在の `src/` 配下の構造と `architecture-and-guidelines.md` を突き合わせ、新アーキテクチャ移行のためのタスクを極小AAWU（1〜3ファイル単位）のDAGチケットとして `.regista/tickets/` に発行してください。
2. チケット一覧を board-summary 形式で出力して完了してください。
```
