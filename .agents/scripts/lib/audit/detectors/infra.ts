import type { AuditContext, Detector, Finding } from '../types';

/**
 * INFRA-01: 必須ツールがサブエージェントに付与されていない（TOOL_MISSING）
 */
export const detectToolMissing: Detector = (ctx: AuditContext): Finding[] => {
  if (ctx.role !== 'worker' && ctx.role !== 'auditor') {
    return [];
  }

  const calledToolNames = new Set<string>();
  let hasComplaint = false;
  let complaintStep: number | undefined;

  const complaintRegex =
    /(no|lack|missing|ない|欠落|見当たらない).{0,30}(tool|ツール)|(tool|ツール).{0,30}(not available|ない|欠落|見当たらない)/i;

  for (const r of ctx.records) {
    if (r.type === 'PLANNER_RESPONSE' && r.tool_calls) {
      for (const tc of r.tool_calls) {
        calledToolNames.add(tc.name);
      }
    }

    const textToScan = `${r.content ?? ''}\n${r.thinking ?? ''}`;
    if (
      textToScan.includes('TASK_BLOCKED') ||
      complaintRegex.test(textToScan)
    ) {
      hasComplaint = true;
      if (complaintStep === undefined) {
        complaintStep = r.step_index;
      }
    }
  }

  let isMissingRequired = false;
  let requiredDescription = '';

  if (ctx.role === 'worker') {
    const hasWriteOrCmd =
      calledToolNames.has('run_command') ||
      calledToolNames.has('edit_file') ||
      calledToolNames.has('write_file');
    if (!hasWriteOrCmd) {
      isMissingRequired = true;
      requiredDescription = 'run_command, edit_file, or write_file';
    }
  } else if (ctx.role === 'auditor') {
    const hasCmd = calledToolNames.has('run_command');
    if (!hasCmd) {
      isMissingRequired = true;
      requiredDescription = 'run_command';
    }
  }

  if (!isMissingRequired) {
    return [];
  }

  const severity = hasComplaint ? 'HIGH' : 'MED';
  const steps =
    complaintStep !== undefined
      ? [complaintStep]
      : [ctx.records[0]?.step_index ?? 0];
  const evidence = hasComplaint
    ? `Role '${ctx.role}' has no ${requiredDescription} invoked and complained about missing tools at step ${steps.join(',')}`
    : `Role '${ctx.role}' never invoked required tool(s) (${requiredDescription})`;

  return [
    {
      id: 'INFRA-01',
      name: 'TOOL_MISSING',
      severity,
      sessionId: ctx.sessionId,
      steps,
      evidence,
      layers: ['agent-def'],
    },
  ];
};

/**
 * INFRA-02: ガードの誤爆・ロール不一致（HOOK_ROLE_MISMATCH）
 */
export const detectHookRoleMismatch: Detector = (
  ctx: AuditContext,
): Finding[] => {
  const findings: Finding[] = [];

  const roleMentionRegex =
    /(Planner|Scout|Worker|Reviewer|Auditor)\s+(?:is prohibited|is a read-only|can only modify)/i;
  const workerIdRegex = /Worker\s+'([^']+)'/i;

  for (const r of ctx.records) {
    const content = r.content ?? '';
    const isDenial =
      r.status === 'ERROR' ||
      content.includes('tool call denied by pre-tool hook') ||
      content.includes('[GUARD]');

    if (!isDenial) continue;

    // (a) 主語ロールの不一致
    const roleMatch = roleMentionRegex.exec(content);
    if (roleMatch) {
      const subjectRole = roleMatch[1].toLowerCase();
      if (ctx.role !== 'unknown' && subjectRole !== ctx.role) {
        findings.push({
          id: 'INFRA-02',
          name: 'HOOK_ROLE_MISMATCH',
          severity: 'HIGH',
          sessionId: ctx.sessionId,
          steps: [r.step_index],
          evidence: `Hook denial targeted at '${subjectRole}', but current session detected role is '${ctx.role}'`,
          layers: ['hook'],
        });
        continue;
      }
    }

    // (b) Worker ID の不一致
    const workerMatch = workerIdRegex.exec(content);
    if (workerMatch) {
      const mentionedId = workerMatch[1];
      if (
        !ctx.childIds.includes(mentionedId) &&
        ctx.sessionId !== mentionedId
      ) {
        findings.push({
          id: 'INFRA-02',
          name: 'HOOK_ROLE_MISMATCH',
          severity: 'HIGH',
          sessionId: ctx.sessionId,
          steps: [r.step_index],
          evidence: `Hook referenced child worker '${mentionedId}' not present in this session childIds`,
          layers: ['hook'],
        });
      }
    }
  }

  return findings;
};

/**
 * INFRA-03: 未展開テンプレート文字列（UNEXPANDED_TEMPLATE）
 */
export const detectUnexpandedTemplate: Detector = (
  ctx: AuditContext,
): Finding[] => {
  const findings: Finding[] = [];
  const templateRegex = /\$\{[a-zA-Z0-9_]+\}/g;

  for (const r of ctx.records) {
    const content = r.content ?? '';
    const isDenialOrError =
      r.status === 'ERROR' ||
      content.includes('tool call denied by pre-tool hook') ||
      content.includes('[GUARD]');

    if (!isDenialOrError) continue;

    const matches = content.match(templateRegex);
    if (matches && matches.length > 0) {
      const uniqueMatches = Array.from(new Set(matches));
      findings.push({
        id: 'INFRA-03',
        name: 'UNEXPANDED_TEMPLATE',
        severity: 'LOW',
        sessionId: ctx.sessionId,
        steps: [r.step_index],
        evidence: `Unexpanded template token(s) found in denial: ${uniqueMatches.join(', ')}`,
        layers: ['hook'],
      });
    }
  }

  return findings;
};
