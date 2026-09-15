import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';

function extractTypesFromFile(filePath: string): string[] {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
    );

    const exportedDecls: string[] = [];
    const printer = ts.createPrinter({ removeComments: true });

    function getSignature(node: ts.Node): string {
      if (ts.isFunctionDeclaration(node)) {
        const sig = ts.factory.createFunctionDeclaration(
          node.modifiers,
          node.asteriskToken,
          node.name,
          node.typeParameters,
          node.parameters,
          node.type,
          undefined, // no body
        );
        return printer.printNode(ts.EmitHint.Unspecified, sig, sourceFile);
      }
      return printer.printNode(ts.EmitHint.Unspecified, node, sourceFile);
    }

    function visit(node: ts.Node) {
      if (
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isFunctionDeclaration(node)
      ) {
        const isExported = node.modifiers?.some(
          (m) => m.kind === ts.SyntaxKind.ExportKeyword,
        );
        if (isExported) {
          exportedDecls.push(getSignature(node));
        }
      } else if (ts.isVariableStatement(node)) {
        const isExported = node.modifiers?.some(
          (m) => m.kind === ts.SyntaxKind.ExportKeyword,
        );
        if (isExported) {
          exportedDecls.push(
            printer.printNode(ts.EmitHint.Unspecified, node, sourceFile),
          );
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return exportedDecls;
  } catch {
    return [];
  }
}

function processTarget(targetPath: string) {
  if (!fs.existsSync(targetPath)) {
    console.error(`Target not found: ${targetPath}`);
    process.exit(1);
  }

  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    const decls = extractTypesFromFile(targetPath);
    if (decls.length > 0) {
      console.log(`// === [AST: ${targetPath}] ===`);
      console.log(decls.join('\n\n'));
    } else {
      console.log(
        `// [AST: ${targetPath}] No exported types/signatures found.`,
      );
    }
  } else if (stat.isDirectory()) {
    const entries = fs.readdirSync(targetPath, { recursive: true });
    const tsFiles = (entries as string[])
      .filter(
        (f) =>
          (f.endsWith('.ts') || f.endsWith('.tsx')) &&
          !f.endsWith('.d.ts') &&
          !f.includes('.test.') &&
          !f.includes('node_modules'),
      )
      .map((f) => path.join(targetPath, f));

    console.log(
      `// === [AST Summary: ${targetPath} (${tsFiles.length} files)] ===\n`,
    );
    for (const file of tsFiles) {
      const decls = extractTypesFromFile(file);
      if (decls.length > 0) {
        const relPath = path.relative(process.cwd(), file);
        console.log(`// --- ${relPath} ---`);
        console.log(decls.join('\n'));
        console.log('');
      }
    }
  }
}

const target = process.argv[2];
if (!target) {
  console.error('Usage: tsx scripts/ast/extract-types.ts <file|directory>');
  process.exit(1);
}

processTarget(target);
