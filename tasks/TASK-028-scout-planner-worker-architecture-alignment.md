# TASK-028: Scout/Planner/Workerの新アーキテクチャ・6大設計原則への適合

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-20
- **Target Files**:
  - `.agents/agents/scout.md` (MODIFY)
  - `.agents/agents/planner.md` (MODIFY)
  - `.agents/agents/worker.md` (MODIFY)
  - `.agents/skills/writing-plans/SKILL.md` (MODIFY)
  - `scripts/task/new-task.ts` (MODIFY)
  - `.agents/skills/test-driven-development/SKILL.md` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. Scout: 最新設計（Store Provider、レジストリ、4層モデル）を優先抽出し、古いアンチパターン（シングルトン直接参照等）の抽出を禁止するガードを追加
- [x] 2. Planner: 4層モデル、Store Provider、Shell Purity、OCP レジストリ、RAII 等をタスク仕様（契約・テスト戦略）に落とし込む設計指針を追加
- [x] 3. Worker: 制約事項に Store Provider 配下のシングルトン直接参照禁止（CRITICAL即時REJECTED）、Shell Purity、RAII クリーンアップ義務を明記
- [x] 4. Task Templates & Skills: `new-task.ts` と `writing-plans/SKILL.md` の Reviewer Checklist を最新 4大定性監査に同期し、`test-driven-development/SKILL.md` のコマンドを `ai:check` に修正
- [x] 5. 検証: `bun run task:validate` および `bun test scripts/task` が exit code 0 で通過すること

## 3. Context Snippets (参照コード・型定義・import)
<!-- Workerが自律探索（Read/Grep）を行わずに実装できるよう、必要な文脈を過不足なく事前注入する -->

### 3.1 Import Specs
```ts
// scripts/task/new-task.ts 関連
import { generateTaskScaffold } from '../new-task';
import { validateTaskFile } from '../validate-task';
```

### 3.2 Key Interfaces & Types
```ts
// Reviewer 4大定性監査項目（TASK-027 で確定）
// 1. 要件網羅性 & テスタビリティ
// 2. ホスト境界 & Store Provider & Zero-Flicker & RAII
// 3. 設計負債 & 拡張性 (OCP / SLAP / Shell Purity)
// 4. サイレント破壊 & 既存保護
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```markdown
Reviewer Assessment Audit Checklist:
1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: Scout プロンプト刷新
- **Worker Model**: `flash` (Planner 自己編集)
- **対象ファイル**: `.agents/agents/scout.md`
- **契約 (Interface)**:
  - 参照パターン抽出時の「最新設計優先・旧アンチパターン抽出防止」ガード
  - 4層モデル（Level 1〜4）および Store Provider / レジストリ構造の特定
- **Testing Strategy**: プロンプト構造の目視確認および構文整合性確認
- **Tasks**:
  - [x] 1. TDD実装: `.agents/agents/scout.md` を更新し最新設計抽出ガードを追加
- **Worker Handoff Log**:
  - Scout のプロンプトに最新設計の優先抽出と旧アンチパターン（シングルトン直接参照等）の抽出禁止ガードを追加完了。

---

### Phase 2: Planner プロンプト & writing-plans スキル刷新
- **Worker Model**: `flash` (Planner 自己編集)
- **対象ファイル**: `.agents/agents/planner.md`, `.agents/skills/writing-plans/SKILL.md`
- **契約 (Interface)**:
  - Planner オーケストレーションに「4層モデル・6大原則に基づくタスク設計指針」を注入
  - `writing-plans/SKILL.md` のテンプレートを最新 4大定性監査チェックリストに同期
- **Testing Strategy**: プロンプトおよびスキル文書の整合性確認
- **Tasks**:
  - [x] 1. TDD実装: `.agents/agents/planner.md` と `writing-plans/SKILL.md` を更新
- **Worker Handoff Log**:
  - Planner プロンプトと writing-plans スキルに 4層モデル・6大原則に基づくタスク設計指針および新4大監査項目を反映完了。

---

### Phase 3: Worker プロンプト & TDDスキル刷新
- **Worker Model**: `flash` (Planner 自己編集)
- **対象ファイル**: `.agents/agents/worker.md`, `.agents/skills/test-driven-development/SKILL.md`
- **契約 (Interface)**:
  - Worker 制約事項に「Store Provider シングルトン直参照禁止（CRITICAL）」、「Shell Purity」、「RAII クリーンアップ義務」を追加
  - TDDスキルの実行コマンドを `bun run ai:check` に修正
- **Testing Strategy**: プロンプトおよびスキル文書の整合性確認
- **Tasks**:
  - [x] 1. TDD実装: `.agents/agents/worker.md` と `test-driven-development/SKILL.md` を更新
- **Worker Handoff Log**:
  - Worker 制約事項に Store Provider シングルトン直参照禁止(CRITICAL)、Shell Purity、RAII義務を追加。TDDスキルのコマンド名を同期完了。

---

### Phase 4: タスク生成スクリプト同期 & 全体検証
- **Worker Model**: `flash` (Planner 自己編集)
- **対象ファイル**: `scripts/task/new-task.ts`
- **契約 (Interface)**:
  - `new-task.ts` の Reviewer Checklist を最新 4大定性監査に同期
- **Testing Strategy**: `bun test scripts/task` および `bun run task:validate`
- **Tasks**:
  - [x] 1. TDD実装: `scripts/task/new-task.ts` を修正し、テストおよびタスクバリデーションを実行
- **Worker Handoff Log**:
  - `new-task.ts` のテンプレートを新4大定性監査項目に同期。`bun test scripts/task` (10 tests) PASS。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `flash`
- **Reviewed At**: 2026-10-20 22:38
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  - Scout, Planner, Worker の各プロンプトおよび関連スキル・テンプレートを最新の4層アーキテクチャ・6大設計品質原則に完全同期。
  - `bun test scripts/task` (10 tests pass) および `task:validate` exit code 0 確認済み。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
