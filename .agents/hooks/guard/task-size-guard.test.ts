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

  it('allows task files under 250 lines and 5 phases', () => {
    const payload = {
      toolCall: {
        name: 'write_to_file',
        args: {
          TargetFile: 'tasks/TASK-099-small.md',
          CodeContent: '# TASK-099\n### Phase 1\n### Phase 2\n',
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
        name: 'write_to_file',
        args: {
          TargetFile: 'tasks/TASK-099-big.md',
          CodeContent: code,
        },
      },
    };
    const res = checkTaskSizeGuard(payload);
    expect(res).not.toBeNull();
    expect(res?.decision).toBe('deny');
    expect(res?.reason).toContain('Task file limit exceeded');
    expect(res?.reason).toContain('TASK-003');
  });

  it('allows detailed task files exceeding 250 lines when phases <= 5 and files per phase <= 6', () => {
    const detailedLines = [
      '# TASK-099',
      '### Phase 1: Core',
      '- **対象ファイル**: `src/a.ts`, `src/b.ts`, `src/a.test.ts`',
      ...new Array(300).fill('// detailed invariant or concrete test value'),
      '### Phase 2: UI',
      '- **対象ファイル**: `src/c.tsx`, `src/c.test.tsx`',
    ].join('\n');

    const payload = {
      toolCall: {
        name: 'write_to_file',
        args: {
          TargetFile: 'tasks/TASK-099-detailed.md',
          CodeContent: detailedLines,
        },
      },
    };
    expect(checkTaskSizeGuard(payload)).toEqual({ decision: 'allow' });
  });

  it('denies a phase that packs more than 6 target files', () => {
    const code = [
      '# TASK-099',
      '### Phase 1: Overstuffed Phase',
      '- **対象ファイル**: `src/1.ts`, `src/2.ts`, `src/3.ts`, `src/4.ts`, `src/5.ts`, `src/1.test.ts`, `src/2.test.ts`',
    ].join('\n');

    const payload = {
      toolCall: {
        name: 'write_to_file',
        args: {
          TargetFile: 'tasks/TASK-099-overstuffed.md',
          CodeContent: code,
        },
      },
    };
    const res = checkTaskSizeGuard(payload);
    expect(res?.decision).toBe('deny');
    expect(res?.reason).toContain('Phase file limit exceeded');
  });

  it('denies appending a new phase to a task file already marked as DONE', () => {
    const tmpDoneFile = path.resolve('tasks/TASK-999-tmp-done.md');
    fs.writeFileSync(
      tmpDoneFile,
      '# TASK-999\n## 1. Metadata\n- **Status**: `DONE`\n## 4. Implementation Phases\n### Phase 1: Init\n',
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
});
