import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';

export interface ImpactDefinition {
  file: string;
  range: string;
  signature: string;
}

export interface ImpactConsumerRef {
  file: string;
  lines: string[];
  totalMatches: number;
}

export interface ImpactReport {
  target: string;
  mode: 'file' | 'symbol';
  definitions: ImpactDefinition[];
  internalImports: string[];
  consumers: ImpactConsumerRef[];
  relatedTests: string[];
}

const TEST_FILE_RE = /\.(test|spec)\.[jt]sx?$/i;

function getRangeLabel(sourceFile: ts.SourceFile, node: ts.Node): string {
  const start =
    sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line +
    1;
  const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
  return start === end ? `[L${start}]` : `[L${start}-L${end}]`;
}

function summarizeNodeSignature(
  sourceFile: ts.SourceFile,
  node: ts.Node,
): string {
  if (ts.isFunctionDeclaration(node) && node.name) {
    const params = node.parameters.map((p) => p.getText(sourceFile)).join(', ');
    const ret = node.type ? `: ${node.type.getText(sourceFile)}` : '';
    return `function ${node.name.text}(${params})${ret}`;
  }
  if (
    ts.isInterfaceDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isEnumDeclaration(node)
  ) {
    return `${node.getText(sourceFile).split('\n')[0]}`;
  }
  if (ts.isClassDeclaration(node) && node.name) {
    return `class ${node.name.text}`;
  }
  if (ts.isVariableStatement(node)) {
    const decl = node.declarationList.declarations[0];
    if (decl) {
      const name = decl.name.getText(sourceFile);
      const type = decl.type ? `: ${decl.type.getText(sourceFile)}` : '';
      return `const ${name}${type}`;
    }
  }
  return node.getText(sourceFile).split('\n')[0].slice(0, 100);
}

function parseSource(filePath: string, content: string): ts.SourceFile {
  const isTsx = filePath.endsWith('.tsx') || filePath.endsWith('.jsx');
  return ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

function collectInternalImports(sourceFile: ts.SourceFile): string[] {
  const imports: string[] = [];
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isImportDeclaration(node)) {
      const spec = node.moduleSpecifier
        .getText(sourceFile)
        .replace(/^['"]|['"]$/g, '');
      if (spec.startsWith('@/') || spec.startsWith('.')) {
        const clause = node.importClause?.getText(sourceFile) ?? '*';
        imports.push(`${spec}: ${clause.replace(/\s+/g, ' ')}`);
      }
    }
  });
  return imports;
}

function extractFileExports(
  relPath: string,
  sourceFile: ts.SourceFile,
): { definitions: ImpactDefinition[]; exportNames: string[] } {
  const definitions: ImpactDefinition[] = [];
  const exportNames: string[] = [];

  ts.forEachChild(sourceFile, (node) => {
    const isExported =
      ts.canHaveModifiers(node) &&
      ts
        .getModifiers(node)
        ?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (!isExported) return;

    const range = getRangeLabel(sourceFile, node);
    const sig = summarizeNodeSignature(sourceFile, node);

    if (
      (ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isEnumDeclaration(node)) &&
      node.name
    ) {
      exportNames.push(node.name.text);
      definitions.push({ file: relPath, range, signature: sig });
      return;
    }

    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          exportNames.push(decl.name.text);
        }
      }
      definitions.push({ file: relPath, range, signature: sig });
    }
  });

  return { definitions, exportNames };
}

function findSymbolDefinitionsInFile(
  relPath: string,
  sourceFile: ts.SourceFile,
  symbol: string,
): ImpactDefinition[] {
  const defs: ImpactDefinition[] = [];
  ts.forEachChild(sourceFile, (node) => {
    if (
      (ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isEnumDeclaration(node)) &&
      node.name?.text === symbol
    ) {
      defs.push({
        file: relPath,
        range: getRangeLabel(sourceFile, node),
        signature: summarizeNodeSignature(sourceFile, node),
      });
      return;
    }

    if (ts.isVariableStatement(node)) {
      const hasDecl = node.declarationList.declarations.some(
        (d) => ts.isIdentifier(d.name) && d.name.text === symbol,
      );
      if (hasDecl) {
        defs.push({
          file: relPath,
          range: getRangeLabel(sourceFile, node),
          signature: summarizeNodeSignature(sourceFile, node),
        });
      }
    }
  });
  return defs;
}

function resolveSearchRoots(cwd: string, scopeDir?: string): string[] {
  if (scopeDir) {
    const abs = path.resolve(cwd, scopeDir);
    if (fs.existsSync(abs)) {
      return [path.relative(cwd, abs) || '.'];
    }
  }
  const defaults = ['src', 'extension', 'tests', '.agents', 'scripts'].filter(
    (d) => fs.existsSync(path.join(cwd, d)),
  );
  return defaults.length > 0 ? defaults : ['.'];
}

function runRgMatches(
  pattern: string,
  roots: string[],
  cwd: string,
): Array<{ file: string; lineNum: number; text: string }> {
  const res = spawnSync(
    'rg',
    [
      '-n',
      '--no-heading',
      '-g',
      '*.ts',
      '-g',
      '*.tsx',
      '-g',
      '*.js',
      '-g',
      '*.jsx',
      '--',
      pattern,
      ...roots,
    ],
    { cwd, encoding: 'utf8' },
  );

  if (res.status !== 0 && res.status !== 1) return [];
  const matches: Array<{ file: string; lineNum: number; text: string }> = [];
  for (const rawLine of (res.stdout ?? '').split('\n')) {
    if (!rawLine) continue;
    const m = /^([^:]+):(\d+):(.*)$/.exec(rawLine);
    if (!m) continue;
    const normFile = m[1].replace(/^\.\//, '');
    matches.push({
      file: normFile,
      lineNum: Number.parseInt(m[2], 10),
      text: m[3].trim(),
    });
  }
  return matches;
}

function groupReferences(
  matches: Array<{ file: string; lineNum: number; text: string }>,
  excludedFiles: Set<string>,
  maxRefsPerFile: number,
  defLineMap?: Map<string, Set<number>>,
): { consumers: ImpactConsumerRef[]; relatedTests: string[] } {
  const consumerMap = new Map<string, string[]>();
  const consumerCounts = new Map<string, number>();
  const testSet = new Set<string>();

  for (const m of matches) {
    if (excludedFiles.has(m.file)) continue;
    if (defLineMap?.get(m.file)?.has(m.lineNum)) continue;

    if (TEST_FILE_RE.test(m.file)) {
      testSet.add(m.file);
      continue;
    }

    const total = (consumerCounts.get(m.file) ?? 0) + 1;
    consumerCounts.set(m.file, total);
    const list = consumerMap.get(m.file) ?? [];
    if (list.length < maxRefsPerFile) {
      list.push(`L${m.lineNum}: ${m.text.slice(0, 100)}`);
      consumerMap.set(m.file, list);
    }
  }

  const consumers: ImpactConsumerRef[] = Array.from(consumerMap.entries())
    .map(([file, lines]) => ({
      file,
      lines,
      totalMatches: consumerCounts.get(file) ?? lines.length,
    }))
    .sort(
      (a, b) => b.totalMatches - a.totalMatches || a.file.localeCompare(b.file),
    );

  return {
    consumers,
    relatedTests: Array.from(testSet).sort(),
  };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function analyzeImpact(
  target: string,
  options?: { cwd?: string; scopeDir?: string; maxRefsPerFile?: number },
): ImpactReport {
  const cwd = path.resolve(options?.cwd ?? process.cwd());
  const maxRefsPerFile = options?.maxRefsPerFile ?? 5;
  const roots = resolveSearchRoots(cwd, options?.scopeDir);
  const absTarget = path.resolve(cwd, target);

  if (fs.existsSync(absTarget) && fs.statSync(absTarget).isFile()) {
    const relTarget = path.relative(cwd, absTarget).replace(/\\/g, '/');
    const content = fs.readFileSync(absTarget, 'utf8');
    const sf = parseSource(absTarget, content);
    const internalImports = collectInternalImports(sf);
    const { definitions, exportNames } = extractFileExports(relTarget, sf);

    const baseNoExt = path.basename(relTarget).replace(/\.[jt]sx?$/, '');
    const patterns = [
      `['"][^'"]*/${escapeRegExp(baseNoExt)}['"]`,
      ...exportNames.slice(0, 6).map((n) => `\\b${escapeRegExp(n)}\\b`),
    ];
    const combinedPattern = patterns.join('|');
    const matches = runRgMatches(combinedPattern, roots, cwd);
    const { consumers, relatedTests } = groupReferences(
      matches,
      new Set([relTarget]),
      maxRefsPerFile,
    );

    return {
      target: relTarget,
      mode: 'file',
      definitions,
      internalImports,
      consumers,
      relatedTests,
    };
  }

  const symbolPattern = `\\b${escapeRegExp(target)}\\b`;
  const matches = runRgMatches(symbolPattern, roots, cwd);

  const uniqueFiles = Array.from(new Set(matches.map((m) => m.file)));
  const definitions: ImpactDefinition[] = [];
  const internalImportSet = new Set<string>();
  const defLineMap = new Map<string, Set<number>>();

  for (const relFile of uniqueFiles) {
    if (TEST_FILE_RE.test(relFile)) continue;
    const abs = path.join(cwd, relFile);
    if (!fs.existsSync(abs)) continue;
    const sf = parseSource(abs, fs.readFileSync(abs, 'utf8'));
    const defs = findSymbolDefinitionsInFile(relFile, sf, target);
    if (defs.length > 0) {
      definitions.push(...defs);
      for (const imp of collectInternalImports(sf)) {
        internalImportSet.add(imp);
      }
      const lineSet = defLineMap.get(relFile) ?? new Set<number>();
      for (const d of defs) {
        const startM = /^\[L(\d+)/.exec(d.range);
        if (startM) lineSet.add(Number.parseInt(startM[1], 10));
      }
      defLineMap.set(relFile, lineSet);
    }
  }

  const { consumers, relatedTests } = groupReferences(
    matches,
    new Set<string>(),
    maxRefsPerFile,
    defLineMap,
  );

  return {
    target,
    mode: 'symbol',
    definitions,
    internalImports: Array.from(internalImportSet),
    consumers,
    relatedTests,
  };
}

export function formatImpactReport(report: ImpactReport): string {
  const lines: string[] = [`=== IMPACT (${report.mode}): ${report.target} ===`];

  lines.push(`\n[Definitions / Exports (${report.definitions.length})]`);
  if (report.definitions.length === 0) {
    lines.push('  (none)');
  } else {
    for (const d of report.definitions) {
      lines.push(`  ${d.file} ${d.range}: ${d.signature}`);
    }
  }

  lines.push(`\n[Internal Imports (${report.internalImports.length})]`);
  if (report.internalImports.length === 0) {
    lines.push('  (none)');
  } else {
    for (const imp of report.internalImports.slice(0, 20)) {
      lines.push(`  ${imp}`);
    }
  }

  lines.push(`\n[Consumers (${report.consumers.length} files)]`);
  if (report.consumers.length === 0) {
    lines.push('  (none)');
  } else {
    for (const c of report.consumers.slice(0, 30)) {
      const more =
        c.totalMatches > c.lines.length
          ? ` (+${c.totalMatches - c.lines.length} more)`
          : '';
      lines.push(`  ${c.file} (${c.totalMatches})${more}`);
      for (const ref of c.lines) {
        lines.push(`    ${ref}`);
      }
    }
    if (report.consumers.length > 30) {
      lines.push(`  ... +${report.consumers.length - 30} more consumer files`);
    }
  }

  lines.push(`\n[Related Tests (${report.relatedTests.length})]`);
  if (report.relatedTests.length === 0) {
    lines.push('  (none)');
  } else {
    for (const t of report.relatedTests.slice(0, 20)) {
      lines.push(`  ${t}`);
    }
  }

  return lines.join('\n');
}

if (import.meta.main) {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  if (args.length === 0) {
    console.error('Usage: bun run ai:impact <symbol|filePath> [scopeDir]');
    process.exit(1);
  }
  const report = analyzeImpact(args[0], {
    cwd: process.cwd(),
    scopeDir: args[1],
  });
  console.log(formatImpactReport(report));
}
