import * as ts from "typescript";
import * as fs from "fs";

function extractTypes(filePath: string) {
  const sourceFile = ts.createSourceFile(
    filePath,
    fs.readFileSync(filePath, "utf8"),
    ts.ScriptTarget.Latest,
    true
  );

  const exportedDecls: string[] = [];
  const printer = ts.createPrinter({ removeComments: true });

  function getSignature(node: ts.Node): string {
    if (ts.isFunctionDeclaration(node)) {
      // Create a signature only (without body)
      const sig = ts.factory.createFunctionDeclaration(
        node.modifiers,
        node.asteriskToken,
        node.name,
        node.typeParameters,
        node.parameters,
        node.type,
        undefined // no body
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
        (m) => m.kind === ts.SyntaxKind.ExportKeyword
      );
      if (isExported) {
        exportedDecls.push(getSignature(node));
      }
    } else if (ts.isVariableStatement(node)) {
      const isExported = node.modifiers?.some(
        (m) => m.kind === ts.SyntaxKind.ExportKeyword
      );
      if (isExported) {
        // Just print the variable declaration (could be an arrow function)
        exportedDecls.push(printer.printNode(ts.EmitHint.Unspecified, node, sourceFile));
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  console.log(exportedDecls.join("\n\n"));
}

const targetFile = process.argv[2];
if (!targetFile) {
  console.error("Usage: tsx scripts/ast/extract-types.ts <file>");
  process.exit(1);
}
extractTypes(targetFile);
