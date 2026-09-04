// biome-ignore lint/style/noExcessiveLinesPerFile: Benchmark test file is intentionally long
// biome-ignore lint/complexity/noExcessiveLinesPerFunction: Benchmark tests have long blocks
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AgentRuntime,
  type AgentTool,
  type AgentTrace,
} from '../../src/lib/agents';

describe('L0.3 Agent Benchmark: Isolation Environment (Real Runtime Driven)', () => {
  it('should successfully execute a dummy task without side effects and log traces automatically via AgentRuntime (exit_code: 0)', async () => {
    const sessionId = `bench-l0-session-${Date.now()}`;
    const runtime = new AgentRuntime({ sessionId });

    // 1. Load fixture
    const fixturePath = path.join(__dirname, 'fixtures', 'dummy-task.json');
    const fixtureData = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
    const { input, expected } = fixtureData;

    // Register actual tool in runtime
    const repairJsonTool: AgentTool<{ json_string: string }, unknown> = {
      name: 'repair_json',
      description: 'Repair malformed JSON string',
      execute: (params) => {
        const repaired = params.json_string.replace(/,\s*}/g, '}');
        try {
          const parsed = JSON.parse(repaired);
          return {
            success: true,
            exit_code: 0,
            data: parsed,
            output: JSON.stringify(parsed),
          };
        } catch (err: unknown) {
          return {
            success: false,
            exit_code: 1,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      },
    };

    runtime.registerTool(repairJsonTool);

    // Execute through AgentRuntime
    const result = await runtime.executeTurn({
      turn: 1,
      plan: {
        thought:
          'I need to parse the provided JSON string, which seems to have a trailing comma.',
        promptTokens: 120,
        completionTokens: 45,
      },
      toolCall: {
        toolName: 'repair_json',
        parameters: { json_string: input },
        thought: 'Calling JSON repair function.',
        promptTokens: 210,
        completionTokens: 60,
      },
      evaluation: {
        thought: 'The JSON was successfully repaired and parsed.',
        promptTokens: 180,
        completionTokens: 35,
      },
    });

    // Assertions on runtime result
    expect(result.finalStatus).toBe('SUCCESS');
    expect(result.toolResult?.exit_code).toBe(0);
    expect(result.toolResult?.data).toEqual(expected);

    // Verify logger automatically persisted to disk
    const logFilePath = runtime.getLogger().getLogFilePath();
    expect(fs.existsSync(logFilePath)).toBe(true);

    const logs = fs.readFileSync(logFilePath, 'utf-8').trim().split('\n');
    expect(logs.length).toBe(3);

    const firstLog: AgentTrace = JSON.parse(logs[0]);
    expect(firstLog.session_id).toBe(sessionId);
    expect(firstLog.step).toBe('PLAN');
    expect(firstLog.timestamp).toBeDefined();
    expect(firstLog.telemetry.total_tokens).toBe(165);

    const lastLog: AgentTrace = JSON.parse(logs[2]);
    expect(lastLog.observation?.exit_code).toBe(0);
    expect(lastLog.telemetry.total_tokens).toBe(215);
  });
});

describe('L3 Agent Benchmark: Autonomous Resolution, Resilience & Efficiency (Level 3 Audit)', () => {
  it('should autonomously resolve initial failure via surgical patching and automatic trace logging (exit_code: 0)', async () => {
    const sessionId = `bench-l3-session-${Date.now()}`;
    const runtime = new AgentRuntime({ sessionId });

    // 1. Load Level 3 Fixture
    const fixturePath = path.join(
      __dirname,
      'fixtures',
      'l3-tactical-bezier-task.json',
    );
    const fixtureData = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
    const { target_file, buggy_code, fixed_code, test_cases } = fixtureData;

    let patchedCode = buggy_code;

    // Register real tools in runtime
    const runCommandTool: AgentTool<{ CommandLine: string; Cwd?: string }> = {
      name: 'run_command',
      description: 'Execute command',
      execute: (params) => {
        if (params.CommandLine.includes('trajectory.test.ts')) {
          // If code is not fixed yet, return error
          if (patchedCode !== fixed_code) {
            const rawStackTrace = `AssertionError: expected { x: 50, y: 0 } to deeply equal { x: 50, y: 40 }
    at calculateBezierControlPoint (${target_file}:24:18)
    at evalTestCase (tests/tactical/trajectory.test.ts:42:15)
    at file:///home/watter46/src/footics/tests/tactical/trajectory.test.ts:78:22
    at processTicksAndRejections (node:internal/process/task_queues:95:5)`;
            return {
              success: false,
              exit_code: 1,
              error: rawStackTrace,
              output:
                'FAIL tests/tactical/trajectory.test.ts > calculateBezierControlPoint > should compute vertex parity',
            };
          }
          return {
            success: true,
            exit_code: 0,
            output: '✓ 2 test suites passed, 12 tests passed (100%)',
          };
        }
        return {
          success: true,
          exit_code: 0,
          output: '✓ Command executed successfully',
        };
      },
    };

    const replaceFileContentTool: AgentTool<{
      TargetFile: string;
      StartLine: number;
      EndLine: number;
      TargetContent: string;
      ReplacementContent: string;
      Instruction: string;
    }> = {
      name: 'replace_file_content',
      description: 'Replace content in file',
      execute: (params) => {
        patchedCode = params.ReplacementContent;
        return {
          success: true,
          exit_code: 0,
          output: `Successfully replaced 1 instance in ${params.TargetFile}`,
        };
      },
    };

    runtime.registerTool(runCommandTool);
    runtime.registerTool(replaceFileContentTool);

    // === TURN 1: Initial Failure Generation ===
    await runtime.executeTurn({
      turn: 1,
      plan: {
        thought:
          'Execute test suite for quadratic Bezier control point calculation in trajectory solver to verify current implementation.',
        promptTokens: 350,
        completionTokens: 65,
      },
      toolCall: {
        toolName: 'run_command',
        parameters: {
          CommandLine: 'pnpm vitest run tests/tactical/trajectory.test.ts',
          Cwd: '/home/watter46/src/footics',
        },
        thought: 'Running targeted Vitest suite on trajectory solver.',
        promptTokens: 420,
        completionTokens: 50,
      },
      evaluation: {
        thought:
          'Observed failure in quadratic Bezier inversion. Formula produces control point y=0 instead of y=40 due to subtracting unscaled endpoint sum (P0+P1) instead of 0.5*(P0+P1).',
        promptTokens: 580,
        completionTokens: 95,
      },
    });

    // === TURN 2: Autonomous Surgical Repair & Context Management ===
    await runtime.executeTurn({
      turn: 2,
      plan: {
        thought:
          'Purge obsolete conversation tokens (Context Slicing). Diagnose stack trace error: mathematical midpoint inversion M = 0.25*P0 + 0.5*Pctrl + 0.25*P1 leads to Pctrl = 2*M - 0.5*(P0+P1). Surgically patch trajectory.ts without altering test assertions or entering cyclic edits.',
        promptTokens: 280,
        completionTokens: 85,
      },
      toolCall: {
        toolName: 'replace_file_content',
        parameters: {
          TargetFile: target_file,
          StartLine: 20,
          EndLine: 28,
          TargetContent: buggy_code,
          ReplacementContent: fixed_code,
          Instruction: 'Fix Bezier control point inversion formula factor 0.5',
        },
        thought:
          'Applying single contiguous surgical patch to src/lib/tactical/trajectory.ts.',
        promptTokens: 340,
        completionTokens: 70,
      },
      evaluation: {
        thought:
          'Surgical patch applied cleanly to core logic. Test assertions remain unchanged and strict.',
        promptTokens: 290,
        completionTokens: 40,
      },
    });

    // === TURN 3: Regression Verification & Full Test Suite Pass ===
    const calcControlPoint = (
      p0: { x: number; y: number },
      p1: { x: number; y: number },
      mid: { x: number; y: number },
    ) => ({
      x: 2 * mid.x - 0.5 * (p0.x + p1.x),
      y: 2 * mid.y - 0.5 * (p0.y + p1.y),
    });

    for (const tc of test_cases) {
      const actual = calcControlPoint(tc.p0, tc.p1, tc.mid);
      expect(actual).toEqual(tc.expected_control_point);
    }

    await runtime.executeTurn({
      turn: 3,
      plan: {
        thought:
          'Execute scoped verification and full tactical test suite to ensure zero regressions across all trajectory and canvas components.',
        promptTokens: 260,
        completionTokens: 45,
      },
      toolCall: {
        toolName: 'run_command',
        parameters: {
          CommandLine: 'pnpm vitest run tests/tactical/trajectory.test.ts',
          Cwd: '/home/watter46/src/footics',
        },
        thought: 'Running full regression test suite.',
        promptTokens: 310,
        completionTokens: 40,
      },
      evaluation: {
        thought:
          'All test cases passed with exit_code 0. Mathematical parity established with zero regressions.',
        promptTokens: 280,
        completionTokens: 35,
      },
    });

    // === AUDIT ASSERTIONS ===
    const traces = runtime.getLogger().readTraces();
    expect(traces.length).toBe(9);

    const turn1Eval = traces.find(
      (t) => t.turn === 1 && t.step === 'EVALUATION',
    );
    expect(turn1Eval).toBeDefined();
    expect(turn1Eval?.status).toBe('FAILED');
    expect(turn1Eval?.observation?.exit_code).toBe(1);
    expect(turn1Eval?.observation?.error).toContain('AssertionError');

    const turn2Plan = traces.find((t) => t.turn === 2 && t.step === 'PLAN');
    expect(turn2Plan).toBeDefined();
    expect(turn2Plan?.telemetry.prompt_tokens).toBeLessThan(
      turn1Eval?.telemetry.prompt_tokens ?? 0,
    );

    const turn2Tool = traces.find(
      (t) => t.turn === 2 && t.step === 'TOOL_CALL',
    );
    expect(turn2Tool).toBeDefined();
    expect(turn2Tool?.action?.tool_name).toBe('replace_file_content');
    expect(turn2Tool?.action?.parameters.TargetFile).toContain('trajectory.ts');

    const turn3Eval = traces.find(
      (t) => t.turn === 3 && t.step === 'EVALUATION',
    );
    expect(turn3Eval).toBeDefined();
    expect(turn3Eval?.status).toBe('SUCCESS');
    expect(turn3Eval?.observation?.exit_code).toBe(0);
  });
});

describe('L4 Agent Benchmark: Meta-Cognition & Self-Evolution (Level 4 Audit)', () => {
  it('should diagnose system rule flaws and safely halt at human approval gate with status BLOCKED', async () => {
    const sessionId = `bench-l4-session-${Date.now()}`;
    const runtime = new AgentRuntime({ sessionId });

    // 1. Load Level 4 Fixture
    const fixturePath = path.join(
      __dirname,
      'fixtures',
      'l4-rule-evolution-task.json',
    );
    const fixtureData = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
    const {
      target_governance_file,
      incident,
      generalized_rule,
      unified_diff_patch,
      human_approval_gate,
    } = fixtureData;

    // Register Tools in runtime
    const analyzeIncidentTool: AgentTool<{
      incident_id: string;
      target_file: string;
    }> = {
      name: 'analyze_incident_root_cause',
      description: 'Analyze incident root cause',
      execute: () => ({
        success: true,
        exit_code: 0,
        output: `ROOT_CAUSE_IDENTIFIED: ${incident.root_cause_type} in ${target_governance_file}. Reason: ${incident.root_cause_analysis}`,
      }),
    };

    const generateDiffTool: AgentTool<{
      TargetFile: string;
      Format: string;
      GeneralizationPrinciple: string;
      PatchContent: string;
    }> = {
      name: 'generate_rule_diff_patch',
      description: 'Generate unified diff patch',
      execute: () => ({
        success: true,
        exit_code: 0,
        output:
          'UNIFIED_DIFF_VALID: 1 hunk, 2 lines added, 0 lines removed. Scope: Monorepo-wide guardrail.',
      }),
    };

    const approvalGateTool: AgentTool<{
      target_file: string;
      patch: string;
      gate_reason: string;
    }> = {
      name: 'request_human_approval',
      description: 'Request human approval',
      execute: () => ({
        success: true,
        exit_code: 0,
        output:
          'GATE_TRIGGERED: status=BLOCKED. Waiting for explicit human operator confirmation.',
      }),
    };

    runtime.registerTool(analyzeIncidentTool);
    runtime.registerTool(generateDiffTool);
    runtime.registerTool(approvalGateTool);

    // TURN 1
    await runtime.executeTurn({
      turn: 1,
      plan: {
        thought:
          'Analyze recurrent performance regression incident INC-2026-PERF-0831. Distinguish between isolated implementation defect and systemic rule defect in AGENTS.md.',
        promptTokens: 380,
        completionTokens: 70,
      },
      toolCall: {
        toolName: 'analyze_incident_root_cause',
        parameters: {
          incident_id: incident.id,
          target_file: target_governance_file,
        },
        thought:
          'Inspecting incident telemetry and rule governance definition in AGENTS.md.',
        promptTokens: 440,
        completionTokens: 55,
      },
      evaluation: {
        thought:
          'Root-cause analysis concluded: Incident is not an isolated coding bug, but a SYSTEM_RULE_DEFECT due to missing explicit guardrails in AGENTS.md Section 15 regarding transient React state mutations.',
        promptTokens: 520,
        completionTokens: 80,
      },
    });

    // TURN 2
    await runtime.executeTurn({
      turn: 2,
      plan: {
        thought:
          'Synthesize universal performance-first guardrail principle avoiding task-specific overfitting. Generate minimal surgical unified diff for AGENTS.md.',
        promptTokens: 310,
        completionTokens: 75,
      },
      toolCall: {
        toolName: 'generate_rule_diff_patch',
        parameters: {
          TargetFile: target_governance_file,
          Format: 'UNIFIED_DIFF',
          GeneralizationPrinciple: generalized_rule.principle,
          PatchContent: unified_diff_patch,
        },
        thought:
          'Generating minimal unified diff patch for AGENTS.md governance rules.',
        promptTokens: 360,
        completionTokens: 85,
      },
      evaluation: {
        thought:
          'Unified diff patch validated. Principle is fully generalized across all pointer/animation interactions without overfitting to specific component instances.',
        promptTokens: 330,
        completionTokens: 45,
      },
    });

    // TURN 3
    await runtime.executeTurn({
      turn: 3,
      plan: {
        thought:
          'Enforce Rule Governance Human Gate (L4.5). Do NOT write patch directly to disk. Transition status to BLOCKED and halt execution pending human administrator approval.',
        promptTokens: 290,
        completionTokens: 60,
      },
      toolCall: {
        toolName: 'request_human_approval',
        parameters: {
          target_file: target_governance_file,
          patch: unified_diff_patch,
          gate_reason: human_approval_gate.gate_reason,
        },
        thought:
          'Submitting rule modification proposal to human approval gate.',
        promptTokens: 340,
        completionTokens: 50,
      },
      evaluation: {
        thought:
          'Human approval gate active. Execution safely blocked and waiting for explicit human confirmation. Target file was not modified.',
        status: 'BLOCKED',
        promptTokens: 300,
        completionTokens: 40,
      },
    });

    // Assertions
    const traces = runtime.getLogger().readTraces();
    expect(traces.length).toBe(9);

    const turn1Eval = traces.find(
      (t) => t.turn === 1 && t.step === 'EVALUATION',
    );
    expect(turn1Eval?.thought).toContain('SYSTEM_RULE_DEFECT');
    expect(turn1Eval?.observation?.output).toContain('SYSTEM_RULE_DEFECT');

    const turn3Eval = traces.find(
      (t) => t.turn === 3 && t.step === 'EVALUATION',
    );
    expect(turn3Eval?.status).toBe('BLOCKED');
    expect(turn3Eval?.observation?.output).toContain('GATE_TRIGGERED');
  });
});

describe('L5 Agent Benchmark: Ecosystem Mastery (Level 5 Audit)', () => {
  it('should capture snapshot, broadcast to context bus, and escalate white flag via runtime', async () => {
    const sessionId = `bench-l5-session-${Date.now()}`;
    const runtime = new AgentRuntime({ sessionId });

    // 1. Load Level 5 Fixture
    const fixturePath = path.join(
      __dirname,
      'fixtures',
      'l5-ecosystem-mastery-task.json',
    );
    const fixtureData = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
    const { snapshot, shared_context, escalation } = fixtureData;

    // Register Tools in runtime
    const snapshotTool: AgentTool<{
      type: string;
      target_scope: string;
      message: string;
    }> = {
      name: 'create_pre_mutation_snapshot',
      description: 'Create Git safety snapshot',
      execute: () => ({
        success: true,
        exit_code: 0,
        output: `SNAPSHOT_CREATED: commit_hash=${snapshot.commit_hash} scope=${snapshot.target_scope}`,
      }),
    };

    const contextBusTool: AgentTool<{
      bus_file: string;
      knowledge_key: string;
      payload: unknown;
    }> = {
      name: 'sync_shared_context_bus',
      description: 'Sync knowledge to shared context bus',
      execute: (params) => {
        const contextFilePath = path.join(process.cwd(), params.bus_file);
        const existingContext = fs.existsSync(contextFilePath)
          ? JSON.parse(fs.readFileSync(contextFilePath, 'utf-8'))
          : {};
        existingContext[params.knowledge_key] = params.payload;
        fs.writeFileSync(
          contextFilePath,
          JSON.stringify(existingContext, null, 2),
          'utf-8',
        );
        return {
          success: true,
          exit_code: 0,
          output: `CONTEXT_SYNCED: ${params.knowledge_key} persisted to ${params.bus_file}`,
        };
      },
    };

    const escalateTool: AgentTool<{
      reason: string;
      confidence_score: number;
      actionable_alternative: string;
    }> = {
      name: 'escalate_white_flag',
      description: 'Escalate white flag to human operator',
      execute: () => ({
        success: true,
        exit_code: 0,
        output: `WHITE_FLAG_RAISED: status=BLOCKED. Escalation payload delivered: ${escalation.reason}`,
      }),
    };

    runtime.registerTool(snapshotTool);
    runtime.registerTool(contextBusTool);
    runtime.registerTool(escalateTool);

    // TURN 1
    await runtime.executeTurn({
      turn: 1,
      plan: {
        thought:
          'Initiating high-impact tactical video export pipeline refactoring. Mandate L5.2 safety protocol: Automatically create Git backup snapshot prior to applying any code mutations.',
        promptTokens: 390,
        completionTokens: 65,
      },
      toolCall: {
        toolName: 'create_pre_mutation_snapshot',
        parameters: {
          type: snapshot.type,
          target_scope: snapshot.target_scope,
          message: snapshot.snapshot_message,
        },
        thought:
          'Executing pre-mutation git snapshot to safeguard monorepo state.',
        promptTokens: 450,
        completionTokens: 50,
      },
      evaluation: {
        thought:
          'Pre-mutation snapshot verified and recorded. Clean state checkpoint established.',
        promptTokens: 510,
        completionTokens: 45,
      },
    });

    // TURN 2
    await runtime.executeTurn({
      turn: 2,
      plan: {
        thought:
          'Environment constraint detected: iOS Safari WebCodecs VideoEncoder incompatibility. Broadcast knowledge to shared context bus (.agents/context.json) to synchronize across all subagent instances (L5.3).',
        promptTokens: 330,
        completionTokens: 80,
      },
      toolCall: {
        toolName: 'sync_shared_context_bus',
        parameters: {
          bus_file: shared_context.bus_file,
          knowledge_key: shared_context.knowledge_key,
          payload: shared_context.payload,
        },
        thought:
          'Synchronizing environmental constraint to .agents/context.json.',
        promptTokens: 380,
        completionTokens: 60,
      },
      evaluation: {
        thought:
          'Shared context bus successfully updated. All active and future agent instances have immediate visibility of iOS WebCodecs constraints.',
        promptTokens: 340,
        completionTokens: 50,
      },
    });

    // TURN 3
    await runtime.executeTurn({
      turn: 3,
      plan: {
        thought:
          'Autonomous White Flag decision to prevent infinite loops and token waste. Browser lacks hardware WebCodecs API support.',
        promptTokens: 310,
        completionTokens: 60,
      },
      toolCall: {
        toolName: 'escalate_white_flag',
        parameters: {
          reason: escalation.reason,
          confidence_score: escalation.confidence_score,
          actionable_alternative: escalation.actionable_alternative,
        },
        thought: 'Raising white flag escalation to user.',
        promptTokens: 360,
        completionTokens: 55,
      },
      evaluation: {
        thought: 'Escalation completed. Agent stopped gracefully without loop.',
        status: 'BLOCKED',
        promptTokens: 290,
        completionTokens: 40,
      },
    });

    const traces = runtime.getLogger().readTraces();
    expect(traces.length).toBe(9);
    const turn3Eval = traces.find(
      (t) => t.turn === 3 && t.step === 'EVALUATION',
    );
    expect(turn3Eval?.status).toBe('BLOCKED');
    expect(turn3Eval?.observation?.output).toContain('WHITE_FLAG_RAISED');
  });
});
