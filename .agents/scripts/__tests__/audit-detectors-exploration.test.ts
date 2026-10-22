import { describe, expect, test } from 'bun:test';
import {
  detectBadFirstMove,
  detectBlindRedo,
  detectExploreShare,
  detectGuessedPath,
  detectLinecountPuzzle,
  detectRepeatDenial,
  detectRoleViolation,
  detectScopeViolation,
  detectScoutBypass,
  detectSerialIndependent,
  EXPLORATION_DETECTORS,
} from '../lib/audit/detectors/exploration';
import type { AuditContext } from '../lib/audit/types';

describe('audit-session Phase 1-3: exploration detectors (EXP-01〜EXP-10)', () => {
  describe('EXP-01: SCOUT_BYPASS', () => {
    test('detects planner reading 3+ source files without invoking scout', () => {
      const ctx: AuditContext = {
        sessionId: 'test-scout-bypass',
        role: 'planner',
        childIds: [],
        records: [
          {
            step_index: 1,
            type: 'PLANNER_RESPONSE',
            tool_calls: [
              { name: 'view_file', args: { AbsolutePath: 'src/a.ts' } },
            ],
          },
          {
            step_index: 2,
            type: 'PLANNER_RESPONSE',
            tool_calls: [
              { name: 'view_file', args: { AbsolutePath: 'src/b.ts' } },
            ],
          },
          {
            step_index: 3,
            type: 'PLANNER_RESPONSE',
            tool_calls: [
              { name: 'view_file', args: { AbsolutePath: 'src/c.ts' } },
            ],
          },
        ],
      };

      const findings = detectScoutBypass(ctx);
      expect(findings.length).toBe(1);
      expect(findings[0].id).toBe('EXP-01');
      expect(findings[0].severity).toBe('HIGH');
      expect(findings[0].layers).toEqual(['planner', 'rule']);
    });

    test('returns empty if scout was invoked', () => {
      const ctx: AuditContext = {
        sessionId: 'test-scout-ok',
        role: 'planner',
        childIds: ['scout-1'],
        records: [
          {
            step_index: 1,
            type: 'PLANNER_RESPONSE',
            tool_calls: [
              { name: 'invoke_subagent', args: { TypeName: 'scout' } },
            ],
          },
          {
            step_index: 2,
            type: 'PLANNER_RESPONSE',
            tool_calls: [
              { name: 'view_file', args: { AbsolutePath: 'src/a.ts' } },
            ],
          },
        ],
      };

      expect(detectScoutBypass(ctx).length).toBe(0);
    });
  });

  describe('EXP-02: BAD_FIRST_MOVE', () => {
    test('detects raw file read in first turns without repo_summary / ai:find / ai:outline', () => {
      const ctx: AuditContext = {
        sessionId: 'test-bad-first',
        role: 'planner',
        childIds: [],
        records: [
          {
            step_index: 1,
            type: 'PLANNER_RESPONSE',
            tool_calls: [
              { name: 'view_file', args: { AbsolutePath: 'src/app.ts' } },
            ],
          },
        ],
      };

      const findings = detectBadFirstMove(ctx);
      expect(findings.length).toBe(1);
      expect(findings[0].id).toBe('EXP-02');
      expect(findings[0].severity).toBe('MED');
    });

    test('returns empty if first move read repo_summary.txt or used ai:find', () => {
      const ctx: AuditContext = {
        sessionId: 'test-good-first',
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
                  CommandLine: 'rtk read .agents/.cache/repo_summary.txt',
                },
              },
            ],
          },
        ],
      };

      expect(detectBadFirstMove(ctx).length).toBe(0);
    });
  });

  describe('EXP-03: EXPLORE_SHARE', () => {
    test('detects when exploration turns exceed 30% before first edit or subagent', () => {
      const records: any[] = [];
      // 5 turns of reading
      for (let i = 1; i <= 5; i++) {
        records.push({
          step_index: i,
          type: 'PLANNER_RESPONSE',
          tool_calls: [
            { name: 'view_file', args: { AbsolutePath: `src/f${i}.ts` } },
          ],
        });
      }
      // step 6 invokes subagent
      records.push({
        step_index: 6,
        type: 'PLANNER_RESPONSE',
        tool_calls: [{ name: 'invoke_subagent', args: { TypeName: 'worker' } }],
      });
      // 4 turns after
      for (let i = 7; i <= 10; i++) {
        records.push({
          step_index: i,
          type: 'PLANNER_RESPONSE',
          tool_calls: [{ name: 'send_message', args: { Recipient: 'worker' } }],
        });
      }

      const ctx: AuditContext = {
        sessionId: 'test-explore-share',
        role: 'planner',
        childIds: [],
        records,
      };

      const findings = detectExploreShare(ctx);
      expect(findings.length).toBe(1);
      expect(findings[0].id).toBe('EXP-03');
      expect(findings[0].severity).toBe('MED');
    });
  });

  describe('EXP-04: SERIAL_INDEPENDENT', () => {
    test('detects 3 consecutive single file view calls without parallelism', () => {
      const ctx: AuditContext = {
        sessionId: 'test-serial',
        role: 'planner',
        childIds: [],
        records: [
          {
            step_index: 1,
            type: 'PLANNER_RESPONSE',
            tool_calls: [
              { name: 'view_file', args: { AbsolutePath: 'src/1.ts' } },
            ],
          },
          {
            step_index: 2,
            type: 'PLANNER_RESPONSE',
            tool_calls: [
              { name: 'view_file', args: { AbsolutePath: 'src/2.ts' } },
            ],
          },
          {
            step_index: 3,
            type: 'PLANNER_RESPONSE',
            tool_calls: [
              { name: 'view_file', args: { AbsolutePath: 'src/3.ts' } },
            ],
          },
        ],
      };

      const findings = detectSerialIndependent(ctx);
      expect(findings.length).toBe(1);
      expect(findings[0].id).toBe('EXP-04');
      expect(findings[0].severity).toBe('LOW');
    });
  });

  describe('EXP-05: LINECOUNT_PUZZLE', () => {
    test('detects wc -l run after sequential slicing denial or around reads', () => {
      const ctx: AuditContext = {
        sessionId: 'test-wc-puzzle',
        role: 'planner',
        childIds: [],
        records: [
          {
            step_index: 10,
            type: 'GENERIC',
            status: 'ERROR',
            content:
              'tool call denied by pre-tool hook: [GUARD] Sequential slicing loop detected',
          },
          {
            step_index: 11,
            type: 'PLANNER_RESPONSE',
            tool_calls: [
              {
                name: 'run_command',
                args: { CommandLine: 'wc -l src/file.ts' },
              },
            ],
          },
        ],
      };

      const findings = detectLinecountPuzzle(ctx);
      expect(findings.length).toBe(1);
      expect(findings[0].id).toBe('EXP-05');
      expect(findings[0].severity).toBe('MED');
    });
  });

  describe('EXP-06: GUESSED_PATH', () => {
    test('detects file guessing error steps', () => {
      const ctx: AuditContext = {
        sessionId: 'test-guess-path',
        role: 'planner',
        childIds: [],
        records: [
          {
            step_index: 5,
            type: 'GENERIC',
            status: 'ERROR',
            content:
              "tool call denied by pre-tool hook: [GUARD] File not found: '/path/TASK-031.md'. Guessing file paths without verifying is strictly prohibited.",
          },
        ],
      };

      const findings = detectGuessedPath(ctx);
      expect(findings.length).toBe(1);
      expect(findings[0].id).toBe('EXP-06');
      expect(findings[0].severity).toBe('LOW');
    });
  });

  describe('EXP-07: SCOPE_VIOLATION', () => {
    test('detects unscoped ai:check or raw vitest commands', () => {
      const ctx: AuditContext = {
        sessionId: 'test-scope-violation',
        role: 'worker',
        childIds: [],
        records: [
          {
            step_index: 20,
            type: 'PLANNER_RESPONSE',
            tool_calls: [
              {
                name: 'run_command',
                args: { CommandLine: 'bun run ai:check' },
              },
            ],
          },
          {
            step_index: 22,
            type: 'PLANNER_RESPONSE',
            tool_calls: [
              { name: 'run_command', args: { CommandLine: 'vitest run' } },
            ],
          },
        ],
      };

      const findings = detectScopeViolation(ctx);
      expect(findings.length).toBe(2);
      expect(findings[0].id).toBe('EXP-07');
      expect(findings[0].severity).toBe('HIGH');
    });
  });

  describe('EXP-08: REPEAT_DENIAL', () => {
    test('detects 2 consecutive denials on the same file or command', () => {
      const ctx: AuditContext = {
        sessionId: 'test-repeat-denial',
        role: 'planner',
        childIds: [],
        records: [
          {
            step_index: 5,
            type: 'GENERIC',
            status: 'ERROR',
            content:
              "tool call denied by pre-tool hook: [GUARD] Sequential slicing loop detected for 'file.ts'.",
          },
          {
            step_index: 6,
            type: 'GENERIC',
            status: 'ERROR',
            content:
              "tool call denied by pre-tool hook: [GUARD] Sequential slicing loop detected for 'file.ts'.",
          },
        ],
      };

      const findings = detectRepeatDenial(ctx);
      expect(findings.length).toBe(1);
      expect(findings[0].id).toBe('EXP-08');
      expect(findings[0].severity).toBe('HIGH');
    });
  });

  describe('EXP-09: ROLE_VIOLATION', () => {
    test('detects Planner attempting to edit src/ code', () => {
      const ctx: AuditContext = {
        sessionId: 'test-role-violation',
        role: 'planner',
        childIds: [],
        records: [
          {
            step_index: 157,
            type: 'GENERIC',
            status: 'ERROR',
            content:
              "tool call denied by pre-tool hook: [GUARD] Access Denied: Planner is prohibited from editing source code ('src/app.ts').",
          },
        ],
      };

      const findings = detectRoleViolation(ctx);
      expect(findings.length).toBe(1);
      expect(findings[0].id).toBe('EXP-09');
      expect(findings[0].severity).toBe('HIGH');
    });
  });

  describe('EXP-10: BLIND_REDO', () => {
    test('detects consecutive identical command execution', () => {
      const ctx: AuditContext = {
        sessionId: 'test-blind-redo',
        role: 'worker',
        childIds: [],
        records: [
          {
            step_index: 10,
            type: 'PLANNER_RESPONSE',
            tool_calls: [
              {
                name: 'run_command',
                args: { CommandLine: 'bun run ai:check src/a.ts' },
              },
            ],
          },
          {
            step_index: 12,
            type: 'PLANNER_RESPONSE',
            tool_calls: [
              {
                name: 'run_command',
                args: { CommandLine: 'bun run ai:check src/a.ts' },
              },
            ],
          },
        ],
      };

      const findings = detectBlindRedo(ctx);
      expect(findings.length).toBe(1);
      expect(findings[0].id).toBe('EXP-10');
      expect(findings[0].severity).toBe('MED');
    });
  });

  test('EXPLORATION_DETECTORS exports all 10 detectors', () => {
    expect(EXPLORATION_DETECTORS.length).toBe(10);
  });
});
