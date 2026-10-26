# TASK-063: 開発規約・設定ファイル・機械検証ガードレールのゼロベース強化

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-26
- **Target Files**:
  - `.agents/rules/coding-standards.md` (MODIFY)
  - `.agents/rules/component-architecture.md` (MODIFY)
  - `.agents/rules/data-access.md` (MODIFY)
  - `.agents/rules/testing-standards.md` (MODIFY)
  - `.agents/rules/react-nextjs.md` (NEW)
  - `AGENTS.md` (MODIFY)
  - `tsconfig.json` (MODIFY)
  - `biome.json` (MODIFY)
  - `.dependency-cruiser.cjs` (NEW)
  - `next.config.ts` (MODIFY)
  - `vitest.config.ts` (MODIFY)
  - `package.json` (MODIFY)
  - `.agents/scripts/lib/code-guardrails.ts` (NEW)
  - `.agents/guardrails-baseline.json` (NEW)
  - `.agents/scripts/check-worker.ts` (MODIFY)
  - `.agents/scripts/check-reviewer.ts` (MODIFY)
  - `scripts/lint/check-file-size.ts` (MODIFY)
  - `.agents/scripts/__tests__/code-guardrails.test.ts` (NEW)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `.agents/rules/` の全規約文書から未実装・架空のシンボル名を排除し、R1〜R12 の明確な判定基準と「禁止コード ⇔ 推奨コード」を整備する。
- [x] 2. データアクセス規約を実態（Dexie + TanStack Query + Zustand 3層モデル）に合わせ、コンポーネントファイル命名を `kebab-case.tsx`、ファイル行数上限を 300行に統一する。
- [x] 3. `tsconfig.json`、`biome.json`、`.dependency-cruiser.cjs`、`next.config.ts`（React Compiler）、`vitest.config.ts`（v8 カバレッジ）を強化する。
- [x] 4. 既存違反をベースライン（`.agents/guardrails-baseline.json`）として凍結し、新規違反や件数増加を `ai:check` / `ai:reviewer:check` で機械的に遮断する。
- [x] 5. 既存の技術的負債を解消するための分野別是正タスク（TASK-064〜TASK-068）を作成する。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import {
  loadGuardrailsBaseline,
  normalizeRepoPath,
  validateFileAgainstBaseline,
} from './lib/code-guardrails';
```

### 3.2 Key Interfaces & Types
```ts
export interface GuardrailsBaseline {
  maxLinesOver300: Record<string, number>;
  explicitAny: Record<string, number>;
  reactFc: string[];
  customEvent: string[];
  tacticalSingleton: string[];
  consoleLog: string[];
  deepRelativeImport: Record<string, number>;
  eslintDisable: string[];
  useClientViolations: string[];
  pascalCaseComponents: string[];
}
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```ts
const errs = validateFileAgainstBaseline(normFile, content, baseline);
expect(errs).toEqual([]);
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 規約文書群の全面改定と React 19 / Next.js 16 規約の新設
- **Worker Model**: `pro`
- **対象ファイル**: `.agents/rules/coding-standards.md`, `.agents/rules/component-architecture.md`, `.agents/rules/data-access.md`, `.agents/rules/testing-standards.md`, `.agents/rules/react-nextjs.md`, `AGENTS.md`
- **契約 (Interface)**:
  ```ts
  // R1〜R12 の禁止コード ⇔ 推奨コードおよび機械検証ルール定義
  ```
- **Testing Strategy**: 規約内のコマンド・シンボルがすべて実在することを確認。
- **Tasks**:
  - [x] 1. 規約改定と新規ルールファイル作成
- **Worker Handoff Log**:
  - R1〜R12 の禁止⇔推奨コード対比を整備し、未定義シンボル8件と非実在コマンドを排除。

### Phase 2: 設定ファイル群と開発依存パッケージの強化
- **Worker Model**: `pro`
- **対象ファイル**: `tsconfig.json`, `biome.json`, `.dependency-cruiser.cjs`, `next.config.ts`, `vitest.config.ts`, `package.json`
- **契約 (Interface)**:
  ```ts
  // ES2022, noFallthroughCasesInSwitch, noImplicitOverride, React Compiler, v8 coverage, depcruise rules
  ```
- **Testing Strategy**: `biome check`、`tsc --noEmit`、`depcruise` が exit code 0 で通過すること。
- **Tasks**:
  - [x] 1. 設定ファイル更新と `ai:check` 検証 PASS
- **Worker Handoff Log**:
  - `@testing-library/user-event`, `@vitest/coverage-v8@4.1.11`, `babel-plugin-react-compiler` を導入し `.dependency-cruiser.cjs` を新設。

### Phase 3: ベースライン凍結型ガードレール検証器と単体テストの実装
- **Worker Model**: `pro`
- **対象ファイル**: `.agents/scripts/lib/code-guardrails.ts`, `.agents/guardrails-baseline.json`, `.agents/scripts/check-worker.ts`, `.agents/scripts/check-reviewer.ts`, `scripts/lint/check-file-size.ts`, `.agents/scripts/__tests__/code-guardrails.test.ts`
- **契約 (Interface)**:
  ```ts
  export function validateFileAgainstBaseline(
    normFile: string,
    content: string,
    baseline: GuardrailsBaseline,
  ): string[];
  ```
- **Testing Strategy**: `bun test ./.agents/scripts/__tests__/code-guardrails.test.ts` で R1〜R11 の全遮断条件とベースライン許容条件を検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun test ./.agents/scripts/__tests__/code-guardrails.test.ts` ➔ `bun run ai:check` PASS
- **Worker Handoff Log**:
  - `code-guardrails.ts` と `.agents/guardrails-baseline.json` を実装し、8件のユニットテストが PASS。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-26
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  - 規約・設定・検証スクリプトの3層が一致し、ベースライン凍結により既存作業を止めずに新規違反を100%遮断できることを確認。
