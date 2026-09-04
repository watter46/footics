import type { AgentLogger } from './logger';
import { LatencyTimer } from './telemetry';
import type {
  Action,
  AgentTool,
  Observation,
  ToolExecutionContext,
  ToolResult,
} from './types';

export class ToolExecutor {
  private tools: Map<string, AgentTool> = new Map();

  constructor(tools: AgentTool[] = []) {
    for (const tool of tools) {
      this.registerTool(tool);
    }
  }

  registerTool(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  listTools(): AgentTool[] {
    return Array.from(this.tools.values());
  }

  async execute<T = unknown>(
    toolName: string,
    parameters: Record<string, unknown>,
    options: {
      turn: number;
      thought?: string;
      logger?: AgentLogger;
      promptTokens?: number;
      completionTokens?: number;
    },
  ): Promise<ToolResult<T>> {
    const tool = this.tools.get(toolName);
    const timer = new LatencyTimer();
    const action: Action = {
      tool_name: toolName,
      parameters,
    };

    if (!tool) {
      const observation: Observation = {
        exit_code: 1,
        error: `Tool "${toolName}" not found in registry. Available tools: ${Array.from(this.tools.keys()).join(', ')}`,
      };

      if (options.logger) {
        options.logger.logToolCall(
          options.turn,
          options.thought || `Calling unknown tool "${toolName}"`,
          action,
          observation,
          {
            timer,
            promptTokens: options.promptTokens,
            completionTokens: options.completionTokens,
          },
          'FAILED',
        );
      }

      return {
        success: false,
        exit_code: 1,
        error: observation.error,
      };
    }

    const context: ToolExecutionContext = {
      session_id: options.logger?.getSessionId() || 'anonymous',
      turn: options.turn,
    };

    let result: ToolResult<T>;
    try {
      result = (await tool.execute(parameters, context)) as ToolResult<T>;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      result = {
        success: false,
        exit_code: 1,
        error: errorMessage,
      };
    }

    const observation: Observation = {
      exit_code: result.exit_code,
      output:
        result.output ||
        (result.data ? JSON.stringify(result.data) : undefined),
      error: result.error,
    };

    if (options.logger) {
      options.logger.logToolCall(
        options.turn,
        options.thought || `Calling tool "${toolName}"`,
        action,
        observation,
        {
          timer,
          promptTokens: options.promptTokens,
          completionTokens: options.completionTokens,
        },
        result.success && result.exit_code === 0 ? 'SUCCESS' : 'FAILED',
      );
    }

    return result;
  }
}
