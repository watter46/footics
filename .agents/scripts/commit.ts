import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { executePreflight } from './preflight';

export function parseCommitArgs(args: string[]): {
  message: string | null;
  files: string[];
} {
  let message: string | null = null;
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
    } else if (!a.startsWith('-')) {
      files.push(a);
    }
  }
  return { message, files };
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
      .filter((l) => l.startsWith(' D') || l.startsWith('D '))
      .map((l) => l.slice(3).split(' -> ').pop() ?? '')
      .map((p) => p.replace(/^"|"$/g, '').trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function runCommit(
  argv: string[],
  cwd = process.cwd(),
): Promise<number> {
  const { message: rawMessage, files: targetFiles } = parseCommitArgs(argv);
  const message = rawMessage || findTaskTitle(cwd);

  if (!message) {
    console.error('[ERROR] Commit message is required.');
    console.error('Usage: bun run ai:commit -m "<message>" [files...]');
    console.error(
      'Hint: If tasks/TASK-*.md exists, its title will be used as fallback.',
    );
    return 1;
  }

  // 1. Preflight 検証（並列実行・Fast-Path判定含む）
  const preflightRes = await executePreflight(targetFiles, cwd);
  console.log(preflightRes.verdict);

  if (!preflightRes.ok) {
    console.error(
      '\n[COMMIT ABORTED] Preflight verification failed. Resolve the errors above before committing.',
    );
    return 1;
  }

  const deletedFiles = getDeletedFiles(cwd);
  if (preflightRes.files.length === 0 && deletedFiles.length === 0) {
    console.log('No changes to commit.');
    return 0;
  }

  // 2. ステージング: 検証合格ファイルおよび削除ファイルのみ追加
  const filesToAdd =
    targetFiles.length > 0
      ? targetFiles
      : [...new Set([...preflightRes.files, ...deletedFiles])];

  if (filesToAdd.length > 0) {
    const addRes = spawnSync('git', ['add', '--', ...filesToAdd], {
      cwd,
      encoding: 'utf8',
    });
    if (addRes.status !== 0) {
      console.error(`[ERROR] git add failed: ${addRes.stderr}`);
      return 1;
    }
  }

  // 3. コミット実行
  const commitRes = spawnSync('git', ['commit', '-m', message], {
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
