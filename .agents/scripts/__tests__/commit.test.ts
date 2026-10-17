import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
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

describe('runCommit validation', () => {
  test('aborts with code 1 if message is omitted and no tasks file exists', async () => {
    const emptyDir = path.join(tmpRoot, 'no-task');
    fs.mkdirSync(emptyDir, { recursive: true });
    const code = await runCommit([], emptyDir);
    expect(code).toBe(1);
  });
});
