import type { Finding } from './types';

export function renderFindings(findings: Finding[]): string {
  if (findings.length === 0) {
    return '(No findings)';
  }

  return findings
    .map((f) => {
      const normalizedEvidence = f.evidence.replace(/\r?\n/g, ' ').trim();
      let evidenceSnippet = normalizedEvidence;
      if (evidenceSnippet.length > 160) {
        evidenceSnippet = `${evidenceSnippet.slice(0, 157)}...`;
      }
      return `[${f.severity}] ${f.id} ${f.name} session=${f.sessionId} steps=${f.steps.join(',')} layers=${f.layers.join(',')} :: ${evidenceSnippet}`;
    })
    .join('\n');
}
