import * as fs from 'node:fs';
import * as path from 'node:path';

export interface TaskScaffoldOptions {
  id: string;
  slug: string;
  title?: string;
  tasksDir?: string;
  now?: Date;
}

export interface TaskScaffoldResult {
  filePath: string;
  fileName: string;
  content: string;
}

export function generateTaskScaffold(
  options: TaskScaffoldOptions,
): TaskScaffoldResult {
  const id = options.id.padStart(3, '0');
  const slug = options.slug;
  const title = options.title || slug;
  const fileName = `TASK-${id}-${slug}.md`;
  const tasksDir = options.tasksDir || path.join(process.cwd(), 'tasks');
  const targetPath = path.join(tasksDir, fileName);

  if (fs.existsSync(targetPath)) {
    throw new Error(
      `Task file already exists: ${path.relative(process.cwd(), targetPath)}`,
    );
  }

  const now = options.now || new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const template = `# TASK-${id}: ${title}

## 1. Metadata
- **Status**: \`TODO\`
- **Created**: ${today}
- **Target Files**:
  - \`src/.../target.ts\` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [ ] 1. [明確かつ客観的に検証可能な振る舞い]
- [ ] 2. [型定義や制約事項]

## 2.5 Architectural Invariants & Why (破壊禁止の前提と設計理由)
<!-- ちゃぶ台返し防止の前提条件と、影響を受ける呼び出し元（Consumers）の同期確認リストを明記する -->
- **Invariants (破壊禁止の不変条件と理由)**:
  1. [不変条件と設計上の理由（Why）]
- **Consumers (呼び出し元・別画面の同期確認リスト)**:
  - \`src/.../consumer.tsx\` — [シグネチャ・状態遷移の整合確認]

## 3. Context Snippets (参照コード・型定義・import)
<!-- Workerが自律探索（Read/Grep）を行わずに実装できるよう、必要な文脈を過不足なく事前注入する -->

### 3.1 Import Specs
\`\`\`ts
// 実装に必要なインポートパスの確定仕様
\`\`\`

### 3.2 Key Interfaces & Types
\`\`\`ts
// 参照・利用する主要な型定義
\`\`\`

### 3.3 Reference Pattern (既存実装・テスト抜粋)
\`\`\`ts
// 類似コンポーネントや既存テストの書き方（3〜10行程度）
\`\`\`

## 4. Implementation Phases (Worker 実装手順)
<!-- 1〜4ファイルは1 Phase一括、5ファイル以上は1 Phase最大4ファイル（テスト含め6ファイル）以下に分割、15ファイル超は連番タスク（TASK-XXXa, TASK-XXXb）に分割 -->

### Phase 1: [サブシステム名]
- **Worker Model**: \`flash\`
- **対象ファイル**: \`src/.../target.ts\`, \`src/.../__tests__/target.test.ts\`
- **契約 (Exact Contract & Formula)**:
  \`\`\`ts
  // 公開シグネチャおよび具体的な計算式・座標変換式・分岐条件（推論の余地を残さない）
  \`\`\`
- **Testing Strategy (Concrete Test Values)**: [テストファイルパス、具体的な入力値と期待出力値（例: input={x:10} ➔ expected={x:20}）]
- **Tasks**:
  - [ ] 1. TDD実装: \`bun run ai:check:red <テストファイル>\` ➔ 実装 ➔ \`bun run ai:check <対象ファイル>\` PASS
- **Worker Handoff Log**:
  <!-- 確定したexportシンボルや注意点のみを1〜2行で記録 -->

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: \`pro\`
- **Reviewed At**: 
- **Decision**: \`TODO\`
- **Audit Checklist**:
  - [ ] 1. ドメイン論理 & 要件網羅性 & テスタビリティ: 数式/座標/状態遷移の整合性、受入要件の全網羅、Concrete Test Values検証、ハック排除
  - [ ] 2. Invariants保護 & Consumer同期: Section 2.5 の不変条件（ちゃぶ台返し防止）遵守、別画面・呼び出し元（Consumers）の更新漏れゼロ
  - [ ] 3. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [ ] 4. 設計負債 & サイレント破壊防止: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、公開シグネチャ保護、指示外変更の排除
- **Summary**:
  <!-- 判定理由または改善指示を簡潔に記載 -->

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
`;

  if (!fs.existsSync(tasksDir)) {
    fs.mkdirSync(tasksDir, { recursive: true });
  }

  Bun.write(targetPath, template);

  return {
    filePath: targetPath,
    fileName,
    content: template,
  };
}

function printUsage() {
  console.log(`
Usage:
  bun run task:new <id> <slug> [title]

Examples:
  bun run task:new 010 inspector-refactor
  bun run task:new 011 player-radar-sync "選手レーダーチャート同期"
`);
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    printUsage();
    process.exit(1);
  }

  const rawId = args[0];
  const slug = args[1];
  const title = args[2] || slug;

  try {
    const result = generateTaskScaffold({
      id: rawId,
      slug,
      title,
    });
    console.log(`✅ Task scaffold generated successfully!`);
    console.log(`   File: tasks/${result.fileName}`);
    console.log(`   Link: file://${result.filePath}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`❌ Error: ${message}`);
    process.exit(1);
  }
}
