import {
  extractTargetFile,
  extractWriteContent,
  isModifyToolName,
} from '../tool-helpers';
import type { AuditContext, Detector, Finding } from '../types';

function isAppCodeTarget(file: string): boolean {
  const norm = file.replace(/\\/g, '/').replace(/^\/+/, '');
  return (
    norm.startsWith('src/') ||
    norm.startsWith('extension/') ||
    norm.startsWith('tests/') ||
    /\/(?:src|extension|tests)\//.test(norm)
  );
}

function isTestTarget(file: string): boolean {
  return /\.(?:test|spec)\.[tj]sx?$/.test(file) || file.includes('__tests__/');
}

/**
 * QUAL-01: QUALITY_OR_MOCK_BYPASS
 * src/extension/tests への biome-ignore / test.skip / @ts-expect-error / store vi.mock / --no-verify 検知
 */
export const detectQualityOrMockBypass: Detector = (
  ctx: AuditContext,
): Finding[] => {
  const findings: Finding[] = [];

  for (const r of ctx.records) {
    if (r.type === 'PLANNER_RESPONSE' && r.tool_calls) {
      for (const tc of r.tool_calls) {
        if (tc.name === 'run_command') {
          const cmd = String(tc.args?.CommandLine ?? '');
          if (cmd.includes('--no-verify')) {
            findings.push({
              id: 'QUAL-01',
              name: 'QUALITY_OR_MOCK_BYPASS',
              severity: 'HIGH',
              sessionId: ctx.sessionId,
              steps: [r.step_index],
              evidence: `Used --no-verify to bypass git hooks: '${cmd.slice(0, 100)}'`,
              layers: ['planner', 'worker'],
            });
          }
          continue;
        }

        if (isModifyToolName(tc.name)) {
          const file = extractTargetFile(tc);
          if (!file || !isAppCodeTarget(file)) continue;
          const content = extractWriteContent(tc);
          if (!content) continue;

          if (
            content.includes('biome-ignore') ||
            content.includes('eslint-disable')
          ) {
            findings.push({
              id: 'QUAL-01',
              name: 'QUALITY_OR_MOCK_BYPASS',
              severity: 'HIGH',
              sessionId: ctx.sessionId,
              steps: [r.step_index],
              evidence: `Inserted lint suppression in '${file}'`,
              layers: ['worker'],
            });
          }
          if (/\b(?:test|it|describe)\.skip\b/.test(content)) {
            findings.push({
              id: 'QUAL-01',
              name: 'QUALITY_OR_MOCK_BYPASS',
              severity: 'HIGH',
              sessionId: ctx.sessionId,
              steps: [r.step_index],
              evidence: `Inserted test.skip in '${file}'`,
              layers: ['worker'],
            });
          }
          if (/@ts-(?:ignore|expect-error)/.test(content)) {
            findings.push({
              id: 'QUAL-01',
              name: 'QUALITY_OR_MOCK_BYPASS',
              severity: 'HIGH',
              sessionId: ctx.sessionId,
              steps: [r.step_index],
              evidence: `Inserted @ts-ignore / @ts-expect-error in '${file}'`,
              layers: ['worker'],
            });
          }
          if (
            isTestTarget(file) &&
            /\b(?:vi|jest)\.mock\s*\(\s*['"][^'"]*(?:\/stores\/|-store\b)[^'"]*['"]/.test(
              content,
            )
          ) {
            findings.push({
              id: 'QUAL-01',
              name: 'QUALITY_OR_MOCK_BYPASS',
              severity: 'HIGH',
              sessionId: ctx.sessionId,
              steps: [r.step_index],
              evidence: `Mocked internal Zustand store in test '${file}' (R12 violation)`,
              layers: ['worker', 'task-design'],
            });
          }
        }
      }
    }
  }

  return findings;
};

/**
 * QUAL-02: ARCH_PATTERN_VIOLATION
 * ストア丸ごと購読 / CustomEvent / レガシー二重ストア / React.FC の新規書き込み検知
 */
export const detectArchPatternViolation: Detector = (
  ctx: AuditContext,
): Finding[] => {
  const findings: Finding[] = [];

  for (const r of ctx.records) {
    if (r.type === 'PLANNER_RESPONSE' && r.tool_calls) {
      for (const tc of r.tool_calls) {
        if (!isModifyToolName(tc.name)) continue;
        const file = extractTargetFile(tc);
        if (!file || !isAppCodeTarget(file) || isTestTarget(file)) continue;

        const content = extractWriteContent(tc);
        if (!content) continue;

        if (
          /\buse[A-Z]\w*Store(?:Context)?\s*\(\s*\)/.test(content) ||
          /\buse[A-Z]\w*Store(?:Context)?\s*\(\s*\(?[a-zA-Z_]\w*\)?\s*=>\s*[a-zA-Z_]\w*\s*\)/.test(
            content,
          )
        ) {
          findings.push({
            id: 'QUAL-02',
            name: 'ARCH_PATTERN_VIOLATION',
            severity: 'MED',
            sessionId: ctx.sessionId,
            steps: [r.step_index],
            evidence: `Subscribed to whole Zustand store without selector in '${file}'`,
            layers: ['worker', 'task-design'],
          });
        }

        if (/\b(?:new\s+CustomEvent|dispatchEvent)\s*\(/.test(content)) {
          findings.push({
            id: 'QUAL-02',
            name: 'ARCH_PATTERN_VIOLATION',
            severity: 'MED',
            sessionId: ctx.sessionId,
            steps: [r.step_index],
            evidence: `Used CustomEvent / dispatchEvent in '${file}' (R6 violation)`,
            layers: ['worker', 'task-design'],
          });
        }

        if (
          !file.endsWith('tactical-unified-store.ts') &&
          (/\buseTacticalUnifiedStore\b/.test(content) ||
            content.includes('tactical-canvas-store-adapter'))
        ) {
          findings.push({
            id: 'QUAL-02',
            name: 'ARCH_PATTERN_VIOLATION',
            severity: 'MED',
            sessionId: ctx.sessionId,
            steps: [r.step_index],
            evidence: `Referenced legacy singleton/adapter store in '${file}'`,
            layers: ['worker', 'task-design'],
          });
        }
      }
    }
  }

  return findings;
};

export const QUALITY_DETECTORS: Detector[] = [
  detectQualityOrMockBypass,
  detectArchPatternViolation,
];
