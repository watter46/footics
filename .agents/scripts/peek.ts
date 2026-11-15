import * as fs from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';

export const MAX_PEEK_OUTPUT_LINES = 250;

export interface PeekOptions {
  symbol?: string;
  cwd?: string;
}

const TEST_FILE_RE = /\.(test|spec)\.[jt]sx?$/i;

function getLineBounds(
  sourceFile: ts.SourceFile,
  node: ts.Node,
): { start: number; end: number; label: string } {
  const start =
    sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line +
    1;
  const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
  return {
    start,
    end,
    label: start === end ? `[L${start}]` : `[L${start}-L${end}]`,
  };
}

function summarizeFunctionLike(
  sourceFile: ts.SourceFile,
  fn: ts.ArrowFunction | ts.FunctionExpression,
): string {
  const asyncMod = fn.modifiers?.some(
    (m) => m.kind === ts.SyntaxKind.AsyncKeyword,
  )
    ? 'async '
    : '';
  const typeParams = fn.typeParameters
    ? `<${fn.typeParameters.map((tp) => tp.getText(sourceFile)).join(', ')}>`
    : '';
  const params = fn.parameters.map((p) => p.getText(sourceFile)).join(', ');
  const ret = fn.type ? `: ${fn.type.getText(sourceFile)}` : '';
  return `${asyncMod}${typeParams}(${params})${ret} => { ... }`;
}

function summarizeInitializer(
  sourceFile: ts.SourceFile,
  init: ts.Expression,
): string {
  if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) {
    return summarizeFunctionLike(sourceFile, init);
  }

  if (ts.isCallExpression(init)) {
    const callee = init.expression.getText(sourceFile);
    const typeArgs = init.typeArguments
      ? `<${init.typeArguments.map((t) => t.getText(sourceFile)).join(', ')}>`
      : '';
    if (init.arguments.length > 0) {
      const firstArg = init.arguments[0];
      if (ts.isArrowFunction(firstArg) || ts.isFunctionExpression(firstArg)) {
        const inner = summarizeFunctionLike(sourceFile, firstArg);
        return `${callee}${typeArgs}(${inner})`;
      }
      if (ts.isCallExpression(firstArg)) {
        return `${callee}${typeArgs}(${summarizeInitializer(sourceFile, firstArg)})`;
      }
    }
    const { start, end } = getLineBounds(sourceFile, init);
    if (end - start > 8) {
      return `${callee}${typeArgs}(...)`;
    }
    return init.getText(sourceFile);
  }

  const { start, end } = getLineBounds(sourceFile, init);
  const span = end - start + 1;
  if (span > 12) {
    if (ts.isObjectLiteralExpression(init)) {
      return `{ ... (${span} lines) }`;
    }
    if (ts.isArrayLiteralExpression(init)) {
      return `[ ... (${span} lines) ]`;
    }
    return `... (${span} lines)`;
  }

  return init.getText(sourceFile);
}

function getTestCallName(expr: ts.Expression): string | null {
  if (ts.isIdentifier(expr)) {
    return ['describe', 'it', 'test'].includes(expr.text) ? expr.text : null;
  }
  if (ts.isPropertyAccessExpression(expr)) {
    const base = getTestCallName(expr.expression);
    if (base) return `${base}.${expr.name.text}`;
  }
  if (ts.isCallExpression(expr)) {
    return getTestCallName(expr.expression);
  }
  return null;
}

function getTestTitle(
  sourceFile: ts.SourceFile,
  call: ts.CallExpression,
): string | null {
  const first = call.arguments[0];
  if (!first) return null;
  if (ts.isStringLiteralLike(first)) return first.text;
  return first.getText(sourceFile).slice(0, 60);
}

function collectTestBlocks(
  sourceFile: ts.SourceFile,
  container: ts.Node,
  depth: number,
  out: string[],
): void {
  ts.forEachChild(container, (node) => {
    if (
      ts.isExpressionStatement(node) &&
      ts.isCallExpression(node.expression)
    ) {
      const call = node.expression;
      const callName = getTestCallName(call.expression);
      if (callName) {
        const title = getTestTitle(sourceFile, call) ?? '(unnamed)';
        const { label } = getLineBounds(sourceFile, node);
        const indent = '  '.repeat(depth);
        out.push(`${indent}${label} ${callName}(${JSON.stringify(title)})`);
        const lastArg = call.arguments[call.arguments.length - 1];
        if (
          lastArg &&
          (ts.isArrowFunction(lastArg) || ts.isFunctionExpression(lastArg))
        ) {
          collectTestBlocks(sourceFile, lastArg.body, depth + 1, out);
        }
        return;
      }
    }
    if (ts.isBlock(node)) {
      collectTestBlocks(sourceFile, node, depth, out);
    }
  });
}

function findMatchingTestCall(
  sourceFile: ts.SourceFile,
  container: ts.Node,
  symbol: string,
): { start: number; end: number; label: string } | null {
  let partialMatch: { start: number; end: number; label: string } | null = null;
  let exactMatch: { start: number; end: number; label: string } | null = null;

  const visit = (node: ts.Node) => {
    if (exactMatch) return;
    if (
      ts.isExpressionStatement(node) &&
      ts.isCallExpression(node.expression)
    ) {
      const call = node.expression;
      const callName = getTestCallName(call.expression);
      if (callName) {
        const title = getTestTitle(sourceFile, call) ?? '';
        if (title === symbol) {
          exactMatch = getLineBounds(sourceFile, node);
          return;
        }
        if (!partialMatch && title.includes(symbol)) {
          partialMatch = getLineBounds(sourceFile, node);
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(container);
  return exactMatch ?? partialMatch;
}

function findDeclarationBounds(
  sourceFile: ts.SourceFile,
  symbol: string,
  isTest: boolean,
): { start: number; end: number; label: string } | null {
  let matched: { start: number; end: number; label: string } | null = null;

  ts.forEachChild(sourceFile, (node) => {
    if (matched) return;
    if (
      (ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isEnumDeclaration(node)) &&
      node.name?.text === symbol
    ) {
      matched = getLineBounds(sourceFile, node);
      return;
    }
    if (ts.isVariableStatement(node)) {
      const hasDecl = node.declarationList.declarations.some(
        (d) => ts.isIdentifier(d.name) && d.name.text === symbol,
      );
      if (hasDecl) {
        matched = getLineBounds(sourceFile, node);
      }
    }
  });

  if (!matched && isTest) {
    matched = findMatchingTestCall(sourceFile, sourceFile, symbol);
  }
  return matched;
}

function extractTopSymbolNames(
  sourceFile: ts.SourceFile,
  content: string,
  isTest: boolean,
): string[] {
  const names: string[] = [];
  ts.forEachChild(sourceFile, (node) => {
    if (
      (ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isEnumDeclaration(node)) &&
      node.name
    ) {
      names.push(node.name.text);
      return;
    }
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          names.push(decl.name.text);
        }
      }
    }
  });

  if (names.length === 0 && isTest) {
    const blocks: string[] = [];
    collectTestBlocks(sourceFile, sourceFile, 0, blocks);
    const total = blocks.length;
    if (total > 0) return [`${total} test block(s)`];
  }
  void content;
  return names;
}

export function extractPeekFromSource(
  filePath: string,
  content: string,
  options?: PeekOptions,
): string {
  const cwd = options?.cwd ? path.resolve(options.cwd) : process.cwd();
  const isTsx = filePath.endsWith('.tsx') || filePath.endsWith('.jsx');
  const isTest = TEST_FILE_RE.test(filePath);
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const relPath = path.relative(cwd, path.resolve(cwd, filePath));
  const allLines = content.split('\n');

  if (options?.symbol) {
    const bounds = findDeclarationBounds(sourceFile, options.symbol, isTest);
    if (!bounds) {
      return `=== ${relPath}:${options.symbol} ===\n[Not found: ${options.symbol}]`;
    }
    const slice = allLines
      .slice(bounds.start - 1, bounds.end)
      .map((line, idx) => `${bounds.start + idx}: ${line}`);
    return [
      `=== ${relPath}:${options.symbol} ${bounds.label} ===`,
      ...slice,
    ].join('\n');
  }

  const imports: string[] = [];
  const items: string[] = [];

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isImportDeclaration(node)) {
      const spec = node.moduleSpecifier
        .getText(sourceFile)
        .replace(/^['"]|['"]$/g, '');
      if (spec.startsWith('@/') || spec.startsWith('.')) {
        const clause = node.importClause?.getText(sourceFile) ?? '*';
        imports.push(`  from '${spec}': ${clause.replace(/\s+/g, ' ')}`);
      }
      return;
    }

    const isExported =
      (ts.canHaveModifiers(node) &&
        ts
          .getModifiers(node)
          ?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) ||
      ts.isExportDeclaration(node) ||
      ts.isExportAssignment(node);

    const { label: range } = getLineBounds(sourceFile, node);

    if (
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isEnumDeclaration(node)
    ) {
      items.push(`${range} ${node.getText(sourceFile)}`);
      return;
    }

    if (ts.isFunctionDeclaration(node) && node.name) {
      const exportPrefix = isExported ? 'export ' : '';
      const asyncPrefix = node.modifiers?.some(
        (m) => m.kind === ts.SyntaxKind.AsyncKeyword,
      )
        ? 'async '
        : '';
      const typeParams = node.typeParameters
        ? `<${node.typeParameters.map((tp) => tp.getText(sourceFile)).join(', ')}>`
        : '';
      const params = node.parameters
        .map((p) => p.getText(sourceFile))
        .join(', ');
      const ret = node.type ? `: ${node.type.getText(sourceFile)}` : '';
      items.push(
        `${range} ${exportPrefix}${asyncPrefix}function ${node.name.getText(sourceFile)}${typeParams}(${params})${ret};`,
      );
      return;
    }

    if (ts.isVariableStatement(node)) {
      const firstDecl = node.declarationList.declarations[0];
      if (!firstDecl) return;

      const isTopLevelFn =
        firstDecl.initializer &&
        (ts.isArrowFunction(firstDecl.initializer) ||
          ts.isFunctionExpression(firstDecl.initializer) ||
          ts.isCallExpression(firstDecl.initializer));

      if (!isExported && !isTopLevelFn) return;

      const exportPrefix = isExported ? 'export ' : '';
      const flags =
        node.declarationList.flags & ts.NodeFlags.Const
          ? 'const'
          : node.declarationList.flags & ts.NodeFlags.Let
            ? 'let'
            : 'var';

      const declSummaries = node.declarationList.declarations.map((decl) => {
        const dName = decl.name.getText(sourceFile);
        const dType = decl.type ? `: ${decl.type.getText(sourceFile)}` : '';
        if (!decl.initializer) return `${dName}${dType}`;
        return `${dName}${dType} = ${summarizeInitializer(sourceFile, decl.initializer)}`;
      });

      items.push(
        `${range} ${exportPrefix}${flags} ${declSummaries.join(', ')};`,
      );
      return;
    }

    if (ts.isClassDeclaration(node) && node.name) {
      const exportPrefix = isExported ? 'export ' : '';
      const members = node.members
        .map((m) => {
          const { label: mRange } = getLineBounds(sourceFile, m);
          if (ts.isMethodDeclaration(m) && m.name) {
            const params = m.parameters
              .map((p) => p.getText(sourceFile))
              .join(', ');
            const ret = m.type ? `: ${m.type.getText(sourceFile)}` : '';
            return `  ${mRange} ${m.name.getText(sourceFile)}(${params})${ret};`;
          }
          if (ts.isPropertyDeclaration(m) && m.name) {
            const propType = m.type ? `: ${m.type.getText(sourceFile)}` : '';
            return `  ${mRange} ${m.name.getText(sourceFile)}${propType};`;
          }
          return null;
        })
        .filter(Boolean);
      items.push(
        `${range} ${exportPrefix}class ${node.name.getText(sourceFile)} {\n${members.join('\n')}\n}`,
      );
      return;
    }

    if (ts.isExportDeclaration(node)) {
      items.push(`${range} ${node.getText(sourceFile)}`);
    }
  });

  if (isTest) {
    collectTestBlocks(sourceFile, sourceFile, 0, items);
  }

  const lines: string[] = [`=== ${relPath} (${allLines.length} lines) ===`];
  if (imports.length > 0) {
    lines.push('// Internal Imports:', ...imports);
  }
  if (items.length === 0) {
    lines.push('// (No exported types or functions found)');
  } else {
    lines.push(...items);
  }
  return lines.join('\n');
}

function summarizeFileOneLine(
  filePath: string,
  content: string,
  cwd: string,
): string {
  const isTsx = filePath.endsWith('.tsx') || filePath.endsWith('.jsx');
  const isTest = TEST_FILE_RE.test(filePath);
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const relPath = path.relative(cwd, path.resolve(cwd, filePath));
  const totalLines = content.split('\n').length;
  const names = extractTopSymbolNames(sourceFile, content, isTest);
  const shown = names.slice(0, 5).join(', ');
  const rest = names.length > 5 ? ` (+${names.length - 5} more)` : '';
  const symbolPart = names.length > 0 ? `${shown}${rest}` : '(no symbols)';
  return `=== ${relPath} (${totalLines} lines) | symbols: ${symbolPart} ===`;
}

export function formatPeekOutput(
  filePaths: string[],
  options?: PeekOptions,
): string {
  const cwd = options?.cwd ? path.resolve(options.cwd) : process.cwd();
  const entries = filePaths.map((f) => {
    const abs = path.resolve(cwd, f);
    const content = fs.readFileSync(abs, 'utf8');
    return {
      filePath: abs,
      content,
      peek: extractPeekFromSource(abs, content, { ...options, cwd }),
    };
  });

  const fullText = entries.map((e) => e.peek).join('\n\n');
  if (options?.symbol) {
    return fullText;
  }

  const lineCount = fullText.split('\n').length;
  if (lineCount <= MAX_PEEK_OUTPUT_LINES) {
    return fullText;
  }

  const summaries = entries.map((e) =>
    summarizeFileOneLine(e.filePath, e.content, cwd),
  );
  summaries.push(
    `\n[Degraded: output ${lineCount} lines > ${MAX_PEEK_OUTPUT_LINES}. Run 'bun run ai:peek <file>' or 'bun run ai:peek <file>:<Symbol>' for full signatures.]`,
  );
  return summaries.join('\n');
}

function collectTargetFiles(targets: string[], cwd: string): string[] {
  const result: string[] = [];
  for (const raw of targets) {
    const abs = path.resolve(cwd, raw);
    if (!fs.existsSync(abs)) continue;
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      const entries = fs.readdirSync(abs, {
        withFileTypes: true,
        recursive: true,
      });
      for (const entry of entries) {
        if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
          const parent =
            entry.parentPath ||
            (entry as unknown as { path?: string }).path ||
            abs;
          result.push(path.join(parent, entry.name));
        }
      }
    } else if (stat.isFile()) {
      result.push(abs);
    }
  }
  return result.sort();
}

function parseCliTargets(
  args: string[],
  cwd: string,
): { targets: string[]; symbol?: string } {
  if (args.length === 1 && args[0].includes(':')) {
    const idx = args[0].lastIndexOf(':');
    const maybeFile = args[0].slice(0, idx);
    const maybeSym = args[0].slice(idx + 1);
    if (maybeSym && fs.existsSync(path.resolve(cwd, maybeFile))) {
      return { targets: [maybeFile], symbol: maybeSym };
    }
  }
  if (
    args.length === 2 &&
    fs.existsSync(path.resolve(cwd, args[0])) &&
    !fs.existsSync(path.resolve(cwd, args[1]))
  ) {
    return { targets: [args[0]], symbol: args[1] };
  }
  return { targets: args };
}

if (import.meta.main) {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  if (args.length === 0) {
    console.error('Usage: bun run ai:peek <file-or-dir> [Symbol|file2...]');
    process.exit(1);
  }

  const cwd = process.cwd();
  const parsed = parseCliTargets(args, cwd);
  const files = collectTargetFiles(parsed.targets, cwd);
  if (files.length === 0) {
    console.error(`[ERROR] Target not found: ${args.join(', ')}`);
    process.exit(1);
  }

  console.log(formatPeekOutput(files, { cwd, symbol: parsed.symbol }));
}
