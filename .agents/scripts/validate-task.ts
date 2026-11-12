import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface TaskValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

function extractCodeBlocks(markdown: string): string[] {
  const blocks: string[] = [];
  const regex = /```[a-zA-Z0-9_-]*\n([\s\S]*?)```/g;
  for (const match of markdown.matchAll(regex)) {
    blocks.push(match[1]);
  }
  return blocks;
}

/**
 * タスクファイルから `[DELETE] \`path/to/file\`` で指定された削除対象ファイル一覧を抽出する
 */
export function extractDeletedTargetFiles(markdown: string): string[] {
  const deleted: string[] = [];
  const regex = /`?\[DELETE\]`?\s*`([^`\n]+)`/gi;
  for (const match of markdown.matchAll(regex)) {
    const filePath = match[1].trim();
    if (filePath && !deleted.includes(filePath)) {
      deleted.push(filePath);
    }
  }
  return deleted;
}

/**
 * タスクファイルから事前定義された Commit メッセージを抽出する
 */
export function extractTaskCommitMessage(markdown: string): string | null {
  // 1. YAML frontmatter `commit: "..."`
  const fmMatch = markdown.match(
    /^---\n[\s\S]*?^commit:\s*["']?([^"'\n]+)["']?/m,
  );
  if (fmMatch?.[1]) return fmMatch[1].trim();

  // 2. Markdown bullet `- **Commit**: \`...\`` or `- **Commit Message**: \`...\``
  const bulletMatch = markdown.match(
    /-\s+\*\*Commit(?:\s+Message)?\*\*:\s*`?([^`\n]+)`?/i,
  );
  if (bulletMatch?.[1]) return bulletMatch[1].trim();

  return null;
}

export function validateTaskMarkdown(
  filePath: string,
  content: string,
  options: { cwd?: string; checkNewFormat?: boolean } = {},
): TaskValidationResult {
  const cwd = options.cwd ?? process.cwd();
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Status の確認
  const statusMatch =
    content.match(/-\s+\*\*Status\*\*:\s*`?(TODO|IN_PROGRESS|DONE)`?/i) ||
    content.match(/^status:\s*(TODO|IN_PROGRESS|DONE)\b/im);

  if (!statusMatch) {
    errors.push(
      `[TASK VALIDATION] ${filePath}: Missing Status ('TODO' | 'IN_PROGRESS' | 'DONE').`,
    );
  }
  const status = statusMatch ? statusMatch[1].toUpperCase() : 'UNKNOWN';

  // 2. Phase セクションの存在確認
  const phases = content.match(/^###\s+Phase\s+\d+/gim) ?? [];
  if (phases.length === 0) {
    errors.push(
      `[TASK VALIDATION] ${filePath}: Must contain at least one '### Phase N' section.`,
    );
  }

  // 3. 行数上限（800行）およびコードブロック行数（120行）のチェック
  const totalLines = content.split('\n').length;
  if (totalLines > 800) {
    errors.push(
      `[TASK VALIDATION] ${filePath}: Task file exceeds 800 lines (${totalLines} lines). Task files must define targeted contracts instead of dumping entire source files. Split into smaller sequential tasks (e.g. TASK-XXXa, TASK-XXXb).`,
    );
  }

  // 4. 省略記号・未決定事項（Workerの推論を誘発する曖昧表現）および巨大コピペの禁止チェック
  const codeBlocks = extractCodeBlocks(content);
  for (const block of codeBlocks) {
    const blockLines = block.split('\n').length;
    if (blockLines > 120) {
      errors.push(
        `[TASK VALIDATION] ${filePath}: Code block exceeds 120 lines (${blockLines} lines). Full file copy-pasting is strictly prohibited. Narrow Before ➔ After down to targeted functions or TSX blocks (30-60 lines with 2-3 anchor lines).`,
      );
      break;
    }

    if (
      /\/\/\s*\.\.\.\s*$|\/\*\s*\.\.\.\s*\*\/|\/\/\s*既存のまま|\/\/\s*省略|TODO:\s*ASK/m.test(
        block,
      )
    ) {
      errors.push(
        `[TASK VALIDATION] ${filePath}: Code block contains lazy placeholder ('// ...', '// 既存のまま', '// 省略', or 'TODO: ASK'). Planner must write complete, copy-pasteable contracts for Worker.`,
      );
      break;
    }
  }

  // 5. 新フォーマット検証（明示的にファイル指定された場合、または Commit が含まれる新タスク）
  const hasActionTags = /\[(ADD|MODIFY|DELETE)\]/i.test(content);
  const commitMsg = extractTaskCommitMessage(content);

  if (options.checkNewFormat && status !== 'DONE') {
    if (!commitMsg) {
      errors.push(
        `[TASK VALIDATION] ${filePath}: Missing pre-defined commit message ('- **Commit**: \`type(scope): summary\`').`,
      );
    }
    if (!hasActionTags) {
      errors.push(
        `[TASK VALIDATION] ${filePath}: Target files must specify action tags ('[ADD]', '[MODIFY]', or '[DELETE]').`,
      );
    }
  }

  // 5. Status: DONE 時の完了条件チェック
  if (status === 'DONE') {
    // 5a. 未完了チェックボックスがないか
    const unchecked = content.match(/^[\s]*-\s+\[\s\]\s+.+$/gm) ?? [];
    if (unchecked.length > 0) {
      errors.push(
        `[TASK VALIDATION] ${filePath}: Status is DONE, but ${unchecked.length} unchecked item(s) ('- [ ]') remain.`,
      );
    }

    // 5b. [DELETE] 指定されたファイルが物理削除されているか
    const deletedTargets = extractDeletedTargetFiles(content);
    for (const delFile of deletedTargets) {
      const absDel = path.resolve(cwd, delFile);
      if (fs.existsSync(absDel)) {
        errors.push(
          `[TASK VALIDATION] ${filePath}: File marked as [DELETE] ('${delFile}') still exists on disk. Delete it before completing the task.`,
        );
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

export function findLatestActiveTaskFile(cwd = process.cwd()): string | null {
  const tasksDir = path.join(cwd, 'tasks');
  if (!fs.existsSync(tasksDir)) return null;

  try {
    const statusOut =
      spawnSync('git', ['status', '--porcelain', 'tasks/'], {
        cwd,
        encoding: 'utf8',
      }).stdout ?? '';

    const modifiedTasks = statusOut
      .split('\n')
      .filter((l) => l.length > 3 && !l.startsWith(' D') && !l.startsWith('D '))
      .map((l) => l.slice(3).split(' -> ').pop()?.trim() ?? '')
      .filter((f) => f.includes('TASK-') && f.endsWith('.md'));

    if (modifiedTasks.length > 0) {
      return modifiedTasks[0];
    }
  } catch {}

  return null;
}

if (import.meta.main) {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const explicitTarget = args[0] ?? null;
  const target = explicitTarget ?? findLatestActiveTaskFile(process.cwd());

  if (!target) {
    console.log('✅ No active modified task file to validate.');
    process.exit(0);
  }

  const abs = path.resolve(target);
  if (!fs.existsSync(abs)) {
    console.error(`[ERROR] Task file not found: ${target}`);
    process.exit(1);
  }

  const content = fs.readFileSync(abs, 'utf8');
  const res = validateTaskMarkdown(target, content, {
    cwd: process.cwd(),
    checkNewFormat: explicitTarget !== null,
  });

  for (const w of res.warnings) console.warn(w);
  if (!res.ok) {
    for (const err of res.errors) console.error(err);
    process.exit(1);
  }

  console.log(`✅ Task file validated: ${target}`);
}
