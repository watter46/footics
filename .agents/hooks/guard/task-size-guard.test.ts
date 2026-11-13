import { describe, expect, it } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { checkTaskSizeGuard } from './task-size-guard';

describe('checkTaskSizeGuard', () => {
  it('allows non-task file modifications', () => {
    const payload = {
      toolCall: {
        name: 'replace_file_content',
        args: {
          TargetFile: 'src/components/button.tsx',
          ReplacementContent: 'const x = 1;',
        },
      },
    };
    expect(checkTaskSizeGuard(payload)).toBeNull();
  });

  it('allows contract task files within 400 lines, 5 phases, 4 active files/phase, and 40-line code blocks', () => {
    const payload = {
      toolCall: {
        name: 'write_file',
        args: {
          Path: 'tasks/TASK-099-small.md',
          Content: [
            '# TASK-099',
            '### Phase 1: Core',
            '- **Target Files**:',
            '  - `[MODIFY]` `src/1.ts`',
            '  - `[MODIFY]` `src/2.ts`',
            '  - `[ADD]` `src/3.ts`',
            '  - `[ADD]` `src/1.test.ts`',
            '  - `[DELETE]` `src/old-1.ts`',
            '  - `[DELETE]` `src/old-2.ts`',
            '```ts',
            ...new Array(35).fill('export type X = number;'),
            '```',
          ].join('\n'),
        },
      },
    };
    expect(checkTaskSizeGuard(payload)).toEqual({ decision: 'allow' });
  });

  it('denies task files with more than 5 phases', () => {
    const code =
      '# TASK-099\n' +
      '### Phase 1\n' +
      '### Phase 2\n' +
      '### Phase 3\n' +
      '### Phase 4\n' +
      '### Phase 5\n' +
      '### Phase 6: Extra Phase\n';

    const payload = {
      toolCall: {
        name: 'write_file',
        args: {
          Path: 'tasks/TASK-099-big.md',
          Content: code,
        },
      },
    };
    const res = checkTaskSizeGuard(payload);
    expect(res?.decision).toBe('deny');
    expect(res?.reason).toContain('Task file limit exceeded');
  });

  it('denies a phase that packs more than 4 active target files ([DELETE] excluded)', () => {
    const code = [
      '# TASK-099',
      '### Phase 1: Overstuffed Phase',
      '- **Target Files**:',
      '  - `[MODIFY]` `src/1.ts`',
      '  - `[MODIFY]` `src/2.ts`',
      '  - `[MODIFY]` `src/3.ts`',
      '  - `[MODIFY]` `src/4.ts`',
      '  - `[ADD]` `src/1.test.ts`',
      '  - `[DELETE]` `src/old.ts`',
    ].join('\n');

    const payload = {
      toolCall: {
        name: 'write_file',
        args: {
          Path: 'tasks/TASK-099-overstuffed.md',
          Content: code,
        },
      },
    };
    const res = checkTaskSizeGuard(payload);
    expect(res?.decision).toBe('deny');
    expect(res?.reason).toContain('Phase file limit exceeded');
    expect(res?.reason).toContain('<=4 active files');
  });

  it('denies appending a new phase to a task file already marked as DONE', () => {
    const tmpDoneFile = path.resolve('tasks/TASK-999-tmp-done.md');
    fs.writeFileSync(
      tmpDoneFile,
      '# TASK-999\n- **Status**: `DONE`\n### Phase 1: Init\n',
      'utf8',
    );

    try {
      const payload = {
        toolCall: {
          name: 'edit_file',
          args: {
            Path: tmpDoneFile,
            Target: '### Phase 1: Init\n',
            Replacement: '### Phase 1: Init\n### Phase 2: Post-DONE addition\n',
          },
        },
      };
      const res = checkTaskSizeGuard(payload);
      expect(res?.decision).toBe('deny');
      expect(res?.reason).toContain('already marked as DONE');
    } finally {
      if (fs.existsSync(tmpDoneFile)) {
        fs.unlinkSync(tmpDoneFile);
      }
    }
  });

  it('denies task files exceeding 400 lines limit', () => {
    const hugeTask = [
      '# TASK-099',
      '### Phase 1: Massive Scope',
      '- **Target Files**: `[MODIFY]` `src/1.ts`',
      ...new Array(410).fill('- line item contract'),
    ].join('\n');

    const payload = {
      toolCall: {
        name: 'write_file',
        args: {
          Path: 'tasks/TASK-099-huge.md',
          Content: hugeTask,
        },
      },
    };
    const res = checkTaskSizeGuard(payload);
    expect(res?.decision).toBe('deny');
    expect(res?.reason).toContain('Task file line limit exceeded');
    expect(res?.reason).toContain('<=400 lines');
  });

  it('denies task files containing code blocks over 40 lines', () => {
    const codeWithMassiveBlock = [
      '# TASK-099',
      '### Phase 1: Core',
      '- **Target Files**: `[MODIFY]` `src/1.ts`',
      '```ts',
      ...new Array(45).fill('const x = 1;'),
      '```',
    ].join('\n');

    const payload = {
      toolCall: {
        name: 'write_file',
        args: {
          Path: 'tasks/TASK-099-massive-block.md',
          Content: codeWithMassiveBlock,
        },
      },
    };
    const res = checkTaskSizeGuard(payload);
    expect(res?.decision).toBe('deny');
    expect(res?.reason).toContain('Oversized code block detected');
    expect(res?.reason).toContain('<= 40 lines');
  });
});
