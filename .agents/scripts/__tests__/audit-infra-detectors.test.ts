import { describe, expect, test } from 'bun:test';
import {
  detectHookRoleMismatch,
  detectToolMissing,
  detectUnexpandedTemplate,
} from '../lib/audit/detectors/infra';
import { DETECTORS } from '../lib/audit/registry';
import type { AuditContext } from '../lib/audit/types';

describe('audit-session Phase 3: infra detectors (INFRA-01, 02, 03)', () => {
  describe('INFRA-01: detectToolMissing', () => {
    test('returns HIGH when worker called no write/cmd tools and mentions missing tools in thinking', () => {
      const ctx: AuditContext = {
        sessionId: 'worker-missing-tool-high',
        role: 'worker',
        childIds: [],
        records: [
          {
            step_index: 0,
            type: 'SYSTEM_MESSAGE',
            content: 'type: "TASK_ASSIGN"\ntarget_file: "tasks/TASK-001.md"',
          },
          {
            step_index: 1,
            type: 'PLANNER_RESPONSE',
            thinking:
              'コマンド実行ツールが見当たらないため、テストを実行できません。',
            tool_calls: [
              { name: 'view_file', args: { AbsolutePath: 'src/app.ts' } },
            ],
          },
          {
            step_index: 2,
            type: 'GENERIC',
            status: 'DONE',
            content: '1: export const app = 1;',
          },
        ],
      };

      const findings = detectToolMissing(ctx);
      expect(findings.length).toBe(1);
      expect(findings[0].id).toBe('INFRA-01');
      expect(findings[0].severity).toBe('HIGH');
      expect(findings[0].layers).toEqual(['agent-def']);
      expect(findings[0].steps).toContain(1);
    });

    test('returns MED when auditor never called run_command but has no explicit complaint', () => {
      const ctx: AuditContext = {
        sessionId: 'auditor-no-cmd-med',
        role: 'auditor',
        childIds: [],
        records: [
          {
            step_index: 0,
            type: 'SYSTEM_MESSAGE',
            content: 'type: "AUDIT_REQUEST"',
          },
          {
            step_index: 1,
            type: 'PLANNER_RESPONSE',
            thinking: 'Let me inspect files directly',
            tool_calls: [
              { name: 'view_file', args: { AbsolutePath: 'src/app.ts' } },
            ],
          },
        ],
      };

      const findings = detectToolMissing(ctx);
      expect(findings.length).toBe(1);
      expect(findings[0].id).toBe('INFRA-01');
      expect(findings[0].severity).toBe('MED');
    });

    test('returns empty when worker successfully used run_command', () => {
      const ctx: AuditContext = {
        sessionId: 'worker-ok',
        role: 'worker',
        childIds: [],
        records: [
          {
            step_index: 0,
            type: 'SYSTEM_MESSAGE',
            content: 'type: "TASK_ASSIGN"',
          },
          {
            step_index: 1,
            type: 'PLANNER_RESPONSE',
            tool_calls: [
              { name: 'run_command', args: { CommandLine: 'bun test' } },
            ],
          },
        ],
      };

      expect(detectToolMissing(ctx).length).toBe(0);
    });
  });

  describe('INFRA-02: detectHookRoleMismatch', () => {
    test('returns HIGH when planner session encounters denial targeted at Scout', () => {
      const ctx: AuditContext = {
        sessionId: 'planner-session',
        role: 'planner',
        childIds: ['worker-1'],
        records: [
          {
            step_index: 10,
            type: 'PLANNER_RESPONSE',
            tool_calls: [
              { name: 'view_file', args: { AbsolutePath: 'src/app.ts' } },
            ],
          },
          {
            step_index: 11,
            type: 'GENERIC',
            status: 'ERROR',
            content:
              'Encountered error in step execution: tool call denied by pre-tool hook: [GUARD] Scout is a read-only agent and cannot access this resource.',
          },
        ],
      };

      const findings = detectHookRoleMismatch(ctx);
      expect(findings.length).toBe(1);
      expect(findings[0].id).toBe('INFRA-02');
      expect(findings[0].severity).toBe('HIGH');
      expect(findings[0].layers).toEqual(['hook']);
      expect(findings[0].steps).toEqual([11]);
    });

    test('returns HIGH when hook mentions unknown worker id not in childIds', () => {
      const ctx: AuditContext = {
        sessionId: 'parent-session',
        role: 'planner',
        childIds: ['worker-valid-123'],
        records: [
          {
            step_index: 20,
            type: 'PLANNER_RESPONSE',
            tool_calls: [
              { name: 'send_message', args: { Recipient: 'alien-worker-999' } },
            ],
          },
          {
            step_index: 21,
            type: 'GENERIC',
            status: 'ERROR',
            content:
              "tool call denied by pre-tool hook: [GUARD] Worker 'alien-worker-999' context limit exceeded.",
          },
        ],
      };

      const findings = detectHookRoleMismatch(ctx);
      expect(findings.length).toBe(1);
      expect(findings[0].id).toBe('INFRA-02');
      expect(findings[0].severity).toBe('HIGH');
    });

    test('returns empty when worker hook denial matches worker role', () => {
      const ctx: AuditContext = {
        sessionId: 'worker-session',
        role: 'worker',
        childIds: [],
        records: [
          {
            step_index: 15,
            type: 'GENERIC',
            status: 'ERROR',
            content:
              'tool call denied by pre-tool hook: [GUARD] Worker can only modify files in src/ or tests/.',
          },
        ],
      };

      expect(detectHookRoleMismatch(ctx).length).toBe(0);
    });
  });

  describe('INFRA-03: detectUnexpandedTemplate', () => {
    test('returns LOW when hook error contains unexpanded template ${relPath}', () => {
      const ctx: AuditContext = {
        sessionId: 'test-template-error',
        role: 'planner',
        childIds: [],
        records: [
          {
            step_index: 12,
            type: 'GENERIC',
            status: 'ERROR',
            content:
              "tool call denied by pre-tool hook: [GUARD] File '${relPath}' is forbidden.",
          },
        ],
      };

      const findings = detectUnexpandedTemplate(ctx);
      expect(findings.length).toBe(1);
      expect(findings[0].id).toBe('INFRA-03');
      expect(findings[0].severity).toBe('LOW');
      expect(findings[0].layers).toEqual(['hook']);
      expect(findings[0].steps).toEqual([12]);
      expect(findings[0].evidence).toContain('${relPath}');
    });
  });

  describe('registry integration', () => {
    test('detectors are registered in DETECTORS list in registry', () => {
      const registeredIds = DETECTORS.map((d) =>
        d({
          sessionId: 's',
          role: 'unknown',
          childIds: [],
          records: [],
        }),
      ).flatMap((f) => f.map((x) => x.id));
      expect(DETECTORS.length).toBeGreaterThanOrEqual(3);
      expect(registeredIds).toBeDefined();
    });
  });
});
