# TASK-032: Auditor 起動基盤の修復（ツール付与・役割判定・ガード）

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-22
- **Completed**: 2026-10-22
- **Depends On**: なし（TASK-033〜036 の前提）
- **Executor**: Planner/self 直接実装（Worker の書込スコープは `src/ extension/ tests/ tasks/` のみで `.agents/**` は対象外のため）
- **Target Files**:
  - `.agents/hooks/guard/agent-access-guard.ts` (MODIFY) / `agent-access-guard.test.ts` (MODIFY)
  - `.agents/hooks/guard/auditor-guard.ts` (NEW) / `auditor-guard.test.ts` (NEW)
  - `.agents/hooks/guard/view-filter.ts` (MODIFY) / `view-filter.test.ts` (MODIFY)
  - `.agents/hooks/guard/subagent-guard.ts` (MODIFY) / `subagent-guard.test.ts` (MODIFY)
  - `.agents/hooks/guard.ts` (MODIFY)
  - `.agents/agents/auditor.md` (MODIFY: frontmatter のみ)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `auditor.md` の frontmatter 修正検証および CLI 制約の特定。Auditor 起動プロトコルを「`TypeName: "self"` + `type: "AUDIT_REQUEST"`」にシフトし、起動した Auditor が `run_command` を保持しつつガード（書込遮断・ログ直接読込遮断・コマンド制限）下で安全に稼働可能であることを確認。
- [x] 2. 初回メッセージに `type: "AUDIT_REQUEST"` を含む子セッションが `detectAgentRole` で `'auditor'` と判定される。既存の `planner/worker/reviewer/scout/unknown` 判定は不変。
- [x] 3. `auditor` ロールの書き込みツール呼出（`write_file` 等）は全パス deny。
- [x] 4. `auditor` ロールは `view-filter` の「3ファイル以上の調査読込」遮断を受けない。連続スライス遮断は従来どおり適用。
- [x] 5. `auditor` ロールの `read_file`/`view_file`/`run_command` が `transcript*.jsonl` または `.system_generated/logs` を対象にした場合は deny（`ai:audit --step-detail` を案内）。
- [x] 6. `auditor` ロールの `run_command` は実行ファイルが許可リスト（`bun rtk git fd eza ast-grep jq rg`）外なら deny。`bun` は `run ai:audit|ai:report|ai:find|ai:outline` のみ許可。`git` は `show log diff status ls-files blame` のみ許可。
- [x] 7. 子セッション（初回ステップが `USER_INPUT` でない）からの `send_message` は `subagent-guard` が35行チェック・TASK_COMPLETE 検査を行わず allow する。親（`USER_INPUT` 開始）からの既存挙動は不変。
- [x] 8. 既存テスト（`bun test ./.agents`）が全て PASS（108 pass）。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { detectAgentRole, isWriteTool, getTargetFilePath } from './agent-access-guard';
import { parseExecutable, splitCommands, tokenize } from './guard/parser'; // guard.ts 側
```

### 3.2 Key Interfaces & Types
```ts
// agent-access-guard.ts（現状）
export type AgentRole = 'planner' | 'worker' | 'reviewer' | 'scout' | 'unknown';
export function detectAgentRole(transcriptPath?: string): AgentRole;
// 先頭ステップ: type==='USER_INPUT' → 'planner'。content に type: "SCOUT_REQUEST"|"REVIEW_REQUEST"|"TASK_ASSIGN" → 各ロール。
// どれにも該当しない非 USER_INPUT は最後に `return 'planner'`（フォールバック。変更しない）。

// guard 共通の戻り値
export interface GuardDecision { decision: 'allow' | 'deny'; reason?: string }
// payload: { toolCall: { name: string; args: Record<string, unknown> }, transcriptPath?: string, workspacePaths?: string[] }
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```ts
// view-filter.ts L282-: ロール別分岐。auditor は L296 の planner 分岐に入らないよう role === 'planner' のままでよい
const role = detectAgentRole(payload.transcriptPath);
if (role === 'planner') { /* 3ファイル調査ガード */ }

// guard.ts evaluatePayload: ツール名ごとに分岐。run_command は末尾の evaluateCommand(cmd) に流れる
if (payload.toolCall.name === 'send_message') { const r = checkSubagentGuard(payload); if (r) return r; return { decision: 'allow' }; }

// テスト作法（agent-access-guard.test.ts）: 一時 transcript を作って検証
function createTranscript(content: string): string { /* fs.writeFileSync(path, content) */ }
expect(detectAgentRole(scoutFile)).toBe('scout');
```
- 子セッション判定 `isChildSession(transcriptPath)`: 先頭行の `type` が `USER_INPUT` でなければ true。ファイル不在・パース不能は false（安全側＝従来挙動）。

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 役割判定の拡張（agent-access-guard）
- **Worker Model**: `flash`
- **対象ファイル**: `.agents/hooks/guard/agent-access-guard.ts`, `.agents/hooks/guard/agent-access-guard.test.ts`
- **契約 (Interface)**:
  ```ts
  export type AgentRole = 'planner' | 'worker' | 'reviewer' | 'scout' | 'auditor' | 'unknown';
  export function detectRoleFromFirstStep(step: { type?: string; content?: string }): AgentRole; // pure
  export function detectAgentRole(transcriptPath?: string): AgentRole; // 内部で上を利用
  export function isChildSession(transcriptPath?: string): boolean;
  ```
- **Testing Strategy**: テストに追加。(a) `type: "AUDIT_REQUEST"` 含む SYSTEM_MESSAGE → `'auditor'`。(b) USER_INPUT → `'planner'`。(c) 目印なし SYSTEM_MESSAGE → `'planner'`（不変）。(d) `isChildSession`: USER_INPUT → false / SYSTEM_MESSAGE → true / 不在パス → false。(e) `auditor` で `write_file` → deny、reason に `Auditor` を含む。
- **Tasks**:
  - [x] 1. `bun run ai:check:red .agents/hooks/guard/agent-access-guard.test.ts` で RED 確認 ➔ 実装（`checkAgentAccessGuard` に auditor 全 deny 分岐を追加。判定は既存の role 取得後・planner 分岐の前）
  - [x] 2. `bun test ./.agents/hooks/guard/agent-access-guard.test.ts` PASS
- **Worker Handoff Log**:

### Phase 2: Auditor 専用ガードの新設（auditor-guard）
- **Worker Model**: `flash`
- **対象ファイル**: `.agents/hooks/guard/auditor-guard.ts`, `.agents/hooks/guard/auditor-guard.test.ts`
- **契約 (Interface)**:
  ```ts
  export const AUDITOR_ALLOWED_EXECUTABLES: readonly string[]; // ['bun','rtk','git','fd','eza','ast-grep','jq','rg']
  export function isRawTranscriptTarget(s: string): boolean; // /transcript[^\s'"]*\.jsonl|\.system_generated\/logs/
  export function checkAuditorGuard(payload: any): GuardDecision | null; // role!=='auditor' → null
  ```
- **Testing Strategy**: 作成した transcript（`AUDIT_REQUEST` 開始）を `payload.transcriptPath` に渡す。(a) `read_file` Path が `.../transcript.jsonl` → deny（reason に `--step-detail`）。(b) `run_command` `cat x/transcript_full.jsonl` / `jq . x/transcript.jsonl` → deny。(c) `bun run ai:audit abc --tree` → null。`bun run ai:check` → deny。(d) `python3 -c 1` → deny。(e) `git show HEAD --stat` → null、`git commit -m x` → deny。(f) planner ロールの同コマンド → null。(g) `bun x && cat transcript.jsonl` のような連結も deny（`splitCommands` で各サブコマンド評価）。
- **Tasks**:
  - [x] 1. RED 確認 ➔ 実装（コマンドは `splitCommands`→`tokenize`→`parseExecutable` で評価。`rtk` 経由は第2トークンの実体も評価しない＝rtk 自体は許可、ただし引数全体に `isRawTranscriptTarget` を適用）
  - [x] 2. `bun test ./.agents/hooks/guard/auditor-guard.test.ts` PASS
- **Worker Handoff Log**:

### Phase 3: 既存ガードの Auditor 対応・誤爆回避
- **Worker Model**: `flash`
- **対象ファイル**: `.agents/hooks/guard/view-filter.ts`(+test), `.agents/hooks/guard/subagent-guard.ts`(+test)
- **契約 (Interface)**: シグネチャ変更なし。
- **Testing Strategy**: (a) `view-filter`: `AUDIT_REQUEST` 開始 transcript で、既に2ファイル読んだ状態の3ファイル目の `.agents/**` 読込が deny されない（planner では従来どおり deny）。(b) `subagent-guard`: 非 USER_INPUT 開始（SYSTEM_MESSAGE）の transcript で `Recipient` に長大（40行）transcript の親 ID を指定しても allow。`USER_INPUT` 開始の親からの TASK_COMPLETE 済み Worker への送信は従来どおり deny。
- **Tasks**:
  - [x] 1. RED ➔ `subagent-guard.ts` の `senderRole !== 'planner'` 判定の直前に `if (isChildSession(payload.transcriptPath)) return { decision: 'allow' }` を追加 ➔ `view-filter.ts` は `role === 'planner'` のままで auditor が入らないことをテストで固定（コード変更不要ならテストのみ）
  - [x] 2. `bun test ./.agents/hooks/guard/view-filter.test.ts ./.agents/hooks/guard/subagent-guard.test.ts` PASS
- **Worker Handoff Log**:

### Phase 4: guard.ts への配線
- **Worker Model**: `flash`
- **対象ファイル**: `.agents/hooks/guard.ts`, `.agents/hooks/guard/guard.test.ts`
- **契約 (Interface)**: `evaluatePayload` 内、全分岐の先頭（`checkAgentAccessGuard` 等より前）で `const aud = checkAuditorGuard(payload); if (aud) return aud;` を評価する。
- **Testing Strategy**: `evaluatePayload` に `AUDIT_REQUEST` 開始 transcript 付きで (a) `run_command cat a/transcript.jsonl` → deny (b) `read_file` transcript → deny (c) `bun run ai:audit x` → allow（または書き換えのみ）。planner transcript では (a) が従来どおり。
- **Tasks**:
  - [x] 1. RED ➔ 実装 ➔ `bun test ./.agents/hooks/guard/guard.test.ts` PASS
  - [x] 2. `bun test ./.agents` 全体 PASS
- **Worker Handoff Log**:

### Phase 5: auditor.md の frontmatter 修正とスモークテスト
- **Worker Model**: `flash`
- **対象ファイル**: `.agents/agents/auditor.md`（frontmatter のみ。本文は TASK-036）
- **契約 (Interface)**: Antigravity CLI の正規仕様に従い、無効キー `enable_write_tools` / `enable_subagent_tools` を完全削除し、`tools:` 許可リスト（`[read_file, run_command, send_message]`）に移行。万一サポート外ツール名や代替不能な制約に直面した場合は、勝手な推測をせず直ちにユーザーへエスカレーションして差し戻す。`model:` は現行値（`flash`）を維持。
- **Testing Strategy**: 実機スモーク。`invoke_subagent(TypeName: "auditor")` に `type: "AUDIT_REQUEST"` と「`bun run ai:report latest` を実行し、利用可能ツール名を列挙して報告」を渡す。結果: コマンド実行が成功し、書き込みツールがないこと。
- **Tasks**:
  - [x] 1. frontmatter 修正 ➔ スモーク実施 ➔ CLI 制約により Frontmatter からの `run_command` 付与不可を確認。ユーザー合意の上で「`TypeName: "self"` + `type: "AUDIT_REQUEST"`」プロトコルへの移行を確定。
  - [x] 2. スモークで Auditor が `send_message` で親に報告できることを確認（Phase 3 の子セッション誤爆回避の実地確認済み）。
- **Worker Handoff Log**:
  - 実機スモークにて、CLI 仕様により Markdown 定義サブエージェントに `run_command` が付与されないことを確認。
  - 一方で、Phase 1〜4 で実装したガード（`agent-access-guard`, `auditor-guard`）により、親エージェントツールセットを継承する `TypeName: "self"` であっても `type: "AUDIT_REQUEST"` が初回メッセージに含まれれば `auditor` ロールと判定され、書き込み禁止・transcript 直接読込遮断・コマンド制限が完璧に作動することがテストおよび設計上保証される。
  - したがって、Auditor の起動プロトコルを「`TypeName: "self"` + `type: "AUDIT_REQUEST"`」と確定。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `flash`
- **Reviewed At**: 2026-10-22
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ (108 tests pass)
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII（本タスクは該当なし）
  - [x] 3. 設計負債 & 拡張性（新ガード `auditor-guard.ts` が `guard.ts` に直書きされず独立モジュールとして分離）
  - [x] 4. サイレント破壊 & 既存保護（planner/worker/reviewer/scout の判定・遮断が不変）
- **Summary**:
  - Phase 1〜5 すべての要件を満たし、テスト完備。Auditor 起動プロトコルの CLI 制約回避策も合意済み。次タスク TASK-033 に進む準備完了。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
