# TASK-035: audit-session 読込最適性検出器の実装 (READ-01〜READ-10)

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-22
- **Completed**: 2026-10-22
- **Depends On**: TASK-033（Finding モデル・Registry 基盤）
- **Executor**: Planner/self 直接実装
- **Target Files**:
  - `.agents/scripts/lib/audit/detectors/reading.ts` (NEW)
  - `.agents/scripts/lib/audit/registry.ts` (MODIFY: 検出器登録)
  - `.agents/scripts/__tests__/audit-detectors-reading.test.ts` (NEW)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. 検出器 `READ-01 SMALL_SLICED`: 400 行以下のファイルに対して `StartLine` または `EndLine` を指定したスライス読込を行っているステップを検出する（`Showing lines 1-X of Y` で Y <= 400 を判定）。severity: MED, layers: `['planner', 'worker']`。
- [x] 2. 検出器 `READ-02 SEQ_SLICING`: 同一ファイルに対して複数回連続してスライス読込を行っているステップを検出する。severity: HIGH, layers: `['planner', 'worker']`。
- [x] 3. 検出器 `READ-03 LARGE_FULL_BLIND`: 400 行を超えるファイルを、直前の `rtk grep` や `ai:outline` なしに全文一括で読み込んでいるステップを検出する。severity: MED, layers: `['planner', 'worker']`。
- [x] 4. 検出器 `READ-04 DUPLICATE_READ`: 同一ファイルの同一行範囲を、間に `edit_file` / `write_file` などの編集を挟まずに 2 回以上読み込んでいる無駄を検出する。severity: LOW, layers: `['planner', 'worker']`。
- [x] 5. 検出器 `READ-05 EDIT_WITHOUT_RAW_READ`: `edit_file` が実行された直前（直前 3 ターン以内）に、当該対象ファイルの無加工 `read_file` が行われていない場合を検出する。severity: HIGH, layers: `['worker']`。
- [x] 6. 検出器 `READ-06 RTK_READ_BASIS`: 編集対象ファイルを `rtk read` の要約結果のみに基づいて `edit_file` しているステップを検出する。severity: HIGH, layers: `['worker']`。
- [x] 7. 検出器 `READ-07 RAW_LOG_READ`: `transcript*.jsonl` や `.system_generated/logs` を `cat`, `read_file`, `jq` などで直接開いているステップを検出する。severity: HIGH, layers: `['auditor', 'planner', 'worker']`。
- [x] 8. 検出器 `READ-08 HEAVY_READ_TOP`: セッション内で読込行数・トークン量が上位 5 件の巨大ファイルを抽出し、統計情報として提示する。severity: INFO, layers: `['planner', 'worker']`。
- [x] 9. 検出器 `READ-09 READ_UNUSED`: ファイルを `read_file` したが、その後の会話、編集、サブエージェント指示のいずれにもファイル名やシンボルが現れなかった潜在的無駄読込を検出する。severity: LOW, layers: `['planner']`。
- [x] 10. 検出器 `READ-10 WORKER_EXPLORES`: Worker セッションにおいて、タスクファイルの Context Snippets に記載されていない外部ソースファイルを自前探索しているステップを検出する。severity: MED, layers: `['worker', 'task-design']`。
- [x] 11. `bun test ./.agents/scripts/__tests__/audit-detectors-reading.test.ts` が全件 PASS（11 pass）。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import type { AuditContext, Detector, Finding } from '../types';
```

### 3.2 Key Reference Pattern
```ts
// GENERIC ステップの content から総行数を抽出する正規表現
const LINES_REGEX = /Showing lines (\d+)-(\d+) of (\d+)/;
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: READ-01〜04 (スライス違反・重複読込)
- **対象ファイル**: `.agents/scripts/lib/audit/detectors/reading.ts`, テスト
- **Tasks**:
  - [x] 1. TDD 実装: `SMALL_SLICED`, `SEQ_SLICING`, `LARGE_FULL_BLIND`, `DUPLICATE_READ` の検出ロジックを作成。
  - [x] 2. 単体テスト PASS。

### Phase 2: READ-05〜07 (編集前生のりしろ・生ログ直接読込)
- **対象ファイル**: `.agents/scripts/lib/audit/detectors/reading.ts`, テスト
- **Tasks**:
  - [x] 1. TDD 実装: `EDIT_WITHOUT_RAW_READ`, `RTK_READ_BASIS`, `RAW_LOG_READ` の検出ロジックを作成。
  - [x] 2. 単体テスト PASS。

### Phase 3: READ-08〜10 (巨大読込Top5・無駄読込・Worker自前探索)
- **対象ファイル**: `.agents/scripts/lib/audit/detectors/reading.ts`, テスト
- **Tasks**:
  - [x] 1. TDD 実装: `HEAVY_READ_TOP`, `READ_UNUSED`, `WORKER_EXPLORES` の検出ロジックを作成。
  - [x] 2. 単体テスト PASS。

### Phase 4: Registry 登録と結合検証
- **対象ファイル**: `.agents/scripts/lib/audit/registry.ts`, テスト
- **Tasks**:
  - [x] 1. `DETECTORS` 配列に登録。
  - [x] 2. `bun run ai:audit c2ed8fa3-3d8b-44c6-bc2c-59b80300d362 --tree` を実行し、Step 55 (player-ghost-trajectory スライス) や Step 71 が `READ-01` / `READ-02` で的確に検知されることを確認。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `flash`
- **Reviewed At**: 2026-10-22
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ（10検出器の全件ユニットテスト完備、153 pass）
  - [x] 2. パフォーマンス（全 transcript レコードを効率的に1パス走査）
