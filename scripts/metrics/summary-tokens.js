#!/usr/bin/env node

/**
 * scripts/metrics/summary-tokens.js
 *
 * Provides summary and stats for token usage logs saved in .agy/metrics/token_usage.jsonl
 *
 * Usage:
 *   node scripts/metrics/summary-tokens.js [command]
 *
 * Commands:
 *   summary (default) - Display overall statistics (total tokens, calls, averages)
 *   tail [n]          - Show the most recent [n] sessions (default: 5)
 *   raw               - Output raw JSONL contents
 *   clean             - Remove or truncate the metrics log file
 */

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const METRICS_FILE = path.resolve(
  process.cwd(),
  '.agy',
  'metrics',
  'token_usage.jsonl',
);

async function loadRecords() {
  if (!fs.existsSync(METRICS_FILE)) {
    return [];
  }

  const records = [];
  const fileStream = fs.createReadStream(METRICS_FILE, { encoding: 'utf8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Number.POSITIVE_INFINITY,
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      records.push(JSON.parse(trimmed));
    } catch {
      // Ignore invalid JSON lines
    }
  }

  return records;
}

function formatNumber(num) {
  return (num || 0).toLocaleString();
}

async function showSummary() {
  const records = await loadRecords();
  if (records.length === 0) {
    console.log(
      '\n📊 No token metrics recorded yet in .agy/metrics/token_usage.jsonl\n',
    );
    return;
  }

  let totalInput = 0;
  let totalOutput = 0;
  let totalTokens = 0;
  let totalToolCalls = 0;
  let totalSteps = 0;
  let validSessions = 0;

  for (const r of records) {
    const m = r.metrics || {};
    if (m.totalTokens > 0 || m.totalSteps > 0) {
      validSessions++;
      totalInput += m.inputTokens || 0;
      totalOutput += m.outputTokens || 0;
      totalTokens += m.totalTokens || 0;
      totalToolCalls += m.toolCallsCount || 0;
      totalSteps += m.totalSteps || 0;
    }
  }

  const avgTokens =
    validSessions > 0 ? Math.round(totalTokens / validSessions) : 0;
  const avgInput =
    validSessions > 0 ? Math.round(totalInput / validSessions) : 0;
  const avgOutput =
    validSessions > 0 ? Math.round(totalOutput / validSessions) : 0;
  const avgToolCalls =
    validSessions > 0 ? (totalToolCalls / validSessions).toFixed(1) : 0;

  console.log(`\n${'='.repeat(55)}`);
  console.log('📊 [Footics Token Usage Summary]');
  console.log(`${'='.repeat(55)}`);
  console.log(
    `• Total Logged Sessions:  ${records.length} (Active: ${validSessions})`,
  );
  console.log(`• Total Tokens (est):     ${formatNumber(totalTokens)}`);
  console.log(`  ├─ Input Tokens:        ${formatNumber(totalInput)}`);
  console.log(`  └─ Output Tokens:       ${formatNumber(totalOutput)}`);
  console.log(`• Total Tool Calls:       ${formatNumber(totalToolCalls)}`);
  console.log(`• Total Trajectory Steps: ${formatNumber(totalSteps)}`);
  console.log(`${'-'.repeat(55)}`);
  console.log('📈 [Session Averages]');
  console.log(
    `• Avg Tokens / Session:   ${formatNumber(avgTokens)} (In: ${formatNumber(avgInput)} / Out: ${formatNumber(avgOutput)})`,
  );
  console.log(`• Avg Tool Calls / Sess:  ${avgToolCalls}`);
  console.log(`${'='.repeat(55)}\n`);
}

async function showTail(count = 5) {
  const records = await loadRecords();
  if (records.length === 0) {
    console.log('\n📊 No token metrics recorded yet.\n');
    return;
  }

  const targetRecords = records.slice(-count);
  console.log(`\n🕒 [Recent ${targetRecords.length} Sessions]`);
  console.log(`${'-'.repeat(80)}`);
  console.log(
    `${'Timestamp'.padEnd(25)} | ${'Tokens'.padStart(10)} | ${'In / Out'.padStart(16)} | ${'Tools'.padStart(6)} | Conv ID`,
  );
  console.log(`${'-'.repeat(80)}`);

  for (const r of targetRecords) {
    const m = r.metrics || {};
    const ts = (r.timestamp || '').slice(0, 19).replace('T', ' ');
    const convId = (r.conversationId || 'N/A').slice(0, 16);
    const tokens = formatNumber(m.totalTokens);
    const inOut = `${formatNumber(m.inputTokens)} / ${formatNumber(m.outputTokens)}`;
    const tools = formatNumber(m.toolCallsCount);

    console.log(
      `${ts.padEnd(25)} | ${tokens.padStart(10)} | ${inOut.padStart(16)} | ${tools.padStart(6)} | ${convId}`,
    );
  }
  console.log(`${'-'.repeat(80)}\n`);
}

function cleanMetrics() {
  if (fs.existsSync(METRICS_FILE)) {
    fs.writeFileSync(METRICS_FILE, '', 'utf8');
    console.log(`🧹 Cleaned ${METRICS_FILE}`);
  } else {
    console.log('ℹ️ No metrics file to clean.');
  }
}

async function main() {
  const cmd = process.argv[2] || 'summary';

  switch (cmd) {
    case 'summary':
      await showSummary();
      break;
    case 'tail': {
      const count = Number.parseInt(process.argv[3], 10) || 5;
      await showTail(count);
      break;
    }
    case 'raw': {
      if (fs.existsSync(METRICS_FILE)) {
        process.stdout.write(fs.readFileSync(METRICS_FILE, 'utf8'));
      }
      break;
    }
    case 'clean':
      cleanMetrics();
      break;
    default:
      console.log(`Unknown command: ${cmd}`);
      console.log(
        'Usage: node scripts/metrics/summary-tokens.js [summary|tail|raw|clean]',
      );
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(`[metrics summary error]: ${err.message}`);
  process.exit(1);
});
