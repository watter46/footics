import type { GuardDecision, ParsedCommand } from './safety-filter';

const BIOME_REWRITE_SUBCMDS = ['check', 'lint', 'ci'];
const BIOME_COMPACT_FLAGS: [string, string][] = [
  ['--diagnostic-level', '--diagnostic-level=error'],
  ['--max-diagnostics', '--max-diagnostics=20'],
  ['--reporter', '--reporter=concise'],
];
const TEST_RUNNER_RE =
  /\b(vitest|jest|playwright|pytest|mocha|bun\s+test|cargo\s+test|go\s+test)\b/;

/**
 * biome check/lint/ci に、未指定のコンパクト出力フラグだけを末尾付与する。
 * (rtk lint は ESLint 向けフィルタのため Biome 出力には使わない)
 */
function rewriteBiome(args: string[], rawSubCmd: string): GuardDecision | null {
  if (!BIOME_REWRITE_SUBCMDS.includes(args[0] ?? '')) return null;
  if (args.includes('--help') || args.includes('-h')) return null;
  const missing = BIOME_COMPACT_FLAGS.filter(
    ([name]) => !args.some((a) => a === name || a.startsWith(`${name}=`)),
  ).map(([, flag]) => flag);
  if (missing.length === 0) return null;
  return {
    decision: 'allow',
    overwrite: { CommandLine: `${rawSubCmd} ${missing.join(' ')}` },
  };
}

function checkTokenGuard(
  parsed: ParsedCommand,
  rawSubCmd: string,
  _fullCmdLine: string,
): GuardDecision | null {
  const { executable, args } = parsed;

  // 1. アドホックスクリプト実行の遮断 (ガード回避・環境破壊防止)
  if (['python', 'python3', 'node', 'perl', 'ruby'].includes(executable)) {
    return {
      decision: 'deny',
      reason:
        "[GUARD] Ad-hoc script execution (python, node, etc.) is prohibited to prevent guard bypass. Use 'rtk' commands.",
    };
  }

  // 1b. bun -e / --eval / -p の遮断 (node -e と同等の抜け穴)。正規手段を案内する。
  if (
    executable === 'bun' &&
    ['-e', '--eval', '-p', '--print'].includes(args[0] ?? '')
  ) {
    return {
      decision: 'deny',
      reason:
        "[GUARD] Ad-hoc 'bun -e' is prohibited (same as node -e). For agent logs use 'bun run ai:report [<conversation-id>|latest]'; for verification use 'bun run ai:preflight'.",
    };
  }

  // 1c. rtk test は「失敗のみ・末尾数行」のロッシーフィルタ。テストランナー以外への使用を遮断。
  if (executable === 'rtk' && args[0] === 'test') {
    const inner = args.slice(1).join(' ');
    if (!TEST_RUNNER_RE.test(inner)) {
      return {
        decision: 'deny',
        reason:
          "[GUARD] 'rtk test' keeps only failures / the last lines of output (lossy) and is for test runners only. Run the command directly, or use 'bun run ai:preflight' / 'bun run ai:report'.",
      };
    }
  }

  // 2. 重要ルール・設計書に対する rtk smart の遮断
  if (executable === 'rtk' && args[0] === 'smart') {
    const targetPath = args.slice(1).join(' ').trim();
    const isCriticalTarget =
      /(\.agents\/rules|\.agents\/agents|\btasks\/)/.test(targetPath);
    if (isCriticalTarget) {
      return {
        decision: 'deny',
        reason: `[GUARD] '${targetPath}' is critical. Use 'view_file' or uncompressed 'rtk read'.`,
      };
    }
  }

  // 3. Markdown / 設定 / ルールファイルに対する要約読込 (-l, -m) の遮断
  if (
    executable === 'rtk' &&
    args[0] === 'read' &&
    args.some((a) => a === '-m' || a === '-l' || a === '--level')
  ) {
    const targetFiles = args.slice(1).join(' ');
    if (/\.(md|json|ya?ml)\b|(rules|config|AGENTS|GEMINI)/i.test(targetFiles)) {
      return {
        decision: 'deny',
        reason:
          '[GUARD] Using -l minimal/aggressive or -m is forbidden for Markdown/config/rules files. Read the full file without these flags to preserve intention.',
      };
    }
  }

  // 4. トークン爆発フラグの遮断 (fd -H, jq ., git diff --stat)
  if (
    executable === 'fd' &&
    (args.includes('-H') || args.includes('--hidden'))
  ) {
    return {
      decision: 'deny',
      reason:
        "[GUARD] 'fd -H' / '--hidden' is forbidden as it traverses hidden directories (.git, .next, etc.) causing token explosion. Use 'fd -t f <pattern> <dir>' instead.",
    };
  }

  if (executable === 'jq') {
    const filterArg = args.find((a) => !a.startsWith('-'));
    if (filterArg === '.' || filterArg === "'.'" || filterArg === '"."') {
      return {
        decision: 'deny',
        reason:
          "[GUARD] Full JSON dumping with 'jq .' or 'jq -c .' is forbidden. Use 'rtk json --keys-only <file>', 'jq -c \"keys\" <file>', or slice 'jq -c \".[0:5]\" <file>'.",
      };
    }
  }

  if (
    (executable === 'git' || (executable === 'rtk' && args[0] === 'git')) &&
    args.includes('diff') &&
    args.includes('--stat')
  ) {
    return {
      decision: 'deny',
      reason:
        "[GUARD] 'git diff --stat' is forbidden as it lacks diff details. Use 'GIT_EXTERNAL_DIFF=difft rtk git diff' or 'rtk git diff -U0'.",
    };
  }

  // git log -p / git log -u / git log --patch の遮断 (ソースコード全文パッチ出力によるトークン爆発防止)
  if (
    (executable === 'git' || (executable === 'rtk' && args[0] === 'git')) &&
    args.some((a) => a === 'log') &&
    args.some(
      (a) =>
        a === '-p' ||
        a === '-u' ||
        a === '--patch' ||
        /^-[a-zA-Z]*p/.test(a) ||
        /^-[a-zA-Z]*u/.test(a),
    )
  ) {
    return {
      decision: 'deny',
      reason:
        "[GUARD] 'git log -p' (patch mode) dumps entire code diffs and causes token explosion. Use 'rtk git log -n 5 --oneline' or check specific diffs via 'GIT_EXTERNAL_DIFF=difft rtk git show <hash> -- <file>'.",
    };
  }

  // 5. 検証コマンドのスコープ強制 (ai:check / ai:reviewer:check)
  if (['pnpm', 'npm', 'yarn', 'bun'].includes(executable)) {
    if (
      args.includes('ai:reviewer:check') ||
      args.includes('agent:check-reviewer')
    ) {
      const idx = args.findIndex(
        (a) => a === 'ai:reviewer:check' || a === 'agent:check-reviewer',
      );
      const targetFiles = args.slice(idx + 1);
      if (targetFiles.length === 0 || targetFiles[0].startsWith('-')) {
        return {
          decision: 'deny',
          reason:
            "[GUARD] 'ai:reviewer:check' requires target file paths to minimize scope. Example: bun run ai:reviewer:check src/foo.ts",
        };
      }
    }
    // 全体検証コマンド (:all) の無断実行抑止 (Scope-First Guard: ユーザー承認必須)
    if (
      args.some(
        (a) => a === 'check:all' || a === 'lint:all' || a === 'typecheck:all',
      )
    ) {
      return {
        decision: 'force_ask',
        reason:
          '[GUARD] Running full codebase verification (:all) is costly. Please confirm if full check is explicitly intended.',
      };
    }
  }

  // 6. 透過的コマンド書き換え (overwrite) - 原文 rawSubCmd を維持して安全に置換
  // 6a. sg -> ast-grep
  if (executable === 'sg') {
    return {
      decision: 'allow',
      overwrite: { CommandLine: rawSubCmd.replace(/^sg\b/, 'ast-grep') },
    };
  }

  // 6b. tree -> eza -T -L 2 --git-ignore
  if (executable === 'tree') {
    const targetDir = args.filter((a) => !a.startsWith('-')).join(' ');
    const newCmd = `eza -T -L 2 --git-ignore${targetDir ? ` ${targetDir}` : ''}`;
    return {
      decision: 'allow',
      overwrite: { CommandLine: newCmd },
    };
  }

  // 6c. rg (制限なし) -> rtk grep
  if (executable === 'rg') {
    const hasLimit = args.some(
      (a) => a === '-m' || a === '--max-count' || /^-m\d+/.test(a),
    );
    if (!hasLimit) {
      return {
        decision: 'allow',
        overwrite: { CommandLine: rawSubCmd.replace(/^rg\b/, 'rtk grep') },
      };
    }
  }

  // 6d. ls / dir -> rtk ls
  if (executable === 'ls') {
    return {
      decision: 'allow',
      overwrite: { CommandLine: rawSubCmd.replace(/^ls\b/, 'rtk ls') },
    };
  }
  if (executable === 'dir') {
    return {
      decision: 'allow',
      overwrite: { CommandLine: rawSubCmd.replace(/^dir\b/, 'rtk ls') },
    };
  }

  // 6e-1. tail およびファイル読込・行数計測バイパスコマンドの遮断
  if (executable === 'tail') {
    return {
      decision: 'deny',
      reason:
        "[GUARD] 'tail' is prohibited for code exploration. Use 'bun run ai:outline <file>' to locate signatures, or 'view_file' with specific StartLine/EndLine.",
    };
  }
  if (
    ['strings', 'nl', 'tac', 'od', 'xxd', 'base64', 'wc'].includes(executable)
  ) {
    return {
      decision: 'deny',
      reason: `[GUARD] '${executable}' is prohibited to prevent file read / line count guard bypass. Use 'bun run ai:outline <file>' or 'view_file' instead.`,
    };
  }

  // 6e-2. head の健全化 (オプション -n <N> を rtk read -m 1:<N> に安全変換)
  if (executable === 'head') {
    let lineCount = 10;
    const files: string[] = [];
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a === '-n' && args[i + 1] && /^\d+$/.test(args[i + 1])) {
        lineCount = parseInt(args[i + 1], 10);
        i++;
      } else if (/^-n(\d+)$/.test(a)) {
        const m = a.match(/^-n(\d+)$/);
        if (m) lineCount = parseInt(m[1], 10);
      } else if (/^-(\d+)$/.test(a)) {
        const m = a.match(/^-(\d+)$/);
        if (m) lineCount = parseInt(m[1], 10);
      } else if (!a.startsWith('-')) {
        files.push(a);
      }
    }
    if (files.length > 0) {
      return {
        decision: 'allow',
        overwrite: {
          CommandLine: `rtk read -m 1:${lineCount} ${files.join(' ')}`,
        },
      };
    }
    return {
      decision: 'allow',
      overwrite: {
        CommandLine: rawSubCmd.replace(/^head\b/, 'rtk read'),
      },
    };
  }

  // 6e-3. cat / less / more -> rtk read
  if (['cat', 'less', 'more'].includes(executable)) {
    return {
      decision: 'allow',
      overwrite: {
        CommandLine: rawSubCmd.replace(/^(cat|less|more)\b/, 'rtk read'),
      },
    };
  }

  // 6f. find -> rtk find
  if (executable === 'find') {
    return {
      decision: 'allow',
      overwrite: { CommandLine: rawSubCmd.replace(/^find\b/, 'rtk find') },
    };
  }

  // 6g. grep -> rtk grep
  if (executable === 'grep') {
    return {
      decision: 'allow',
      overwrite: { CommandLine: rawSubCmd.replace(/^grep\b/, 'rtk grep') },
    };
  }

  // 6h. git (diff, status, log, show, branch, stash, worktree, grep)
  if (executable === 'git') {
    const subCmd = args[0] || '';
    if (
      subCmd === 'status' ||
      subCmd === 'log' ||
      subCmd === 'show' ||
      subCmd === 'branch' ||
      subCmd === 'stash' ||
      subCmd === 'worktree'
    ) {
      return {
        decision: 'allow',
        overwrite: { CommandLine: rawSubCmd.replace(/^git\b/, 'rtk git') },
      };
    }
    if (subCmd === 'grep') {
      return {
        decision: 'allow',
        overwrite: {
          CommandLine: rawSubCmd.replace(/^git\s+grep\b/, 'rtk grep'),
        },
      };
    }
    if (subCmd === 'diff') {
      const diffCmd = rawSubCmd.replace(/^git\b/, 'rtk git');
      return {
        decision: 'allow',
        overwrite: {
          CommandLine: `GIT_EXTERNAL_DIFF=difft ${diffCmd}`,
        },
      };
    }
  }

  // 6i. rtk git diff without GIT_EXTERNAL_DIFF
  if (
    executable === 'rtk' &&
    args[0] === 'git' &&
    args[1] === 'diff' &&
    !rawSubCmd.startsWith('GIT_EXTERNAL_DIFF=')
  ) {
    return {
      decision: 'allow',
      overwrite: { CommandLine: `GIT_EXTERNAL_DIFF=difft ${rawSubCmd}` },
    };
  }

  // 6j. tsc -> rtk tsc
  if (executable === 'tsc') {
    const runnerRe = /^(?:(?:bunx|npx|pnpm\s+exec|bun\s+run)\s+)?tsc\b/;
    return {
      decision: 'allow',
      overwrite: { CommandLine: rawSubCmd.replace(runnerRe, 'rtk tsc') },
    };
  }

  // 6k. biome -> コンパクト出力フラグ付与 (rtk lint は ESLint 向けのため使わない) / eslint -> rtk lint
  if (executable === 'biome') {
    return rewriteBiome(args, rawSubCmd);
  }
  if (executable === 'eslint') {
    const runnerRe = /^(?:(?:bunx|npx|pnpm\s+exec)\s+)?eslint\b/;
    return {
      decision: 'allow',
      overwrite: { CommandLine: rawSubCmd.replace(runnerRe, 'rtk lint') },
    };
  }

  // 6l. vitest -> rtk vitest / jest -> rtk test
  if (executable === 'vitest') {
    const runnerRe = /^(?:(?:bunx|npx|pnpm\s+exec)\s+)?vitest\b/;
    return {
      decision: 'allow',
      overwrite: { CommandLine: rawSubCmd.replace(runnerRe, 'rtk vitest') },
    };
  }
  if (executable === 'jest') {
    const runnerRe = /^(?:(?:bunx|npx|pnpm\s+exec)\s+)?jest\b/;
    return {
      decision: 'allow',
      overwrite: { CommandLine: rawSubCmd.replace(runnerRe, 'rtk test') },
    };
  }

  // 6m. next -> rtk next
  if (executable === 'next') {
    const runnerRe = /^(?:(?:bunx|npx|pnpm\s+exec)\s+)?next\b/;
    return {
      decision: 'allow',
      overwrite: { CommandLine: rawSubCmd.replace(runnerRe, 'rtk next') },
    };
  }

  // 6n. playwright -> rtk playwright
  if (executable === 'playwright') {
    const runnerRe = /^(?:(?:bunx|npx|pnpm\s+exec)\s+)?playwright\b/;
    return {
      decision: 'allow',
      overwrite: {
        CommandLine: rawSubCmd.replace(runnerRe, 'rtk playwright'),
      },
    };
  }

  // 6o. package managers (install / add) -> rtk <executable>
  if (['pnpm', 'npm', 'yarn', 'bun'].includes(executable)) {
    const subCmd = args[0] || '';
    if (
      executable === 'bun' &&
      subCmd === 'test' &&
      !rawSubCmd.startsWith('rtk test')
    ) {
      return {
        decision: 'allow',
        overwrite: { CommandLine: `rtk test ${rawSubCmd}` },
      };
    }
    if (['install', 'i', 'add'].includes(subCmd)) {
      return {
        decision: 'allow',
        overwrite: { CommandLine: `rtk ${rawSubCmd}` },
      };
    }
  }

  return null;
}

export { checkTokenGuard };
