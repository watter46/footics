import { describe, expect, it } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  extractDeletedTargetFiles,
  extractTaskCommitMessage,
  validateTaskMarkdown,
} from '../validate-task';

describe('validate-task.ts', () => {
  it('extracts commit message and [DELETE] target files accurately', () => {
    const md = [
      '# TASK-200: Clean up legacy store',
      '- **Status**: `TODO`',
      '- **Commit**: `refactor(tactical): remove legacy canvas store`',
      '### Phase 1: Remove store',
      '- **Target Files**:',
      '  - `[MODIFY]` `src/a.ts`',
      '  - `[DELETE]` `src/old-store.ts`',
    ].join('\n');

    expect(extractTaskCommitMessage(md)).toBe(
      'refactor(tactical): remove legacy canvas store',
    );
    expect(extractDeletedTargetFiles(md)).toEqual(['src/old-store.ts']);
  });

  it('rejects lazy code block placeholders (// ..., // 既存のまま)', () => {
    const md = [
      '# TASK-201',
      '- **Status**: `TODO`',
      '- **Commit**: `feat: add x`',
      '### Phase 1: Core',
      '- **Target Files**: `[MODIFY]` `src/a.ts`',
      '```ts',
      'export function foo() {',
      '  // 既存のまま',
      '}',
      '```',
    ].join('\n');

    const res = validateTaskMarkdown('tasks/TASK-201.md', md, {
      checkNewFormat: true,
    });
    expect(res.ok).toBe(false);
    expect(res.errors[0]).toContain('lazy placeholder');
  });

  it('rejects DONE task if a [DELETE] file still exists on disk', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'task-val-'));
    const zombieFile = path.join(tmpDir, 'zombie.ts');
    fs.writeFileSync(zombieFile, 'export const old = 1;');

    const md = [
      '# TASK-202',
      '- **Status**: `DONE`',
      '- **Commit**: `refactor: delete zombie`',
      '### Phase 1: Delete',
      '- **Target Files**: `[DELETE]` `zombie.ts`',
      '- [x] Deleted zombie.ts',
    ].join('\n');

    const res = validateTaskMarkdown('tasks/TASK-202.md', md, { cwd: tmpDir });
    expect(res.ok).toBe(false);
    expect(res.errors[0]).toContain(
      "marked as [DELETE] ('zombie.ts') still exists",
    );

    fs.unlinkSync(zombieFile);
    const resAfterDelete = validateTaskMarkdown('tasks/TASK-202.md', md, {
      cwd: tmpDir,
    });
    expect(resAfterDelete.ok).toBe(true);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('rejects task files exceeding 800 lines', () => {
    const hugeTask = [
      '# TASK-203',
      '- **Status**: `TODO`',
      '- **Commit**: `feat: huge`',
      '### Phase 1: Core',
      '- **Target Files**: `[MODIFY]` `src/a.ts`',
      ...new Array(850).fill('- line item'),
    ].join('\n');

    const res = validateTaskMarkdown('tasks/TASK-203.md', hugeTask);
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.includes('exceeds 800 lines'))).toBe(true);
  });

  it('rejects task files containing code blocks exceeding 120 lines', () => {
    const massiveBlockTask = [
      '# TASK-204',
      '- **Status**: `TODO`',
      '- **Commit**: `feat: massive block`',
      '### Phase 1: Core',
      '- **Target Files**: `[MODIFY]` `src/a.ts`',
      '```ts',
      ...new Array(130).fill('const x = 1;'),
      '```',
    ].join('\n');

    const res = validateTaskMarkdown('tasks/TASK-204.md', massiveBlockTask);
    expect(res.ok).toBe(false);
    expect(
      res.errors.some(
        (e) =>
          e.includes('exceeds 120 lines') &&
          e.includes('Full file copy-pasting is strictly prohibited'),
      ),
    ).toBe(true);
  });
});
