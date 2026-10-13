interface ParsedCommand {
  executable: string;
  args: string[];
}

interface GuardDecision {
  decision: 'allow' | 'deny' | 'ask' | 'force_ask';
  reason?: string;
  overwrite?: {
    CommandLine?: string;
    [key: string]: any;
  };
}

function checkSafetyGuard(
  parsed: ParsedCommand,
  rawSubCmd: string,
  fullCmdLine: string,
): GuardDecision | null {
  const { executable, args } = parsed;

  if (
    /(curl|wget|fetch)\b.*\|\s*(bash|sh|zsh|dash|python|perl|ruby)\b/i.test(
      fullCmdLine,
    )
  ) {
    return {
      decision: 'deny',
      reason:
        '[GUARD] Piping remote scripts directly into shell is prohibited.',
    };
  }

  if (
    /:(\(\)|)\s*\{\s*:\|:&\s*\};:/.test(fullCmdLine) ||
    /:\|\s*:&/.test(fullCmdLine)
  ) {
    return { decision: 'deny', reason: '[GUARD] Fork bomb pattern detected.' };
  }

  if (executable === 'sudo' || executable === 'su') {
    return {
      decision: 'deny',
      reason: '[GUARD] Privilege escalation (sudo/su) is prohibited.',
    };
  }

  if (executable === 'chmod') {
    if (
      args.some(
        (a) =>
          a === '777' || (a === '-R' && args.includes('777')) || a === 'a+rwx',
      )
    ) {
      return {
        decision: 'deny',
        reason: '[GUARD] Insecure permissions (chmod 777) are prohibited.',
      };
    }
  }

  const SYSTEM_DESTRUCTIVE = new Set([
    'dd',
    'mkfs',
    'fdisk',
    'parted',
    'shred',
    'wipe',
    'shutdown',
    'reboot',
    'poweroff',
    'init',
  ]);
  if (SYSTEM_DESTRUCTIVE.has(executable)) {
    return {
      decision: 'deny',
      reason: `[GUARD] Low-level system/disk command '${executable}' is prohibited.`,
    };
  }

  if (executable === 'killall' && args.includes('-9')) {
    return {
      decision: 'deny',
      reason:
        '[GUARD] Indiscriminate process termination (killall -9) is prohibited.',
    };
  }
  if (executable === 'kill' && args.includes('-9') && args.includes('-1')) {
    return {
      decision: 'deny',
      reason: '[GUARD] Mass process termination (kill -9 -1) is prohibited.',
    };
  }

  if (executable === 'git') {
    const subCmd = args[0] || '';
    if (subCmd === 'push') {
      const isForce = args.some(
        (a) =>
          a === '--force' ||
          a === '-f' ||
          a.startsWith('--force-with-lease') ||
          (a.startsWith('+') && a.includes(':')),
      );
      if (isForce)
        return {
          decision: 'deny',
          reason:
            '[GUARD] Force push is blocked to protect repository integrity.',
        };
    }
    if (subCmd === 'reset' && args.includes('--hard')) {
      return {
        decision: 'force_ask',
        reason:
          '[GUARD] git reset --hard will discard uncommitted changes. User confirmation required.',
      };
    }
    if (subCmd === 'clean') {
      const isForceClean = args.some(
        (a) => /^-[a-zA-Z]*f/.test(a) || a === '--force',
      );
      if (isForceClean)
        return {
          decision: 'force_ask',
          reason:
            '[GUARD] git clean will remove untracked files. User confirmation required.',
        };
    }
    if (
      subCmd === 'checkout' &&
      (args.includes('-f') ||
        args.includes('--force') ||
        (args.includes('--') && args.includes('.')))
    ) {
      return {
        decision: 'force_ask',
        reason:
          '[GUARD] git checkout discard operation requires user confirmation.',
      };
    }
    if (subCmd === 'restore' && (args.includes('.') || args.includes(':/'))) {
      return {
        decision: 'force_ask',
        reason:
          '[GUARD] git restore discard operation requires user confirmation.',
      };
    }
    if (
      subCmd === 'branch' &&
      (args.includes('-D') ||
        (args.includes('--delete') && args.includes('--force')))
    ) {
      return {
        decision: 'force_ask',
        reason:
          '[GUARD] Force deleting a git branch requires user confirmation.',
      };
    }
    if (
      args.includes('--no-verify') ||
      (args.includes('-n') && subCmd === 'commit')
    ) {
      if (subCmd === 'commit' || subCmd === 'push') {
        return {
          decision: 'deny',
          reason:
            "[GUARD] Bypassing git hooks via '--no-verify' is prohibited to maintain code quality.",
        };
      }
    }
  }

  if (executable === 'rm') {
    const hasRecursive = args.some(
      (a) => /^-[a-zA-Z]*[rR]/.test(a) || a === '--recursive',
    );
    if (hasRecursive) {
      const targets = args.filter((a) => !a.startsWith('-'));
      const CATASTROPHIC_PATTERNS = [
        /^\/$/,
        /^\/\*$/,
        /^~$/,
        /^~\/$/,
        /^~\/\*$/,
        /^\$HOME(\/.*)?$/,
        /^(\.|\.\.|\.\/|\.\.\/)$/,
        /^\*$/,
        /^"?\.\*"?$/,
        /^(\.\/)?\.git(\/.*)?$/,
        /^(\.\/)?src(\/.*)?$/,
        /^(\.\/)?\.agents(\/.*)?$/,
        /^(\.\/)?docs(\/.*)?$/,
      ];

      if (targets.length === 0) {
        return {
          decision: 'deny',
          reason:
            '[GUARD] Catastrophic deletion detected: rm with recursive flag and no explicit target.',
        };
      }

      for (const t of targets) {
        const cleanT = t.replace(/\/+$/, '');
        for (const pattern of CATASTROPHIC_PATTERNS) {
          if (pattern.test(cleanT) || pattern.test(t)) {
            return {
              decision: 'deny',
              reason: `[GUARD] Catastrophic deletion detected: rm -rf on critical target '${t}'.`,
            };
          }
        }
      }
      return {
        decision: 'force_ask',
        reason: `[GUARD] Recursive deletion requires user confirmation: '${rawSubCmd}'`,
      };
    }
  }

  return null;
}

export type { GuardDecision, ParsedCommand };
export { checkSafetyGuard };
