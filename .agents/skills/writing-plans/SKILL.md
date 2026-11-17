---
name: writing-plans
description: 仕様や要件から、実行モデル（Gemini 4 Hydrogen/low）が迷わず・脱線せず・高速に組み立てられる契約仕様書（tasks/TASK-*.md）を作成するスキル
---

# Writing Plans (実装計画立案スキル)

## 概要 (Overview)

本プロジェクトは **コンテキストA（高推論モデル：設計・タスク分解）** と **コンテキストB（`Gemini 4 Hydrogen/low`：実行オーケストレート＆Phase 実装）** の役割分担で動作します（旧 `Scout` および `Reviewer` は廃止）。
コンテキストA の Planner は、設計・型境界・並列順・テスト観点をすべて確定させ、実行モデル（`Hydrogen/low`）が**勝手な設計やフォールバック作成をせず、迷わず組み立てられる部品契約**として `tasks/TASK-*.md` を作成します。

## 1. Plan Artifact と Task File の役割分担

1. **ユーザー向け設計合意 (Plan Artifact)**:
   - 保存先: `<appDataDir>/brain/<conversation-id>/implementation_plan.md`
   - 制約: `.agents/rules/plan-artifact.md` に準拠し、**コード・ファイルパス・図表・システム用語を一切排除**し、Footics ユビキタス言語の4セクション構成で合意する。
2. **実行モデル向け設計契約書 (Task File)**:
   - 保存先: `tasks/TASK-<連番>-<slug>.md`
   - 構造: **Execution Waves（並列/直列順）＋ Negative Contracts（機械検証）＋ Invariants & Design Decisions ＋ Phase（1 Phase = 1 Worker 契約）**。

## 2. 事前探索プロトコル (Planner による直接探索)

`.agents/rules/efficient-exploration.md` を唯一正本とし、Planner はサブエージェントへ探索を丸投げせず決定論的ツールで最小探索します：
1. **公開型・境界・Consumers のみ抽出**: `bun run ai:impact <symbol|file>`・`rg -l '<symbol>' src/ extension/`・`bun run ai:peek <file|dir> [Symbol]` で公開型・シグネチャ・`[L開始-L終了]`・参照関係のみを把握する。
2. **AST一括抽出（`ai:read` 第一選択・大型/連続/重複 `read_file` 禁止）**: `/plan` 探索時に契約記述へ必要な関数・型本体を確認する場合は、**`read_file` ではなく `bun run ai:read <file1:Symbol1 file2:start-end file3:line...>`** で1ターン抽出する。150行超 TS/JS ファイルへの全文 `read_file`、100行超スライス、連続スライス（ページ送り）、編集なし再読込は禁止。
3. **推測パス並列読込の厳禁**: `ls` / `fd` / `rg` の結果確認前に、実在未確認の推測パスへの `read_file` を同一ターンで並列発行しない（必ずパス確定後の次ターンで読込）。
4. **中間蒸留ゲート（15〜20ターン上限）**: 探索が **15〜20 ターン** を超える規模、または多モジュール横断の大規模リファクタリング時は、その場でタスク生成を続行せず `large-codebase-research` スキルで Artifact（`research-<topic>.md`）へ中間蒸留し、新規セッションで `/plan <Artifactパス>` を実行する。

## 3. 記述粒度・サイズ上限・詰め込み防止ルール（`Hydrogen/low` 最適化）

1. **一時的フォールバック・新旧二重持ちの全面禁止 (Zero Fallback Rule)**:
   - 既存テストや呼び出し元を温存する optional 引数や旧ストアを残してはならない。破壊的変更時は `[DELETE]` または完全置換し、全 Consumer と既存テストを同一タスク（または連番タスク）内で一括更新する。
2. **`Before ➔ After` 写経と実装コード丸書きの完全廃止**:
   - タスクファイル内に既存コード（`Before`）や実装本体（`After`）を貼り付けてはならない（二重トークン消費と未コンパイル誤コード生成の原因）。
   - 代わりに、**① 対象ファイル＋シンボル/行範囲アンカー、② 公開型・関数シグネチャ・計算式、③ 分岐・状態遷移・確定設計判断、④ 具体的テスト仕様（入力 ➔ 期待値）** を記載し、実装コード自体は実ファイルを読んだ `Hydrogen/low` Worker に書かせる。
   - **Worker による `TASK-*.md` 直接編集は廃止**（並列実行時の編集競合防止）。進捗・完了・エラーはメッセージ（`TASK_COMPLETE` / `TASK_BLOCKED`）で返す。
3. **サイズハード上限（`task-size-guard` & `task:validate` で物理強制）**:
   - **1 Phase の実作業ファイル数**: 推奨 `2〜3`、**ハード上限 `4 ファイル`**（`[ADD]` / `[MODIFY]` 合算、`[DELETE]` はカウント除外）。
   - **大ファイル・リファクタ移行の詰め込み防止特例**: 既存 `300行超` のファイルや大型テスト移行を含む場合、ファイル数上限に関わらず **`1 Phase = 1 プロダクションファイル（＋対応テスト1まで）`**、読込合計目安 **`600行以内`** に限定する。
   - **1 Phase の責務単一性**: ドメインロジック・UI・複数 Consumer 移行を1 Worker に混載せず、閉じた単一責務ごとに Phase を分ける。
   - **1 タスクの Phase 数**: 推奨 `1〜4`、**ハード上限 `5 Phase`**（総実編集目安 12ファイル以内）。超過時は連番タスク（`TASK-XXXa`, `TASK-XXXb`）へ分割する。
   - **タスクファイル全体行数**: 推奨 `100〜250行`、**ハード上限 `400 行`**。
   - **単一コードブロック行数**: **ハード上限 `40 行`**（公開型定義・関数シグネチャ・数式のみ許可）。
4. **全領域共通テスト基準**:
   - テスト仕様は「**内部モジュールの `vi.mock` 禁止**（純粋関数 I/O テスト、または本物の `StoreProvider`/Context 接続テスト。外部ブラウザ境界のみ DI/mock 可）」で記述する。
5. **機械検証可能な `Negative Contracts`**:
   - 自然文メモではなく、``- `rg: <pattern>` ``（または ``- `rg(dir1,dir2): <pattern>` ``）、``- `absent: <filePath>` ``、該当なしなら ``- `none` `` を必ず記載する（`ai:commit` 時に自動実行検証される）。

## 4. `TASK-*.md` 正式テンプレート

作成直後に必ず `bun run task:validate tasks/TASK-XXX.md` を実行すること（連番分割時は各ファイルごとに個別実行すること）：

```markdown
# TASK-XXX: [タイトル]

- **Status**: `TODO`
- **Commit**: `refactor(scope): concise commit message`
- **Execution Waves**:
  - Wave 1: Phase 1, Phase 2 (parallel)
  - Wave 2: Phase 3 (sequential after Wave 1)
- **Negative Contracts**:
  - `rg: OldSymbolName`
  - `absent: src/path/to/old-file.ts`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. [不変条件と理由]
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. [フォールバック禁止、エラー時挙動、状態配置先など]
- **Consumers (同期更新対象)**:
  - `src/.../consumer-a.tsx`
  - `extension/.../consumer-b.tsx`

## 2. Implementation Phases

### Phase 1: [閉じた単一責務の名称]
- **Target Files**:
  - `[ADD]` `src/.../new-module.ts` (~120 lines)
  - `[MODIFY]` `src/.../consumer-a.tsx` (`TargetFn`, L25-L60)
  - `[DELETE]` `src/.../old-file.ts`
  - `[MODIFY]` `src/.../__tests__/consumer-a.test.tsx`
- **Reference Files (Read-Only)**:
  - `src/.../shared-types.ts`
- **Contract**:
  ```ts
  // 公開型・関数シグネチャ・数式のみ（40行以内、実装本体は書かない）
  export function targetFn(input: FooInput): FooResult;
  ```
  - 振る舞い仕様・境界条件:
    1. [仕様を箇条書きで曖昧さなく記述]
- **Concrete Test Cases**:
  - `src/.../__tests__/consumer-a.test.tsx`（内部 `vi.mock` 禁止・純粋関数 I/O または実 StoreProvider 接続）:
    - `case 1`: 入力 X ➔ 期待値 Y
    - `case 2`: 異常系 A ➔ Error throw / 状態 Z
- **Verification**:
  - `bun run ai:check src/.../new-module.ts src/.../consumer-a.tsx src/.../__tests__/consumer-a.test.tsx`
```
