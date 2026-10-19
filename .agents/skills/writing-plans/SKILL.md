---
name: writing-plans
description: 仕様や要件から、Worker（Flash）が推論なしで実装できる高解像度なタスクファイル（tasks/TASK-*.md）を作成するスキル
---

# Writing Plans (実装計画立案スキル)

## 概要 (Overview)

要件・仕様から詳細な実装計画（タスクファイル）を作成するためのスキルです。
推論能力の低い Worker エージェント（Flash モデル）でも手戻りなく迷わず実装作業に集中できるよう、対象ファイル、TypeScript 型シグネチャ、テストケース、検証手順を極小粒度で規定します。
Footics の「極限のトークン最適化」「4層分離パイプライン（Scout → Planner → Worker → Reviewer）」の設計思想に基づいています。

**開始時の宣言:** `📝 実装計画（TASKファイル）の作成を開始します。`

## 計画の保存先 (Single Source of Truth)

計画ファイルは必ず以下の場所に保存します：
- 保存先: `tasks/TASK-<連番>-<feature-name>.md` (例: `tasks/TASK-001-player-marker.md`)
- 連番は既存の `tasks/` を確認して決定します（001, 002 等）。

## 事前探索プロトコル (Exploration Protocol)

計画立案に必要な既存コードベースの調査には、以下の手順とツールを厳格に使用します：
1. **全体像把握**: `rtk read .agents/.cache/repo_summary.txt`（高レベル地図）
2. **シンボル・ファイル特定**: `bun run ai:find <キーワード>`（repo_map.txt から一発検索・次手ガイド付き）
3. **シグネチャ・型抽出**: `bun run ai:outline <ファイルパス>` で export シンボル・interface を最少トークン（90%削減）で抽出
4. **行・構造特定**: `rtk grep "<キーワード>" <ファイル>` または `ast-grep`
5. **使い捨て調査 (Scout) の活用**: 調査範囲が複数ファイルに及ぶ場合は、自前で読まず Scout サブエージェント（`TypeName: "scout"`）を起動して Context Snippets を抽出させ、回収後に即 kill すること。
※ 生の `ls`, `cat`, `grep`, `find`, `tree` などの直接実行は Hook により自動書き換えまたは遮断されます。

## タスク分割と指示の鉄則 (Task Right-Sizing)

1. **チケットの肥大化防止（厳守）**:
   - 変更ファイル目安5件以上、またはレイヤーが異なる場合は別タスク（TASK-001, TASK-002）に分離してください。
   - **上限制約**: 1タスクあたり **最大 5 Phase・250 行以内**（フック `task-size-guard` によりこれを超える追加は自動遮断されます）。
2. **Context-Ready 原則（Worker の探索ゼロ化）**:
   - Worker（Flashモデル）が外部ファイルを自前で Read / Grep 探索しなくて済むよう、実装に必要な **Import Specs、関連 Interface/Types、既存コードの参照パターン（抜粋）を必ず `## 3. Context Snippets` に明記** すること。
3. **Phase の本質定義**:
   - 開発工程（「型定義だけ」「テストだけ」）の分割ではなく、**「機能・サブシステムごとの完結した段階」** として分割します。
   - 各 Phase 内で Worker が単独で **TDD（テスト作成 ➔ 実装 ➔ スコープ検証）を一通り完結** させます。
4. **適切な指示粒度（What & Contract）**:
   - Worker には「具体的な契約とテスト期待値」を明確に提示します。行単位の擬似コードやCSSクラス名などの過剰なHowの手書きは不要です。
   - **Testing Strategy**: 具体的なテストファイルパスと入力・期待値を明記。
   - **契約 (Interface)**: 公開する型定義・関数シグネチャを明記。内部実装は Worker に委任します。

## TASK-*.md 正式テンプレート

タスクファイルは以下のフォーマットに**厳密に準拠**して生成してください（`bun run task:new <num> <slug>` で自動生成されます）：

```markdown
# TASK-XXX: [タイトル]

## 1. Metadata
- **Status**: `TODO` | `IN_PROGRESS` | `IN_REVIEW` | `REJECTED` | `DONE`
- **Created**: YYYY-MM-DD
- **Target Files**:
  - `src/.../target-a.ts` (NEW)
  - `src/.../target-b.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [ ] 要件1: [明確かつ客観的に検証可能な振る舞い]
- [ ] 要件2: [型定義や制約事項]

## 3. Context Snippets (参照コード・型定義・import)
<!-- Workerが自律探索（Read/Grep）を行わずに実装できるよう、必要な文脈を過不足なく事前注入する -->

### 3.1 Import Specs
\`\`\`ts
// 実装に必要なインポートパスの確定仕様
import type { SomeType } from '@/path/to/types';
import { someUtil } from '@/path/to/utils';
\`\`\`

### 3.2 Key Interfaces & Types
\`\`\`ts
// 参照・利用する主要な型定義
export interface TargetProps { ... }
\`\`\`

### 3.3 Reference Pattern (既存実装・テスト抜粋)
\`\`\`ts
// 類似コンポーネントや既存テストの書き方（3〜10行程度）
\`\`\`

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: [サブシステム名]
- **Worker Model**: `flash` | `flash_lite`
- **対象ファイル**: `src/.../service.ts`, `src/.../__tests__/service.test.ts`
- **契約 (Interface)**:
  \`\`\`ts
  export function doSomething(param: string): Promise<Result>;
  \`\`\`
- **Testing Strategy**: [テストファイルパス、入力と期待値]
- **Tasks**:
  - [ ] 1. TDD実装: `bun run ai:check:red <テストファイル>` ➔ 実装 ➔ `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:
  <!-- 確定したexportシンボルや注意点のみを1〜2行で記録 -->

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `flash`
- **Reviewed At**: YYYY-MM-DD HH:mm
- **Decision**: `TODO` | `LGTM` | `REJECTED`
- **Audit Checklist**:
  - [ ] 要件網羅性: Requirements の仕様が手抜きなくコードに実在するか（テストのハリボテ化がないか）
  - [ ] 境界と副作用: Level 2 core にホスト依存（chrome.*, Web専用ストア）の混入がないか、useEffectによるFlickerがないか
  - [ ] 設計負債防止: switch/ifの増殖（OCP違反）がなく、1ファイル250行以内に収まっているか
  - [ ] サイレント破壊防止: 指示外ファイルの変更や既存コード・テストの勝手な削除がないか
- **Summary**:
  <!-- 判定理由または改善指示を簡潔に記載 -->

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
### Fix 1 (YYYY-MM-DD)
- **Worker Model**: `flash`
- **Rejection Reason**: [不合格理由]
- **Target Files**: `対象ファイルパス`
- **Required Steps**:
  - [ ] 1. [具体的な修正指示]
  - [ ] 2. `bun run ai:check <ファイル>` で PASS 確認
```

## Planner 最終出力フォーマット

計画（`tasks/TASK-*.md`）の保存が完了したら、チャットへの最終出力を以下の**定型フォーマット**で出力し、ターンを終了してください：

```markdown
📝 **[PLANNING COMPLETE]**
タスクファイルを生成しました。内容を確認し、承認してください。
- **Task**: [TASK-XXX.md](file:///path/to/tasks/TASK-XXX.md)
- **Target**: `対象となる主なファイルパス`
```
