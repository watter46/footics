import type { GuardDecision, ParsedCommand } from './safety-filter';

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

  // 2. 重要ルール・設計書に対する rtk smart の遮断
  if (executable === 'rtk' && args[0] === 'smart') {
    const targetPath = args.slice(1).join(' ').trim();
    const isCriticalTarget =
      /(\.agents\/rules|\.agents\/agents|\.agents\/tasks)/.test(targetPath);
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

  // 5. 検証コマンドのスコープ強制 (agent:check-worker / agent:check-reviewer)
  if (['pnpm', 'npm', 'yarn', 'bun'].includes(executable)) {
    if (args.includes('agent:check-worker')) {
      const idx = args.indexOf('agent:check-worker');
      const targetFiles = args.slice(idx + 1);
      if (targetFiles.length === 0 || targetFiles[0].startsWith('-')) {
        return {
          decision: 'deny',
          reason:
            "[GUARD] 'agent:check-worker' requires target file paths to minimize scope. Example: pnpm run agent:check-worker src/foo.ts",
        };
      }
    }
    if (args.includes('agent:check-reviewer')) {
      const idx = args.indexOf('agent:check-reviewer');
      const targetFiles = args.slice(idx + 1);
      if (targetFiles.length === 0 || targetFiles[0].startsWith('-')) {
        return {
          decision: 'deny',
          reason:
            "[GUARD] 'agent:check-reviewer' requires target file paths to minimize scope. Example: pnpm run agent:check-reviewer src/foo.ts",
        };
      }
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
    const newCmd = `eza -T -L 2 --git-ignore${targetDir ? ' ' + targetDir : ''}`;
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

  // 6e. cat / less / more / head / tail -> rtk read
  if (['cat', 'less', 'more', 'head', 'tail'].includes(executable)) {
    return {
      decision: 'allow',
      overwrite: {
        CommandLine: rawSubCmd.replace(
          /^(cat|less|more|head|tail)\b/,
          'rtk read',
        ),
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

  // 6h. git (diff, status, log)
  if (executable === 'git') {
    const subCmd = args[0] || '';
    if (subCmd === 'status' || subCmd === 'log') {
      return {
        decision: 'allow',
        overwrite: { CommandLine: rawSubCmd.replace(/^git\b/, 'rtk git') },
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
    return {
      decision: 'allow',
      overwrite: { CommandLine: rawSubCmd.replace(/^tsc\b/, 'rtk tsc') },
    };
  }

  // 6k. biome / eslint -> rtk lint
  if (executable === 'biome') {
    return {
      decision: 'allow',
      overwrite: { CommandLine: rawSubCmd.replace(/^biome\b/, 'rtk lint') },
    };
  }
  if (executable === 'eslint') {
    return {
      decision: 'allow',
      overwrite: { CommandLine: rawSubCmd.replace(/^eslint\b/, 'rtk lint') },
    };
  }

  // 6l. vitest -> rtk vitest / jest -> rtk test
  if (executable === 'vitest') {
    return {
      decision: 'allow',
      overwrite: { CommandLine: rawSubCmd.replace(/^vitest\b/, 'rtk vitest') },
    };
  }
  if (executable === 'jest') {
    return {
      decision: 'allow',
      overwrite: { CommandLine: rawSubCmd.replace(/^jest\b/, 'rtk test') },
    };
  }

  // 6m. next -> rtk next
  if (executable === 'next') {
    return {
      decision: 'allow',
      overwrite: { CommandLine: rawSubCmd.replace(/^next\b/, 'rtk next') },
    };
  }

  // 6n. playwright -> rtk playwright
  if (executable === 'playwright') {
    return {
      decision: 'allow',
      overwrite: {
        CommandLine: rawSubCmd.replace(/^playwright\b/, 'rtk playwright'),
      },
    };
  }

  // 6m. package managers (install / add) -> rtk <executable>
  if (['pnpm', 'npm', 'yarn', 'bun'].includes(executable)) {
    const subCmd = args[0] || '';
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
