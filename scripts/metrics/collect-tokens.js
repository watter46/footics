#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

async function readStdin() {
  let inputData = '';
  for await (const chunk of process.stdin) {
    inputData += chunk;
  }
  if (!inputData.trim()) return {};
  try {
    return JSON.parse(inputData.trim());
  } catch {
    return {};
  }
}

function resolveTranscriptPath(rawPath) {
  if (!rawPath) return '';
  if (rawPath.endsWith('transcript.jsonl')) {
    const fullPath = rawPath.replace(
      /transcript\.jsonl$/,
      'transcript_full.jsonl',
    );
    if (fs.existsSync(fullPath)) return fullPath;
  }
  return rawPath;
}

function calculateStepTokens(entry, metrics) {
  metrics.totalSteps++;

  if (Array.isArray(entry.tool_calls)) {
    metrics.toolCallsCount += entry.tool_calls.length;
  }

  const isUserInput =
    entry.source === 'USER_EXPLICIT' ||
    entry.type === 'USER_INPUT' ||
    entry.source === 'SYSTEM' ||
    entry.type === 'GENERIC';

  if (isUserInput && typeof entry.content === 'string') {
    metrics.inputTokens += Math.ceil(entry.content.length / 4);
  }

  const isModelOutput =
    entry.source === 'MODEL' || entry.type === 'PLANNER_RESPONSE';

  if (isModelOutput) {
    if (typeof entry.content === 'string') {
      metrics.outputTokens += Math.ceil(entry.content.length / 4);
    }
    if (typeof entry.thinking === 'string') {
      metrics.outputTokens += Math.ceil(entry.thinking.length / 4);
    }
    if (Array.isArray(entry.tool_calls)) {
      for (const tc of entry.tool_calls) {
        metrics.outputTokens += Math.ceil(JSON.stringify(tc).length / 4);
      }
    }
  }
}

async function parseTranscript(filePath) {
  const metrics = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    toolCallsCount: 0,
    totalSteps: 0,
  };

  if (!filePath || !fs.existsSync(filePath)) return metrics;

  try {
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Number.POSITIVE_INFINITY,
    });

    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const entry = JSON.parse(trimmed);
        calculateStepTokens(entry, metrics);
      } catch {
        // Ignore JSON parse errors for broken lines
      }
    }
  } catch (err) {
    console.error(`[metrics] Error reading transcript: ${err.message}`);
  }

  metrics.totalTokens = metrics.inputTokens + metrics.outputTokens;
  return metrics;
}

function persistMetrics(payload, metrics) {
  const record = {
    timestamp: new Date().toISOString(),
    conversationId: payload.conversationId || payload.conversation_id || null,
    modelName: payload.modelName || payload.model_name || null,
    terminationReason:
      payload.terminationReason || payload.termination_reason || null,
    metrics,
  };

  try {
    const workspaceRoot =
      Array.isArray(payload.workspacePaths) && payload.workspacePaths.length > 0
        ? payload.workspacePaths[0]
        : process.cwd();
    const metricsDir = path.join(workspaceRoot, '.agy', 'metrics');
    fs.mkdirSync(metricsDir, { recursive: true });
    const targetFile = path.join(metricsDir, 'token_usage.jsonl');
    fs.appendFileSync(targetFile, `${JSON.stringify(record)}\n`, 'utf8');
  } catch (err) {
    console.error(`[metrics] Error persisting metrics: ${err.message}`);
  }
}

function printSummary(metrics) {
  console.error(`\n${'='.repeat(50)}`);
  console.error('📊 [Token Usage Summary]');
  console.error(
    `• Input Tokens (est):   ${metrics.inputTokens.toLocaleString()}`,
  );
  console.error(
    `• Output Tokens (est):  ${metrics.outputTokens.toLocaleString()}`,
  );
  console.error(
    `• Total Tokens (est):   ${metrics.totalTokens.toLocaleString()}`,
  );
  console.error(`• Tool Calls:           ${metrics.toolCallsCount}`);
  console.error(`• Total Steps:          ${metrics.totalSteps}`);
  console.error(`${'='.repeat(50)}\n`);
}

async function main() {
  const payload = await readStdin();
  const rawPath = payload.transcriptPath || payload.transcript_path || '';
  const transcriptPath = resolveTranscriptPath(rawPath);
  const metrics = await parseTranscript(transcriptPath);

  persistMetrics(payload, metrics);
  printSummary(metrics);

  process.stdout.write(JSON.stringify({}));
}

main().catch((err) => {
  console.error(`[metrics] Unexpected error: ${err.message}`);
  process.stdout.write('{}');
  process.exit(0);
});
