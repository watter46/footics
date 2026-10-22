import { EXPLORATION_DETECTORS } from './detectors/exploration';
import {
  detectHookRoleMismatch,
  detectToolMissing,
  detectUnexpandedTemplate,
} from './detectors/infra';
import type { AuditContext, Detector, Finding, Severity } from './types';

export const DETECTORS: Detector[] = [
  detectToolMissing,
  detectHookRoleMismatch,
  detectUnexpandedTemplate,
  ...EXPLORATION_DETECTORS,
];

export function registerDetector(d: Detector): void {
  DETECTORS.push(d);
}

const SEVERITY_ORDER: Record<Severity, number> = {
  HIGH: 0,
  MED: 1,
  LOW: 2,
  INFO: 3,
};

export function runDetectors(
  ctx: AuditContext,
  detectors: Detector[] = DETECTORS,
): Finding[] {
  const findings: Finding[] = [];
  for (const detector of detectors) {
    findings.push(...detector(ctx));
  }

  return findings.sort((a, b) => {
    const sevDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (sevDiff !== 0) {
      return sevDiff;
    }
    const aStep = a.steps[0] ?? 0;
    const bStep = b.steps[0] ?? 0;
    return aStep - bStep;
  });
}
