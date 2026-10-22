# TASK-033: audit-session 基盤拡張（Finding モデル・子セッション再帰集計・インフラ検出器・step-detail）

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-22
- **Completed**: 2026-10-22
- **Depends On**: TASK-032 Phase 1（`detectRoleFromFirstStep` を利用）
- **Executor**: Planner/self 直接実装（`.agents/**` は Worker 書込スコープ外）
- **Target Files**:
  - `.agents/scripts/lib/audit/types.ts` (NEW)
  - `.agents/scripts/lib/audit/registry.ts` (NEW)
  - `.agents/scripts/lib/audit/render.ts` (NEW)
  - `.agents/scripts/lib/audit/tree.ts` (NEW)
  - `.agents/scripts/lib/audit/step-detail.ts` (NEW)
  - `.agents/scripts/lib/audit/detectors/infra.ts` (NEW)
  - `.agents/scripts/audit-session.ts` (MODIFY)
  - `.agents/scripts/__tests__/audit-foundation.test.ts` (NEW) / `audit-session.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `Finding`（id / severity / sessionId / steps / evidence / layers）と `Detector`（`(ctx) => Finding[]`）の型があり、`runDetectors` が登録済み検出器を順に実行して severity 降順で返す。検出器の追加は配列への登録のみ（OCP）。
- [x] 2. `detectHookDenials` が `status === 'DONE'` のステップ（ファイル内容や `cat` 出力に `[GUARD]` が含まれるだけのもの）を遮断として数えない。`status: 'ERROR'` かつ `tool call denied by pre-tool hook` を含むものは数える。status 未設定の既存テストは従来どおり通る。
- [x] 3. `findChildSubagentIds` が `Created the following subagent:`（単数）と `subagents:`（複数）の両方から ID を抽出する。
- [x] 4. `collectSessionTree(rootId, { maxDepth: 3 })` が子の子まで再帰し、循環・重複 ID を無視し、存在しない transcript はスキップする。
- [x] 5. 検出器 `INFRA-01 TOOL_MISSING`: 役割が worker/auditor のセッションで、必須ツール（worker: `run_command|edit_file|write_file` のいずれか／auditor: `run_command`）が1回も呼ばれておらず、かつ `TASK_BLOCKED` または thinking/content に「ツールがない」旨（`/(no|lack|missing|ない|欠落|見当たらない).{0,30}(tool|ツール)|(tool|ツール).{0,30}(not available|ない|欠落|見当たらない)/i`）がある → HIGH。条件の前半のみ該当は MED。layers: `['agent-def']`。
- [x] 6. 検出器 `INFRA-02 HOOK_ROLE_MISMATCH`: (a) 遮断文言の主語ロール（`Planner|Scout|Worker|Reviewer is prohibited|is a read-only|can only modify`）がセッションの検出ロールと不一致、または (b) `Worker '<id>'`（reuse prohibited / context limit exceeded）の `<id>` が当該セッションの子 ID に含まれない → HIGH。layers: `['hook']`。
- [x] 7. 検出器 `INFRA-03 UNEXPANDED_TEMPLATE`: 遮断ステップ（ERROR）の content に `${識別子}` が残存 → LOW。layers: `['hook']`。
- [x] 8. `bun run ai:audit --step-detail <id> <start>[:<end>]` が `transcript_full.jsonl`（無ければ `transcript.jsonl`）から指定範囲（最大10ステップ）の type/status/時刻、tool_calls の args（各600文字まで）、content（1500文字まで）、thinking（400文字まで）を出力する。
- [x] 9. `bun run ai:audit <id> --tree` が親＋全子孫の AuditReport と Findings を出力し、末尾に TREE SUMMARY（セッション数・合計ターン・合計 Duration・合計 Denials・severity 別 Findings 件数）を出す。`--json` は `{ reports, findings }` を返す。親の role ラベルが `detectRoleFromFirstStep` 由来になる（USER_INPUT 開始は `Planner / Coordinator`）。
- [x] 10. 既存の `audit-session.test.ts` を含む `bun test ./.agents` が全て PASS（129 pass）。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import type { TranscriptRecord, AuditReport } from '../../audit-session'; // type-only（循環回避）
import { detectRoleFromFirstStep, type AgentRole } from '../../../hooks/guard/agent-access-guard';
import * as fs from 'node:fs'; import * as path from 'node:path';
```

### 3.2 Key Interfaces & Types
```ts
// audit-session.ts（現状・export 済み）
export interface TranscriptRecord { step_index: number; type: string; source?: string; status?: string;
  content?: string; thinking?: string; created_at?: string;
  tool_calls?: Array<{ name: string; args: Record<string, unknown> }>; }
export function parseJsonl(text: string): TranscriptRecord[];
export function brainDir(): string;                       // env BRAIN_DIR 優先
export function resolveTranscript(arg: string | undefined): string | null; // .../<id>/.system_generated/logs/transcript.jsonl
export function detectHookDenials(records: TranscriptRecord[]): HookDenial[]; // L162-217。isDenied は content.includes('tool call denied by pre-tool hook' | '[GUARD]' | '[GATEGUARD]') && r.type==='GENERIC'
export function findChildSubagentIds(records: TranscriptRecord[], fromStep = 0): string[]; // L362-。'Created the following subagents:' のみ一致（バグ）。idRegex: /"conversationId":\s*"([^"]+)"/g
export function auditSession(records, options?): AuditReport; // L401-。role は簡易推定（L449-）
export function main(argv: string[]): number;              // --compare / --steps / --tree / --json / --from-request

// 新規（types.ts）
export type Severity = 'HIGH' | 'MED' | 'LOW' | 'INFO';
export type SuspectLayer = 'planner' | 'worker' | 'scout' | 'reviewer' | 'auditor' | 'agent-def' | 'hook' | 'rule' | 'script' | 'task-design';
export interface Finding { id: string; name: string; severity: Severity; sessionId: string; steps: number[]; evidence: string; layers: SuspectLayer[] }
export type SessionRole = AgentRole | 'child';
export interface AuditContext { sessionId: string; records: TranscriptRecord[]; role: AgentRole; childIds: string[] }
export type Detector = (ctx: AuditContext) => Finding[];
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```ts
// 実 transcript の形（確認済み）
// 子起動結果: { type:'GENERIC', content:'...Created the following subagent:\n{\n  "conversationId":  "<uuid>",...' }
// 遮断: { type:'GENERIC', status:'ERROR', content:'...Encountered error in step execution: tool call denied by pre-tool hook: [GUARD] ...' }
// 正常な read 結果: { type:'GENERIC', status:'DONE', content:'...Showing lines 1-98 of 98\n1: ...' }
// ツール呼出: { type:'PLANNER_RESPONSE', tool_calls:[{ name:'read_file', args:{ Path:'"/abs/x.ts"', StartLine:'1', EndLine:'100' } }] }  // 値は文字列で外側に引用符が付く
import { describe, expect, test } from 'bun:test';
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: Finding モデル・レジストリ・レンダラ
- **Worker Model**: `flash`
- **対象ファイル**: `lib/audit/types.ts`, `registry.ts`, `render.ts`, `__tests__/audit-foundation.test.ts`
- **契約 (Interface)**:
  ```ts
  export const DETECTORS: Detector[];                         // registry.ts（初期は空配列＋infra を後続 Phase で登録）
  export function runDetectors(ctx: AuditContext, detectors?: Detector[]): Finding[]; // severity 降順（HIGH>MED>LOW>INFO）、同順位は steps[0] 昇順
  export function renderFindings(findings: Finding[]): string; // 1件1行: `[HIGH] INFRA-01 TOOL_MISSING session=cef39316 steps=3,5 layers=agent-def :: <evidence 160文字まで>`
  ```
- **Testing Strategy**: ダミー検出器2つ（HIGH/LOW）の並び、0件時 `(No findings)`、evidence 切り詰めを検証。
- **Tasks**:
  - [x] 1. `bun run ai:check:red .agents/scripts/__tests__/audit-foundation.test.ts` ➔ 実装 ➔ PASS
- **Worker Handoff Log**:
  - `types.ts`, `registry.ts`, `render.ts` を作成。TDD により severity 降順・steps 昇順ソートおよびフォーマット出力を検証完了。

### Phase 2: 遮断検出の偽陽性修正・子 ID 抽出・再帰ツリー
- **Worker Model**: `flash`
- **対象ファイル**: `audit-session.ts`（`detectHookDenials`, `findChildSubagentIds`）, `lib/audit/tree.ts`, テスト
- **契約 (Interface)**:
  ```ts
  export function collectSessionTree(rootId: string, opts?: { maxDepth?: number }): Array<{ sessionId: string; depth: number; records: TranscriptRecord[] }>;
  ```
- **Testing Strategy**: (a) `status:'DONE'` で content に `[GUARD]` を含む GENERIC → denials 0件。(b) ERROR＋`denied by pre-tool hook` → 1件。(c) 単数形 `subagent:` ・複数形の両方から ID 抽出。(d) `BRAIN_DIR` を一時ディレクトリにし、親→子→孫の transcript を作って depth 順に3件返る／循環（子が親 ID を再掲）で無限ループしない。
- **Tasks**:
  - [x] 1. RED ➔ 実装（正規表現を `/Created the following subagents?:/`、isDenied に `r.status !== 'DONE'` を AND）➔ PASS
- **Worker Handoff Log**:
  - `detectHookDenials` の `status === 'DONE'` スキップにより偽陽性を根絶。
  - `findChildSubagentIds` で単数・複数の両対応。
  - `collectSessionTree` で再帰 BFS 走査・循環ガードを実装。

### Phase 3: インフラ検出器（INFRA-01/02/03）
- **Worker Model**: `flash`
- **対象ファイル**: `lib/audit/detectors/infra.ts`, `registry.ts`（登録）, テスト
- **契約 (Interface)**:
  ```ts
  export const detectToolMissing: Detector;        // INFRA-01
  export const detectHookRoleMismatch: Detector;   // INFRA-02
  export const detectUnexpandedTemplate: Detector; // INFRA-03
  ```
- **Testing Strategy**: (a) first step に `TASK_ASSIGN`、tool_calls は `view_file` のみ、thinking に「コマンド実行ツールが見当たらない」→ HIGH。同条件で thinking 無し→ MED。`run_command` 実行済み→ 0件。(b) planner セッションの ERROR 遮断に `Scout is a read-only` → mismatch。`Worker 'zzz' ... context limit exceeded` で zzz が childIds に無い → HIGH、有る → 0件。(c) ERROR 遮断 content に `('${relPath}')` → LOW。
- **Tasks**:
  - [x] 1. RED ➔ 実装・登録 ➔ PASS
- **Worker Handoff Log**:
  - INFRA-01 (TOOL_MISSING), INFRA-02 (HOOK_ROLE_MISMATCH), INFRA-03 (UNEXPANDED_TEMPLATE) を実装し `DETECTORS` レジストリに登録完了。

### Phase 4: step-detail
- **Worker Model**: `flash`
- **対象ファイル**: `lib/audit/step-detail.ts`, `audit-session.ts`（フラグ配線）, テスト
- **契約 (Interface)**:
  ```ts
  export function renderStepDetail(records: TranscriptRecord[], range: { start: number; end: number }): string; // 最大10ステップ。超過は末尾に `(clamped to 10 steps)`
  export function resolveFullTranscript(arg: string): string | null; // transcript_full.jsonl 優先
  ```
- **Testing Strategy**: 長大 content が1500文字で切られ `…(+N chars)` が付く。範囲外はエラー文言。13ステップ指定で10件に clamp。
- **Tasks**:
  - [x] 1. RED ➔ 実装 ➔ PASS
- **Worker Handoff Log**:
  - `resolveFullTranscript` による `transcript_full.jsonl` 優先解決および `renderStepDetail` による clamp / 文字数制限を実装完了。

### Phase 5: CLI 統合（--tree 集計・Findings・role ラベル）
- **Worker Model**: `flash`
- **対象ファイル**: `audit-session.ts`（`main`, `auditSession` の role 推定）, テスト
- **契約 (Interface)**: `--tree` 時は `collectSessionTree` を使用。`AuditReport` に影響を与えず、Findings は `main` 側で `runDetectors` を適用して付与。
- **Testing Strategy**: 一時 `BRAIN_DIR` に親＋子（TOOL_MISSING 条件を満たす）を置き `main(['<id>','--tree'])` の標準出力に `TREE SUMMARY` と `INFRA-01` が含まれる。`--json` が `reports`/`findings` を持つ。親の role が `Planner / Coordinator`。
- **Tasks**:
  - [x] 1. RED ➔ 実装 ➔ `bun test ./.agents` 全体 PASS ➔ 実セッションで `bun run ai:audit c2ed8fa3-3d8b-44c6-bc2c-59b80300d362 --tree` を実行し、Denials が 4 件（Step 55/71/157/177）、子が 9 件取得されることを確認し Handoff Log に記録
- **Worker Handoff Log**:
  - 実セッション `c2ed8fa3-3d8b-44c6-bc2c-59b80300d362` に対する実測完了：
    - 親セッション: Turns=124, Duration=797s, Denials=4件 (Step 55, 71, 157, 177)
    - 取得された子セッション: 9件
    - TREE SUMMARY: Sessions=10, Total Turns=585, Duration=3734s, Total Denials=26件, Findings: HIGH=5, MED=0, LOW=2, INFO=0

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `flash`
- **Reviewed At**: 2026-10-22
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ（実 transcript 形式に基づくテスト完備、129 pass）
  - [x] 2. ホスト境界（該当なし）
  - [x] 3. 設計負債 & 拡張性（検出器が registry 登録式で `audit-session.ts` に直書きされていない、OCP 厳守）
  - [x] 4. サイレント破壊 & 既存保護（既存 export のシグネチャ不変、`--compare`/`--steps` 不変）
- **Summary**:
  - TASK-033 の全 Phase が受入要件を満たし、実機検証（実セッション c2ed8fa3 監査）でも期待通りの結果（Denials 4件、子9件、INFRA-01/02/03 抽出）を確認。LGTM。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
