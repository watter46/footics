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

  // 7. Phase の Handoff Log チェック & V2 タスク構成チェック (250行制限撤廃・1 Phase 最大6ファイル上限)
  const phaseHeaders = content.match(/###\s+Phase\s+\d+:/g) || [];
  const taskNumMatch = path.basename(filePath).match(/^TASK-(\d+)/);
  const taskNum = taskNumMatch ? parseInt(taskNumMatch[1], 10) : 0;
  const hasInvariantsSection = /^##\s+2\.5\s+Architectural Invariants/m.test(
    content,
  );
  const isV2Task = taskNum >= 159 || hasInvariantsSection;

  if (taskNum >= 159 && !hasInvariantsSection) {
    result.errors.push(
      `[Format Error] Missing required section: '## 2.5 Architectural Invariants & Why' (required for TASK-159+).`,
    );
  }

  if (isV2Task) {
    if (phaseHeaders.length > 5) {
      result.errors.push(
        `[Phase Limit Error] Task has ${phaseHeaders.length} phases (max allowed: 5). Split large changes (>15 files) into sequential tasks (e.g. TASK-XXXa, TASK-XXXb).`,
      );
    }

    const phaseSectionRegex =
      /^(###\s+Phase\s+\d+[^\n]*)\n([\s\S]*?)(?=^###\s+Phase\s+\d+|^##\s+\d+\.|$(?![\s\S]))/gm;
    for (const match of content.matchAll(phaseSectionRegex)) {
      const header = match[1].trim();
      const body = match[2];
      const targetMatch = body.match(
        /-\s+\*\*(?:対象ファイル|Target Files|対象スコープ)\*\*:\s*([^\n]*(?:\n\s+-\s+[^\n]*)*)/i,
      );
      if (targetMatch) {
        const backticks = targetMatch[1].match(/`[^`\n]+`/g);
        const fileCount = backticks ? backticks.length : 0;
        if (fileCount > 6) {
          result.errors.push(
            `[Phase File Limit Error] ${header} specifies ${fileCount} target files (max allowed: 6 [4 production + 2 test]). Split into smaller phases.`,
          );
        }
      }
    }
  }

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

export interface BatchValidationResult {
  total: number;
  passed: number;
  failed: number;
  results: ValidationResult[];
}

export function validateAllTasks(options?: {
  tasksDir?: string;
  from?: number;
}): BatchValidationResult {
  const tasksDir = options?.tasksDir ?? path.join(process.cwd(), 'tasks');
  const fromNum = options?.from ?? 7; // デフォルトは新仕様パイプライン対象の TASK-007 以降

  if (!fs.existsSync(tasksDir)) {
    return { total: 0, passed: 0, failed: 0, results: [] };
  }

  const files = fs
    .readdirSync(tasksDir)
    .filter((f) => f.startsWith('TASK-') && f.endsWith('.md'))
    .filter((f) => {
      const match = f.match(/^TASK-(\d+)/);
      if (!match) return false;
      const num = parseInt(match[1], 10);
      return num >= fromNum;
    })
    .sort();

  const results: ValidationResult[] = [];
  let passed = 0;
  let failed = 0;

  for (const file of files) {
    const fullPath = path.join(tasksDir, file);
    const res = validateTaskFile(fullPath);
    results.push(res);
    if (res.valid) {
      passed++;
    } else {
      failed++;
    }
  }

  return {
    total: files.length,
    passed,
    failed,
    results,
  };
}

// CLI 実行時
if (import.meta.main) {
  const args = process.argv.slice(2);
  const isAll = args.includes('--all');
  const fromArgIdx = args.indexOf('--from');
  const fromNum =
    fromArgIdx !== -1 && args[fromArgIdx + 1]
      ? parseInt(args[fromArgIdx + 1], 10)
      : 7;

  if (isAll) {
    console.log(
      `\n📋 === Batch Task Validation Report (from TASK-${String(fromNum).padStart(3, '0')}) ===`,
    );
    const batch = validateAllTasks({ from: fromNum });

    for (const res of batch.results) {
      const base = path.basename(res.taskPath);
      if (res.valid) {
        console.log(`  ✅ ${base}`);
      } else {
        console.log(`  ❌ ${base} (${res.errors.length} error(s))`);
        for (const e of res.errors) {
          console.log(`     - ${e}`);
        }
      }
    }

    console.log(
      `\nSummary: ${batch.passed}/${batch.total} tasks PASSED (${batch.failed} failed).`,
    );

    if (batch.failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }

  let targetFile = args.find((a) => !a.startsWith('--'));

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
