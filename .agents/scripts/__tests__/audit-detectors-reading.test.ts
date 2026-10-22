import { describe, expect, test } from 'bun:test';
import {
  detectDuplicateRead,
  detectEditWithoutRawRead,
  detectHeavyReadTop,
  detectLargeFullBlind,
  detectRawLogRead,
  detectReadUnused,
  detectRtkReadBasis,
  detectSeqSlicing,
  detectSmallSliced,
  detectWorkerExplores,
  READING_DETECTORS,
} from '../lib/audit/detectors/reading';
import type { AuditContext } from '../lib/audit/types';

describe('audit-session Phase 1-3: reading detectors (READ-01〜READ-10)', () => {
  describe('READ-01: SMALL_SLICED', () => {
    test('detects slicing a file that has <= 400 lines', () => {
      const ctx: AuditContext = {
        sessionId: 'test-small-sliced',
        role: 'planner',
        childIds: [],
        records: [
          {
            step_index: 1,
            type: 'PLANNER_RESPONSE',
            tool_calls: [
              {
                name: 'view_file',
                args: {
                  AbsolutePath: 'src/small.ts',
                  StartLine: 1,
                  EndLine: 50,
                },
              },
            ],
          },
          {
            step_index: 2,
            type: 'GENERIC',
            status: 'DONE',
            content: 'Showing lines 1-50 of 120\n1: export const a = 1;',
          },
        ],
      };

      const findings = detectSmallSliced(ctx);
      expect(findings.length).toBe(1);
      expect(findings[0].id).toBe('READ-01');
      expect(findings[0].severity).toBe('MED');
    });
  });

  describe('READ-02: SEQ_SLICING', () => {
    test('detects sequential slicing on same file or slicing denial', () => {
      const ctx: AuditContext = {
        sessionId: 'test-seq-slicing',
        role: 'planner',
        childIds: [],
        records: [
          {
            step_index: 10,
            type: 'PLANNER_RESPONSE',
            tool_calls: [
              {
                name: 'read_file',
                args: { Path: 'src/ghost.ts', StartLine: 1, EndLine: 50 },
              },
            ],
          },
          {
            step_index: 12,
            type: 'PLANNER_RESPONSE',
            tool_calls: [
              {
                name: 'read_file',
                args: { Path: 'src/ghost.ts', StartLine: 51, EndLine: 100 },
              },
            ],
          },
        ],
      };

      const findings = detectSeqSlicing(ctx);
      expect(findings.length).toBe(1);
      expect(findings[0].id).toBe('READ-02');
      expect(findings[0].severity).toBe('HIGH');
    });
  });

  describe('READ-03: LARGE_FULL_BLIND', () => {
    test('detects full file read on 400+ lines file without preceding grep/outline', () => {
      const ctx: AuditContext = {
        sessionId: 'test-large-full',
        role: 'planner',
        childIds: [],
        records: [
          {
            step_index: 1,
            type: 'PLANNER_RESPONSE',
            tool_calls: [
              { name: 'view_file', args: { AbsolutePath: 'src/large.ts' } },
            ],
          },
          {
            step_index: 2,
            type: 'GENERIC',
            status: 'DONE',
            content: 'Showing lines 1-600 of 600\n1: // large file',
          },
        ],
      };

      const findings = detectLargeFullBlind(ctx);
      expect(findings.length).toBe(1);
      expect(findings[0].id).toBe('READ-03');
      expect(findings[0].severity).toBe('MED');
    });
  });

  describe('READ-04: DUPLICATE_READ', () => {
    test('detects reading identical file without intervening edit', () => {
      const ctx: AuditContext = {
        sessionId: 'test-dup-read',
        role: 'worker',
        childIds: [],
        records: [
          {
            step_index: 1,
            type: 'PLANNER_RESPONSE',
            tool_calls: [
              { name: 'view_file', args: { AbsolutePath: 'src/mod.ts' } },
            ],
          },
          {
            step_index: 3,
            type: 'PLANNER_RESPONSE',
            tool_calls: [
              { name: 'view_file', args: { AbsolutePath: 'src/mod.ts' } },
            ],
          },
        ],
      };

      const findings = detectDuplicateRead(ctx);
      expect(findings.length).toBe(1);
      expect(findings[0].id).toBe('READ-04');
      expect(findings[0].severity).toBe('LOW');
    });
  });

  describe('READ-05: EDIT_WITHOUT_RAW_READ', () => {
    test('detects worker editing a file without reading it first', () => {
      const ctx: AuditContext = {
        sessionId: 'test-blind-edit',
        role: 'worker',
        childIds: [],
        records: [
          {
            step_index: 5,
            type: 'PLANNER_RESPONSE',
            tool_calls: [
              { name: 'edit_file', args: { Path: 'src/unseen.ts' } },
            ],
          },
        ],
      };

      const findings = detectEditWithoutRawRead(ctx);
      expect(findings.length).toBe(1);
      expect(findings[0].id).toBe('READ-05');
      expect(findings[0].severity).toBe('HIGH');
    });
  });

  describe('READ-06: RTK_READ_BASIS', () => {
    test('detects edit based only on rtk read -m', () => {
      const ctx: AuditContext = {
        sessionId: 'test-rtk-read-basis',
        role: 'worker',
        childIds: [],
        records: [
          {
            step_index: 1,
            type: 'PLANNER_RESPONSE',
            tool_calls: [
              {
                name: 'run_command',
                args: { CommandLine: 'rtk read -m 1:30 src/foo.ts' },
              },
            ],
          },
          {
            step_index: 2,
            type: 'PLANNER_RESPONSE',
            tool_calls: [{ name: 'edit_file', args: { Path: 'src/foo.ts' } }],
          },
        ],
      };

      const findings = detectRtkReadBasis(ctx);
      expect(findings.length).toBe(1);
      expect(findings[0].id).toBe('READ-06');
      expect(findings[0].severity).toBe('HIGH');
    });
  });

  describe('READ-07: RAW_LOG_READ', () => {
    test('detects direct transcript read attempt', () => {
      const ctx: AuditContext = {
        sessionId: 'test-raw-log',
        role: 'auditor',
        childIds: [],
        records: [
          {
            step_index: 10,
            type: 'PLANNER_RESPONSE',
            tool_calls: [
              {
                name: 'run_command',
                args: {
                  CommandLine:
                    'cat /brain/xyz/.system_generated/logs/transcript.jsonl',
                },
              },
            ],
          },
        ],
      };

      const findings = detectRawLogRead(ctx);
      expect(findings.length).toBe(1);
      expect(findings[0].id).toBe('READ-07');
      expect(findings[0].severity).toBe('HIGH');
    });
  });

  describe('READ-08: HEAVY_READ_TOP', () => {
    test('outputs top read files as INFO', () => {
      const ctx: AuditContext = {
        sessionId: 'test-heavy',
        role: 'planner',
        childIds: [],
        records: [
          {
            step_index: 1,
            type: 'PLANNER_RESPONSE',
            tool_calls: [
              { name: 'view_file', args: { AbsolutePath: 'src/big.ts' } },
            ],
          },
          {
            step_index: 2,
            type: 'GENERIC',
            status: 'DONE',
            content: `Showing lines 1-500 of 500\n${'line\n'.repeat(500)}`,
          },
        ],
      };

      const findings = detectHeavyReadTop(ctx);
      expect(findings.length).toBe(1);
      expect(findings[0].id).toBe('READ-08');
      expect(findings[0].severity).toBe('INFO');
    });
  });

  describe('READ-09: READ_UNUSED', () => {
    test('detects reading file whose name is never mentioned again in planner session', () => {
      const ctx: AuditContext = {
        sessionId: 'test-unused-read',
        role: 'planner',
        childIds: [],
        records: [
          {
            step_index: 1,
            type: 'PLANNER_RESPONSE',
            tool_calls: [
              {
                name: 'view_file',
                args: { AbsolutePath: 'src/forgotten-widget.ts' },
              },
            ],
          },
          {
            step_index: 2,
            type: 'GENERIC',
            status: 'DONE',
            content: 'Showing lines 1-10 of 10\ncontent',
          },
          {
            step_index: 3,
            type: 'PLANNER_RESPONSE',
            content:
              'Now let us implement features in other-place.ts without ever mentioning that file',
          },
        ],
      };

      const findings = detectReadUnused(ctx);
      expect(findings.length).toBe(1);
      expect(findings[0].id).toBe('READ-09');
      expect(findings[0].severity).toBe('LOW');
    });
  });

  describe('READ-10: WORKER_EXPLORES', () => {
    test('detects worker reading outside files not listed in initial task assign prompt', () => {
      const ctx: AuditContext = {
        sessionId: 'test-worker-explores',
        role: 'worker',
        childIds: [],
        records: [
          {
            step_index: 0,
            type: 'SYSTEM_MESSAGE',
            content:
              'type: "TASK_ASSIGN"\ntarget: "tasks/TASK-001.md"\nfiles: ["src/target.ts"]',
          },
          {
            step_index: 1,
            type: 'PLANNER_RESPONSE',
            tool_calls: [
              {
                name: 'view_file',
                args: { AbsolutePath: 'src/unrelated-other.ts' },
              },
            ],
          },
        ],
      };

      const findings = detectWorkerExplores(ctx);
      expect(findings.length).toBe(1);
      expect(findings[0].id).toBe('READ-10');
      expect(findings[0].severity).toBe('MED');
    });
  });

  test('READING_DETECTORS exports all 10 detectors', () => {
    expect(READING_DETECTORS.length).toBe(10);
  });
});
