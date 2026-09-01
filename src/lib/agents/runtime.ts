import { AgentLogger } from './logger';
import { LatencyTimer } from './telemetry';
import { ToolExecutor } from './tool-executor';
import type {
  Action,
  AgentStatus,
  AgentTool,
  AgentTrace,
  Observation,
  ToolResult,
} from './types';

export interface TurnExecutionParams {
  turn: number;
  plan: {
    thought: string;
    promptTokens?: number;
    completionTokens?: number;
    status?: AgentStatus;
  };
  toolCall?: {
    toolName: string;
    parameters: Record<string, unknown>;
    thought?: string;
    promptTokens?: number;
    completionTokens?: number;
  };
  evaluation?: {
    thought: string;
    observation?: Observation;
    promptTokens?: number;
    completionTokens?: number;
    status?: AgentStatus;
    evaluateResult?: (toolResult?: ToolResult) => {
      thought?: string;
      observation?: Observation;
      status?: AgentStatus;
    };
  };
}

export interface TurnExecutionResult {
  turn: number;
  planTrace: AgentTrace;
  toolTrace?: AgentTrace;
  toolResult?: ToolResult;
  evaluationTrace?: AgentTrace;
  finalStatus: AgentStatus;
}

export class AgentRuntime {
  private sessionId: string;
  private logger: AgentLogger;
  private toolExecutor: ToolExecutor;

  constructor(options?: {
    sessionId?: string;
    logger?: AgentLogger;
    tools?: AgentTool[];
    logDir?: string;
  }) {
    this.sessionId =
      options?.sessionId || `agent-session-${Date.now()}`;
    this.logger =
      options?.logger ||
      new AgentLogger(this.sessionId, options?.logDir);
    this.toolExecutor = new ToolExecutor(options?.tools || []);
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getLogger(): AgentLogger {
    return this.logger;
  }

  getToolExecutor(): ToolExecutor {
    return this.toolExecutor;
  }

  registerTool<TParams extends Record<string, unknown> = Record<string, unknown>, TResult = unknown>(
    tool: AgentTool<TParams, TResult>,
  ): void {
    this.toolExecutor.registerTool(tool as unknown as AgentTool);
  }

  async executeTurn(params: TurnExecutionParams): Promise<TurnExecutionResult> {
    const { turn, plan, toolCall, evaluation } = params;

    // 1. PLAN Phase
    const planTimer = new LatencyTimer();
    const planTrace = this.logger.logPlan(
      turn,
      plan.thought,
      {
        timer: planTimer,
        promptText: plan.thought,
        promptTokens: plan.promptTokens,
        completionTokens: plan.completionTokens,
      },
      plan.status || 'SUCCESS',
    );

    // 2. TOOL_CALL Phase (Wiring tool executor with logger)
    let toolResult: ToolResult | undefined;
    let toolTrace: AgentTrace | undefined;

    if (toolCall) {
      const tracesBefore = this.logger.readTraces().length;
      toolResult = await this.toolExecutor.execute(
        toolCall.toolName,
        toolCall.parameters,
        {
          turn,
          thought: toolCall.thought,
          logger: this.logger,
          promptTokens: toolCall.promptTokens,
          completionTokens: toolCall.completionTokens,
        },
      );

      const tracesAfter = this.logger.readTraces();
      if (tracesAfter.length > tracesBefore) {
        toolTrace = tracesAfter[tracesAfter.length - 1];
      }
    }

    // 3. EVALUATION Phase
    let evaluationTrace: AgentTrace | undefined;
    let finalStatus: AgentStatus =
      toolResult && (!toolResult.success || toolResult.exit_code !== 0)
        ? 'FAILED'
        : 'SUCCESS';

    if (evaluation) {
      const evalTimer = new LatencyTimer();
      let evalThought = evaluation.thought;
      let evalObservation = evaluation.observation;
      let evalStatus = evaluation.status;

      if (evaluation.evaluateResult) {
        const dynamicEval = evaluation.evaluateResult(toolResult);
        if (dynamicEval.thought) evalThought = dynamicEval.thought;
        if (dynamicEval.observation) evalObservation = dynamicEval.observation;
        if (dynamicEval.status) evalStatus = dynamicEval.status;
      }

      if (!evalObservation && toolResult) {
        evalObservation = {
          exit_code: toolResult.exit_code,
          output: toolResult.output,
          error: toolResult.error,
        };
      }

      finalStatus = evalStatus || (evalObservation?.exit_code === 0 ? 'SUCCESS' : 'FAILED');

      evaluationTrace = this.logger.logEvaluation(
        turn,
        evalThought,
        evalObservation,
        {
          timer: evalTimer,
          promptText: evalThought,
          promptTokens: evaluation.promptTokens,
          completionTokens: evaluation.completionTokens,
        },
        finalStatus,
      );
    }

    return {
      turn,
      planTrace,
      toolTrace,
      toolResult,
      evaluationTrace,
      finalStatus,
    };
  }

  async executeTurns(turns: TurnExecutionParams[]): Promise<TurnExecutionResult[]> {
    const results: TurnExecutionResult[] = [];
    for (const turnParams of turns) {
      const result = await this.executeTurn(turnParams);
      results.push(result);
      if (result.finalStatus === 'BLOCKED') {
        break;
      }
    }
    return results;
  }
}
