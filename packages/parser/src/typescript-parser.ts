import ts from 'typescript';
import { hashAst } from './hash';
import { fileMetrics, lineSpan, nodeComplexity, nodeNesting } from './metrics';
import { MAX_SYMBOLS_PER_FILE } from './skip-path';
import type {
  LanguageParser,
  ParseResult,
  ParsedRelation,
  ParsedSymbol,
  ParserDiagnostic,
  SourceFile,
  StructuralDiff,
} from './types';

export class TypeScriptParser implements LanguageParser {
  async parse(file: SourceFile): Promise<ParseResult> {
    const source = ts.createSourceFile(
      file.path,
      file.content,
      ts.ScriptTarget.Latest,
      true,
      scriptKind(file.path, file.language),
    );
    const collector = new SymbolCollector(file.path, source);
    collector.visit(source);
    const symbols = collector.symbols.slice(0, MAX_SYMBOLS_PER_FILE);
    const allowed = new Set(symbols.map((symbol) => symbol.qualifiedName));
    return {
      symbols,
      relations: collector.relations.filter(
        (relation) => allowed.has(relation.sourceQualifiedName) || relation.sourceQualifiedName === file.path,
      ),
      diagnostics: parseDiagnostics(source),
      metrics: fileMetrics(file.content, symbols.reduce((sum, symbol) => sum + symbol.metrics.complexity, 0)),
    };
  }

  async normalize(facts: ParseResult): Promise<ParsedSymbol[]> {
    const seen = new Set<string>();
    const next: ParsedSymbol[] = [];
    for (const symbol of facts.symbols) {
      if (seen.has(symbol.qualifiedName)) {
        continue;
      }
      seen.add(symbol.qualifiedName);
      next.push(symbol);
    }
    return next;
  }

  async compare(previous: ParseResult, current: ParseResult): Promise<StructuralDiff> {
    const before = new Map(previous.symbols.map((symbol) => [symbol.qualifiedName, symbol]));
    const after = new Map(current.symbols.map((symbol) => [symbol.qualifiedName, symbol]));
    const added: ParsedSymbol[] = [];
    const removed: ParsedSymbol[] = [];
    const changed: ParsedSymbol[] = [];
    for (const [key, symbol] of after) {
      const prior = before.get(key);
      if (!prior) {
        added.push(symbol);
      } else if (prior.astHash !== symbol.astHash) {
        changed.push(symbol);
      }
    }
    for (const [key, symbol] of before) {
      if (!after.has(key)) {
        removed.push(symbol);
      }
    }
    return { added, removed, changed };
  }
}

class SymbolCollector {
  readonly symbols: ParsedSymbol[] = [];
  readonly relations: ParsedRelation[] = [];
  private readonly stack: ParsedSymbol[] = [];

  constructor(
    private readonly filePath: string,
    private readonly source: ts.SourceFile,
  ) {
    const moduleSymbol = this.createSymbol('MODULE', this.filePath.split('/').pop() || this.filePath, this.filePath, null, source);
    this.symbols.push(moduleSymbol);
    this.stack.push(moduleSymbol);
  }

  visit(node: ts.Node): void {
    const extracted = this.extract(node);
    if (extracted) {
      this.symbols.push(extracted);
      this.stack.push(extracted);
      ts.forEachChild(node, (child) => this.visit(child));
      this.stack.pop();
      return;
    }
    this.collectRelations(node);
    ts.forEachChild(node, (child) => this.visit(child));
  }

  private extract(node: ts.Node): ParsedSymbol | null {
    if (ts.isFunctionDeclaration(node) && node.name) {
      return this.named(node, 'FUNCTION', node.name.text);
    }
    if (ts.isClassDeclaration(node) && node.name) {
      this.heritage(node);
      return this.named(node, 'CLASS', node.name.text);
    }
    if (ts.isInterfaceDeclaration(node)) {
      this.heritage(node);
      return this.named(node, 'INTERFACE', node.name.text);
    }
    if (ts.isEnumDeclaration(node)) {
      return this.named(node, 'ENUM', node.name.text);
    }
    if (ts.isTypeAliasDeclaration(node)) {
      return this.named(node, 'TYPE', node.name.text);
    }
    if (ts.isModuleDeclaration(node) && ts.isIdentifier(node.name)) {
      return this.named(node, 'NAMESPACE', node.name.text);
    }
    if (ts.isMethodDeclaration(node) && methodName(node)) {
      return this.named(node, 'METHOD', methodName(node)!);
    }
    if (ts.isConstructorDeclaration(node)) {
      return this.named(node, 'METHOD', 'constructor');
    }
    if ((ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) && methodName(node)) {
      return this.named(node, 'METHOD', methodName(node)!);
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && isDocumentScope(node)) {
      const kind = variableKind(node);
      return this.named(node, kind, node.name.text);
    }
    return null;
  }

  private named(node: ts.Node, kind: string, name: string): ParsedSymbol {
    const parent = this.stack[this.stack.length - 1] ?? null;
    const qualifiedName =
      parent && parent.kind !== 'MODULE' ? `${parent.qualifiedName}.${name}` : `${this.filePath}:${name}`;
    return this.createSymbol(kind, name, qualifiedName, parent?.qualifiedName ?? this.filePath, node);
  }

  private createSymbol(
    kind: string,
    name: string,
    qualifiedName: string,
    parentQualifiedName: string | null,
    node: ts.Node,
  ): ParsedSymbol {
    const span = lineSpan(this.source, node);
    const complexity = nodeComplexity(node);
    const nesting = nodeNesting(node);
    return {
      kind,
      name,
      qualifiedName,
      parentQualifiedName,
      startLine: span.startLine,
      endLine: span.endLine,
      astHash: hashAst([kind, qualifiedName, span.startLine, span.endLine, complexity]),
      metrics: {
        loc: span.endLine - span.startLine + 1,
        complexity,
        nesting,
      },
    };
  }

  private collectRelations(node: ts.Node): void {
    const owner = this.stack[this.stack.length - 1];
    if (!owner) {
      return;
    }
    if (ts.isImportDeclaration(node)) {
      const spec = moduleSpecifier(node.moduleSpecifier);
      if (spec) {
        this.relations.push({
          type: 'imports',
          sourceQualifiedName: this.filePath,
          targetQualifiedName: spec,
          confidence: 0.9,
        });
      }
      return;
    }
    if (ts.isExportDeclaration(node)) {
      const spec = node.moduleSpecifier ? moduleSpecifier(node.moduleSpecifier) : null;
      this.relations.push({
        type: 'exports',
        sourceQualifiedName: this.filePath,
        targetQualifiedName: spec || owner.qualifiedName,
        confidence: 0.85,
      });
      return;
    }
    if (ts.isCallExpression(node)) {
      const target = callName(node.expression);
      if (target) {
        this.relations.push({
          type: 'calls',
          sourceQualifiedName: owner.qualifiedName,
          targetQualifiedName: target,
          confidence: target.includes('.') ? 0.45 : 0.55,
        });
      }
    }
  }

  private heritage(node: ts.ClassDeclaration | ts.InterfaceDeclaration): void {
    const ownerName = node.name?.text;
    if (!ownerName) {
      return;
    }
    const sourceName = `${this.filePath}:${ownerName}`;
    for (const clause of node.heritageClauses ?? []) {
      const type = clause.token === ts.SyntaxKind.ExtendsKeyword ? 'extends' : 'implements';
      for (const entry of clause.types) {
        const target = entry.expression.getText(this.source);
        this.relations.push({
          type,
          sourceQualifiedName: sourceName,
          targetQualifiedName: target,
          confidence: 0.7,
        });
      }
    }
  }
}

function parseDiagnostics(source: ts.SourceFile): ParserDiagnostic[] {
  const raw = (source as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics ?? [];
  return raw.map((diagnostic) => {
    const start = diagnostic.start ?? 0;
    const pos = source.getLineAndCharacterOfPosition(start);
    return {
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n').slice(0, 400),
      line: pos.line + 1,
      column: pos.character + 1,
      severity: 'error' as const,
    };
  });
}

function scriptKind(path: string, language: SourceFile['language']): ts.ScriptKind {
  const lower = path.toLowerCase();
  if (lower.endsWith('.tsx')) {
    return ts.ScriptKind.TSX;
  }
  if (lower.endsWith('.jsx')) {
    return ts.ScriptKind.JSX;
  }
  if (language === 'javascript' || lower.endsWith('.js') || lower.endsWith('.mjs') || lower.endsWith('.cjs')) {
    return ts.ScriptKind.JS;
  }
  return ts.ScriptKind.TS;
}

function methodName(node: ts.MethodDeclaration | ts.GetAccessorDeclaration | ts.SetAccessorDeclaration): string | null {
  if (!node.name) {
    return null;
  }
  if (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name) || ts.isNumericLiteral(node.name)) {
    return node.name.text;
  }
  if (ts.isComputedPropertyName(node.name) && ts.isStringLiteral(node.name.expression)) {
    return node.name.expression.text;
  }
  return null;
}

function variableKind(node: ts.VariableDeclaration): string {
  if (node.initializer && (ts.isFunctionExpression(node.initializer) || ts.isArrowFunction(node.initializer))) {
    return 'FUNCTION';
  }
  const statement = node.parent && ts.isVariableDeclarationList(node.parent) ? node.parent : null;
  if (statement && (statement.flags & ts.NodeFlags.Const) !== 0) {
    return 'CONSTANT';
  }
  return 'VARIABLE';
}

function isDocumentScope(node: ts.Node): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (ts.isBlock(current) && !ts.isModuleBlock(current) && !ts.isSourceFile(current)) {
      return false;
    }
    if (ts.isFunctionLike(current)) {
      return false;
    }
    if (ts.isSourceFile(current) || ts.isModuleBlock(current)) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function moduleSpecifier(node: ts.Expression): string | null {
  return ts.isStringLiteralLike(node) ? node.text : null;
}

function callName(expression: ts.Expression): string | null {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text;
  }
  return null;
}

export const typescriptParser = new TypeScriptParser();
