import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface TaskValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export interface NegativeContractRule {
  kind: 'rg' | 'absent' | 'none';
  pattern?: string;
  targets?: string[];
  filePath?: string;
  raw: string;
}

export const MAX_TASK_LINES = 400;
export const MAX_CODE_BLOCK_LINES = 40;
export const MAX_TASK_PHASES = 5;
export const MAX_PHASE_FILES = 4;

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
  const fmMatch = markdown.match(
    /^---\n[\s\S]*?^commit:\s*["']?([^"'\n]+)["']?/m,
  );
  if (fmMatch?.[1]) return fmMatch[1].trim();

  const bulletMatch = markdown.match(
    /-\s+\*\*Commit(?:\s+Message)?\*\*:\s*`?([^`\n]+)`?/i,
  );
  if (bulletMatch?.[1]) return bulletMatch[1].trim();

  return null;
}

/**
 * `Negative Contracts` セクションから機械検証可能なルール (`rg:`, `absent:`, `none`) を抽出する
 */
export function extractNegativeContracts(
  markdown: string,
): NegativeContractRule[] {
  const rules: NegativeContractRule[] = [];
  const sectionMatch = markdown.match(
    /(?:^|\n)(?:-\s+\*\*Negative Contracts\*\*:|##+\s+Negative Contracts[^\n]*)\n([\s\S]*?)(?=\n##+\s+|\n-\s+\*\*[A-Z]|$)/i,
  );
  if (!sectionMatch) return rules;

  const lines = sectionMatch[1].split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith('-')) continue;
    const item = line.replace(/^-\s+/, '').trim();
    const unwrapped = item.replace(/^`([^`]+)`(?:\s*\(.*\))?$/, '$1').trim();

    if (/^none\b/i.test(unwrapped)) {
      rules.push({ kind: 'none', raw: item });
      continue;
    }

    const rgScoped = unwrapped.match(/^rg\(([^)]+)\):\s*(.+)$/i);
    if (rgScoped) {
      const targets = rgScoped[1]
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const pattern = rgScoped[2].trim();
      if (pattern) {
        rules.push({ kind: 'rg', targets, pattern, raw: item });
      }
      continue;
    }

    const rgDefault = unwrapped.match(/^rg:\s*(.+)$/i);
    if (rgDefault) {
      const pattern = rgDefault[1].trim();
      if (pattern) {
        rules.push({ kind: 'rg', pattern, raw: item });
      }
      continue;
    }

    const absentMatch = unwrapped.match(/^absent:\s*(.+)$/i);
    if (absentMatch) {
      const filePath = absentMatch[1].trim();
      if (filePath) {
        rules.push({ kind: 'absent', filePath, raw: item });
      }
    }
  }

  return rules;
}

/**
 * 抽出された `Negative Contracts` を実際にファイルシステム / `rg` で検証する
 */
export function verifyNegativeContracts(
  rules: NegativeContractRule[],
  cwd: string,
): string[] {
  const errors: string[] = [];

  for (const rule of rules) {
    if (rule.kind === 'none') continue;

    if (rule.kind === 'absent' && rule.filePath) {
      const absPath = path.resolve(cwd, rule.filePath);
      if (fs.existsSync(absPath)) {
        errors.push(
          `[NEGATIVE CONTRACT] File marked absent still exists on disk: '${rule.filePath}'`,
        );
      }
      continue;
    }

    if (rule.kind === 'rg' && rule.pattern) {
      const candidateTargets =
        rule.targets && rule.targets.length > 0
          ? rule.targets
          : ['src', 'extension'];
      const existingTargets = candidateTargets.filter((t) =>
        fs.existsSync(path.resolve(cwd, t)),
      );
      const searchTargets =
        existingTargets.length > 0 ? existingTargets : ['.'];

      const rgRes = spawnSync(
        'rg',
        ['-l', '--', rule.pattern, ...searchTargets],
        {
          cwd,
          encoding: 'utf8',
        },
      );

      if (rgRes.status === 0) {
        const matched = (rgRes.stdout ?? '')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
        errors.push(
          `[NEGATIVE CONTRACT] Prohibited pattern '${rule.pattern}' still matched ${matched.length} file(s): ${matched.slice(0, 5).join(', ')}`,
        );
      } else if (rgRes.status !== 1) {
        errors.push(
          `[NEGATIVE CONTRACT] Failed to execute 'rg' for pattern '${rule.pattern}': ${rgRes.stderr ?? 'unknown error'}`,
        );
      }
    }
  }

  return errors;
}

interface PhaseTargetAnalysis {
  phaseHeader: string;
  activeFiles: string[];
  untaggedEntries: string[];
}

export function analyzePhaseTargets(markdown: string): PhaseTargetAnalysis[] {
  const results: PhaseTargetAnalysis[] = [];
  const phaseRegex =
    /^(###\s+Phase\s+\d+[^\n]*)\n([\s\S]*?)(?=^###\s+Phase\s+\d+|^##\s+\d+\.|$(?![\s\S]))/gm;

  for (const match of markdown.matchAll(phaseRegex)) {
    const phaseHeader = match[1].trim();
    const body = match[2];
    const targetMatch = body.match(
      /-\s+\*\*(?:対象ファイル|Target Files)\*\*:\s*([^\n]*(?:\n\s+-\s+[^\n]*)*)/i,
    );
    if (!targetMatch) {
      results.push({ phaseHeader, activeFiles: [], untaggedEntries: [] });
      continue;
    }

    const lines = targetMatch[1]
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const activeFiles: string[] = [];
    const untaggedEntries: string[] = [];

    for (const line of lines) {
      if (/`?\[DELETE\]`?/i.test(line)) {
        continue;
      }
      const hasAddOrModify = /`?\[(?:ADD|MODIFY)\]`?/i.test(line);
      const backticks = line.match(/`[^`\n]+`/g) ?? [];
      const fileTokens = backticks
        .map((b) => b.slice(1, -1).trim())
        .filter((t) => !/^\[(?:ADD|MODIFY|DELETE)\]$/i.test(t))
        .filter((t) => t.includes('/') || /\.[tj]sx?$/.test(t));

      if (!hasAddOrModify && fileTokens.length > 0) {
        untaggedEntries.push(...fileTokens);
      }
      activeFiles.push(...fileTokens);
    }

    results.push({ phaseHeader, activeFiles, untaggedEntries });
  }

  return results;
}

export function validateTaskMarkdown(
  filePath: string,
  content: string,
  options: {
    cwd?: string;
    strictFormat?: boolean;
    verifyContracts?: boolean;
  } = {},
): TaskValidationResult {
  const cwd = options.cwd ?? process.cwd();
  const strictFormat = options.strictFormat ?? true;
  const verifyContracts = options.verifyContracts ?? false;
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

  // 2. Phase セクション数確認 (1..5)
  const phases = content.match(/^###\s+Phase\s+\d+/gim) ?? [];
  if (phases.length === 0) {
    errors.push(
      `[TASK VALIDATION] ${filePath}: Must contain at least one '### Phase N' section.`,
    );
  } else if (phases.length > MAX_TASK_PHASES) {
    errors.push(
      `[TASK VALIDATION] ${filePath}: Task has ${phases.length} phases (hard limit: <= ${MAX_TASK_PHASES}). Split into sequential tasks (e.g. TASK-XXXa, TASK-XXXb).`,
    );
  }

  // 3. 行数上限（400行）およびコードブロック行数上限（40行）
  const totalLines = content.split('\n').length;
  if (totalLines > MAX_TASK_LINES) {
    errors.push(
      `[TASK VALIDATION] ${filePath}: Task file exceeds ${MAX_TASK_LINES} lines (${totalLines} lines). Keep specs concise and split large scopes into sequential tasks.`,
    );
  }

  const codeBlocks = extractCodeBlocks(content);
  for (const block of codeBlocks) {
    const blockLines = block.split('\n').length;
    if (blockLines > MAX_CODE_BLOCK_LINES) {
      errors.push(
        `[TASK VALIDATION] ${filePath}: Code block exceeds ${MAX_CODE_BLOCK_LINES} lines (${blockLines} lines). Only public interfaces, signatures, and formulas are allowed (no implementation bodies or Before/After dumps).`,
      );
      break;
    }

    if (
      /\/\/\s*\.\.\.\s*$|\/\*\s*\.\.\.\s*\*\/|\/\/\s*既存のまま|\/\/\s*省略|TODO:\s*ASK|\.\.\.existing code\.\.\./im.test(
        block,
      )
    ) {
      errors.push(
        `[TASK VALIDATION] ${filePath}: Code block contains lazy placeholder ('// ...', '// 既存のまま', '// 省略', or 'TODO: ASK').`,
      );
      break;
    }
  }

  // 4. Phase ごとの Target Files 数上限 (<= 4, [DELETE] 除外) およびタグ検査
  const phaseTargets = analyzePhaseTargets(content);
  for (const pt of phaseTargets) {
    if (pt.activeFiles.length > MAX_PHASE_FILES) {
      errors.push(
        `[TASK VALIDATION] ${filePath}: ${pt.phaseHeader} specifies ${pt.activeFiles.length} active target files (hard limit: <= ${MAX_PHASE_FILES}, [DELETE] excluded).`,
      );
    }
    if (strictFormat && pt.untaggedEntries.length > 0) {
      errors.push(
        `[TASK VALIDATION] ${filePath}: ${pt.phaseHeader} target files missing [ADD]/[MODIFY]/[DELETE] tag: ${pt.untaggedEntries.join(', ')}`,
      );
    }
  }

  // 5. 新契約フォーマット検証（省略禁止・旧写経/競合セクション禁止）
  if (strictFormat) {
    const commitMsg = extractTaskCommitMessage(content);
    if (!commitMsg) {
      errors.push(
        `[TASK VALIDATION] ${filePath}: Missing pre-defined commit message ('- **Commit**: \`type(scope): summary\`').`,
      );
    }

    if (!/-\s+\*\*Execution Waves\*\*:/i.test(content)) {
      errors.push(
        `[TASK VALIDATION] ${filePath}: Missing '- **Execution Waves**:' section specifying parallel/sequential execution order.`,
      );
    }

    if (
      !/^##\s+\d*\.*\s*(?:Architectural\s+)?Invariants\s*&\s*(?:Design Decisions|Consumers)/im.test(
        content,
      )
    ) {
      errors.push(
        `[TASK VALIDATION] ${filePath}: Missing '## 1. Architectural Invariants & Design Decisions' section.`,
      );
    }

    if (!/\[(ADD|MODIFY|DELETE)\]/i.test(content)) {
      errors.push(
        `[TASK VALIDATION] ${filePath}: Target files must specify action tags ('[ADD]', '[MODIFY]', or '[DELETE]').`,
      );
    }

    const negRules = extractNegativeContracts(content);
    if (negRules.length === 0) {
      errors.push(
        `[TASK VALIDATION] ${filePath}: Missing machine-verifiable Negative Contracts ('rg: <pattern>', 'absent: <path>', or 'none').`,
      );
    }

    if (/^\s*\*{0,2}Before\*{0,2}\s*:\*{0,2}\s*$/im.test(content)) {
      errors.push(
        `[TASK VALIDATION] ${filePath}: Legacy 'Before:' / 'After:' code copying is abolished. Specify symbol/line range and Contract instead.`,
      );
    }

    if (
      /\*{0,2}Worker Model\*{0,2}\s*:|\*{0,2}Worker Handoff Log\*{0,2}|##\s*\d*\.?\s*Rejections/i.test(
        content,
      )
    ) {
      errors.push(
        `[TASK VALIDATION] ${filePath}: Contains abolished legacy metadata ('Worker Model', 'Worker Handoff Log', or '## 6. Rejections').`,
      );
    }
  }

  // 6. Status: DONE または --verify-contracts 時の物理・機械検証
  if (status === 'DONE' || verifyContracts) {
    if (status === 'DONE') {
      const unchecked = content.match(/^[\s]*-\s+\[\s\]\s+.+$/gm) ?? [];
      if (unchecked.length > 0) {
        errors.push(
          `[TASK VALIDATION] ${filePath}: Status is DONE, but ${unchecked.length} unchecked item(s) ('- [ ]') remain.`,
        );
      }
    }

    const deletedTargets = extractDeletedTargetFiles(content);
    for (const delFile of deletedTargets) {
      const absDel = path.resolve(cwd, delFile);
      if (fs.existsSync(absDel)) {
        errors.push(
          `[TASK VALIDATION] ${filePath}: File marked as [DELETE] ('${delFile}') still exists on disk. Delete it before completing the task.`,
        );
      }
    }

    const negRules = extractNegativeContracts(content);
    errors.push(...verifyNegativeContracts(negRules, cwd));
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
  const rawArgs = process.argv.slice(2);
  const verifyContracts = rawArgs.includes('--verify-contracts');
  const requireDone = rawArgs.includes('--require-done');
  const args = rawArgs.filter((a) => !a.startsWith('-'));
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
    strictFormat: true,
    verifyContracts,
  });

  if (requireDone) {
    const isDone = /-\s+\*\*Status\*\*:\s*`?DONE`?/i.test(content);
    if (!isDone) {
      res.errors.push(
        `[TASK VALIDATION] ${target}: Status must be updated to 'DONE' before committing.`,
      );
      res.ok = false;
    }
  }

  for (const w of res.warnings) console.warn(w);
  if (!res.ok) {
    for (const err of res.errors) console.error(err);
    process.exit(1);
  }

  console.log(`✅ Task file validated: ${target}`);
}
