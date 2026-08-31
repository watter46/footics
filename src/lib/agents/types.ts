export type AgentStep = 'PLAN' | 'TOOL_CALL' | 'EVALUATION';
export type AgentStatus = 'SUCCESS' | 'FAILED' | 'BLOCKED';

export interface Action {
  tool_name: string;
  parameters: Record<string, unknown>;
}

export interface Observation {
  exit_code?: number;
  output?: string;
  error?: string;
}

export interface Telemetry {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  latency_ms: number;
}

export interface AgentTrace {
  timestamp: string;
  session_id: string;
  turn: number;
  step: AgentStep;
  thought: string;
  action?: Action;
  observation?: Observation;
  telemetry: Telemetry;
  status: AgentStatus;
}

export interface ToolExecutionContext {
  session_id: string;
  turn: number;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  exit_code: number;
  data?: T;
  output?: string;
  error?: string;
}

export interface AgentTool<
  TParams extends Record<string, unknown> = Record<string, unknown>,
  TResult = unknown,
> {
  name: string;
  description: string;
  execute: (
    parameters: TParams,
    context?: ToolExecutionContext,
  ) => Promise<ToolResult<TResult>> | ToolResult<TResult>;
}
