import * as fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AgentRuntime } from '../runtime';
import type { AgentTool } from '../types';

describe('Agent Runtime & Logger Real Wiring Test', () => {
  it('should automatically measure latency, count tokens, and persist logs to JSONL via ToolExecutor & AgentRuntime', async () => {
    const sessionId = `test-runtime-live-${Date.now()}`;
    const runtime = new AgentRuntime({ sessionId });

    // Define real tool
    const mathTool: AgentTool<{ a: number; b: number }, number> = {
      name: 'add_numbers',
      description: 'Add two numbers together',
      execute: (params) => {
        return {
          success: true,
          exit_code: 0,
          data: params.a + params.b,
          output: `Result: ${params.a + params.b}`,
        };
      },
    };

    runtime.registerTool(mathTool);

    // Execute Turn via Runtime (NOT static mock logging)
    const turnResult = await runtime.executeTurn({
      turn: 1,
      plan: {
        thought: 'I will calculate 15 + 27 using add_numbers tool.',
      },
      toolCall: {
        toolName: 'add_numbers',
        parameters: { a: 15, b: 27 },
        thought: 'Invoking add_numbers tool with inputs.',
      },
      evaluation: {
        thought: 'Calculation completed successfully.',
      },
    });

    // Verification
    expect(turnResult.finalStatus).toBe('SUCCESS');
    expect(turnResult.toolResult?.success).toBe(true);
    expect(turnResult.toolResult?.exit_code).toBe(0);
    expect(turnResult.toolResult?.data).toBe(42);

    const logFilePath = runtime.getLogger().getLogFilePath();
    expect(fs.existsSync(logFilePath)).toBe(true);

    const traces = runtime.getLogger().readTraces();
    expect(traces.length).toBe(3);

    // Verify PLAN step trace
    const planTrace = traces[0];
    expect(planTrace.step).toBe('PLAN');
    expect(planTrace.session_id).toBe(sessionId);
    expect(planTrace.turn).toBe(1);
    expect(planTrace.telemetry.prompt_tokens).toBeGreaterThan(0);
    expect(planTrace.telemetry.latency_ms).toBeGreaterThanOrEqual(1);

    // Verify TOOL_CALL step trace (Automatically logged by ToolExecutor)
    const toolTrace = traces[1];
    expect(toolTrace.step).toBe('TOOL_CALL');
    expect(toolTrace.action?.tool_name).toBe('add_numbers');
    expect(toolTrace.action?.parameters).toEqual({ a: 15, b: 27 });
    expect(toolTrace.observation?.exit_code).toBe(0);
    expect(toolTrace.observation?.output).toBe('Result: 42');
    expect(toolTrace.telemetry.latency_ms).toBeGreaterThanOrEqual(1);

    // Verify EVALUATION step trace
    const evalTrace = traces[2];
    expect(evalTrace.step).toBe('EVALUATION');
    expect(evalTrace.status).toBe('SUCCESS');
    expect(evalTrace.observation?.exit_code).toBe(0);
  });
});
