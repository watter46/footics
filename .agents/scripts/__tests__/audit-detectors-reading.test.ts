import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  detectCompactLoopAlert,
  detectDuplicateRead,
  detectEditWithoutRawRead,
  detectHeavyReadTop,
  detectLargeFullBlind,
  detectRawLogRead,
  detectReadUnused,
  detectRtkReadBasis,
  detectSeqSlicing,
  detectWorkerExplores,
  READING_DETECTORS,
} from '../lib/audit/detectors/reading';
import type { AuditContext } from '../lib/audit/types';

describe('audit-session Phase 1-3: reading detectors (READ-02〜READ-11)', () => {
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
    test('detects full file read on 151+ lines file without preceding peek/impact/rg', () => {
      const ctx: AuditContext = {
        sessionId: 'test-large-full',
        role: 'planner',
        childIds: [],
        records: [
          {
            step_index: 1,
            type: 'PLANNER_RESPONSE',
            tool_calls: [
              { name: 'read_file', args: { Path: 'src/medium.ts' } },
            ],
          },
          {
            step_index: 2,
            type: 'GENERIC',
            status: 'DONE',
            content: 'Showing lines 1-180 of 180\n1: // medium file',
          },
        ],
      };

      const findings = detectLargeFullBlind(ctx);
      expect(findings.length).toBe(1);
      expect(findings[0].id).toBe('READ-03');
      expect(findings[0].severity).toBe('MED');
    });

    test('returns empty if multi-arg ai:peek or :Symbol probe already inspected the file', () => {
      const ctx: AuditContext = {
        sessionId: 'test-large-peeked',
        role: 'planner',
        childIds: [],
        records: [
          {
            step_index: 1,
            type: 'PLANNER_RESPONSE',
            tool_calls: [
              {
                name: 'run_command',
                args: {
                  CommandLine:
                    'bun run ai:peek src/other.ts src/large.ts:MyFunc',
                },
              },
            ],
          },
          {
            step_index: 2,
            type: 'PLANNER_RESPONSE',
            tool_calls: [{ name: 'read_file', args: { Path: 'src/large.ts' } }],
          },
          {
            step_index: 3,
            type: 'GENERIC',
            status: 'DONE',
            content: 'Showing lines 1-600 of 600\n1: // large file',
          },
        ],
      };

      expect(detectLargeFullBlind(ctx).length).toBe(0);
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

    test('normalizes relative/absolute paths and handles write_file Overwrite', () => {
      const absPath = `${process.cwd()}/src/seen.ts`;
      const ctx: AuditContext = {
        sessionId: 'test-path-norm-write',
        role: 'planner',
        childIds: [],
        records: [
          {
            step_index: 1,
            type: 'PLANNER_RESPONSE',
            tool_calls: [{ name: 'read_file', args: { Path: 'src/seen.ts' } }],
          },
          {
            step_index: 2,
            type: 'PLANNER_RESPONSE',
            tool_calls: [{ name: 'edit_file', args: { Path: absPath } }],
          },
          {
            step_index: 3,
            type: 'PLANNER_RESPONSE',
            tool_calls: [
              {
                name: 'write_file',
                args: { Path: 'src/overwritten.ts', Overwrite: true },
              },
            ],
          },
        ],
      };

      const findings = detectEditWithoutRawRead(ctx);
      expect(findings.length).toBe(1);
      expect(findings[0].evidence).toContain('src/overwritten.ts');
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

    test('treats file referenced in subsequent tool_calls args as used', () => {
      const ctx: AuditContext = {
        sessionId: 'test-used-in-toolcall',
        role: 'planner',
        childIds: [],
        records: [
          {
            step_index: 1,
            type: 'PLANNER_RESPONSE',
            tool_calls: [
              {
                name: 'read_file',
                args: { Path: 'src/utilized-widget.ts' },
              },
            ],
          },
          {
            step_index: 2,
            type: 'PLANNER_RESPONSE',
            tool_calls: [
              {
                name: 'edit_file',
                args: {
                  Path: 'tasks/TASK-001.md',
                  Replacement: 'Modify `src/utilized-widget.ts`',
                },
              },
            ],
          },
        ],
      };

      expect(detectReadUnused(ctx).length).toBe(0);
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

    test('allows files listed inside assigned Phase of target_file on disk', () => {
      const fixtureDir = path.resolve(
        '.agents/scripts/__tests__/fixtures-read10',
      );
      const taskPath = path.join(fixtureDir, 'TASK-999.md');
      fs.mkdirSync(fixtureDir, { recursive: true });
      fs.writeFileSync(
        taskPath,
        `### Phase 1: Setup\n- Target Files: \`src/phase1-target.ts\`\n\n### Phase 2: Other\n- Target Files: \`src/phase2-other.ts\`\n`,
      );

      try {
        const ctx: AuditContext = {
          sessionId: 'test-worker-phase-ok',
          role: 'worker',
          childIds: [],
          records: [
            {
              step_index: 0,
              type: 'SYSTEM_MESSAGE',
              content: `type: "TASK_ASSIGN"\ntarget_file: "${taskPath}"\ntarget_phase: 1`,
            },
            {
              step_index: 1,
              type: 'PLANNER_RESPONSE',
              tool_calls: [
                {
                  name: 'read_file',
                  args: { Path: 'src/phase1-target.ts' },
                },
                {
                  name: 'read_file',
                  args: { Path: 'src/phase2-other.ts' },
                },
              ],
            },
          ],
        };

        const findings = detectWorkerExplores(ctx);
        expect(findings.length).toBe(1);
        expect(findings[0].evidence).toContain('src/phase2-other.ts');
      } finally {
        fs.rmSync(fixtureDir, { recursive: true, force: true });
      }
    });
  });

  describe('READ-11: COMPACT_LOOP_ALERT', () => {
    test('detects cache_read_tokens 160K -> 20K drop as HIGH and ignores steady growth', () => {
      const ctxDrop: AuditContext = {
        sessionId: 'test-compact-drop',
        role: 'planner',
        childIds: [],
        records: [
          {
            step_index: 1,
            type: 'PLANNER_RESPONSE',
            cache_read_tokens: 90_000,
          },
          {
            step_index: 2,
            type: 'PLANNER_RESPONSE',
            cache_read_tokens: 160_000,
          },
          {
            step_index: 3,
            type: 'PLANNER_RESPONSE',
            cache_read_tokens: 20_000,
          },
        ],
      };
      const findings = detectCompactLoopAlert(ctxDrop);
      expect(findings.length).toBe(1);
      expect(findings[0].id).toBe('READ-11');
      expect(findings[0].name).toBe('COMPACT_LOOP_ALERT');
      expect(findings[0].severity).toBe('HIGH');
      expect(findings[0].layers).toEqual(['planner']);

      const ctxSteady: AuditContext = {
        sessionId: 'test-compact-steady',
        role: 'planner',
        childIds: [],
        records: [
          {
            step_index: 1,
            type: 'PLANNER_RESPONSE',
            cache_read_tokens: 50_000,
          },
          {
            step_index: 2,
            type: 'PLANNER_RESPONSE',
            cache_read_tokens: 110_000,
          },
          {
            step_index: 3,
            type: 'PLANNER_RESPONSE',
            cache_read_tokens: 140_000,
          },
        ],
      };
      expect(detectCompactLoopAlert(ctxSteady)).toEqual([]);
    });
  });

  test('READING_DETECTORS exports all 10 detectors', () => {
    expect(READING_DETECTORS.length).toBe(10);
  });
});
