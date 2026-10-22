# TASK-034: audit-session 探索妥当性検出器の実装 (EXP-01〜EXP-10)

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-22
- **Completed**: 2026-10-22
- **Depends On**: TASK-033（Finding モデル・Registry 基盤）
- **Executor**: Planner/self 直接実装
- **Target Files**:
  - `.agents/scripts/lib/audit/detectors/exploration.ts` (NEW)
  - `.agents/scripts/lib/audit/registry.ts` (MODIFY: 検出器登録)
  - `.agents/scripts/__tests__/audit-detectors-exploration.test.ts` (NEW)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. 検出器 `EXP-01 SCOUT_BYPASS`: Planner セッションで `invoke_subagent(scout)` を呼ばないまま、異なるソースコードファイル（`src/**` または `extension/**`）を 3 件以上 `read_file`/`view_file` している場合を検出する。severity: HIGH, layers: `['planner', 'rule']`。
- [x] 2. 検出器 `EXP-02 BAD_FIRST_MOVE`: Planner セッションの初動 3 ターン以内のツール呼出に `repo_summary.txt` の読込、`bun run ai:find`、`bun run ai:outline` のいずれも含まれず、漫然と生ファイル探索を行っている場合を検出する。severity: MED, layers: `['planner', 'rule']`。
- [x] 3. 検出器 `EXP-03 EXPLORE_SHARE`: 最初のコード編集・サブエージェント起動までの探索ターン数が全体の 30% を超えている場合を検出する。severity: MED, layers: `['planner']`。
- [x] 4. 検出器 `EXP-04 SERIAL_INDEPENDENT`: 互いに依存しない読み取り呼出（異なるファイルへの `read_file`）が 3 ステップ以上連続して 1 件ずつ単独発行されている場合を検出する。severity: LOW, layers: `['planner', 'worker']`。
- [x] 5. 検出器 `EXP-05 LINECOUNT_PUZZLE`: `wc -l` コマンドが、`read_file` 遮断の直後または読込の直前に実行されている迷走パターンを検出する。severity: MED, layers: `['planner', 'rule']`。
- [x] 6. 検出器 `EXP-06 GUESSED_PATH`: 存在しないファイルパスへの `read_file` や `cat` がガード等で遮断・エラーとなったステップを検出する。severity: LOW, layers: `['planner', 'worker']`。
- [x] 7. 検出器 `EXP-07 SCOPE_VIOLATION`: `ai:check` にディレクトリを指定している、または生の `vitest`, `biome check`, `tsc` を直接実行しているステップを検出する。severity: HIGH, layers: `['planner', 'worker']`。
- [x] 8. 検出器 `EXP-08 REPEAT_DENIAL`: 同じ種類のガード遮断を同一ファイル・同一コマンドで 2 回以上連続して受けたステップを検出する。severity: HIGH, layers: `['agent-def', 'hook']`。
- [x] 9. 検出器 `EXP-09 ROLE_VIOLATION`: 役割ごとの禁止行為（Planner の src 編集、Scout のファイル書込、Worker の許可外領域書込、Reviewer のコマンド実行）を検出する。severity: HIGH, layers: `['agent-def', 'hook']`。
- [x] 10. 検出器 `EXP-10 BLIND_REDO`: 同一コマンドの連続再実行（既存の `CommandInefficiency` ロジックを Finding 化）。severity: MED, layers: `['worker', 'script']`。
- [x] 11. `bun test ./.agents/scripts/__tests__/audit-detectors-exploration.test.ts` が全件 PASS（13 pass）。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import type { AuditContext, Detector, Finding } from '../types';
import { normalizeRelativePath } from '../../../../hooks/guard/agent-access-guard';
```

### 3.2 Key Interfaces & Types
```ts
// types.ts
export interface Finding {
  id: string;
  name: string;
  severity: Severity;
  sessionId: string;
  steps: number[];
  evidence: string;
  layers: SuspectLayer[];
}
```

### 3.3 Reference Pattern
```ts
export const detectScoutBypass: Detector = (ctx) => {
  if (ctx.role !== 'planner') return [];
  // 調査対象ファイルの読込カウント
  const readFiles = new Set<string>();
  let scoutInvoked = false;
  // ...
  return [];
};
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: EXP-01〜03 (初動・委譲・探索割合)
- **対象ファイル**: `.agents/scripts/lib/audit/detectors/exploration.ts`, テスト
- **Tasks**:
  - [x] 1. TDD 実装: `SCOUT_BYPASS`, `BAD_FIRST_MOVE`, `EXPLORE_SHARE` の検出ロジックを作成。
  - [x] 2. 単体テスト PASS。

### Phase 2: EXP-04〜06 (直列読込・行数パズル・推測パス)
- **対象ファイル**: `.agents/scripts/lib/audit/detectors/exploration.ts`, テスト
- **Tasks**:
  - [x] 1. TDD 実装: `SERIAL_INDEPENDENT`, `LINECOUNT_PUZZLE`, `GUESSED_PATH` の検出ロジックを作成。
  - [x] 2. 単体テスト PASS。

### Phase 3: EXP-07〜10 (スコープ・連続遮断・役割違反・再実行)
- **対象ファイル**: `.agents/scripts/lib/audit/detectors/exploration.ts`, テスト
- **Tasks**:
  - [x] 1. TDD 実装: `SCOPE_VIOLATION`, `REPEAT_DENIAL`, `ROLE_VIOLATION`, `BLIND_REDO` の検出ロジックを作成。
  - [x] 2. 単体テスト PASS。

### Phase 4: Registry への登録と結合テスト
- **対象ファイル**: `.agents/scripts/lib/audit/registry.ts`, テスト
- **Tasks**:
  - [x] 1. `DETECTORS` 配列に全 10 検出器を登録。
  - [x] 2. `bun run ai:audit c2ed8fa3-3d8b-44c6-bc2c-59b80300d362 --tree` に対して実行し、Step 55, 71, 157 等の異常が EXP 検出器で検知されることを確認。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `flash`
- **Reviewed At**: 2026-10-22
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ（各検出器に最低 1 ケース以上の境界テスト完備、142 pass）
  - [x] 2. 既存動作への後方互換性（既存テスト全件 PASS）
