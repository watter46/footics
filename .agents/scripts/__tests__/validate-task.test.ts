import { describe, expect, it } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  extractDeletedTargetFiles,
  extractNegativeContracts,
  extractTaskCommitMessage,
  validateTaskMarkdown,
} from '../validate-task';

function buildValidTask(
  overrides: Partial<{
    status: string;
    commit: string;
    waves: string;
    negContracts: string;
    invariants: string;
    phases: string;
  }> = {},
): string {
  return [
    '# TASK-200: Sample Contract Task',
    '',
    `- **Status**: \`${overrides.status ?? 'TODO'}\``,
    `- **Commit**: \`${overrides.commit ?? 'refactor(tactical): sample change'}\``,
    overrides.waves ??
      '- **Execution Waves**:\n  - Wave 1: Phase 1 (sequential)',
    overrides.negContracts ?? '- **Negative Contracts**:\n  - `none`',
    '',
    overrides.invariants ??
      '## 1. Architectural Invariants & Design Decisions\n- Keep pure domain functions.',
    '',
    '## 2. Implementation Phases',
    '',
    overrides.phases ??
      [
        '### Phase 1: Core update',
        '- **Target Files**:',
        '  - `[MODIFY]` `src/a.ts` (`fnA`, L10-L30)',
        '  - `[ADD]` `src/a.test.ts`',
        '- **Contract**:',
        '  ```ts',
        '  export function fnA(x: number): number;',
        '  ```',
      ].join('\n'),
  ].join('\n');
}

describe('validate-task.ts', () => {
  it('validates a well-formed contract task and extracts metadata', () => {
    const md = buildValidTask({
      negContracts:
        '- **Negative Contracts**:\n  - `rg: OldSymbolName`\n  - `absent: src/old-store.ts`',
      phases: [
        '### Phase 1: Remove store',
        '- **Target Files**:',
        '  - `[MODIFY]` `src/a.ts`',
        '  - `[DELETE]` `src/old-store.ts`',
      ].join('\n'),
    });

    expect(extractTaskCommitMessage(md)).toBe(
      'refactor(tactical): sample change',
    );
    expect(extractDeletedTargetFiles(md)).toEqual(['src/old-store.ts']);
    expect(extractNegativeContracts(md)).toEqual([
      { kind: 'rg', pattern: 'OldSymbolName', raw: '`rg: OldSymbolName`' },
      {
        kind: 'absent',
        filePath: 'src/old-store.ts',
        raw: '`absent: src/old-store.ts`',
      },
    ]);

    const res = validateTaskMarkdown('tasks/TASK-200.md', md);
    expect(res.ok).toBe(true);
  });

  it('rejects lazy code block placeholders (// ..., // 既存のまま)', () => {
    const md = buildValidTask({
      phases: [
        '### Phase 1: Core',
        '- **Target Files**: `[MODIFY]` `src/a.ts`',
        '```ts',
        'export function foo(): void {',
        '  // 既存のまま',
        '}',
        '```',
      ].join('\n'),
    });

    const res = validateTaskMarkdown('tasks/TASK-201.md', md);
    expect(res.ok).toBe(false);
    expect(res.errors[0]).toContain('lazy placeholder');
  });

  it('rejects legacy Before/After dumps, Worker Model, Worker Handoff Log, and Rejections', () => {
    const mdBefore = buildValidTask({
      phases: [
        '### Phase 1: Legacy',
        '- **Target Files**: `[MODIFY]` `src/a.ts`',
        '**Before:**',
        '```ts\nconst x = 1;\n```',
      ].join('\n'),
    });
    const resBefore = validateTaskMarkdown('tasks/TASK-202.md', mdBefore);
    expect(resBefore.ok).toBe(false);
    expect(resBefore.errors.some((e) => e.includes('Before'))).toBe(true);

    const mdLegacyMeta = `${buildValidTask()}\n- **Worker Model**: \`flash\`\n`;
    const resMeta = validateTaskMarkdown('tasks/TASK-203.md', mdLegacyMeta);
    expect(resMeta.ok).toBe(false);
    expect(resMeta.errors.some((e) => e.includes('abolished legacy'))).toBe(
      true,
    );
  });

  it('rejects task files exceeding 400 lines or code blocks exceeding 40 lines', () => {
    const hugeTask = [buildValidTask(), ...new Array(410).fill('- item')].join(
      '\n',
    );
    const resHuge = validateTaskMarkdown('tasks/TASK-204.md', hugeTask);
    expect(resHuge.ok).toBe(false);
    expect(resHuge.errors.some((e) => e.includes('exceeds 400 lines'))).toBe(
      true,
    );

    const largeBlockTask = buildValidTask({
      phases: [
        '### Phase 1: Core',
        '- **Target Files**: `[MODIFY]` `src/a.ts`',
        '```ts',
        ...new Array(45).fill('export type A = string;'),
        '```',
      ].join('\n'),
    });
    const resBlock = validateTaskMarkdown('tasks/TASK-205.md', largeBlockTask);
    expect(resBlock.ok).toBe(false);
    expect(resBlock.errors.some((e) => e.includes('exceeds 40 lines'))).toBe(
      true,
    );
  });

  it('enforces <= 4 active files per phase ([DELETE] excluded) and <= 5 phases', () => {
    const overstuffed = buildValidTask({
      phases: [
        '### Phase 1: Too many files',
        '- **Target Files**:',
        '  - `[MODIFY]` `src/1.ts`',
        '  - `[MODIFY]` `src/2.ts`',
        '  - `[MODIFY]` `src/3.ts`',
        '  - `[MODIFY]` `src/4.ts`',
        '  - `[ADD]` `src/5.test.ts`',
        '  - `[DELETE]` `src/old.ts`',
      ].join('\n'),
    });
    const resOver = validateTaskMarkdown('tasks/TASK-206.md', overstuffed);
    expect(resOver.ok).toBe(false);
    expect(resOver.errors.some((e) => e.includes('hard limit: <= 4'))).toBe(
      true,
    );

    const okWithDelete = buildValidTask({
      phases: [
        '### Phase 1: 4 active + 2 delete',
        '- **Target Files**:',
        '  - `[MODIFY]` `src/1.ts`',
        '  - `[MODIFY]` `src/2.ts`',
        '  - `[MODIFY]` `src/3.ts`',
        '  - `[ADD]` `src/1.test.ts`',
        '  - `[DELETE]` `src/old-1.ts`',
        '  - `[DELETE]` `src/old-2.ts`',
      ].join('\n'),
    });
    expect(validateTaskMarkdown('tasks/TASK-207.md', okWithDelete).ok).toBe(
      true,
    );
  });

  it('verifies [DELETE] and Negative Contracts (rg: and absent:) against filesystem on DONE', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'task-val-'));
    try {
      const srcDir = path.join(tmpDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      const zombieFile = path.join(srcDir, 'zombie.ts');
      const consumerFile = path.join(srcDir, 'consumer.ts');
      fs.writeFileSync(zombieFile, 'export const old = 1;');
      fs.writeFileSync(consumerFile, 'import { LegacyApi } from "./zombie";');

      const md = buildValidTask({
        status: 'DONE',
        negContracts:
          '- **Negative Contracts**:\n  - `rg(src): LegacyApi`\n  - `absent: src/zombie.ts`',
        phases: [
          '### Phase 1: Delete',
          '- **Target Files**:',
          '  - `[MODIFY]` `src/consumer.ts`',
          '  - `[DELETE]` `src/zombie.ts`',
        ].join('\n'),
      });

      const failRes = validateTaskMarkdown('tasks/TASK-208.md', md, {
        cwd: tmpDir,
      });
      expect(failRes.ok).toBe(false);
      expect(
        failRes.errors.some((e) =>
          e.includes("marked as [DELETE] ('src/zombie.ts')"),
        ),
      ).toBe(true);
      expect(
        failRes.errors.some((e) =>
          e.includes(
            "File marked absent still exists on disk: 'src/zombie.ts'",
          ),
        ),
      ).toBe(true);
      expect(
        failRes.errors.some((e) =>
          e.includes("Prohibited pattern 'LegacyApi' still matched"),
        ),
      ).toBe(true);

      // Fix both conditions
      fs.unlinkSync(zombieFile);
      fs.writeFileSync(consumerFile, 'export const clean = true;\n');

      const passRes = validateTaskMarkdown('tasks/TASK-208.md', md, {
        cwd: tmpDir,
      });
      expect(passRes.ok).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
