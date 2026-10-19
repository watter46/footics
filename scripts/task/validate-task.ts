import * as fs from 'node:fs';
import * as path from 'node:path';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  taskPath: string;
}

export function validateTaskFile(filePath: string): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    taskPath: filePath,
  };

  if (!fs.existsSync(filePath)) {
    result.valid = false;
    result.errors.push(`File not found: ${filePath}`);
    return result;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // 1. 必須セクションの存在確認
  const requiredSections = [
    { title: 'Metadata', regex: /^##\s+1\.\s+Metadata/m },
    { title: 'Requirements', regex: /^##\s+2\.\s+Requirements/m },
    { title: 'Context Snippets', regex: /^##\s+3\.\s+Context Snippets/m },
    {
      title: 'Implementation Phases',
      regex: /^##\s+4\.\s+Implementation Phases/m,
    },
    {
      title: 'Reviewer Assessment',
      regex: /^##\s+5\.\s+Reviewer (Assessment|Checklist)/m,
    },
  ];

  for (const sec of requiredSections) {
    if (!sec.regex.test(content)) {
      result.errors.push(
        `[Format Error] Missing required section: '## ${sec.title}'. Custom or unstructured formats are strictly prohibited.`,
      );
    }
  }

  // 2. Metadata.Status の取得
  const statusMatch = content.match(/-\s+\*\*Status\*\*:\s*`?([A-Z_]+)`?/i);
  const status = statusMatch ? statusMatch[1].toUpperCase() : null;

  if (!status) {
    result.errors.push(
      `[Metadata Error] Missing or invalid Status in '## 1. Metadata' (e.g. - **Status**: \`TODO\`)`,
    );
  }

  // 3. Reviewer Decision の取得
  const decisionMatch = content.match(
    /-\s+\*\*(Decision|Status)\*\*:\s*`?([A-Z_]+)`?/i,
  );
  // セクション5以降で Decision を探索
  const reviewerSectionIndex = content.search(/^##\s+5\.\s+Reviewer/m);
  let reviewerDecision: string | null = null;
  if (reviewerSectionIndex !== -1) {
    const reviewerSub = content.slice(reviewerSectionIndex);
    const revMatch = reviewerSub.match(
      /-\s+\*\*(Decision|Status)\*\*:\s*`?([A-Z_]+)`?/i,
    );
    if (revMatch) {
      reviewerDecision = revMatch[2].toUpperCase();
    }
  }

  // 4. チェックボックスの集計
  const uncheckedMatches: { line: number; text: string }[] = [];
  lines.forEach((line, idx) => {
    // Rejections セクション（未着手修正指示）以外の - [ ] を検出
    if (/^\s*-\s+\[\s\]/.test(line)) {
      uncheckedMatches.push({ line: idx + 1, text: line.trim() });
    }
  });

  // 5. ステータス整合性の検証
  if (status === 'DONE') {
    // A. DONE なのに未完了チェックボックスがある
    if (uncheckedMatches.length > 0) {
      result.errors.push(
        `[Inconsistency] Status is marked as 'DONE', but found ${uncheckedMatches.length} unchecked item(s):\n` +
          uncheckedMatches
            .map((m) => `    Line ${m.line}: ${m.text}`)
            .join('\n'),
      );
    }

    // B. DONE なのに Reviewer Decision が LGTM でない
    if (reviewerDecision !== 'LGTM') {
      result.errors.push(
        `[Inconsistency] Status is 'DONE', but Reviewer Decision is '${reviewerDecision ?? 'NOT SET'}' (expected: 'LGTM').`,
      );
    }
  } else if (status === 'IN_REVIEW') {
    // レビュー中の場合、全 Phase の Tasks が完了しているか確認
    const phaseTasksUnchecked = uncheckedMatches.filter(
      (m) => m.text.includes('TDD') || m.text.includes('ai:check'),
    );
    if (phaseTasksUnchecked.length > 0) {
      result.warnings.push(
        `Status is 'IN_REVIEW', but some Phase tasks are not checked yet (Lines: ${phaseTasksUnchecked.map((m) => m.line).join(', ')}).`,
      );
    }
  }

  // 6. Reviewer Decision が LGTM なのに Status が TODO / IN_PROGRESS の不整合
  if (reviewerDecision === 'LGTM' && status !== 'DONE') {
    result.errors.push(
      `[Inconsistency] Reviewer Decision is 'LGTM', but Metadata Status is still '${status}' (must be updated to 'DONE').`,
    );
  }

  // 7. Phase の Handoff Log チェック
  const phaseHeaders = content.match(/###\s+Phase\s+\d+:/g) || [];
  if (status === 'DONE' && phaseHeaders.length > 0) {
    const handoffMatches =
      content.match(/-\s+\*\*Worker Handoff Log\*\*:\s*([^\n]*)/g) || [];
    if (handoffMatches.length < phaseHeaders.length) {
      result.warnings.push(
        `Expected ${phaseHeaders.length} Worker Handoff Log entries, but found ${handoffMatches.length}.`,
      );
    }
  }

  result.valid = result.errors.length === 0;
  return result;
}

// CLI 実行時
if (import.meta.main) {
  let targetFile = process.argv[2];

  if (!targetFile) {
    // tasks/ 配下の最新ファイルを自動特定
    const tasksDir = path.join(process.cwd(), 'tasks');
    if (!fs.existsSync(tasksDir)) {
      console.error(`❌ Tasks directory not found: ${tasksDir}`);
      process.exit(1);
    }

    const files = fs
      .readdirSync(tasksDir)
      .filter((f) => f.startsWith('TASK-') && f.endsWith('.md'))
      .map((f) => ({
        name: f,
        mtime: fs.statSync(path.join(tasksDir, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length === 0) {
      console.error(`❌ No task files found in tasks/`);
      process.exit(1);
    }

    targetFile = path.join('tasks', files[0].name);
    console.log(`ℹ️ No target specified. Validating latest task: ${targetFile}`);
  }

  const result = validateTaskFile(targetFile);

  console.log(`\n📋 === Task Validation Report ===`);
  console.log(`File: ${result.taskPath}`);

  if (result.warnings.length > 0) {
    console.log(`\n⚠️ Warnings (${result.warnings.length}):`);
    result.warnings.forEach((w) => {
      console.log(`  - ${w}`);
    });
  }

  if (!result.valid) {
    console.log(`\n❌ Validation FAILED (${result.errors.length} error(s)):`);
    result.errors.forEach((e) => {
      console.log(`  - ${e}`);
    });
    console.log(`\nAction: Fix the task file before proceeding or committing.`);
    process.exit(1);
  } else {
    console.log(
      `\n✅ Task validation PASSED. All checklist and status contracts are consistent.`,
    );
    process.exit(0);
  }
}
