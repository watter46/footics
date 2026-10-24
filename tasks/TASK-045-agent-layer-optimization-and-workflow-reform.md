# TASK-045: エージェント層の抜本最適化・ガード誤爆解消・ワークフロー＆対話改革

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-24
- **Executor**: **Planner 直接実装（重要：`.agents/**` は Worker の書込禁止スコープのため、Worker サブエージェントを起動せず、Planner 自身が直接 `edit_file` と `bun test ./.agents` を実行して全 Phase を実装・検証・コミットすること）**
- **Target Files**:
  - `.agents/hooks/guard/agent-access-guard.ts` (MODIFY)
  - `.agents/hooks/guard/agent-access-guard.test.ts` (MODIFY)
  - `.agents/hooks/guard/auditor-guard.ts` (MODIFY)
  - `.agents/hooks/guard/auditor-guard.test.ts` (MODIFY)
  - `.agents/hooks/guard/view-filter.ts` (MODIFY)
  - `.agents/hooks/guard/view-filter.test.ts` (MODIFY)
  - `.agents/hooks/guard.test.ts` (MODIFY)
  - `.agents/scripts/check-worker.ts` (MODIFY)
  - `.agents/agents/planner.md` (MODIFY)
  - `.agents/agents/worker.md` (MODIFY)
  - `.agents/agents/reviewer.md` (MODIFY)
  - `.agents/agents/scout.md` (MODIFY)
  - `.agents/agents/auditor.md` (MODIFY)
  - `.agents/rules/agent-delegation.md` (MODIFY)
  - `.agents/rules/agent-communication.md` (MODIFY)
  - `.agents/rules/efficient-exploration.md` (MODIFY)
  - `.agents/rules/plan-artifact.md` (MODIFY)
  - `.agents/skills/writing-plans/SKILL.md` (MODIFY)
  - `AGENTS.md` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. **ガード誤爆の根絶と Auditor 権限拡張**:
  - `agent-access-guard.ts`: `normalizeRelativePath` のフォールバック基準を `process.cwd()` からリポジトリルート（`path.resolve(__dirname, '../../../')`）に固定し、CWD ズレによる `.agents/src/...` 誤判定を解消する。また `role === 'auditor'` に対し `tasks/**` と `.agents/**` の編集を `allow`（`src/**`, `extension/**`, `tests/**` は `deny`）とする。
  - `auditor-guard.ts`: Auditor が `.agents` 編集後にテスト検証できるよう、`bun test`（`./.agents` 対象）および `bun run task:validate` を実行許可する。
  - `view-filter.ts`: ① `.system_generated/tasks/` 配下の `.log` 読込を 100行制限から除外して `allow` とする、② `hasRecentSliceRead`（連続スライス遮断）と `hasSequentialSingleViewLoop`（Reviewer 3連続読込遮断）を撤廃する、③ Planner の直接読込上限を 2ファイル（3件目遮断）から **5ファイル（6件目以降で遮断：`recentTargets.size >= 5`）** に緩和する。
- [x] 2. **機械検証の強化 (`check-worker.ts`)**:
  - `src/` 配下の非テスト `.tsx` ファイルで React Hooks（`useState`, `useEffect`, `useContext`, `useRef`, `useCallback`, `useMemo`, `useReducer`, `useStore`）を使用しているのに先頭（コメント除く）に `'use client'` がない場合、エラーで遮断する。
  - `src/features/tactical-unified/core/` 配下の非テストファイルが `@/features/tactical-unified/stores/tactical-unified-store` を値 import している場合、ホスト境界違反エラーで遮断する。
- [x] 3. **モデル階層適正化と並列・短時間ワークフローへの刷新**:
  - モデル設定を **Planner / Reviewer / Auditor = `pro`（または `inherit` で Argon High を継承、Reviewer の `Model: "flash"` ハードコードを完全撤廃）**、**Worker = `flash` / `flash_lite`**、**Scout = `flash_lite`** に統一する。
  - `planner.md` に Scout 起動時の `type: "SCOUT_REQUEST"` YAML テンプレートを明記し、5ファイル以下の調査は Planner 自前の並列読込、6ファイル以上のみ Scout（最大6ターン完了）へ委譲するルールに更新する。
  - 1〜4ファイルの変更は細切れ Phase リレーをせず 1 Worker で一気に完遂し、ファイル被りのない複数 Phase / Task は **同一ターン内で並列 `invoke_subagent(TypeName: "worker")`** する規定を `planner.md` と `agent-delegation.md` に組み込む。
  - `writing-plans/SKILL.md` から既存コード丸写しコピペを廃し、「対象パス＋変更契約シグネチャ＋注意点」のみの軽量仕様に改め、`worker.md` から不要な `agent-self-evaluation` と初回規約全読み指示を削除する。
- [x] 4. **用語の平易化・`caveman` 対話・完了サマリー＆目視確認手順の定着**:
  - `plan-artifact.md`: 「機能ケイパビリティ」「オーケストレーション」「ビルボード描画層」「インバリアント」等の難解カタカナ語・抽象表現を禁止し、平易な日本語（「機能の有効/無効設定」「選手・ボール描画エリア」等）で書くルールと言い換え表を追加する。
  - `AGENTS.md`, `agent-communication.md`, `planner.md`: ユーザー対話での `caveman`（結論最優先・前置き排除）適用と、実装完了サマリーを **「① 変更された内容（ファイル名や内部実装を省いたユーザー目線の変化）」「② 手動・目視での確認手順（画面・操作・期待結果）」の2項目のみ** で出力するテンプレートに統一する。
- [x] 5. `bun test ./.agents` の全テストが PASS すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs & Guard Modifications
```ts
// .agents/hooks/guard/agent-access-guard.ts
const REPO_ROOT = path.resolve(__dirname, '../../../');
export function normalizeRelativePath(targetFile: string, workspacePath?: string): string {
  const resolved = path.resolve(targetFile);
  const root = workspacePath ? path.resolve(workspacePath) : REPO_ROOT;
  if (resolved.startsWith(root)) return path.relative(root, resolved);
  return path.relative(REPO_ROOT, resolved);
}
// role === 'auditor' の書込判定（role === 'planner' と同じスコープに緩和）
if (role === 'auditor') {
  const isCode = relPath.startsWith('src/') || relPath.startsWith('extension/') || relPath.startsWith('tests/');
  if (isCode) {
    return {
      decision: 'deny',
      reason: `[GUARD] Access Denied: Auditor is prohibited from editing production/test code ('${relPath}'). Auditor's write scope is strictly limited to 'tasks/**' and '.agents/**'.`,
    };
  }
  return { decision: 'allow' };
}
```

### 3.2 Key Interfaces & Templates (完了サマリー & Scout Request)
```markdown
<!-- planner.md: Scout 起動プロトコル -->
---
type: "SCOUT_REQUEST"
---
以下の調査対象について、6ターン以内で対象ファイルパスと型シグネチャを抽出してください：
- [調査項目]

<!-- planner.md / agent-communication.md: 実装完了時のユーザー報告テンプレート -->
✅ **[実装完了] TASK-XXX: {タスク名}** (commit: `{hash}`)

### 1. 変更された内容（何が変わったか）
- {ファイル名や内部コードを出さず、ユーザー目線で変わった画面の挙動・機能を1行ずつ端的に記述}

### 2. 手動・目視での確認手順
1. **{確認対象の画面}** を開く
2. **{行う操作}**
3. **{期待される結果}** になっていればOK
（※目視確認が不要な内部改修のみの場合は「自動テストで検証済みのため目視確認は不要です」と1行記載）
```

### 3.3 Reference Pattern (`check-worker.ts` 境界・Directive 検査)
```ts
// Check D: Next.js 'use client' Directive Check for .tsx files using React Hooks
if (file.startsWith('src/') && file.endsWith('.tsx') && !/\.(test|spec)\.tsx$/.test(file)) {
  const usesReactHooks = /\b(useState|useEffect|useContext|useRef|useCallback|useMemo|useReducer|useStore)\b/.test(content);
  const hasUseClient = /^\s*(?:\/\*[\s\S]*?\*\/\s*|\/\/[^\n]*\n\s*)*['"]use client['"]/.test(content);
  if (usesReactHooks && !hasUseClient) {
    console.error(`[ERROR] Missing 'use client' directive in ${file} (uses React/Zustand hooks).`);
    hasError = true;
  }
}
// Check E: Level 2 Core Singleton Store Import Prohibition
if (file.includes('src/features/tactical-unified/core/') && !/\.(test|spec)\.[tj]sx?$/.test(file)) {
  if (/import\s+\{[^}]*\buseTacticalUnifiedStore\b[^}]*\}\s+from/.test(content)) {
    console.error(`[ERROR] Host boundary violation in ${file}: Level 2 core must not import useTacticalUnifiedStore directly.`);
    hasError = true;
  }
}
```

## 4. Implementation Phases (Planner 直接実装手順)

### Phase 1: Hook ガード誤爆根絶 ＆ Auditor `.agents/**` 編集権付与
- **Worker Model**: `flash` (Planner 直接実装)
- **対象ファイル**: `.agents/hooks/guard/agent-access-guard.ts`, `.agents/hooks/guard/agent-access-guard.test.ts`, `.agents/hooks/guard/auditor-guard.ts`, `.agents/hooks/guard/auditor-guard.test.ts`, `.agents/hooks/guard/view-filter.ts`, `.agents/hooks/guard/view-filter.test.ts`
- **Testing Strategy**:
  - `agent-access-guard.test.ts`: Auditor が `.agents/rules/foo.md` と `tasks/TASK-001.md` の編集は `allow`、`src/foo.ts` の編集は `deny` になることを検証。
  - `auditor-guard.test.ts`: Auditor が `bun test ./.agents` および `bun run task:validate` を実行した際に `null` (allow) になることを検証。
  - `view-filter.test.ts`: ① `.system_generated/tasks/task-1.log` の全文読込が `allow` になること、② 連続スライス読込や Reviewer の連続 `view_file` が遮断されないこと、③ Planner の調査読込が 5ファイル目まで `allow` で 6ファイル目で `deny` になることを検証。
- **Tasks**:
  - [x] 1. TDD実装: 各ガードテストを更新 ➔ ガード本体を実装 ➔ `bun test ./.agents` が全件 PASS することを確認
- **Worker Handoff Log**:
  - `REPO_ROOT` 基準化、Auditor の `.agents/**`・`tasks/**` 書込および `bun test ./.agents`・`task:validate` 実行許可、`view-filter.ts` のタスクログ許可・ループガード撤廃・Planner 5ファイル上限緩和を完了。

### Phase 2: 機械検証スクリプト強化 (`check-worker.ts`)
- **Worker Model**: `flash` (Planner 直接実装)
- **対象ファイル**: `.agents/scripts/check-worker.ts`
- **Testing Strategy**: `check-worker.ts` に Check D（`'use client'` 検査）と Check E（`core/` からの `useTacticalUnifiedStore` 値 import 禁止検査）を追加し、`bun run ai:check .agents/scripts/check-worker.ts` が PASS することを確認。
- **Tasks**:
  - [x] 1. TDD実装: `check-worker.ts` に Check D / Check E を追加 ➔ `bun run ai:check .agents/scripts/check-worker.ts` PASS
- **Worker Handoff Log**:
  - Check D（React Hooks 使用 `.tsx` の `'use client'` 検査）と Check E（`tactical-unified/core/` のシングルトンストア直接 import 禁止検査）を実装・検証完了。

### Phase 3: モデル階層適正化 (`pro` / `flash` / `flash_lite`) ＆ 並列・短時間ワークフロー刷新
- **Worker Model**: `flash` (Planner 直接実装)
- **対象ファイル**: `.agents/agents/planner.md`, `.agents/agents/worker.md`, `.agents/agents/reviewer.md`, `.agents/agents/scout.md`, `.agents/agents/auditor.md`, `.agents/rules/agent-delegation.md`, `.agents/rules/efficient-exploration.md`, `.agents/skills/writing-plans/SKILL.md`
- **Tasks**:
  - [x] 1. `planner.md`, `reviewer.md`, `auditor.md` の frontmatter を `model: pro` に更新し、`auditor.md` の `tools` に `write_file`, `edit_file` を追加（`.agents/**`・`tasks/**` 編集権を明記）。`scout.md` を `model: flash_lite` に変更。
  - [x] 2. `planner.md` と `agent-delegation.md` の Reviewer 起動指定を `Model: "pro"`（または `inherit`）に修正し、Scout の `type: "SCOUT_REQUEST"` テンプレート・5ファイル以下自前調査・6ファイル以上 Scout（6ターン制限）、および **非重複 Phase / Task の並列 Worker 起動・1〜4ファイル 1 Worker 完遂ルール** を反映。
  - [x] 3. `writing-plans/SKILL.md` を軽量仕様（既存コード丸写し廃止）に更新し、`worker.md` から `agent-self-evaluation` と Step 0 の規約読込指示を削除。
- **Worker Handoff Log**:
  - 全エージェント定義・委任規約・探索規約・計画スキルを新モデル階層（`pro`/`flash`/`flash_lite`）と並列・一括完遂ワークフローに刷新完了。

### Phase 4: 用語の平易化・`caveman` 対話・実装完了サマリー＆目視確認手順の定着
- **Worker Model**: `flash` (Planner 直接実装)
- **対象ファイル**: `.agents/rules/plan-artifact.md`, `.agents/rules/agent-communication.md`, `AGENTS.md`
- **Tasks**:
  - [x] 1. `plan-artifact.md` に難解カタカナ語（機能ケイパビリティ、オーケストレーション、ビルボード描画層、インバリアント等）の禁止と平易な日本語への言い換え表を追加。
  - [x] 2. `agent-communication.md`, `planner.md`, `AGENTS.md` にユーザー対話での `caveman` 適用と、新・実装完了サマリーフォーマット（①何が変わったか、②手動・目視での確認手順の2項目のみ）を反映し、`bun test ./.agents` 全体 PASS を確認。
- **Worker Handoff Log**:
  - 平易な日本語言い換え表、`caveman` 対話原則、2項目完了サマリーテンプレートを定着完了。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-24 11:38
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件1〜5の全網羅、`bun test ./.agents` の全テスト PASS
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: `check-worker.ts` による境界・`'use client'` 機械検査の動作
  - [x] 3. 設計負債 & 拡張性: 7重重複ルールの整理、ガード誤爆要因の除去
  - [x] 4. サイレント破壊 & 既存保護: Safety Guard や既存の正当なアクセス制御が維持されていること
- **Summary**: 全 Phase のガード改修・機械検証追加・モデル階層＆並列ワークフロー刷新・対話テンプレート統一が要件通り実装され、全テストが PASS していることを確認。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
