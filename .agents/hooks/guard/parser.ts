function splitCommands(cmdLine: string) {
  const commands = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escapeNext = false;

  for (let i = 0; i < cmdLine.length; i++) {
    const ch = cmdLine[i];

    if (escapeNext) {
      current += ch;
      escapeNext = false;
      continue;
    }

    if (ch === '\\' && !inSingleQuote) {
      escapeNext = true;
      current += ch;
      continue;
    }

    if (ch === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      current += ch;
      continue;
    }

    if (ch === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      current += ch;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote) {
      if (ch === '$' && cmdLine[i + 1] === '(') {
        let depth = 1;
        let subStr = '';
        let j = i + 2;
        while (j < cmdLine.length && depth > 0) {
          if (cmdLine[j] === '(') depth++;
          else if (cmdLine[j] === ')') depth--;
          if (depth > 0) subStr += cmdLine[j];
          j++;
        }
        if (subStr.trim()) {
          commands.push(...splitCommands(subStr));
        }
        i = j - 1;
        continue;
      }

      if (ch === '`') {
        let subStr = '';
        let j = i + 1;
        while (j < cmdLine.length && cmdLine[j] !== '`') {
          subStr += cmdLine[j];
          j++;
        }
        if (subStr.trim()) {
          commands.push(...splitCommands(subStr));
        }
        i = j;
        continue;
      }

      const nextChar = cmdLine[i + 1];
      if (ch === ';' || ch === '\n') {
        if (current.trim()) commands.push(current.trim());
        current = '';
        continue;
      }
      if (
        (ch === '&' && nextChar === '&') ||
        (ch === '|' && nextChar === '|')
      ) {
        if (current.trim()) commands.push(current.trim());
        current = '';
        i++;
        continue;
      }
      if (ch === '|' || ch === '&') {
        if (current.trim()) commands.push(current.trim());
        current = '';
        continue;
      }
    }

    current += ch;
  }

  if (current.trim()) {
    commands.push(current.trim());
  }

  return commands;
}

function tokenize(subCmd: string) {
  const tokens = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escapeNext = false;

  for (let i = 0; i < subCmd.length; i++) {
    const ch = subCmd[i];

    if (escapeNext) {
      current += ch;
      escapeNext = false;
      continue;
    }

    if (ch === '\\' && !inSingleQuote) {
      escapeNext = true;
      continue;
    }

    if (ch === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (ch === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && /\s/.test(ch)) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += ch;
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

function parseExecutable(tokens: string[]) {
  const IGNORED_WRAPPERS = new Set([
    'env',
    'nohup',
    'time',
    'exec',
    'xargs',
    'builtin',
    'command',
    'npx',
    'bunx',
    'do',
    'then',
    'else',
    'elif',
    'fi',
    'done',
    '{',
    '}',
    '(',
    ')',
  ]);

  let idx = 0;
  while (idx < tokens.length) {
    const t = tokens[idx];
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(t)) {
      idx++;
      continue;
    }
    if (t === 'export' || t === 'readonly') {
      idx++;
      continue;
    }
    if (t === 'if' || t === 'for' || t === 'while' || t === 'until') {
      idx++;
      continue;
    }
    if (IGNORED_WRAPPERS.has(t)) {
      idx++;
      continue;
    }
    break;
  }

  if (idx >= tokens.length) {
    return { executable: '', args: [], rawTokens: tokens };
  }

  const rawExec = tokens[idx];
  const executable = rawExec.split('/').pop() || '';
  const args = tokens.slice(idx + 1);

  return { executable, rawExec, args, rawTokens: tokens };
}

export { parseExecutable, splitCommands, tokenize };
