import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { findTaskTitle, parseCommitArgs, runCommit } from '../commit';

let tmpRoot: string;

beforeAll(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'commit-test-'));
});

afterAll(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe('parseCommitArgs', () => {
  test('parses -m flag', () => {
    const res = parseCommitArgs(['-m', 'feat: add feature', 'src/a.ts']);
    expect(res.message).toBe('feat: add feature');
    expect(res.files).toEqual(['src/a.ts']);
  });

  test('parses --message flag', () => {
    const res = parseCommitArgs(['--message', 'chore: update']);
    expect(res.message).toBe('chore: update');
    expect(res.files).toEqual([]);
  });

  test('parses -m= and --message= formats', () => {
    const res1 = parseCommitArgs(['-m=fix: bug']);
    expect(res1.message).toBe('fix: bug');

    const res2 = parseCommitArgs(['--message=docs: note', 'a.md', 'b.md']);
    expect(res2.message).toBe('docs: note');
    expect(res2.files).toEqual(['a.md', 'b.md']);
  });

  test('returns null message when omitted', () => {
    const res = parseCommitArgs(['src/a.ts']);
    expect(res.message).toBeNull();
    expect(res.files).toEqual(['src/a.ts']);
    expect(res.staged).toBe(false);
  });

  test('parses --staged flag', () => {
    const res = parseCommitArgs(['--staged', '-m', 'feat: staged only']);
    expect(res.staged).toBe(true);
    expect(res.message).toBe('feat: staged only');
    expect(res.files).toEqual([]);
    expect(res.task).toBeNull();
  });

  test('parses --task and --task= flags', () => {
    const res1 = parseCommitArgs(['--task', 'tasks/TASK-001.md']);
    expect(res1.task).toBe('tasks/TASK-001.md');

    const res2 = parseCommitArgs(['--task=tasks/TASK-002.md', '-m', 'custom']);
    expect(res2.task).toBe('tasks/TASK-002.md');
    expect(res2.message).toBe('custom');
  });
});

describe('findTaskTitle', () => {
  test('extracts title from tasks/TASK-*.md', () => {
    const tasksDir = path.join(tmpRoot, 'tasks');
    fs.mkdirSync(tasksDir, { recursive: true });
    fs.writeFileSync(
      path.join(tasksDir, 'TASK-099.md'),
      '# TASK-099: Canvas Optimization\n\nSome description',
    );

    const title = findTaskTitle(tmpRoot);
    expect(title).toBe('feat: [TASK-099] TASK-099: Canvas Optimization');
  });

  test('returns null if no tasks dir or files', () => {
    const emptyDir = path.join(tmpRoot, 'empty');
    fs.mkdirSync(emptyDir, { recursive: true });
    expect(findTaskTitle(emptyDir)).toBeNull();
  });
});

describe('runCommit validation & isolation', () => {
  function initGitRepo(name: string): string {
    const dir = path.join(tmpRoot, name);
    fs.mkdirSync(dir, { recursive: true });
    spawnSync('git', ['init'], { cwd: dir });
    spawnSync('git', ['config', 'user.email', 'test@example.com'], {
      cwd: dir,
    });
    spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: dir });
    return dir;
  }

  function makeTaskMd(status: string, commitMsg: string, body: string): string {
    return [
      '# TASK: Sample',
      '',
      `- **Status**: \`${status}\``,
      `- **Commit**: \`${commitMsg}\``,
      '- **Execution Waves**:',
      '  - Wave 1: Phase 1',
      '- **Negative Contracts**:',
      '  - `none`',
      '',
      '## 1. Architectural Invariants & Design Decisions',
      '- Keep isolated.',
      '',
      '### Phase 1: Test',
      body,
      '',
    ].join('\n');
  }

  test('aborts with code 1 if message is omitted and no tasks file exists', async () => {
    const emptyDir = path.join(tmpRoot, 'no-task');
    fs.mkdirSync(emptyDir, { recursive: true });
    const code = await runCommit([], emptyDir);
    expect(code).toBe(1);
  });

  test('--task commits only the target task files and leaves other dirty/staged files untouched', async () => {
    const repo = initGitRepo('task-isolation');
    fs.mkdirSync(path.join(repo, 'tasks'), { recursive: true });
    fs.mkdirSync(path.join(repo, 'docs'), { recursive: true });

    fs.writeFileSync(path.join(repo, 'docs/old.md'), 'old\n');
    fs.writeFileSync(path.join(repo, 'docs/other.md'), 'init\n');
    spawnSync('git', ['add', '.'], { cwd: repo });
    spawnSync('git', ['commit', '-m', 'chore: init'], { cwd: repo });

    // Unrelated IN_PROGRESS task + unrelated dirty & staged file
    fs.writeFileSync(
      path.join(repo, 'tasks/TASK-A.md'),
      makeTaskMd(
        'IN_PROGRESS',
        'feat: task a',
        '- **Target Files**:\n  - `[MODIFY]` `docs/other.md`',
      ),
    );
    fs.writeFileSync(path.join(repo, 'docs/other.md'), 'dirty other\n');
    fs.writeFileSync(path.join(repo, 'docs/staged-other.md'), 'staged\n');
    spawnSync('git', ['add', 'docs/staged-other.md'], { cwd: repo });

    // Target DONE task (adds docs/b.md, deletes docs/old.md)
    fs.writeFileSync(
      path.join(repo, 'tasks/TASK-B.md'),
      makeTaskMd(
        'DONE',
        'feat(docs): complete task b',
        '- **Target Files**:\n  - `[ADD]` `docs/b.md`\n  - `[DELETE]` `docs/old.md`',
      ),
    );
    fs.writeFileSync(path.join(repo, 'docs/b.md'), 'new b\n');
    fs.rmSync(path.join(repo, 'docs/old.md'));

    const code = await runCommit(['--task', 'tasks/TASK-B.md'], repo);
    expect(code).toBe(0);

    const lastMsg = spawnSync('git', ['log', '-1', '--pretty=%s'], {
      cwd: repo,
      encoding: 'utf8',
    }).stdout.trim();
    expect(lastMsg).toBe('feat(docs): complete task b');

    const committedFiles = spawnSync(
      'git',
      ['diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD'],
      { cwd: repo, encoding: 'utf8' },
    )
      .stdout.trim()
      .split('\n')
      .sort();
    expect(committedFiles).toEqual([
      'docs/b.md',
      'docs/old.md',
      'tasks/TASK-B.md',
    ]);

    // Other files remain untouched in working tree / index
    const status = spawnSync('git', ['status', '--porcelain'], {
      cwd: repo,
      encoding: 'utf8',
    }).stdout;
    expect(status).toContain('docs/other.md');
    expect(status).toContain('docs/staged-other.md');
    expect(status).toContain('tasks/TASK-A.md');
  });

  test('explicit file args commit only specified files without triggering unrelated task validation', async () => {
    const repo = initGitRepo('explicit-files');
    fs.mkdirSync(path.join(repo, 'tasks'), { recursive: true });
    fs.mkdirSync(path.join(repo, 'docs'), { recursive: true });

    fs.writeFileSync(path.join(repo, 'docs/fix.md'), 'v1\n');
    fs.writeFileSync(path.join(repo, 'docs/unrelated.md'), 'v1\n');
    spawnSync('git', ['add', '.'], { cwd: repo });
    spawnSync('git', ['commit', '-m', 'chore: init'], { cwd: repo });

    fs.writeFileSync(
      path.join(repo, 'tasks/TASK-A.md'),
      makeTaskMd(
        'IN_PROGRESS',
        'feat: wip',
        '- **Target Files**:\n  - `[MODIFY]` `docs/unrelated.md`',
      ),
    );
    fs.writeFileSync(path.join(repo, 'docs/fix.md'), 'v2\n');
    fs.writeFileSync(path.join(repo, 'docs/unrelated.md'), 'wip\n');

    const code = await runCommit(
      ['-m', 'fix(docs): apply targeted fix', 'docs/fix.md'],
      repo,
    );
    expect(code).toBe(0);

    const committed = spawnSync(
      'git',
      ['diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD'],
      { cwd: repo, encoding: 'utf8' },
    ).stdout.trim();
    expect(committed).toBe('docs/fix.md');
  });

  test('bare commit aborts when multiple active TASK files are modified', async () => {
    const repo = initGitRepo('multi-task-bare');
    fs.mkdirSync(path.join(repo, 'tasks'), { recursive: true });
    fs.writeFileSync(path.join(repo, 'README.md'), 'init\n');
    spawnSync('git', ['add', '.'], { cwd: repo });
    spawnSync('git', ['commit', '-m', 'chore: init'], { cwd: repo });

    fs.writeFileSync(
      path.join(repo, 'tasks/TASK-1.md'),
      makeTaskMd('DONE', 'feat: 1', '- **Target Files**:\n  - `[ADD]` `a.md`'),
    );
    fs.writeFileSync(
      path.join(repo, 'tasks/TASK-2.md'),
      makeTaskMd('DONE', 'feat: 2', '- **Target Files**:\n  - `[ADD]` `b.md`'),
    );

    const code = await runCommit(['-m', 'feat: ambiguous'], repo);
    expect(code).toBe(1);
  });

  test('--staged aborts if staged file has unstaged modifications on disk', async () => {
    const repo = initGitRepo('partial-staged');
    fs.writeFileSync(path.join(repo, 'note.md'), 'v1\n');
    spawnSync('git', ['add', 'note.md'], { cwd: repo });
    spawnSync('git', ['commit', '-m', 'init'], { cwd: repo });

    fs.writeFileSync(path.join(repo, 'note.md'), 'v2\n');
    spawnSync('git', ['add', 'note.md'], { cwd: repo });
    fs.writeFileSync(path.join(repo, 'note.md'), 'v3\n');

    const code = await runCommit(['--staged', '-m', 'docs: partial'], repo);
    expect(code).toBe(1);
  });
});
