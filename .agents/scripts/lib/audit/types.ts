import type { AgentRole } from '../../../hooks/guard/agent-access-guard';
import type { TranscriptRecord } from '../../audit-session';

export type Severity = 'HIGH' | 'MED' | 'LOW' | 'INFO';

export type SuspectLayer =
  | 'planner'
  | 'worker'
  | 'scout'
  | 'reviewer'
  | 'auditor'
  | 'agent-def'
  | 'hook'
  | 'rule'
  | 'script'
  | 'task-design';

export interface Finding {
  id: string;
  name: string;
  severity: Severity;
  sessionId: string;
  steps: number[];
  evidence: string;
  layers: SuspectLayer[];
}

export interface AuditContext {
  sessionId: string;
  records: TranscriptRecord[];
  role: AgentRole;
  childIds: string[];
}

export type Detector = (ctx: AuditContext) => Finding[];
