import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  extractTargetFile,
  findToolResultRecord,
  isEditToolName,
  isModifyToolName,
  isReadToolName,
  isWriteToolName,
} from '../tool-helpers';
import type { AuditContext, Detector, Finding } from '../types';

const LINES_REGEX = /Showing lines (\d+)-(\d+) of (\d+)/;

/**
 * READ-02: SEQ_SLICING
 * 同一ファイルへの連続スライス読込または遮断
 */
export const detectSeqSlicing: Detector = (ctx: AuditContext): Finding[] => {
  const findings: Finding[] = [];
  let prevFile = '';
  let prevStep = -1;

  for (const r of ctx.records) {
    if (r.type === 'PLANNER_RESPONSE' && r.tool_calls) {
      for (const tc of r.tool_calls) {
        if (isReadToolName(tc.name)) {
          const hasSlice =
            tc.args?.StartLine !== undefined || tc.args?.EndLine !== undefined;
          const file = extractTargetFile(tc);
          if (hasSlice && file) {
            const resolved = path.resolve(file);
            if (resolved === prevFile) {
              findings.push({
                id: 'READ-02',
                name: 'SEQ_SLICING',
                severity: 'HIGH',
                sessionId: ctx.sessionId,
                steps: [prevStep, r.step_index],
                evidence: `Sequential slicing on the same file: '${file}'`,
                layers: ['planner', 'worker'],
              });
            }
            prevFile = resolved;
            prevStep = r.step_index;
            continue;
          }
        }
        prevFile = '';
      }
    } else if (
      r.status === 'ERROR' &&
      (r.content?.includes('Sequential slicing loop') ||
        r.content?.includes('Sequential slice paging blocked'))
    ) {
      findings.push({
        id: 'READ-02',
        name: 'SEQ_SLICING',
        severity: 'HIGH',
        sessionId: ctx.sessionId,
        steps: [r.step_index],
        evidence: `Sequential slicing loop blocked by hook: ${r.content.slice(0, 120)}`,
        layers: ['planner', 'worker'],
      });
    }
  }

  return findings;
};

function isFileProbed(file: string, probedTokens: Set<string>): boolean {
  if (probedTokens.has(file)) return true;
  const resolved = path.resolve(file);
  for (const p of probedTokens) {
    if (path.resolve(p) === resolved) return true;
    if (file.endsWith(p) || p.endsWith(file)) return true;
    const cleanDir = p.replace(/\/+$/, '');
    if (
      cleanDir &&
      (cleanDir.includes('/') ||
        cleanDir === 'src' ||
        cleanDir === 'extension' ||
        cleanDir === 'tests' ||
        cleanDir === 'scripts') &&
      file.startsWith(`${cleanDir}/`)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * READ-03: LARGE_FULL_BLIND
 * 150行超のファイルを peek/impact/rg/grep なしに全文一括読込
 */
export const detectLargeFullBlind: Detector = (
  ctx: AuditContext,
): Finding[] => {
  const findings: Finding[] = [];
  const probedTokens = new Set<string>();

  for (let i = 0; i < ctx.records.length; i++) {
    const r = ctx.records[i];
    if (r.type === 'PLANNER_RESPONSE' && r.tool_calls) {
      for (let tcIdx = 0; tcIdx < r.tool_calls.length; tcIdx++) {
        const tc = r.tool_calls[tcIdx];
        const cmd = String(tc.args?.CommandLine ?? '');
        if (
          cmd.includes('peek') ||
          cmd.includes('impact') ||
          cmd.includes('ast-grep') ||
          cmd.includes('grep') ||
          cmd.includes('find') ||
          /\brg\b/.test(cmd)
        ) {
          for (const token of cmd.split(/\s+/)) {
            const clean = token.replace(/^["']|["']$/g, '');
            if (
              !clean ||
              clean.startsWith('-') ||
              [
                'bun',
                'run',
                'rtk',
                'ai:peek',
                'ai:impact',
                'ast-grep',
                'rg',
                'grep',
                'find',
              ].includes(clean)
            ) {
              continue;
            }
            probedTokens.add(clean);
            const colonIdx = clean.lastIndexOf(':');
            if (colonIdx > 0 && clean.slice(0, colonIdx).includes('.')) {
              probedTokens.add(clean.slice(0, colonIdx));
            }
          }
        }

        if (isReadToolName(tc.name)) {
          const hasSlice =
            tc.args?.StartLine !== undefined || tc.args?.EndLine !== undefined;
          if (!hasSlice) {
            const file = extractTargetFile(tc);
            const next = findToolResultRecord(ctx.records, i, tcIdx);
            if (next?.type === 'GENERIC' && next.content) {
              const m = LINES_REGEX.exec(next.content);
              if (m) {
                const totalLines = Number.parseInt(m[3], 10);
                if (totalLines > 150 && !isFileProbed(file, probedTokens)) {
                  findings.push({
                    id: 'READ-03',
                    name: 'LARGE_FULL_BLIND',
                    severity: 'MED',
                    sessionId: ctx.sessionId,
                    steps: [r.step_index],
                    evidence: `Full-file blind read on large file (${totalLines} lines > 150) without prior peek/impact/rg: '${file}'`,
                    layers: ['planner', 'worker'],
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  return findings;
};

/**
 * READ-04: DUPLICATE_READ
 * 編集を挟まない同一ファイルの重複読込
 */
export const detectDuplicateRead: Detector = (ctx: AuditContext): Finding[] => {
  const findings: Finding[] = [];
  const readStepsByFile = new Map<string, number[]>();

  for (const r of ctx.records) {
    if (r.type === 'PLANNER_RESPONSE' && r.tool_calls) {
      for (const tc of r.tool_calls) {
        if (isModifyToolName(tc.name)) {
          const file = extractTargetFile(tc);
          if (file) readStepsByFile.delete(path.resolve(file));
        }

        if (isReadToolName(tc.name)) {
          const file = extractTargetFile(tc);
          if (file) {
            const resolved = path.resolve(file);
            const prev = readStepsByFile.get(resolved);
            if (prev && prev.length > 0) {
              findings.push({
                id: 'READ-04',
                name: 'DUPLICATE_READ',
                severity: 'LOW',
                sessionId: ctx.sessionId,
                steps: [prev[prev.length - 1], r.step_index],
                evidence: `Redundantly re-read '${file}' without any intervening edits`,
                layers: ['planner', 'worker'],
              });
            } else {
              readStepsByFile.set(resolved, [r.step_index]);
            }
          }
        }
      }
    }
  }

  return findings;
};

/**
 * READ-05: EDIT_WITHOUT_RAW_READ
 * 直前の無加工 read なしに edit_file / Overwrite write_file を実行
 */
export const detectEditWithoutRawRead: Detector = (
  ctx: AuditContext,
): Finding[] => {
  const findings: Finding[] = [];
  const recentRawReads = new Set<string>();

  for (let i = 0; i < ctx.records.length; i++) {
    const r = ctx.records[i];
    if (r.type === 'PLANNER_RESPONSE' && r.tool_calls) {
      for (let tcIdx = 0; tcIdx < r.tool_calls.length; tcIdx++) {
        const tc = r.tool_calls[tcIdx];
        if (isReadToolName(tc.name)) {
          const file = extractTargetFile(tc);
          if (file) recentRawReads.add(path.resolve(file));
        }

        const isTargetEdit =
          isEditToolName(tc.name) ||
          (isWriteToolName(tc.name) && tc.args?.Overwrite === true);

        if (isTargetEdit) {
          const file = extractTargetFile(tc);
          if (!file) continue;
          const resolved = path.resolve(file);
          const next = findToolResultRecord(ctx.records, i, tcIdx);
          const wasBlocked =
            next?.status === 'ERROR' && next?.content?.includes('GATEGUARD');

          if (wasBlocked || (isTargetEdit && !recentRawReads.has(resolved))) {
            findings.push({
              id: 'READ-05',
              name: 'EDIT_WITHOUT_RAW_READ',
              severity: 'HIGH',
              sessionId: ctx.sessionId,
              steps: [r.step_index],
              evidence: `Attempted to edit '${file}' without prior raw read_file`,
              layers: [ctx.role === 'planner' ? 'planner' : 'worker'],
            });
          }
        }
      }
    }
  }

  return findings;
};

/**
 * READ-06: RTK_READ_BASIS
 * rtk read の圧縮表示のみに基づいて編集
 */
export const detectRtkReadBasis: Detector = (ctx: AuditContext): Finding[] => {
  if (ctx.role !== 'worker') return [];

  const findings: Finding[] = [];
  let lastRtkReadFile = '';

  for (const r of ctx.records) {
    if (r.type === 'PLANNER_RESPONSE' && r.tool_calls) {
      for (const tc of r.tool_calls) {
        if (tc.name === 'run_command') {
          const cmd = String(tc.args?.CommandLine ?? '');
          if (/rtk\s+read\s+(?:-m|--level)\b/.test(cmd)) {
            const parts = cmd.split(/\s+/);
            lastRtkReadFile = parts[parts.length - 1];
          }
        }

        if (isReadToolName(tc.name)) {
          lastRtkReadFile = '';
        }

        if (isEditToolName(tc.name)) {
          const file = extractTargetFile(tc);
          if (file && lastRtkReadFile && file.includes(lastRtkReadFile)) {
            findings.push({
              id: 'READ-06',
              name: 'RTK_READ_BASIS',
              severity: 'HIGH',
              sessionId: ctx.sessionId,
              steps: [r.step_index],
              evidence: `Edited '${file}' directly based on lossy 'rtk read' output without raw read_file`,
              layers: ['worker'],
            });
          }
        }
      }
    }
  }

  return findings;
};

/**
 * READ-07: RAW_LOG_READ
 * transcript や logs を直接開く違反
 */
export const detectRawLogRead: Detector = (ctx: AuditContext): Finding[] => {
  const findings: Finding[] = [];
  const logRegex = /transcript[^\s'"]*\.jsonl|\.system_generated\/logs/i;

  for (const r of ctx.records) {
    if (r.type === 'PLANNER_RESPONSE' && r.tool_calls) {
      for (const tc of r.tool_calls) {
        const file = extractTargetFile(tc);
        const cmd = String(tc.args?.CommandLine ?? '');
        if (logRegex.test(file) || logRegex.test(cmd)) {
          findings.push({
            id: 'READ-07',
            name: 'RAW_LOG_READ',
            severity: 'HIGH',
            sessionId: ctx.sessionId,
            steps: [r.step_index],
            evidence: `Attempted direct access to raw transcript logs: '${file || cmd}'`,
            layers: ['auditor', 'planner', 'worker'],
          });
        }
      }
    }
  }

  return findings;
};

/**
 * READ-08: HEAVY_READ_TOP
 * セッション内で読込量の多いファイルを統計提示
 */
export const detectHeavyReadTop: Detector = (ctx: AuditContext): Finding[] => {
  const fileChars = new Map<string, number>();

  for (let i = 0; i < ctx.records.length; i++) {
    const r = ctx.records[i];
    if (r.type === 'PLANNER_RESPONSE' && r.tool_calls) {
      for (let tcIdx = 0; tcIdx < r.tool_calls.length; tcIdx++) {
        const tc = r.tool_calls[tcIdx];
        if (isReadToolName(tc.name)) {
          const file = extractTargetFile(tc);
          const next = findToolResultRecord(ctx.records, i, tcIdx);
          const len = (next?.content ?? '').length;
          fileChars.set(file, (fileChars.get(file) ?? 0) + len);
        }
      }
    }
  }

  if (fileChars.size === 0) return [];

  const sorted = Array.from(fileChars.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const evidence = sorted
    .map(([f, chars]) => `${f} (~${Math.round(chars / 1000)}KB)`)
    .join(', ');

  return [
    {
      id: 'READ-08',
      name: 'HEAVY_READ_TOP',
      severity: 'INFO',
      sessionId: ctx.sessionId,
      steps: [ctx.records[0]?.step_index ?? 0],
      evidence: `Top read files by volume: ${evidence}`,
      layers: ['planner', 'worker'],
    },
  ];
};

/**
 * READ-09: READ_UNUSED
 * 読まれたが以後の会話・編集・ツール引数で全く使われなかったファイル
 */
export const detectReadUnused: Detector = (ctx: AuditContext): Finding[] => {
  if (ctx.role !== 'planner') return [];

  const findings: Finding[] = [];
  const readFilesWithStep = new Map<string, number>();

  for (let i = 0; i < ctx.records.length; i++) {
    const r = ctx.records[i];
    if (r.type === 'PLANNER_RESPONSE' && r.tool_calls) {
      for (const tc of r.tool_calls) {
        if (isReadToolName(tc.name)) {
          const file = extractTargetFile(tc);
          if (file) {
            readFilesWithStep.set(file, r.step_index);
          }
        }
      }
    }
  }

  for (const [file, step] of readFilesWithStep.entries()) {
    const base =
      file
        .split('/')
        .pop()
        ?.replace(/\.[^.]+$/, '') ?? '';

    const subsequentText = ctx.records
      .filter((r) => r.step_index > step && r.type !== 'GENERIC')
      .map((r) => {
        const callsStr = r.tool_calls ? JSON.stringify(r.tool_calls) : '';
        return `${r.content ?? ''} ${r.thinking ?? ''} ${callsStr}`;
      })
      .join(' ');

    if (base.length > 3 && !subsequentText.includes(base)) {
      findings.push({
        id: 'READ-09',
        name: 'READ_UNUSED',
        severity: 'LOW',
        sessionId: ctx.sessionId,
        steps: [step],
        evidence: `File '${file}' was read but never referenced or utilized in subsequent steps`,
        layers: ['planner'],
      });
    }
  }

  return findings;
};

/**
 * タスクファイルから対象 Phase の Target Files パス一覧を抽出する
 */
function extractPhaseTargetsFromTaskFile(
  taskFilePath: string,
  phaseNum?: number,
): string[] | null {
  const abs = path.resolve(taskFilePath);
  if (!fs.existsSync(abs)) return null;
  try {
    const md = fs.readFileSync(abs, 'utf8');
    let scopeSection = md;
    if (phaseNum !== undefined) {
      const re = new RegExp(
        `###\\s+Phase\\s+${phaseNum}\\b[\\s\\S]*?(?=###\\s+Phase\\s+\\d+|\\n##\\s+\\d+\\.|$)`,
      );
      const m = re.exec(md);
      if (m) scopeSection = m[0];
    }
    const paths: string[] = [taskFilePath];
    for (const match of scopeSection.matchAll(/`([^`\n]+)`/g)) {
      const candidate = match[1].trim();
      if (candidate.includes('/') || /\.[tj]sx?$/.test(candidate)) {
        paths.push(candidate);
      }
    }
    return paths;
  } catch {
    return null;
  }
}

/**
 * READ-10: WORKER_EXPLORES
 * Worker がタスクプロンプト（および割り当て Phase の Target Files）外のファイルを自前探索
 */
export const detectWorkerExplores: Detector = (
  ctx: AuditContext,
): Finding[] => {
  if (ctx.role !== 'worker') return [];

  const firstMsg =
    ctx.records.find((r) => r.type === 'SYSTEM_MESSAGE')?.content ?? '';
  const taskMatch =
    /target_file:\s*["']?([^"'\n]+)["']?/i.exec(firstMsg) ??
    /\b(tasks\/TASK-[^"'\s`\n]+\.md)/.exec(firstMsg);
  const phaseMatch =
    /target_phase:\s*(\d+)/i.exec(firstMsg) ?? /Phase\s+(\d+)/i.exec(firstMsg);

  const taskFile = taskMatch?.[1]?.trim();
  const phaseNum = phaseMatch ? Number.parseInt(phaseMatch[1], 10) : undefined;
  const taskTargets = taskFile
    ? extractPhaseTargetsFromTaskFile(taskFile, phaseNum)
    : null;

  const findings: Finding[] = [];

  for (const r of ctx.records) {
    if (r.type === 'PLANNER_RESPONSE' && r.tool_calls) {
      for (const tc of r.tool_calls) {
        if (isReadToolName(tc.name)) {
          const file = extractTargetFile(tc);
          const base = file.split('/').pop() ?? '';
          const isSourceScope =
            file.startsWith('src/') ||
            file.startsWith('extension/') ||
            /\/(?:src|extension)\//.test(file);

          if (!isSourceScope) continue;

          const inPrompt =
            firstMsg.includes(file) || (base && firstMsg.includes(base));
          const inTaskFile =
            taskTargets !== null &&
            taskTargets.some(
              (t) =>
                file === t ||
                file.endsWith(`/${t}`) ||
                t.endsWith(`/${file}`) ||
                path.resolve(file) === path.resolve(t),
            );

          if (!inPrompt && !inTaskFile) {
            findings.push({
              id: 'READ-10',
              name: 'WORKER_EXPLORES',
              severity: 'MED',
              sessionId: ctx.sessionId,
              steps: [r.step_index],
              evidence: `Worker explored out-of-scope file not specified in task instructions: '${file}'`,
              layers: ['worker', 'task-design'],
            });
          }
        }
      }
    }
  }

  return findings;
};

/**
 * READ-11: COMPACT_LOOP_ALERT
 * Planner ターン間で cache_read_tokens (>= 80K) が 50% 超急落したオートコンパクション発生を検知
 */
export const detectCompactLoopAlert: Detector = (
  ctx: AuditContext,
): Finding[] => {
  const drops: Array<{ step: number; prev: number; curr: number }> = [];
  let prevTokens: number | null = null;

  for (const r of ctx.records) {
    if (
      r.type === 'PLANNER_RESPONSE' &&
      typeof r.cache_read_tokens === 'number'
    ) {
      const curr = r.cache_read_tokens;
      if (
        prevTokens !== null &&
        prevTokens >= 80_000 &&
        curr <= prevTokens * 0.5
      ) {
        drops.push({ step: r.step_index, prev: prevTokens, curr });
      }
      prevTokens = curr;
    }
  }

  if (drops.length === 0) return [];

  const isHigh = drops.length >= 2 || drops.some((d) => d.prev >= 150_000);
  const summary = drops
    .map(
      (d) =>
        `step ${d.step}: ${Math.round(d.prev / 1000)}K->${Math.round(d.curr / 1000)}K`,
    )
    .join(', ');

  return [
    {
      id: 'READ-11',
      name: 'COMPACT_LOOP_ALERT',
      severity: isHigh ? 'HIGH' : 'MED',
      sessionId: ctx.sessionId,
      steps: drops.map((d) => d.step),
      evidence: `Auto-compaction cache drop(s) detected (${drops.length}x): ${summary}`,
      layers: ['planner'],
    },
  ];
};

export const READING_DETECTORS: Detector[] = [
  detectSeqSlicing,
  detectLargeFullBlind,
  detectDuplicateRead,
  detectEditWithoutRawRead,
  detectRtkReadBasis,
  detectRawLogRead,
  detectHeavyReadTop,
  detectReadUnused,
  detectWorkerExplores,
  detectCompactLoopAlert,
];
