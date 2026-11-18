import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { executePreflight } from './preflight';
import {
  extractTaskCommitMessage,
  extractTaskTargetFiles,
  listActiveTaskFiles,
} from './validate-task';

export function parseCommitArgs(args: string[]): {
  message: string | null;
  files: string[];
  staged: boolean;
  task: string | null;
} {
  let message: string | null = null;
  let staged = false;
  let task: string | null = null;
  const files: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-m' || a === '--message') {
      message = args[i + 1] ?? null;
      i += 1;
    } else if (a.startsWith('-m=')) {
      message = a.slice(3);
    } else if (a.startsWith('--message=')) {
      message = a.slice(10);
    } else if (a === '--task' || a === '-t') {
      task = args[i + 1] ?? null;
      i += 1;
    } else if (a.startsWith('--task=')) {
      task = a.slice(7);
    } else if (a === '--staged') {
      staged = true;
    } else if (!a.startsWith('-')) {
      files.push(a);
    }
  }
  return { message, files, staged, task };
}

export function extractCommitMessageFromTaskFile(
  taskPath: string,
  cwd: string,
): string | null {
  try {
    const abs = path.resolve(cwd, taskPath);
    if (!fs.existsSync(abs)) return null;
    const content = fs.readFileSync(abs, 'utf8');
    const explicitCommit = extractTaskCommitMessage(content);
    if (explicitCommit) return explicitCommit;
    const firstLine = content.split('\n').find((l) => l.startsWith('# '));
    if (firstLine) {
      const title = firstLine.replace(/^#\s*/, '').trim();
      const base = path.basename(taskPath, '.md');
      return `feat: [${base}] ${title}`;
    }
  } catch {}
  return null;
}

export function findTaskTitle(cwd: string): string | null {
  try {
    const tasksDir = path.join(cwd, 'tasks');
    if (!fs.existsSync(tasksDir)) return null;
    const files = fs
      .readdirSync(tasksDir)
      .filter((f) => f.startsWith('TASK-') && f.endsWith('.md'));
    if (files.length === 0) return null;
    files.sort(
      (a, b) =>
        fs.statSync(path.join(tasksDir, b)).mtimeMs -
        fs.statSync(path.join(tasksDir, a)).mtimeMs,
    );
    const content = fs.readFileSync(path.join(tasksDir, files[0]), 'utf8');
    const explicitCommit = extractTaskCommitMessage(content);
    if (explicitCommit) {
      return explicitCommit;
    }
    const firstLine = content.split('\n').find((l) => l.startsWith('# '));
    if (firstLine) {
      const title = firstLine.replace(/^#\s*/, '').trim();
      return `feat: [${files[0].replace('.md', '')}] ${title}`;
    }
  } catch {}
  return null;
}

export function getDeletedFiles(cwd: string): string[] {
  try {
    const status =
      spawnSync('git', ['status', '--porcelain'], {
        cwd,
        encoding: 'utf8',
      }).stdout ?? '';
    return status
      .split('\n')
      .filter((l) => l.startsWith(' D'))
      .map((l) => l.slice(3).split(' -> ').pop() ?? '')
      .map((p) => p.replace(/^"|"$/g, '').trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function getStagedFiles(cwd: string): {
  all: string[];
  existing: string[];
} {
  try {
    const allOut =
      spawnSync('git', ['diff', '--cached', '--name-only'], {
        cwd,
        encoding: 'utf8',
      }).stdout ?? '';
    const existingOut =
      spawnSync(
        'git',
        ['diff', '--cached', '--name-only', '--diff-filter=ACMR'],
        {
          cwd,
          encoding: 'utf8',
        },
      ).stdout ?? '';
    return {
      all: allOut
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      existing: existingOut
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    };
  } catch {
    return { all: [], existing: [] };
  }
}

export async function runCommit(
  argv: string[],
  cwd = process.cwd(),
): Promise<number> {
  const {
    message: rawMessage,
    files: targetFiles,
    staged,
    task,
  } = parseCommitArgs(argv);

  if (staged && (task || targetFiles.length > 0)) {
    console.error(
      '[ERROR] --staged cannot be combined with --task or explicit file arguments.',
    );
    return 1;
  }

  if (task) {
    const absTask = path.resolve(cwd, task);
    if (!fs.existsSync(absTask)) {
      console.error(`[ERROR] Task file not found: ${task}`);
      return 1;
    }
  }

  const stagedFiles = staged ? getStagedFiles(cwd) : null;
  if (staged && stagedFiles && stagedFiles.all.length === 0) {
    console.log('No staged changes to commit.');
    return 0;
  }

  if (staged && stagedFiles && stagedFiles.existing.length > 0) {
    const partialOut =
      spawnSync('git', ['diff', '--name-only', '--', ...stagedFiles.existing], {
        cwd,
        encoding: 'utf8',
      }).stdout ?? '';
    const partiallyStaged = partialOut
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (partiallyStaged.length > 0) {
      console.error(
        `[COMMIT ABORTED] Staged file(s) also have unstaged changes on disk: ${partiallyStaged.join(', ')}. Stage them or restore before --staged commit.`,
      );
      return 1;
    }
  }

  const explicitTaskFiles = task
    ? [task]
    : (staged ? (stagedFiles?.all ?? []) : targetFiles).filter(
        (f) => f.startsWith('tasks/') && f.endsWith('.md'),
      );

  const isBareMode = !staged && !task && targetFiles.length === 0;
  if (isBareMode) {
    const activeTasks = listActiveTaskFiles(cwd);
    if (activeTasks.length > 1) {
      console.error(
        `[COMMIT ABORTED] Multiple modified task files detected (${activeTasks.join(', ')}). Specify '--task <path>' or pass explicit files.`,
      );
      return 1;
    }
  }

  let message = rawMessage;
  if (!message && explicitTaskFiles.length > 0) {
    message = extractCommitMessageFromTaskFile(explicitTaskFiles[0], cwd);
  }
  if (!message && isBareMode) {
    message = findTaskTitle(cwd);
  }

  if (!message) {
    console.error('[ERROR] Commit message is required.');
    console.error(
      'Usage: bun run ai:commit [--task <tasks/TASK-XXX.md>] [-m "<message>"] [--staged] [files...]',
    );
    console.error(
      'Hint: Pass --task <path> to commit a specific task, or -m "<message>" <files...> for targeted fix commits.',
    );
    return 1;
  }

  let taskScopeFiles: { active: string[]; deleted: string[] } | null = null;
  if (task) {
    const taskContent = fs.readFileSync(path.resolve(cwd, task), 'utf8');
    taskScopeFiles = extractTaskTargetFiles(taskContent);
  }

  const scopedInputFiles = task
    ? [...new Set([task, ...(taskScopeFiles?.active ?? []), ...targetFiles])]
    : targetFiles;

  const effectiveTargetFiles = staged
    ? (stagedFiles?.existing ?? [])
    : scopedInputFiles.filter((f) => fs.existsSync(path.join(cwd, f)));

  // 0. Task File Validation (対象ファイルに tasks/ が含まれるか、全体コミット時のみ実行)
  const shouldValidateTask = isBareMode || explicitTaskFiles.length > 0;
  if (shouldValidateTask) {
    const taskTargets = explicitTaskFiles.length > 0 ? explicitTaskFiles : [''];
    for (const taskTarget of taskTargets) {
      const validateArgs = [
        path.resolve(__dirname, 'validate-task.ts'),
        ...(taskTarget ? [taskTarget] : []),
        '--verify-contracts',
        '--require-done',
      ];
      const taskCheckProc = spawnSync('bun', validateArgs, {
        cwd,
        encoding: 'utf8',
      });
      if (taskCheckProc.status !== 0) {
        console.error(taskCheckProc.stdout || taskCheckProc.stderr);
        console.error(
          '\n[COMMIT ABORTED] Task file validation failed. Ensure Status is DONE, [DELETE] files are removed, and Negative Contracts match 0 files.',
        );
        return 1;
      }
    }
  }

  // 1. Preflight 検証（並列実行・Fast-Path判定含む）
  let filesToCommitOnly: string[] | null = null;
  if (!staged || effectiveTargetFiles.length > 0) {
    const preflightRes = await executePreflight(effectiveTargetFiles, cwd);
    console.log(preflightRes.verdict);

    if (!preflightRes.ok) {
      console.error(
        '\n[COMMIT ABORTED] Preflight verification failed. Resolve the errors above before committing.',
      );
      return 1;
    }

    if (!staged) {
      const scopedDeleted = isBareMode
        ? getDeletedFiles(cwd)
        : (taskScopeFiles?.deleted ?? []);
      const filesToAdd = isBareMode
        ? [...new Set([...preflightRes.files, ...scopedDeleted])]
        : [...new Set([...scopedInputFiles, ...scopedDeleted])];

      if (filesToAdd.length === 0) {
        console.log('No changes to commit.');
        return 0;
      }

      const existingFiles = filesToAdd.filter((f) =>
        fs.existsSync(path.join(cwd, f)),
      );
      const missingFiles = filesToAdd
        .filter((f) => !fs.existsSync(path.join(cwd, f)))
        .filter((f) => {
          const tracked = spawnSync(
            'git',
            ['ls-files', '--error-unmatch', '--', f],
            {
              cwd,
              encoding: 'utf8',
            },
          );
          return tracked.status === 0;
        });

      if (existingFiles.length === 0 && missingFiles.length === 0) {
        console.log('No changes to commit.');
        return 0;
      }

      if (existingFiles.length > 0) {
        const addRes = spawnSync('git', ['add', '--', ...existingFiles], {
          cwd,
          encoding: 'utf8',
        });
        if (addRes.status !== 0) {
          console.error(`[ERROR] git add failed: ${addRes.stderr}`);
          return 1;
        }
      }

      if (missingFiles.length > 0) {
        const rmRes = spawnSync('git', ['add', '-u', '--', ...missingFiles], {
          cwd,
          encoding: 'utf8',
        });
        if (rmRes.status !== 0) {
          console.error(`[ERROR] git add -u failed: ${rmRes.stderr}`);
          return 1;
        }
      }

      if (!isBareMode) {
        filesToCommitOnly = [...existingFiles, ...missingFiles];
      }
    }
  }

  // 3. コミット実行
  const commitArgs =
    filesToCommitOnly && filesToCommitOnly.length > 0
      ? ['commit', '-m', message, '--', ...filesToCommitOnly]
      : ['commit', '-m', message];
  const commitRes = spawnSync('git', commitArgs, {
    cwd,
    encoding: 'utf8',
  });
  if (commitRes.status !== 0) {
    console.error(
      `[ERROR] git commit failed:\n${commitRes.stdout ?? ''}\n${commitRes.stderr ?? ''}`,
    );
    return 1;
  }

  // 4. コンパクトな状態出力（1〜2行）
  const logProc = spawnSync('git', ['log', '-1', '--oneline'], {
    cwd,
    encoding: 'utf8',
  });
  const statusProc = spawnSync('git', ['status', '-sb'], {
    cwd,
    encoding: 'utf8',
  });
  console.log(`[COMMIT OK] ${logProc.stdout?.trim() ?? ''}`);
  console.log(`${statusProc.stdout?.trim() ?? ''}`);

  return 0;
}

if (import.meta.main) {
  runCommit(process.argv.slice(2)).then((code) => process.exit(code));
}
