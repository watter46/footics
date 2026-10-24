import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { checkViewGuard } from './view-filter';

describe('view-filter: planner investigation guard', () => {
  const testDir = path.resolve('.agents/hooks/guard/__tests__/fixtures-view');

  beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  function createTranscript(steps: any[]): string {
    const p = path.join(
      testDir,
      `transcript-${Date.now()}-${Math.random()}.jsonl`,
    );
    const content = `${steps.map((s) => JSON.stringify(s)).join('\n')}\n`;
    fs.writeFileSync(p, content);
    return p;
  }

  // テスト用ダミーファイルの作成ヘルパー (存在チェックを通過させるため)
  function createDummyFile(relPath: string, lineCount = 500): string {
    const fullPath = path.resolve(relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    // 400行を超えるダミーファイルを作成して小型ファイルスライスガードを回避
    const content = Array.from(
      { length: lineCount },
      (_, i) => `// line ${i + 1}`,
    ).join('\n');
    fs.writeFileSync(fullPath, content);
    return fullPath;
  }

  it('allows planner to read up to 5 investigation target files and denies on 6th', () => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f'].map((k) =>
      createDummyFile(
        `.agents/hooks/guard/__tests__/fixtures-view/src/feat-${k}.ts`,
      ),
    );

    // 5ファイル読込済みの transcript
    const transcriptWith5 = createTranscript([
      { step_index: 0, type: 'USER_INPUT', content: 'Implement new feature' },
      {
        step_index: 1,
        type: 'PLANNER_RESPONSE',
        tool_calls: files
          .slice(0, 4)
          .map((f) => ({ name: 'view_file', args: { AbsolutePath: f } })),
      },
    ]);

    // 5ファイル目は allow
    const res5 = checkViewGuard({
      transcriptPath: transcriptWith5,
      workspacePaths: [testDir],
      toolCall: {
        name: 'view_file',
        args: { AbsolutePath: files[4] },
      },
    });
    expect(res5?.decision).toBe('allow');

    // 6ファイル目は deny
    const transcriptWithFiveRead = createTranscript([
      { step_index: 0, type: 'USER_INPUT', content: 'Implement new feature' },
      {
        step_index: 1,
        type: 'PLANNER_RESPONSE',
        tool_calls: files
          .slice(0, 5)
          .map((f) => ({ name: 'view_file', args: { AbsolutePath: f } })),
      },
    ]);

    const res6 = checkViewGuard({
      transcriptPath: transcriptWithFiveRead,
      workspacePaths: [testDir],
      toolCall: {
        name: 'view_file',
        args: { AbsolutePath: files[5] },
      },
    });

    expect(res6).not.toBeNull();
    expect(res6?.decision).toBe('deny');
    expect(res6?.reason).toContain('Codebase investigation limit reached');
    expect(res6?.reason).toContain('delegate codebase investigation to Scout');
    expect(res6?.reason).toContain('TypeName: "scout"');
  });

  it('allows reading .system_generated/tasks/*.log without line limit and does not block sequential slice or reviewer views', () => {
    const taskLogRes = checkViewGuard({
      toolCall: {
        name: 'view_file',
        args: {
          AbsolutePath:
            '/home/watter46/.gemini/antigravity-cli/brain/123/.system_generated/tasks/task-1.log',
        },
      },
    });
    expect(taskLogRes?.decision).toBe('allow');

    const file1 = createDummyFile(
      '.agents/hooks/guard/__tests__/fixtures-view/src/large.ts',
      600,
    );

    // 連続スライス読込や Reviewer の 3連続 view_file が遮断されないこと
    const reviewerTranscript = createTranscript([
      {
        step_index: 0,
        type: 'SYSTEM_MESSAGE',
        content: 'type: "REVIEW_REQUEST"\nReview task',
      },
      {
        step_index: 1,
        type: 'PLANNER_RESPONSE',
        tool_calls: [
          {
            name: 'view_file',
            args: { AbsolutePath: file1, StartLine: 1, EndLine: 100 },
          },
        ],
      },
      {
        step_index: 2,
        type: 'PLANNER_RESPONSE',
        tool_calls: [{ name: 'view_file', args: { AbsolutePath: file1 } }],
      },
      {
        step_index: 3,
        type: 'PLANNER_RESPONSE',
        tool_calls: [{ name: 'view_file', args: { AbsolutePath: file1 } }],
      },
    ]);

    const resSliceAndReviewer = checkViewGuard({
      transcriptPath: reviewerTranscript,
      workspacePaths: [testDir],
      toolCall: {
        name: 'view_file',
        args: { AbsolutePath: file1, StartLine: 101, EndLine: 200 },
      },
    });
    expect(resSliceAndReviewer?.decision).toBe('allow');
  });

  it('allows planner to re-read already viewed target files', () => {
    const file1 = createDummyFile(
      '.agents/hooks/guard/__tests__/fixtures-view/src/feat-a.ts',
    );
    const file2 = createDummyFile(
      '.agents/hooks/guard/__tests__/fixtures-view/src/feat-b.ts',
    );

    const transcript = createTranscript([
      { step_index: 0, type: 'USER_INPUT', content: 'Implement new feature' },
      {
        step_index: 1,
        type: 'PLANNER_RESPONSE',
        tool_calls: [{ name: 'view_file', args: { AbsolutePath: file1 } }],
      },
      {
        step_index: 2,
        type: 'PLANNER_RESPONSE',
        tool_calls: [{ name: 'view_file', args: { AbsolutePath: file2 } }],
      },
    ]);

    // file1 の再読込は許可されるべき（ユニーク件数は2件のまま）
    const res = checkViewGuard({
      transcriptPath: transcript,
      workspacePaths: [testDir],
      toolCall: {
        name: 'view_file',
        args: { AbsolutePath: file1 },
      },
    });

    expect(res?.decision).toBe('allow');
  });

  it('does not count non-investigation files (tasks, docs, .agents, package.json)', () => {
    const taskFile = createDummyFile(
      '.agents/hooks/guard/__tests__/fixtures-view/tasks/TASK-001.md',
    );
    const docFile = createDummyFile(
      '.agents/hooks/guard/__tests__/fixtures-view/docs/overview.md',
    );
    const agentFile = createDummyFile(
      '.agents/hooks/guard/__tests__/fixtures-view/.agents/rules/test.md',
    );
    const file1 = createDummyFile(
      '.agents/hooks/guard/__tests__/fixtures-view/src/feat-a.ts',
    );

    const transcript = createTranscript([
      { step_index: 0, type: 'USER_INPUT', content: 'Implement new feature' },
      {
        step_index: 1,
        type: 'PLANNER_RESPONSE',
        tool_calls: [
          { name: 'view_file', args: { AbsolutePath: taskFile } },
          { name: 'view_file', args: { AbsolutePath: docFile } },
          { name: 'view_file', args: { AbsolutePath: agentFile } },
        ],
      },
    ]);

    // 非コードファイルを複数読んだ後でも、src/feat-a.ts は 1ファイル目として許可される
    const res = checkViewGuard({
      transcriptPath: transcript,
      workspacePaths: [testDir],
      toolCall: {
        name: 'view_file',
        args: { AbsolutePath: file1 },
      },
    });
    expect(res?.decision).toBe('allow');

    // 別の docs ファイルを読むのも許可される
    const docFile2 = createDummyFile(
      '.agents/hooks/guard/__tests__/fixtures-view/docs/arch.md',
    );
    const resDoc = checkViewGuard({
      transcriptPath: transcript,
      workspacePaths: [testDir],
      toolCall: {
        name: 'view_file',
        args: { AbsolutePath: docFile2 },
      },
    });
    expect(resDoc?.decision).toBe('allow');
  });

  it('resets investigation count across USER_INPUT boundaries', () => {
    const file1 = createDummyFile(
      '.agents/hooks/guard/__tests__/fixtures-view/src/feat-a.ts',
    );
    const file2 = createDummyFile(
      '.agents/hooks/guard/__tests__/fixtures-view/src/feat-b.ts',
    );
    const file3 = createDummyFile(
      '.agents/hooks/guard/__tests__/fixtures-view/src/feat-c.ts',
    );

    // 前回のユーザー入力で file1, file2 を読んだ後、新しい USER_INPUT が届いた
    const transcript = createTranscript([
      { step_index: 0, type: 'USER_INPUT', content: 'Previous request' },
      {
        step_index: 1,
        type: 'PLANNER_RESPONSE',
        tool_calls: [
          { name: 'view_file', args: { AbsolutePath: file1 } },
          { name: 'view_file', args: { AbsolutePath: file2 } },
        ],
      },
      { step_index: 2, type: 'USER_INPUT', content: 'Brand new request' },
    ]);

    // 新しいユーザー入力以降はカウントがリセットされるため、file3 の読込は許可される
    const res = checkViewGuard({
      transcriptPath: transcript,
      workspacePaths: [testDir],
      toolCall: {
        name: 'view_file',
        args: { AbsolutePath: file3 },
      },
    });
    expect(res?.decision).toBe('allow');
  });

  it('does not restrict scout or worker from reading multiple source files', () => {
    const file1 = createDummyFile(
      '.agents/hooks/guard/__tests__/fixtures-view/src/feat-a.ts',
    );
    const file2 = createDummyFile(
      '.agents/hooks/guard/__tests__/fixtures-view/src/feat-b.ts',
    );
    const file3 = createDummyFile(
      '.agents/hooks/guard/__tests__/fixtures-view/src/feat-c.ts',
    );

    // Scout ロールの transcript (SCOUT_REQUEST から開始)
    const scoutTranscript = createTranscript([
      {
        step_index: 0,
        type: 'SYSTEM_MESSAGE',
        content: 'type: "SCOUT_REQUEST"\nInvestigate files',
      },
      {
        step_index: 1,
        type: 'PLANNER_RESPONSE',
        tool_calls: [
          { name: 'view_file', args: { AbsolutePath: file1 } },
          { name: 'view_file', args: { AbsolutePath: file2 } },
        ],
      },
    ]);

    // Scout が 3ファイル目を読んでも deny されない
    const resScout = checkViewGuard({
      transcriptPath: scoutTranscript,
      workspacePaths: [testDir],
      toolCall: {
        name: 'view_file',
        args: { AbsolutePath: file3 },
      },
    });
    expect(resScout?.decision).toBe('allow');

    // Auditor ロールの transcript (AUDIT_REQUEST から開始)
    const auditorTranscript = createTranscript([
      {
        step_index: 0,
        type: 'SYSTEM_MESSAGE',
        content: 'type: "AUDIT_REQUEST"\nAudit session',
      },
      {
        step_index: 1,
        type: 'PLANNER_RESPONSE',
        tool_calls: [
          { name: 'view_file', args: { AbsolutePath: file1 } },
          { name: 'view_file', args: { AbsolutePath: file2 } },
        ],
      },
    ]);

    // Auditor が 3ファイル目を読んでも deny されない
    const resAuditor = checkViewGuard({
      transcriptPath: auditorTranscript,
      workspacePaths: [testDir],
      toolCall: {
        name: 'view_file',
        args: { AbsolutePath: file3 },
      },
    });
    expect(resAuditor?.decision).toBe('allow');
  });
});

describe('view-filter: small file transparent overwrite', () => {
  const testDir = path.resolve(
    '.agents/hooks/guard/__tests__/fixtures-small-view',
  );

  beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('transparently overwrites slice arguments to whole file for small files (<=400 lines)', () => {
    const smallFile = path.join(testDir, 'small.ts');
    fs.writeFileSync(
      smallFile,
      Array.from({ length: 50 }, (_, i) => `// line ${i + 1}`).join('\n'),
    );

    const res = checkViewGuard({
      toolCall: {
        name: 'view_file',
        args: { AbsolutePath: smallFile, StartLine: 10, EndLine: 30 },
      },
    });

    expect(res?.decision).toBe('allow');
    expect(res?.overwrite).toEqual({
      StartLine: 1,
      EndLine: 50,
    });
  });
});
