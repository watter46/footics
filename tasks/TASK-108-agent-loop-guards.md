# TASK-108: エージェント暴走防止（規約厳格化 + ポーリング／連続スライス物理遮断）

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-29
- **Source**: `ideas.md` Step 1・2
- **Target Files**:
  - `.agents/rules/agent-delegation.md` (MODIFY)
  - `.agents/rules/efficient-exploration.md` (MODIFY)
  - `.agents/hooks.json` (MODIFY)
  - `.agents/hooks/guard.ts` (MODIFY)
  - `.agents/hooks/guard.test.ts` (MODIFY)
  - `.agents/hooks/guard/transcript-calls.ts` (ADD)
  - `.agents/hooks/guard/transcript-calls.test.ts` (ADD)
  - `.agents/hooks/guard/subagent-guard.ts` (MODIFY)
  - `.agents/hooks/guard/subagent-guard.test.ts` (MODIFY)
  - `.agents/hooks/guard/view-filter.ts` (MODIFY)
  - `.agents/hooks/guard/view-filter.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `agent-delegation.md`: 5ファイル以上の Worker 一括投入（Fix のまとめ投げ含む）禁止・Phase ごとの検証/コミット義務・`manage_subagents list` ポーリング禁止を明記。
- [x] 2. `efficient-exploration.md`: 400行超ファイルの型確認は初手 `bun run ai:outline`、ページ送りスライス読込禁止を明記。
- [x] 3. `manage_subagents`(`Action: list`) が連続3回目で DENY。他ツール・`USER_INPUT`・`SYSTEM_MESSAGE` でリセット。`hooks.json` の `matcher` に `manage_subagents` を追加。
- [x] 4. 400行超ファイルへの連続範囲スライス読込が3回目で DENY（`ai:outline` を案内）。離れた範囲・小型ファイル・ログは対象外。
- [x] 5. `bun test ./.agents` が全 PASS（184 pass / 0 fail）。新規セッションでの実機検証5項目も期待どおり。

## 3. Context Snippets (型定義・既存コード・設計原則)
```typescript
// transcript-calls.ts
export interface RecordedToolCall { name: string; args: Record<string, any> }
export function cleanString(val: any): string;
export function parseLineNum(val: any): number | undefined;
export function getRecentToolCalls(transcriptPath?: string): RecordedToolCall[];

// subagent-guard.ts
export function checkSubagentPollGuard(payload: any): GuardDecision | null;
```
- 「連続」= 直近の `USER_INPUT` / `SYSTEM_MESSAGE` 以降のツール呼び出し列の末尾が同条件で続くこと。
- transcript の末尾が今回と同一の呼び出しなら、今回分が記録済みとみなして二重計上しない（スライス）。
- 全ロール適用。5ファイル丸投げ禁止は規約のみ（`invoke_subagent` はフック対象外）。

## 4. Implementation Phases

### Phase 1: ルール2本の追記
- **Worker Model**: Planner 直接実装（`.agents/**` は Worker 書込禁止）
- **対象ファイル**:
  - `.agents/rules/agent-delegation.md`
  - `.agents/rules/efficient-exploration.md`
- **Tasks**:
  - [x] 1. 5ファイル丸投げ禁止・ポーリング禁止・初手 `ai:outline`・連続スライス禁止を追記
- **Worker Handoff Log**:
  - 既存 frontmatter は変更なし。追記のみ。

### Phase 2: ポーリング遮断
- **Worker Model**: Planner 直接実装
- **対象ファイル**:
  - `.agents/hooks/guard/transcript-calls.ts` / `.test.ts`
  - `.agents/hooks/guard/subagent-guard.ts` / `.test.ts`
  - `.agents/hooks/guard.ts` / `.test.ts`
  - `.agents/hooks.json`
- **Tasks**:
  - [x] 1. 単体テスト作成（RED → GREEN）
  - [x] 2. 検証実行（`bun run ai:check` PASS）
- **Worker Handoff Log**:
  - `manage_subagents` の `Action` は transcript 上で `"\"list\""` と引用符付き。`cleanString` で除去して比較。

### Phase 3: 連続スライス遮断
- **Worker Model**: Planner 直接実装
- **対象ファイル**:
  - `.agents/hooks/guard/view-filter.ts` / `.test.ts`
- **Tasks**:
  - [x] 1. 単体テスト作成（RED → GREEN）
  - [x] 2. 検証実行（`bun run ai:check` PASS）
- **Worker Handoff Log**:
  - `cleanString` / `parseLineNum` は `transcript-calls.ts` へ移し、`view-filter.ts` は import に変更。小型ファイルの自動補正はスライス判定より先に実行される。

---

## 5. Reviewer Assessment (コード差分監査基準)
- **Reviewer Model**: `pro`
- **Decision**: `LGTM`
- **Reviewed At**: 2026-10-29 21:38
- **Summary**: manage_subagents ポーリング3連続および大型ファイル連続スライスの物理遮断、transcript-calls.ts による解析共通化、transcript 記録前後双方の二重計上防止、既存ガード（小型ファイル自動補正・6ファイル目遮断・send_message 遮断）との安全な共存を 4大定性監査で確認。
- **Audit Checklist**:
  - [x] 1. **要件合致**: ポーリング3連続・連続スライス3連続の遮断が受入要件どおりか。
  - [x] 2. **既存機能無欠陥**: 既存ガード（6ファイル目遮断・小型ファイル補正・send_message 遮断）が壊れていないか。
