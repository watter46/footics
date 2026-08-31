import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  type Action,
  type AgentStatus,
  type AgentStep,
  type AgentTrace,
  type Observation,
  type Telemetry,
} from './types';
import {
  computeTelemetry,
  type TelemetryComputeOptions,
} from './telemetry';

export class AgentLogger {
  private logDir: string;
  private logFilePath: string;
  private sessionId: string;

  constructor(sessionId: string, customLogDir?: string) {
    this.sessionId = sessionId;
    this.logDir =
      customLogDir || path.join(process.cwd(), '.agents', 'logs');

    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    const dateStr = new Date().toISOString().split('T')[0];
    this.logFilePath = path.join(this.logDir, `${dateStr}-${sessionId}.jsonl`);
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getLogFilePath(): string {
    return this.logFilePath;
  }

  log(trace: Omit<AgentTrace, 'timestamp'> & { timestamp?: string }): AgentTrace {
    const fullTrace: AgentTrace = {
      ...trace,
      timestamp: trace.timestamp || new Date().toISOString(),
    };
    const line = `${JSON.stringify(fullTrace)}\n`;
    fs.appendFileSync(this.logFilePath, line, 'utf-8');
    return fullTrace;
  }

  logPlan(
    turn: number,
    thought: string,
    telemetryOrOptions?: Telemetry | TelemetryComputeOptions,
    status: AgentStatus = 'SUCCESS',
  ): AgentTrace {
    let telemetry: Telemetry;
    if (telemetryOrOptions && 'total_tokens' in telemetryOrOptions) {
      telemetry = telemetryOrOptions;
    } else {
      telemetry = computeTelemetry({
        promptText: thought,
        completionText: thought,
        latencyMs: 10,
        ...(telemetryOrOptions || {}),
      });
    }

    return this.log({
      session_id: this.sessionId,
      turn,
      step: 'PLAN',
      thought,
      telemetry,
      status,
    });
  }

  logToolCall(
    turn: number,
    thought: string,
    action: Action,
    observation?: Observation,
    telemetryOrOptions?: Telemetry | TelemetryComputeOptions,
    status: AgentStatus = 'SUCCESS',
  ): AgentTrace {
    let telemetry: Telemetry;
    if (telemetryOrOptions && 'total_tokens' in telemetryOrOptions) {
      telemetry = telemetryOrOptions;
    } else {
      telemetry = computeTelemetry({
        promptText: `${thought} ${JSON.stringify(action)}`,
        completionText: observation ? JSON.stringify(observation) : undefined,
        latencyMs: 50,
        ...(telemetryOrOptions || {}),
      });
    }

    return this.log({
      session_id: this.sessionId,
      turn,
      step: 'TOOL_CALL',
      thought,
      action,
      observation,
      telemetry,
      status,
    });
  }

  logEvaluation(
    turn: number,
    thought: string,
    observation?: Observation,
    telemetryOrOptions?: Telemetry | TelemetryComputeOptions,
    status: AgentStatus = 'SUCCESS',
  ): AgentTrace {
    let telemetry: Telemetry;
    if (telemetryOrOptions && 'total_tokens' in telemetryOrOptions) {
      telemetry = telemetryOrOptions;
    } else {
      telemetry = computeTelemetry({
        promptText: thought,
        completionText: observation ? JSON.stringify(observation) : undefined,
        latencyMs: 20,
        ...(telemetryOrOptions || {}),
      });
    }

    return this.log({
      session_id: this.sessionId,
      turn,
      step: 'EVALUATION',
      thought,
      observation,
      telemetry,
      status,
    });
  }

  readTraces(): AgentTrace[] {
    if (!fs.existsSync(this.logFilePath)) {
      return [];
    }
    const content = fs.readFileSync(this.logFilePath, 'utf-8').trim();
    if (!content) return [];
    return content.split('\n').map((line) => JSON.parse(line));
  }
}
