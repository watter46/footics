import { describe, expect, test } from 'bun:test';
import { runDetectors } from '../lib/audit/registry';
import { renderFindings } from '../lib/audit/render';
import type { AuditContext, Detector, Finding } from '../lib/audit/types';

describe('audit foundation: types, registry, render', () => {
  const dummyContext: AuditContext = {
    sessionId: 'test-session-123',
    records: [],
    role: 'planner',
    childIds: ['child-1'],
  };

  test('runDetectors sorts by severity (HIGH > MED > LOW > INFO) and then steps[0] ascending', () => {
    const d1: Detector = (_ctx) => [
      {
        id: 'TEST-01',
        name: 'LOW_ISSUE',
        severity: 'LOW',
        sessionId: _ctx.sessionId,
        steps: [10],
        evidence: 'low issue occurred',
        layers: ['rule'],
      },
      {
        id: 'TEST-02',
        name: 'HIGH_ISSUE_LATE',
        severity: 'HIGH',
        sessionId: _ctx.sessionId,
        steps: [20],
        evidence: 'high late',
        layers: ['hook'],
      },
    ];

    const d2: Detector = (_ctx) => [
      {
        id: 'TEST-03',
        name: 'HIGH_ISSUE_EARLY',
        severity: 'HIGH',
        sessionId: _ctx.sessionId,
        steps: [5],
        evidence: 'high early',
        layers: ['agent-def'],
      },
      {
        id: 'TEST-04',
        name: 'MED_ISSUE',
        severity: 'MED',
        sessionId: _ctx.sessionId,
        steps: [8],
        evidence: 'med issue',
        layers: ['planner'],
      },
      {
        id: 'TEST-05',
        name: 'INFO_ISSUE',
        severity: 'INFO',
        sessionId: _ctx.sessionId,
        steps: [1],
        evidence: 'info issue',
        layers: ['script'],
      },
    ];

    const findings = runDetectors(dummyContext, [d1, d2]);
    expect(findings.map((f) => f.id)).toEqual([
      'TEST-03', // HIGH step 5
      'TEST-02', // HIGH step 20
      'TEST-04', // MED step 8
      'TEST-01', // LOW step 10
      'TEST-05', // INFO step 1
    ]);
  });

  test('renderFindings returns (No findings) when empty', () => {
    expect(renderFindings([])).toBe('(No findings)');
  });

  test('renderFindings formats each finding on one line with max 160 char evidence', () => {
    const findings: Finding[] = [
      {
        id: 'INFRA-01',
        name: 'TOOL_MISSING',
        severity: 'HIGH',
        sessionId: 'abc12345',
        steps: [3, 5],
        evidence:
          'Very long evidence line that exceeds one hundred and sixty characters easily. '.repeat(
            4,
          ),
        layers: ['agent-def'],
      },
    ];

    const rendered = renderFindings(findings);
    const lines = rendered.trim().split('\n');
    expect(lines.length).toBe(1);
    expect(lines[0]).toContain(
      '[HIGH] INFRA-01 TOOL_MISSING session=abc12345 steps=3,5 layers=agent-def :: ',
    );
    const evidencePart = lines[0].split(' :: ')[1];
    expect(evidencePart.length).toBeLessThanOrEqual(160);
    expect(evidencePart.endsWith('...')).toBe(true);
  });
});
