import * as fs from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';

function getLineRange(sourceFile: ts.SourceFile, node: ts.Node): string {
  const start =
    sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line +
    1;
  const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
  return start === end ? `[L${start}]` : `[L${start}-L${end}]`;
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
    const startLine = sourceFile.getLineAndCharacterOfPosition(
      init.getStart(sourceFile),
    ).line;
    const endLine = sourceFile.getLineAndCharacterOfPosition(
      init.getEnd(),
    ).line;
    if (endLine - startLine > 8) {
      return `${callee}${typeArgs}(...)`;
    }
    return init.getText(sourceFile);
  }

  const startLine = sourceFile.getLineAndCharacterOfPosition(
    init.getStart(sourceFile),
  ).line;
  const endLine = sourceFile.getLineAndCharacterOfPosition(init.getEnd()).line;
  const span = endLine - startLine + 1;
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

export function extractOutlineFromSource(
  filePath: string,
  content: string,
): string {
  const isTsx = filePath.endsWith('.tsx') || filePath.endsWith('.jsx');
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const totalLines = content.split('\n').length;
  const imports: string[] = [];
  const items: string[] = [];

  ts.forEachChild(sourceFile, (node) => {
    // 1. Collect local/internal imports (@/ or relative)
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

    const range = getLineRange(sourceFile, node);

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

      // Top-level exported variables OR top-level component/hook declarations
      const nameText = firstDecl.name.getText(sourceFile);
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
          const mRange = getLineRange(sourceFile, m);
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

  const relPath = path.relative(process.cwd(), path.resolve(filePath));
  const lines: string[] = [`=== ${relPath} (${totalLines} lines) ===`];
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

function collectTargetFiles(targets: string[]): string[] {
  const result: string[] = [];
  for (const raw of targets) {
    const abs = path.resolve(raw);
    if (!fs.existsSync(abs)) continue;
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      const entries = fs.readdirSync(abs, {
        withFileTypes: true,
        recursive: true,
      });
      for (const entry of entries) {
        if (
          entry.isFile() &&
          /\.(ts|tsx)$/.test(entry.name) &&
          !entry.name.endsWith('.test.ts') &&
          !entry.name.endsWith('.test.tsx')
        ) {
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
  return result;
}

if (import.meta.main) {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  if (args.length === 0) {
    console.error('Usage: bun run ai:outline <file-or-dir> [file2...]');
    process.exit(1);
  }

  const files = collectTargetFiles(args);
  if (files.length === 0) {
    console.error(`[ERROR] Target not found: ${args.join(', ')}`);
    process.exit(1);
  }

  const outputs = files.map((f) =>
    extractOutlineFromSource(f, fs.readFileSync(f, 'utf8')),
  );
  console.log(outputs.join('\n\n'));
}
