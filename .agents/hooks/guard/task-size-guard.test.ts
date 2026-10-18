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

  it('denies task files exceeding 250 lines on write_to_file', () => {
    const lines = new Array(260).fill('some task line').join('\n');
    const payload = {
      toolCall: {
        name: 'write_to_file',
        args: {
          TargetFile: 'tasks/TASK-099-long.md',
          CodeContent: lines,
        },
      },
    };
    const res = checkTaskSizeGuard(payload);
    expect(res?.decision).toBe('deny');
    expect(res?.reason).toContain('Task file limit exceeded');
  });
});
