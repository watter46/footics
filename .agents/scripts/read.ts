import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import ts from 'typescript';

export const MAX_READ_OUTPUT_LINES = 250;
export const MAX_SINGLE_SYMBOL_LINES = 120;
export const DEFAULT_UNSCOPED_LINE_LIMIT = 80;

export type ReadSelector =
  | { type: 'symbol'; symbol: string }
  | { type: 'range'; start: number; end: number }
  | { type: 'line'; line: number };

export interface ReadFileRequest {
  filePath: string;
  selectors: ReadSelector[];
}

export interface ReadOptions {
  cwd?: string;
  maxLines?: number;
  maxSingleSymbolLines?: number;
}

export interface EnclosingContext {
  name: string;
  start: number;
  end: number;
  label: string;
}

function getNodeLineBounds(
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

function getPropertyNameText(
  sourceFile: ts.SourceFile,
  nameNode: ts.PropertyName | ts.BindingName | undefined,
): string | null {
  if (!nameNode) return null;
  if (
    ts.isIdentifier(nameNode) ||
    ts.isStringLiteral(nameNode) ||
    ts.isNumericLiteral(nameNode)
  ) {
    return nameNode.text;
  }
  return nameNode.getText(sourceFile).trim();
}

function getTestCallName(expr: ts.Expression): string | null {
  if (ts.isIdentifier(expr)) {
    if (
      expr.text === 'describe' ||
      expr.text === 'it' ||
      expr.text === 'test'
    ) {
      return expr.text;
    }
  }
  if (ts.isPropertyAccessExpression(expr)) {
    return getTestCallName(expr.expression);
  }
  return null;
}

function getTestTitle(
  sourceFile: ts.SourceFile,
  call: ts.CallExpression,
): string | null {
  const firstArg = call.arguments[0];
  if (!firstArg) return null;
  if (
    ts.isStringLiteral(firstArg) ||
    ts.isNoSubstitutionTemplateLiteral(firstArg)
  ) {
    return firstArg.text;
  }
  return firstArg.getText(sourceFile);
}

function getEnclosingCandidateName(
  sourceFile: ts.SourceFile,
  node: ts.Node,
): string | null {
  if (
    (ts.isFunctionDeclaration(node) ||
      ts.isClassDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isEnumDeclaration(node)) &&
    node.name
  ) {
    return node.name.text;
  }

  if (
    ts.isMethodDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node) ||
    ts.isPropertyDeclaration(node)
  ) {
    return getPropertyNameText(sourceFile, node.name);
  }

  if (ts.isPropertyAssignment(node)) {
    const init = node.initializer;
    const bounds = getNodeLineBounds(sourceFile, node);
    if (
      ts.isArrowFunction(init) ||
      ts.isFunctionExpression(init) ||
      bounds.end > bounds.start
    ) {
      return getPropertyNameText(sourceFile, node.name);
    }
  }

  if (ts.isShorthandPropertyAssignment(node)) {
    return node.name.text;
  }

  if (ts.isVariableStatement(node)) {
    const firstDecl = node.declarationList.declarations[0];
    if (firstDecl) {
      if (ts.isIdentifier(firstDecl.name)) {
        return firstDecl.name.text;
      }
      const bounds = getNodeLineBounds(sourceFile, node);
      if (bounds.end > bounds.start) {
        const patternText = firstDecl.name
          .getText(sourceFile)
          .replace(/\s+/g, ' ')
          .trim();
        return patternText.length > 36
          ? `${patternText.slice(0, 33)}...`
          : patternText;
      }
    }
  }

  if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression)) {
    const bounds = getNodeLineBounds(sourceFile, node);
    if (bounds.end > bounds.start) {
      const callee = node.expression.expression.getText(sourceFile).trim();
      if (
        /^(?:React\.)?use(?:Effect|LayoutEffect|InsertionEffect|ImperativeHandle)$/.test(
          callee,
        )
      ) {
        return callee;
      }
    }
  }

  if (ts.isReturnStatement(node)) {
    const bounds = getNodeLineBounds(sourceFile, node);
    if (bounds.end - bounds.start >= 4) {
      return 'return';
    }
  }

  if (ts.isCallExpression(node)) {
    const callName = getTestCallName(node.expression);
    if (callName) {
      const title = getTestTitle(sourceFile, node);
      if (title) return `${callName}('${title}')`;
    }
  }

  return null;
}

function extractObjectLiteralMembers(
  sourceFile: ts.SourceFile,
  obj: ts.ObjectLiteralExpression,
  out: string[],
): void {
  for (const prop of obj.properties) {
    const bounds = getNodeLineBounds(sourceFile, prop);
    if (
      ts.isMethodDeclaration(prop) ||
      ts.isGetAccessorDeclaration(prop) ||
      ts.isSetAccessorDeclaration(prop)
    ) {
      const name = getPropertyNameText(sourceFile, prop.name);
      if (name) {
        out.push(`  ${bounds.label} ${name} (method)`);
      }
      continue;
    }
    if (ts.isPropertyAssignment(prop)) {
      const name = getPropertyNameText(sourceFile, prop.name);
      if (!name) continue;
      const init = prop.initializer;
      if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) {
        out.push(`  ${bounds.label} ${name} (action)`);
      } else if (bounds.end > bounds.start) {
        out.push(`  ${bounds.label} ${name} (property)`);
      }
    }
  }
}

function unwrapReturnedObjectLiterals(
  expr: ts.Expression,
  sourceFile: ts.SourceFile,
  out: string[],
): void {
  if (ts.isParenthesizedExpression(expr)) {
    unwrapReturnedObjectLiterals(expr.expression, sourceFile, out);
    return;
  }
  if (ts.isObjectLiteralExpression(expr)) {
    extractObjectLiteralMembers(sourceFile, expr, out);
    return;
  }
  if (ts.isArrowFunction(expr) || ts.isFunctionExpression(expr)) {
    if (ts.isBlock(expr.body)) {
      for (const stmt of expr.body.statements) {
        if (ts.isReturnStatement(stmt) && stmt.expression) {
          unwrapReturnedObjectLiterals(stmt.expression, sourceFile, out);
        }
      }
    } else {
      unwrapReturnedObjectLiterals(expr.body, sourceFile, out);
    }
    return;
  }
  if (ts.isCallExpression(expr)) {
    for (const arg of expr.arguments) {
      unwrapReturnedObjectLiterals(arg, sourceFile, out);
    }
  }
}

function findPrimaryFunctionBody(
  expr: ts.Expression | undefined,
): ts.ConciseBody | null {
  if (!expr) return null;
  if (ts.isArrowFunction(expr) || ts.isFunctionExpression(expr)) {
    return expr.body;
  }
  if (ts.isParenthesizedExpression(expr)) {
    return findPrimaryFunctionBody(expr.expression);
  }
  if (ts.isCallExpression(expr)) {
    for (const arg of expr.arguments) {
      const found = findPrimaryFunctionBody(arg);
      if (found) return found;
    }
  }
  return null;
}

/**
 * 25行以上の関数・コンポーネント・カスタムフック・Storeファクトリ内部の
 * 1階層メンバー（内部ハンドラ、useCallback/useMemo/useEffect、Zustandアクション、JSX return）を
 * 1行ずつのコンパクトな `[L開始-L終了] name (kind)` リストとして抽出する。
 */
export function extractInnerMemberSummary(
  sourceFile: ts.SourceFile,
  node: ts.Node,
  minParentSpan = 25,
): string[] {
  const parentBounds = getNodeLineBounds(sourceFile, node);
  if (parentBounds.end - parentBounds.start + 1 < minParentSpan) {
    return [];
  }

  let body: ts.ConciseBody | null = null;
  if (ts.isFunctionDeclaration(node) && node.body) {
    body = node.body;
  } else if (ts.isVariableStatement(node)) {
    const firstDecl = node.declarationList.declarations[0];
    if (firstDecl?.initializer) {
      body = findPrimaryFunctionBody(firstDecl.initializer);
      if (!body) {
        const directMembers: string[] = [];
        unwrapReturnedObjectLiterals(
          firstDecl.initializer,
          sourceFile,
          directMembers,
        );
        return directMembers;
      }
    }
  }

  if (!body) return [];

  const out: string[] = [];
  if (!ts.isBlock(body)) {
    unwrapReturnedObjectLiterals(body, sourceFile, out);
    return out;
  }

  for (const stmt of body.statements) {
    const bounds = getNodeLineBounds(sourceFile, stmt);
    const span = bounds.end - bounds.start + 1;

    if (ts.isFunctionDeclaration(stmt) && stmt.name) {
      out.push(`  ${bounds.label} ${stmt.name.text} (function)`);
      continue;
    }

    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        const rawName = decl.name
          .getText(sourceFile)
          .replace(/\s+/g, ' ')
          .trim();
        const dName =
          rawName.length > 36 ? `${rawName.slice(0, 33)}...` : rawName;
        const init = decl.initializer;
        if (!init) continue;

        if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) {
          out.push(`  ${bounds.label} ${dName} (function)`);
          continue;
        }

        if (ts.isCallExpression(init)) {
          const callee = init.expression.getText(sourceFile).trim();
          const objMembers: string[] = [];
          unwrapReturnedObjectLiterals(init, sourceFile, objMembers);
          if (objMembers.length >= 2) {
            out.push(...objMembers);
            continue;
          }
          if (
            span >= 3 ||
            /^(?:React\.)?use(?:Callback|Memo|Reducer|State|Ref)$/.test(callee)
          ) {
            if (span >= 2) {
              out.push(`  ${bounds.label} ${dName} (${callee})`);
            }
          }
          continue;
        }

        if (span >= 5) {
          out.push(`  ${bounds.label} ${dName} (const)`);
        }
      }
      continue;
    }

    if (
      ts.isExpressionStatement(stmt) &&
      ts.isCallExpression(stmt.expression) &&
      span >= 2
    ) {
      const callee = stmt.expression.expression.getText(sourceFile).trim();
      if (
        /^(?:React\.)?use(?:Effect|LayoutEffect|InsertionEffect|ImperativeHandle)$/.test(
          callee,
        )
      ) {
        out.push(`  ${bounds.label} ${callee}()`);
      }
      continue;
    }

    if (ts.isReturnStatement(stmt) && stmt.expression) {
      const objMembers: string[] = [];
      unwrapReturnedObjectLiterals(stmt.expression, sourceFile, objMembers);
      if (objMembers.length >= 2) {
        out.push(...objMembers);
        continue;
      }
      if (span >= 4) {
        out.push(`  ${bounds.label} return`);
      }
    }
  }

  return out;
}

/**
 * 指定された 1-based 行番号を包含する最小の意味ある親 AST ノード（関数・メソッド・コンポーネント・型定義・テストブロック等）を返す。
 */
export function findEnclosingContext(
  sourceFile: ts.SourceFile,
  lineNum: number,
): EnclosingContext | null {
  let bestMultiLine: EnclosingContext | null = null;
  let bestSingleLine: EnclosingContext | null = null;

  function visit(node: ts.Node): void {
    const bounds = getNodeLineBounds(sourceFile, node);
    if (lineNum < bounds.start || lineNum > bounds.end) {
      return;
    }

    const name = getEnclosingCandidateName(sourceFile, node);
    if (name) {
      const span = bounds.end - bounds.start;
      const candidate: EnclosingContext = {
        name,
        start: bounds.start,
        end: bounds.end,
        label: bounds.label,
      };
      if (span > 0) {
        if (!bestMultiLine || span <= bestMultiLine.end - bestMultiLine.start) {
          bestMultiLine = candidate;
        }
      } else if (!bestSingleLine) {
        bestSingleLine = candidate;
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (bestMultiLine) return bestMultiLine;
  if (bestSingleLine) return bestSingleLine;

  // トップレベルステートメントへのフォールバック
  for (const stmt of sourceFile.statements) {
    const bounds = getNodeLineBounds(sourceFile, stmt);
    if (lineNum >= bounds.start && lineNum <= bounds.end) {
      return {
        name: `L${lineNum}`,
        start: bounds.start,
        end: bounds.end,
        label: bounds.label,
      };
    }
  }

  return null;
}

function findMatchingTestBounds(
  sourceFile: ts.SourceFile,
  container: ts.Node,
  symbol: string,
): { start: number; end: number; label: string } | null {
  let exactMatch: { start: number; end: number; label: string } | null = null;
  let partialMatch: { start: number; end: number; label: string } | null = null;

  function visit(node: ts.Node): void {
    if (exactMatch) return;
    if (ts.isCallExpression(node)) {
      const name = getTestCallName(node.expression);
      if (name) {
        const title = getTestTitle(sourceFile, node);
        if (title === symbol) {
          exactMatch = getNodeLineBounds(sourceFile, node);
          return;
        }
        if (!partialMatch && title && title.includes(symbol)) {
          partialMatch = getNodeLineBounds(sourceFile, node);
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(container);
  return exactMatch ?? partialMatch;
}

/**
 * トップレベル宣言 ➔ テストブロック ➔ ネストされた AST シンボル（メソッド・Zustandアクション・内部関数等）の順で検索する。
 */
export function findSymbolBounds(
  sourceFile: ts.SourceFile,
  symbol: string,
  isTest: boolean,
): { start: number; end: number; label: string } | null {
  let matched: { start: number; end: number; label: string } | null = null;

  // 1. トップレベル宣言
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
      matched = getNodeLineBounds(sourceFile, node);
      return;
    }
    if (ts.isVariableStatement(node)) {
      const hasDecl = node.declarationList.declarations.some(
        (d) => ts.isIdentifier(d.name) && d.name.text === symbol,
      );
      if (hasDecl) {
        matched = getNodeLineBounds(sourceFile, node);
      }
    }
  });

  if (matched) return matched;

  // 2. テストブロック (テストファイル時優先)
  if (isTest) {
    matched = findMatchingTestBounds(sourceFile, sourceFile, symbol);
    if (matched) return matched;
  }

  // 3. ネストされた宣言（メソッド・プロパティ・Zustandスライスアクション・内部関数）の再帰走査フォールバック
  function visitRecursive(node: ts.Node): void {
    if (matched) return;

    if (
      (ts.isMethodDeclaration(node) ||
        ts.isPropertyDeclaration(node) ||
        ts.isGetAccessorDeclaration(node) ||
        ts.isSetAccessorDeclaration(node) ||
        ts.isPropertyAssignment(node) ||
        ts.isShorthandPropertyAssignment(node)) &&
      getPropertyNameText(sourceFile, node.name) === symbol
    ) {
      matched = getNodeLineBounds(sourceFile, node);
      return;
    }

    if (
      (ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isEnumDeclaration(node)) &&
      node.name?.text === symbol
    ) {
      matched = getNodeLineBounds(sourceFile, node);
      return;
    }

    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === symbol
    ) {
      const targetNode =
        node.parent &&
        ts.isVariableDeclarationList(node.parent) &&
        node.parent.parent &&
        ts.isVariableStatement(node.parent.parent)
          ? node.parent.parent
          : node;
      matched = getNodeLineBounds(sourceFile, targetNode);
      return;
    }

    ts.forEachChild(node, visitRecursive);
  }

  visitRecursive(sourceFile);
  if (matched) return matched;

  // 4. 非テストファイルでも describe/it があればフォールバック検索
  if (!isTest) {
    matched = findMatchingTestBounds(sourceFile, sourceFile, symbol);
  }

  return matched;
}

export function parseSelectorToken(raw: string): ReadSelector[] {
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const selectors: ReadSelector[] = [];

  for (const part of parts) {
    const rangeMatch = /^L?(\d+)-L?(\d+)$/i.exec(part);
    if (rangeMatch) {
      const s = Number.parseInt(rangeMatch[1], 10);
      const e = Number.parseInt(rangeMatch[2], 10);
      selectors.push({
        type: 'range',
        start: Math.min(s, e),
        end: Math.max(s, e),
      });
      continue;
    }

    const lineMatch = /^@?L?(\d+)$/i.exec(part);
    if (lineMatch) {
      selectors.push({
        type: 'line',
        line: Number.parseInt(lineMatch[1], 10),
      });
      continue;
    }

    selectors.push({ type: 'symbol', symbol: part });
  }

  return selectors;
}

export function parseReadCliArgs(
  args: string[],
  cwd = process.cwd(),
): ReadFileRequest[] {
  const commonSymbols: ReadSelector[] = [];
  const rawTargets: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--symbol' || arg === '-s') {
      const next = args[i + 1];
      if (next && !next.startsWith('-')) {
        commonSymbols.push(...parseSelectorToken(next));
        i++;
      }
      continue;
    }
    if (arg.startsWith('--symbol=')) {
      commonSymbols.push(...parseSelectorToken(arg.slice('--symbol='.length)));
      continue;
    }
    if (arg.startsWith('-')) continue;
    rawTargets.push(arg);
  }

  // `bun run ai:read file.ts SymbolName` (2引数で2つ目がファイルでない場合) の互換サポート
  if (
    rawTargets.length === 2 &&
    commonSymbols.length === 0 &&
    !rawTargets[0].includes(':') &&
    !rawTargets[1].includes(':') &&
    fs.existsSync(path.resolve(cwd, rawTargets[0])) &&
    !fs.existsSync(path.resolve(cwd, rawTargets[1]))
  ) {
    return [
      {
        filePath: rawTargets[0],
        selectors: parseSelectorToken(rawTargets[1]),
      },
    ];
  }

  const requests: ReadFileRequest[] = [];
  for (const raw of rawTargets) {
    const colonIdx = raw.indexOf(':');
    if (colonIdx > 0) {
      const maybeFile = raw.slice(0, colonIdx);
      const selStr = raw.slice(colonIdx + 1);
      requests.push({
        filePath: maybeFile,
        selectors: [...parseSelectorToken(selStr), ...commonSymbols],
      });
    } else {
      requests.push({
        filePath: raw,
        selectors: [...commonSymbols],
      });
    }
  }

  return requests;
}

export function extractReadFromSource(
  filePath: string,
  content: string,
  selectors: ReadSelector[],
  options?: ReadOptions,
): { blocks: Array<{ header: string; body: string; lineCount: number }> } {
  const cwd = options?.cwd ? path.resolve(options.cwd) : process.cwd();
  const relPath = path.relative(cwd, filePath).replace(/\\/g, '/');
  const lines = content.split('\n');
  const totalLines = lines.length;

  if (selectors.length === 0) {
    const end = Math.min(totalLines, DEFAULT_UNSCOPED_LINE_LIMIT);
    const slice = lines.slice(0, end).join('\n');
    const suffix =
      totalLines > end
        ? `\n... [Truncated: ${totalLines - end} more lines. Specify :Symbol, :start-end, or :line]`
        : '';
    return {
      blocks: [
        {
          header: `=== ${relPath} [L1-L${end}] (${totalLines} lines) ===`,
          body: `${slice}${suffix}`,
          lineCount: end,
        },
      ],
    };
  }

  const isTsx = filePath.endsWith('.tsx') || filePath.endsWith('.jsx');
  const isTest = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filePath);
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const blocks: Array<{ header: string; body: string; lineCount: number }> = [];

  for (const sel of selectors) {
    if (sel.type === 'range') {
      const start = Math.max(1, Math.min(sel.start, totalLines));
      const end = Math.max(start, Math.min(sel.end, totalLines));
      const body = lines.slice(start - 1, end).join('\n');
      blocks.push({
        header: `=== ${relPath} [L${start}-L${end}] ===`,
        body,
        lineCount: end - start + 1,
      });
      continue;
    }

    if (sel.type === 'line') {
      const targetLine = Math.max(1, Math.min(sel.line, totalLines));
      const ctx = findEnclosingContext(sourceFile, targetLine);
      if (ctx) {
        const body = lines.slice(ctx.start - 1, ctx.end).join('\n');
        blocks.push({
          header: `=== ${relPath} ${ctx.label} (${ctx.name} @L${targetLine}) ===`,
          body,
          lineCount: ctx.end - ctx.start + 1,
        });
      } else {
        const start = Math.max(1, targetLine - 5);
        const end = Math.min(totalLines, targetLine + 5);
        const body = lines.slice(start - 1, end).join('\n');
        blocks.push({
          header: `=== ${relPath} [L${start}-L${end}] (@L${targetLine}) ===`,
          body,
          lineCount: end - start + 1,
        });
      }
      continue;
    }

    if (sel.type === 'symbol') {
      const bounds = findSymbolBounds(sourceFile, sel.symbol, isTest);
      if (!bounds) {
        blocks.push({
          header: `=== ${relPath} [NOT FOUND: ${sel.symbol}] ===`,
          body: '',
          lineCount: 1,
        });
        continue;
      }
      const span = bounds.end - bounds.start + 1;
      const singleLimit =
        options?.maxSingleSymbolLines ?? MAX_SINGLE_SYMBOL_LINES;
      if (span > singleLimit) {
        let topNode: ts.Node | null = null;
        ts.forEachChild(sourceFile, (node) => {
          if (topNode) return;
          if (
            (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) &&
            node.name?.text === sel.symbol
          ) {
            topNode = node;
            return;
          }
          if (ts.isVariableStatement(node)) {
            const hasDecl = node.declarationList.declarations.some(
              (d) => ts.isIdentifier(d.name) && d.name.text === sel.symbol,
            );
            if (hasDecl) topNode = node;
          }
        });
        const innerMembers = topNode
          ? extractInnerMemberSummary(sourceFile, topNode, 25)
          : [];
        if (innerMembers.length >= 2) {
          const sigPreview = lines
            .slice(bounds.start - 1, Math.min(bounds.end, bounds.start + 2))
            .join('\n');
          const autoPeekBody = [
            sigPreview,
            ...innerMembers,
            `... [Auto-Peek: '${sel.symbol}' is ${span} lines (> ${singleLimit}). Run 'bun run ai:read ${relPath}:<innerSymbol|start-end>' with the needed inner member above]`,
          ].join('\n');
          blocks.push({
            header: `=== ${relPath} ${bounds.label} (${sel.symbol} — Auto-Peek Structure) ===`,
            body: autoPeekBody,
            lineCount: innerMembers.length + 4,
          });
          continue;
        }
      }
      const body = lines.slice(bounds.start - 1, bounds.end).join('\n');
      blocks.push({
        header: `=== ${relPath} ${bounds.label} (${sel.symbol}) ===`,
        body,
        lineCount: span,
      });
    }
  }

  return { blocks };
}

export async function formatReadOutput(
  requests: ReadFileRequest[],
  options?: ReadOptions,
): Promise<string> {
  const cwd = options?.cwd ? path.resolve(options.cwd) : process.cwd();
  const maxLines = options?.maxLines ?? MAX_READ_OUTPUT_LINES;

  const fileResults = await Promise.all(
    requests.map(async (req) => {
      const abs = path.resolve(cwd, req.filePath);
      const relPath = path.relative(cwd, abs).replace(/\\/g, '/');
      if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
        return {
          blocks: [
            {
              header: `=== ${relPath} [FILE NOT FOUND] ===`,
              body: '',
              lineCount: 1,
            },
          ],
        };
      }
      const content = await fsp.readFile(abs, 'utf8');
      return extractReadFromSource(abs, content, req.selectors, {
        ...options,
        cwd,
      });
    }),
  );

  const outSections: string[] = [];
  let usedLines = 0;

  for (const res of fileResults) {
    for (const block of res.blocks) {
      if (!block.body) {
        outSections.push(block.header);
        usedLines += 1;
        continue;
      }

      const remaining = maxLines - usedLines;
      if (remaining <= 0) {
        outSections.push(
          `${block.header}\n... [Truncated: output budget ${maxLines} lines exceeded (${block.lineCount} lines omitted)]`,
        );
        continue;
      }

      const bodyLines = block.body.split('\n');
      if (bodyLines.length > remaining) {
        const sliced = bodyLines.slice(0, remaining).join('\n');
        const omitted = bodyLines.length - remaining;
        outSections.push(
          `${block.header}\n${sliced}\n... [Truncated: ${omitted} more lines]`,
        );
        usedLines += remaining;
      } else {
        outSections.push(`${block.header}\n${block.body}`);
        usedLines += bodyLines.length;
      }
    }
  }

  return outSections.join('\n\n');
}

if (import.meta.main) {
  const rawArgs = process.argv.slice(2);
  const requests = parseReadCliArgs(rawArgs, process.cwd());
  if (requests.length === 0) {
    console.error(
      'Usage: bun run ai:read <file[:Symbol1,Symbol2|start-end|line]...> [--symbol S1,S2]',
    );
    process.exit(1);
  }

  formatReadOutput(requests, { cwd: process.cwd() })
    .then((output) => {
      console.log(output);
    })
    .catch((err) => {
      console.error(
        `[ERROR] ${err instanceof Error ? err.message : String(err)}`,
      );
      process.exit(1);
    });
}
