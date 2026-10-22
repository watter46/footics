import type { AuditContext, Detector, Finding } from '../types';

function extractTargetFile(tc: {
  name: string;
  args?: Record<string, unknown>;
}): string {
  const raw =
    tc.args?.AbsolutePath ??
    tc.args?.Path ??
    tc.args?.TargetFile ??
    tc.args?.file ??
    '';
  return String(raw).trim().replace(/^"|"$/g, '');
}

const LINES_REGEX = /Showing lines (\d+)-(\d+) of (\d+)/;

/**
 * READ-01: SMALL_SLICED
 * 400行以下の小型ファイルをスライス読込
 */
export const detectSmallSliced: Detector = (ctx: AuditContext): Finding[] => {
  const findings: Finding[] = [];

  for (let i = 0; i < ctx.records.length; i++) {
    const r = ctx.records[i];
    if (r.type === 'PLANNER_RESPONSE' && r.tool_calls) {
      for (const tc of r.tool_calls) {
        if (tc.name === 'view_file' || tc.name === 'read_file') {
          const hasSlice =
            tc.args?.StartLine !== undefined || tc.args?.EndLine !== undefined;
          if (hasSlice) {
            const next = ctx.records[i + 1];
            if (next?.type === 'GENERIC' && next.content) {
              const m = LINES_REGEX.exec(next.content);
              if (m) {
                const totalLines = Number.parseInt(m[3], 10);
                if (totalLines <= 400) {
                  const file = extractTargetFile(tc);
                  findings.push({
                    id: 'READ-01',
                    name: 'SMALL_SLICED',
                    severity: 'MED',
                    sessionId: ctx.sessionId,
                    steps: [r.step_index],
                    evidence: `Sliced small file (${totalLines} lines <= 400): '${file}' (StartLine: ${String(tc.args?.StartLine)}, EndLine: ${String(tc.args?.EndLine)})`,
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
        if (tc.name === 'view_file' || tc.name === 'read_file') {
          const hasSlice =
            tc.args?.StartLine !== undefined || tc.args?.EndLine !== undefined;
          const file = extractTargetFile(tc);
          if (hasSlice && file) {
            if (file === prevFile) {
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
            prevFile = file;
            prevStep = r.step_index;
            continue;
          }
        }
        prevFile = '';
      }
    } else if (
      r.status === 'ERROR' &&
      r.content?.includes('Sequential slicing loop detected')
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

/**
 * READ-03: LARGE_FULL_BLIND
 * 400行超の巨大ファイルを grep/outline なしに全文一括読込
 */
export const detectLargeFullBlind: Detector = (
  ctx: AuditContext,
): Finding[] => {
  const findings: Finding[] = [];
  const probedFiles = new Set<string>();

  for (let i = 0; i < ctx.records.length; i++) {
    const r = ctx.records[i];
    if (r.type === 'PLANNER_RESPONSE' && r.tool_calls) {
      for (const tc of r.tool_calls) {
        const cmd = String(tc.args?.CommandLine ?? '');
        if (
          cmd.includes('grep') ||
          cmd.includes('outline') ||
          cmd.includes('find')
        ) {
          const match = /(?:grep|outline|find)[^\s]*\s+([^\s]+)/.exec(cmd);
          if (match?.[1]) probedFiles.add(match[1]);
        }

        if (tc.name === 'view_file' || tc.name === 'read_file') {
          const hasSlice =
            tc.args?.StartLine !== undefined || tc.args?.EndLine !== undefined;
          if (!hasSlice) {
            const file = extractTargetFile(tc);
            const next = ctx.records[i + 1];
            if (next?.type === 'GENERIC' && next.content) {
              const m = LINES_REGEX.exec(next.content);
              if (m) {
                const totalLines = Number.parseInt(m[3], 10);
                if (totalLines > 400 && !probedFiles.has(file)) {
                  findings.push({
                    id: 'READ-03',
                    name: 'LARGE_FULL_BLIND',
                    severity: 'MED',
                    sessionId: ctx.sessionId,
                    steps: [r.step_index],
                    evidence: `Full-file blind read on large file (${totalLines} lines > 400) without prior grep/outline: '${file}'`,
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
        const isEdit =
          tc.name === 'edit_file' ||
          tc.name === 'write_file' ||
          tc.name === 'replace_file_content' ||
          tc.name === 'write_to_file';
        if (isEdit) {
          const file = extractTargetFile(tc);
          readStepsByFile.delete(file);
        }

        if (tc.name === 'view_file' || tc.name === 'read_file') {
          const file = extractTargetFile(tc);
          if (file) {
            const prev = readStepsByFile.get(file);
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
              readStepsByFile.set(file, [r.step_index]);
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
 * 直前の無加工 read なしに edit_file を実行
 */
export const detectEditWithoutRawRead: Detector = (
  ctx: AuditContext,
): Finding[] => {
  if (ctx.role !== 'worker') return [];

  const findings: Finding[] = [];
  const recentRawReads = new Set<string>();

  for (let i = 0; i < ctx.records.length; i++) {
    const r = ctx.records[i];
    if (r.type === 'PLANNER_RESPONSE' && r.tool_calls) {
      for (const tc of r.tool_calls) {
        if (tc.name === 'view_file' || tc.name === 'read_file') {
          const file = extractTargetFile(tc);
          recentRawReads.add(file);
        }

        const isEdit =
          tc.name === 'edit_file' || tc.name === 'replace_file_content';
        if (isEdit) {
          const file = extractTargetFile(tc);
          const next = ctx.records[i + 1];
          const wasBlocked =
            next?.status === 'ERROR' && next?.content?.includes('GATEGUARD');

          if (!recentRawReads.has(file) || wasBlocked) {
            findings.push({
              id: 'READ-05',
              name: 'EDIT_WITHOUT_RAW_READ',
              severity: 'HIGH',
              sessionId: ctx.sessionId,
              steps: [r.step_index],
              evidence: `Attempted to edit '${file}' without prior raw read_file/view_file`,
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

        if (tc.name === 'view_file' || tc.name === 'read_file') {
          lastRtkReadFile = '';
        }

        if (tc.name === 'edit_file' || tc.name === 'replace_file_content') {
          const file = extractTargetFile(tc);
          if (file && lastRtkReadFile && file.includes(lastRtkReadFile)) {
            findings.push({
              id: 'READ-06',
              name: 'RTK_READ_BASIS',
              severity: 'HIGH',
              sessionId: ctx.sessionId,
              steps: [r.step_index],
              evidence: `Edited '${file}' directly based on lossy 'rtk read' output without raw view_file`,
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
      for (const tc of r.tool_calls) {
        if (tc.name === 'view_file' || tc.name === 'read_file') {
          const file = extractTargetFile(tc);
          const next = ctx.records[i + 1];
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
 * 読まれたが以後の会話・編集・サブエージェント指示で全く使われなかったファイル
 */
export const detectReadUnused: Detector = (ctx: AuditContext): Finding[] => {
  if (ctx.role !== 'planner') return [];

  const findings: Finding[] = [];
  const readFilesWithStep = new Map<string, number>();

  for (let i = 0; i < ctx.records.length; i++) {
    const r = ctx.records[i];
    if (r.type === 'PLANNER_RESPONSE' && r.tool_calls) {
      for (const tc of r.tool_calls) {
        if (tc.name === 'view_file' || tc.name === 'read_file') {
          const file = extractTargetFile(tc);
          if (file && !file.includes('repo_summary')) {
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

    // 当該読込結果（step + 1）より後のステップを対象にチェック
    const subsequentText = ctx.records
      .filter((r) => r.step_index > step + 1)
      .map((r) => `${r.content ?? ''} ${r.thinking ?? ''}`)
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
 * READ-10: WORKER_EXPLORES
 * Worker がタスクプロンプト外のファイルを自前探索
 */
export const detectWorkerExplores: Detector = (
  ctx: AuditContext,
): Finding[] => {
  if (ctx.role !== 'worker') return [];

  const firstMsg =
    ctx.records.find((r) => r.type === 'SYSTEM_MESSAGE')?.content ?? '';
  const findings: Finding[] = [];

  for (const r of ctx.records) {
    if (r.type === 'PLANNER_RESPONSE' && r.tool_calls) {
      for (const tc of r.tool_calls) {
        if (tc.name === 'view_file' || tc.name === 'read_file') {
          const file = extractTargetFile(tc);
          const base = file.split('/').pop() ?? '';
          if (
            (file.startsWith('src/') || file.startsWith('extension/')) &&
            !firstMsg.includes(file) &&
            !firstMsg.includes(base)
          ) {
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

export const READING_DETECTORS: Detector[] = [
  detectSmallSliced,
  detectSeqSlicing,
  detectLargeFullBlind,
  detectDuplicateRead,
  detectEditWithoutRawRead,
  detectRtkReadBasis,
  detectRawLogRead,
  detectHeavyReadTop,
  detectReadUnused,
  detectWorkerExplores,
];
