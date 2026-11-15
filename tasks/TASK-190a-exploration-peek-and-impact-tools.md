# TASK-190a: 探索ツール刷新（ai:peek / ai:impact）と静的マップ完全廃止

- **Status**: `DONE`
- **Commit**: `refactor(agents): replace static repo map and ai:outline with ai:peek and ai:impact`
- **Execution Waves**:
  - Wave 1: Phase 1, Phase 2 (parallel — Planner 直接実装、Worker 委譲不可)
  - Wave 2: Phase 3 (sequential after Wave 1 — Planner 直接実装)
- **Negative Contracts**:
  - `absent: scripts/map/generate-repo-map.ts`
  - `absent: scripts/map/find-symbol.ts`
  - `absent: scripts/map/find-symbol.test.ts`
  - `absent: scripts/ast/extract-types.ts`
  - `absent: .agents/scripts/outline.ts`
  - `absent: .agents/scripts/__tests__/outline.test.ts`
  - `absent: .agents/.cache/repo_map.txt`
  - `absent: .agents/.cache/repo_summary.txt`
  - `rg(package.json): ai:find|ai:outline|"map":`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. **オンデマンド AST/参照照会への一本化**: 事前生成キャッシュ（`repo_map.txt`, `repo_summary.txt`）を廃止し、常に最新のファイルシステムと TS AST・`rg` から結果を得る。
  2. **出力サイズ上限によるトークン爆発防止**: `ai:peek` 全体出力が 250行を超える場合はファイル別サマリーへ自動縮退し、`ai:impact` のファイル別参照抜粋も件数上限で丸める。
  3. **権限境界による Planner 直接実装**: `.agents/**`・`scripts/**`・`package.json` は Worker が編集不可（`agent-access-guard.ts`）のため、本タスクは Planner 自身が直接実装・検証・削除する。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `outline.ts` は `peek.ts` へ統合置換し、旧ファイルと旧テストは物理削除する（フォールバック互換ラッパー禁止）。
  2. `peek.ts` は通常 `.ts`/`.tsx` の構造抽出に加え、`*.test.ts(x)` / `*.spec.ts(x)` の `describe` / `it` / `test` ブロック抽出、`file:Symbol` 単体抽出、250行超時の縮退サマリーを提供する。
  3. `impact.ts` は引数が実在ファイルパスならファイル基準分析、それ以外はシンボル基準分析を自動判別し、定義元・Consumers（`src/`, `extension/`）・関連テスト・内部 import を返す。
- **Consumers (同期更新対象)**:
  - `package.json`（scripts 定義）
  - `.agents/hooks/**`・`.agents/scripts/lib/audit/**`・`.agents/rules/**`（後続 `TASK-190b`, `TASK-190c` で同期更新）

## 2. Implementation Phases

### Phase 1: `ai:peek` スクリプト実装と `outline.ts` 統合置換
- **Target Files**:
  - `[ADD]` `.agents/scripts/peek.ts` (~320 lines)
  - `[ADD]` `.agents/scripts/__tests__/peek.test.ts` (~130 lines)
  - `[DELETE]` `.agents/scripts/outline.ts`
  - `[DELETE]` `.agents/scripts/__tests__/outline.test.ts`
- **Reference Files (Read-Only)**:
  - `.agents/scripts/outline.ts`
  - `.agents/scripts/__tests__/outline.test.ts`
- **Contract**:
  ```ts
  export const MAX_PEEK_OUTPUT_LINES = 250;

  export interface PeekOptions {
    symbol?: string;
    cwd?: string;
  }

  export function extractPeekFromSource(
    filePath: string,
    content: string,
    options?: PeekOptions,
  ): string;

  export function formatPeekOutput(
    filePaths: string[],
    options?: PeekOptions,
  ): string;
  ```
  - 振る舞い仕様・境界条件:
    1. 通常 `.ts`/`.tsx` ファイル: 内部 import（`@/` または `.`）、`interface`/`type`/`enum`/`function`/`class`/トップレベル `const` 関数・コンポーネント・フックを `[L開始-L終了]` 付きで出力し、関数本体は `{ ... }` へ折りたたむ。
    2. `*.test.ts(x)` / `*.spec.ts(x)`: AST 走査で `describe` / `it` / `test` のネスト階層をインデント＋`[L開始-L終了]`＋タイトル付きで抽出する（内部 import も出力）。
    3. `options.symbol`（CLI では `path:SymbolName` または第2引数）指定時: 該当トップレベル宣言（またはクラス、テストの `describe`/`it` タイトル一致）のソース本体を行番号付きで返す。未検出時は `[Not found: <symbol>]` を明記する。
    4. `formatPeekOutput`: 各ファイルの `extractPeekFromSource` 合計が 250行（`MAX_PEEK_OUTPUT_LINES`）を超える場合（ただし `symbol` 単体指定時を除く）、ファイル別のコンパクトサマリー（`=== <relPath> (<lines> lines) | symbols: <top symbols> ===`）へ縮退する。
    5. `collectTargetFiles`: ディレクトリ指定時は `.ts`/`.tsx`（テストファイル含む）を再帰収集する。
- **Concrete Test Cases**:
  - `.agents/scripts/__tests__/peek.test.ts`（純粋関数 I/O + tmpdir テスト、内部 `vi.mock` 禁止）:
    - `case 1`: 通常 `.tsx` の内部 import・型・`[L開始-L終了]` 抽出と `memo`/アロー関数本体折りたたみ
    - `case 2`: `*.test.ts` のネストされた `describe` / `it` / `test` のタイトルと `[L開始-L終了]` 抽出
    - `case 3`: `options.symbol` 指定時に該当宣言のソース本体行のみを返し、未存在シンボルは `[Not found:` を返すこと
    - `case 4`: 複数ファイル合計が 250行超となる場合に `formatPeekOutput` が縮退サマリー（`[TRUNCATED` ではなく各ファイルサマリー形式）を返すこと
- **Verification**:
  - `bun run ai:check .agents/scripts/peek.ts .agents/scripts/__tests__/peek.test.ts`

### Phase 2: `ai:impact` スクリプト実装
- **Target Files**:
  - `[ADD]` `.agents/scripts/impact.ts` (~300 lines)
  - `[ADD]` `.agents/scripts/__tests__/impact.test.ts` (~130 lines)
- **Reference Files (Read-Only)**:
  - `.agents/scripts/peek.ts`
- **Contract**:
  ```ts
  export interface ImpactDefinition {
    file: string;
    range: string;
    signature: string;
  }

  export interface ImpactConsumerRef {
    file: string;
    lines: string[];
    totalMatches: number;
  }

  export interface ImpactReport {
    target: string;
    mode: 'file' | 'symbol';
    definitions: ImpactDefinition[];
    internalImports: string[];
    consumers: ImpactConsumerRef[];
    relatedTests: string[];
  }

  export function analyzeImpact(
    target: string,
    options?: { cwd?: string; scopeDir?: string; maxRefsPerFile?: number },
  ): ImpactReport;

  export function formatImpactReport(report: ImpactReport): string;
  ```
  - 振る舞い仕様・境界条件:
    1. `target` が `cwd` 基準で実在ファイルの場合（`mode: 'file'`）: そのファイルの export シンボル一覧（`definitions`）と内部 import 一覧を TS AST で抽出し、モジュールパス（`@/path/to/mod` またはベース名 import）および主要 export シンボルを `rg` で `src/`・`extension/`（または `scopeDir`）から検索して `consumers` と `relatedTests` を収集する。
    2. `target` がシンボル名の場合（`mode: 'symbol'`）: `scopeDir` 未指定時は `['src', 'extension']`（存在しない場合は `['.']`）配下を `rg` で検索し、TS AST で宣言一致（`export` 優先＋トップレベル宣言）を `definitions` に記録し、定義ファイルの内部 import を取得する。
    3. `consumers` には定義自身とテストファイル（`*.test.*`, `*.spec.*`）を除外し、ファイルごとに最大 `maxRefsPerFile`（デフォルト 5）行を抜粋保持する。テストファイルの一致は `relatedTests` に分類する。
    4. `formatImpactReport`: 定義元・内部 import・Consumers（ファイル＋行番号抜粋）・関連テストをコンパクトに整形出力する。
- **Concrete Test Cases**:
  - `.agents/scripts/__tests__/impact.test.ts`（一時ディレクトリ実ファイル＋`rg` 実行 I/O テスト）:
    - `case 1`: シンボル名指定で定義元（`file` + `range` + `signature`）、`consumers`、関連テスト、内部 import が分離出力されること
    - `case 2`: 実在ファイルパス指定で export シンボル一覧、内部 import、逆参照ファイル、関連テストが出力されること
    - `case 3`: `maxRefsPerFile` を超える参照行が切り詰められ `totalMatches` が正確であること
- **Verification**:
  - `bun run ai:check .agents/scripts/impact.ts .agents/scripts/__tests__/impact.test.ts`

### Phase 3: `package.json` 更新と旧マップ群・キャッシュの物理削除
- **Target Files**:
  - `[MODIFY]` `package.json` (`scripts`, L19-L36)
  - `[DELETE]` `scripts/map/generate-repo-map.ts`
  - `[DELETE]` `scripts/map/find-symbol.ts`
  - `[DELETE]` `scripts/map/find-symbol.test.ts`
  - `[DELETE]` `scripts/ast/extract-types.ts`
  - `[DELETE]` `.agents/.cache/repo_map.txt`
  - `[DELETE]` `.agents/.cache/repo_summary.txt`
- **Reference Files (Read-Only)**:
  - `package.json`
- **Contract**:
  - `package.json` の `scripts` 更新仕様:
    1. `"ai:peek": "bun .agents/scripts/peek.ts"` を追加する。
    2. `"ai:impact": "bun .agents/scripts/impact.ts"` を追加する。
    3. `"ai:find"`, `"ai:outline"`, `"map"` を削除する。
  - `[DELETE]` 対象7ファイルを物理削除する（空になった `scripts/map/`, `scripts/ast/` ディレクトリも掃除してよい）。
- **Concrete Test Cases**:
  - `bun run ai:peek .agents/scripts/peek.ts` が exit code 0 で構造出力すること。
  - `bun run ai:impact analyzeImpact .agents/scripts` が exit code 0 で定義・テストを出力すること。
  - `bun run task:validate --verify-contracts tasks/TASK-190a-exploration-peek-and-impact-tools.md` が PASS すること。
- **Verification**:
  - `bun run ai:check package.json && bun test ./.agents`
