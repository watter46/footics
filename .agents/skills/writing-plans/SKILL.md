---
name: writing-plans
description: 仕様や要件から、Worker（Flash）が推論なしで実装できる高解像度なタスクファイル（tasks/TASK-*.md）を作成するスキル
---

# Writing Plans (実装計画立案スキル)

## 概要 (Overview)

要件・仕様から、推論能力の低い Worker エージェント（`flash` / `flash_lite`）が一切の推論や自律探索なしに一発で実装できるタスクファイル（`tasks/TASK-*.md`）を作成するためのスキルです。
本プロジェクトは **Planner（計画・実行管理）と Worker（Phase 実装）の2階層パイプライン** で動作します（旧 `Scout` および `Reviewer` は廃止）。

## 1. 計画書 (Plan Artifact) とタスク指示書 (Task File) の役割分担

1. **ユーザー向け設計合意 (Plan Artifact)**:
   - 保存先: `<appDataDir>/brain/<conversation-id>/plan.md` (または `implementation_plan.md`)
   - 制約: `.agents/rules/plan-artifact.md` に準拠し、**コード・ファイルパス・図表・システム用語を一切排除** し、**Footics ユビキタス言語** を用いた平易な日本語（4セクション構成）で「どう変わるか」「何を廃止するか」を合意する。
2. **Worker向け内部指示書 (Task File)**:
   - 保存先: `tasks/TASK-<連番>-<slug>.md`
   - 構造: **「タスクファイル ＞ フェーズ（1 Worker単位） ＞ タスク」** の階層構造とし、**事前コミットメッセージ（`Commit:`）**、**残存禁止条件（Negative Contracts）**、およびファイルごとの **`[ADD]` / `[MODIFY: Before ➔ After]` / `[DELETE]`** を省略なしで記述する。

## 2. 事前探索プロトコル (Planner による直接探索)

Planner はサブエージェントに探索を丸投げせず、以下の決定論的ツールで自ら調査を完結させます：
1. **シンボル・呼び出し元の全件特定**:
   - 定義元検索: `bun run ai:find <keyword>`
   - 呼び出し元（Consumer）の全件網羅特定: `rg -l '<symbol>' src/ extension/` および `rg -c '<symbol>' src/ extension/`（切り詰めなしで全ファイル特定）
2. **シグネチャ・行番号・内部importの一括抽出**:
   - `bun run ai:outline <file1> [file2 ...]`（複数ファイル一括指定可。`[L開始-L終了]` 行番号と内部 import 一覧を取得）
3. **対象箇所の無加工読込 (`read_file`)**:
   - 400行以下のファイルは1回の `read_file` で全文取得、400行超のファイルは `ai:outline` の行番号を使って該当関数範囲を取得し、タスクファイルに書く `Before` アンカーコードを正確に把握する。

## 3. Planner と Worker (`flash`) の契約境界・タスク作成の鉄則

1. **一時的フォールバック・新旧二重持ちの全面禁止 (Zero Fallback Rule)**:
   - 「既存の呼び出し元や既存テストを壊さないために optional 引数や旧ストアを残す」という設計を **厳禁** とする。
   - 破壊的変更時は、古い仕組みを `[DELETE]` または完全置換し、影響を受けるすべての呼び出し元（Consumers）と既存テストを同一タスク（または連番タスク）内で一括更新する。
2. **タスクファイルは「厳格な契約（Contract）」であり「全コードの写経」ではない**:
   - **Worker に推論させてはいけないこと（タスクファイルに明記する契約）**:
     - ① **事前コミットメッセージ (`Commit`)**: `feat(scope): ...` や `refactor(scope): ...`
     - ② **残存禁止条件 (`Negative Contracts`)**: 完了時に `0件` でなければならない検索条件と削除対象ファイル（`[DELETE]`）
     - ③ **局所的な変更契約 (`Before ➔ After`)**: 変更対象の関数・ブロックの入出力・ロジック仕様
     - ④ **具体テスト仕様 (`Concrete Test Cases`)**: モック禁止の実Store / 純粋関数I/O
   - **Worker に任せるべきこと（タスクファイルに書かないこと）**:
     - 周辺の無関係な既存コードの維持、既存ファイルの行位置調整、Biome や型エラーに対する自律修正
3. **ファイル丸ごとコピペの厳禁とサイズ制約 (Hard Limits)**:
   - **局所ブロック対比**: `[MODIFY]` タスクではファイル冒頭から末尾までの全貼り付けを **厳禁** とする。変更対象の **最小限の関数・TSXブロック（前後2〜3行のアンカー付き、10〜40行程度）** のみを `Before ➔ After` として記述する。import の追加はファイル全体の import を貼るのではなく、追加する 1〜2 行のみを独立して明記する。
   - **ブロック上限**: 1つのコードブロックは **120行以内**（`task-size-guard` および `task:validate` により 120行超は遮断）。
   - **タスクファイル上限**: 1ファイルあたり **300〜500 行（最大 800行）** に収めること（800行超はガードにより物理遮断）。800行を超える規模の場合は、連番タスク（例: `TASK-XXXa`, `TASK-XXXb`）に分割する。
   - **新規ファイル (`[ADD]`) の適正サイズ**: 1ファイル 150〜250行以内（単一責任の原則）にモジュール分割し、タスクファイル全体でも 300〜500行に収まるように設計する。
4. **Phase 分割基準**:
   - **1〜4ファイル**: 1 Phase（1 Worker）で一括完遂。
   - **5ファイル以上**: 1 Phase あたり **最大4プロダクションファイル＋2テストファイル（計6ファイル）以下** に分割する（**`[DELETE]` ファイルは上限カウントから除外**）。
   - 各 Phase の Worker は担当ファイル限定の `bun run ai:check <担当ファイル>` のみを通し、全 Phase 完了後に Planner が全体統合検証（`bun run ai:preflight` / `bun run ai:commit`）を実行する。

## 4. `TASK-*.md` 正式テンプレート

タスクファイル作成後は必ず `bun run task:validate tasks/TASK-XXX.md` を実行して検証すること：

```markdown
# TASK-XXX: [タイトル]

## 1. Metadata & Goal
- **Status**: `TODO` | `IN_PROGRESS` | `DONE`
- **Commit**: `refactor(scope): concise commit message`
- **Negative Contracts (完了時に0件であるべき条件)**:
  - `rg -l "OldSymbolName" src/ extension/` ➔ 0 files
  - Deleted files must not exist: `src/path/to/old-file.ts`

## 2. Architectural Invariants & Consumers
- **Invariants (壊してはいけない前提条件)**:
  1. [前提条件と理由]
- **Consumers (同期更新対象の全ファイルリスト)**:
  - `src/.../consumer-a.tsx`
  - `extension/.../consumer-b.tsx`

## 3. Implementation Phases (タスクファイル > フェーズ > タスク)

### Phase 1: [1 Worker が担当する論理単位]
- **Worker Model**: `flash` | `flash_lite`
- **Target Files**:
  - `[ADD]` `src/.../new-module.ts`
  - `[MODIFY]` `src/.../consumer-a.tsx`
  - `[DELETE]` `src/.../old-file.ts`
  - `[MODIFY]` `src/.../__tests__/consumer-a.test.tsx`

#### Task 1.1: `[ADD]` `src/.../new-module.ts`
```ts
// 完全な新規実装コード（省略禁止）
```

#### Task 1.2: `[MODIFY]` `src/.../consumer-a.tsx` (L25-L50)
- **追加 import**:
```tsx
import { newHelper } from '@/lib/helpers';
```
- **変更箇所 (前後2〜3行アンカー付き、局所ブロック・全コピペ禁止)**:
- **Before**:
```tsx
// 置換対象の既存関数またはTSXブロック（前後2〜3行のアンカーコードを含む）
```
- **After**:
```tsx
// 置換後の完全なコード（ファイル全体のコピペ禁止・ブロック内省略禁止）
```

#### Task 1.3: `[DELETE]` `src/.../old-file.ts`
- `rm src/.../old-file.ts` を実行して物理削除する。

#### Task 1.4: `[MODIFY]` `src/.../__tests__/consumer-a.test.tsx`
- **Concrete Test Implementation (モックなし・実Storeまたは純粋関数I/O)**:
```tsx
// 具体的なテストコード
```

- **Phase Verification**:
  - [ ] 1. 全タスク反映・ファイル削除完了
  - [ ] 2. `bun run ai:check <Target Files（DELETE除く）>` が PASS すること
- **Worker Handoff Log**:
```
