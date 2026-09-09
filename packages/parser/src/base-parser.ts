import { hashAst } from './hash';
import { fileMetrics } from './metrics';
import { MAX_SYMBOLS_PER_FILE } from './skip-path';
import type {
  LanguageParser,
  ParseResult,
  ParsedRelation,
  ParsedSymbol,
  ParserDiagnostic,
  StructuralDiff,
  SymbolMetrics,
} from './types';

export abstract class BaseParser implements LanguageParser {
  abstract parse(file: { path: string; language: string; content: string }): Promise<ParseResult>;

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
    return next.slice(0, MAX_SYMBOLS_PER_FILE);
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

export function moduleSymbol(path: string, endLine: number): ParsedSymbol {
  const name = path.split('/').pop() || path;
  return makeSymbol({
    kind: 'MODULE',
    name,
    qualifiedName: path,
    parentQualifiedName: null,
    startLine: 1,
    endLine: Math.max(1, endLine),
    metrics: { loc: Math.max(1, endLine), complexity: 1, nesting: 0 },
  });
}

export function makeSymbol(input: {
  kind: string;
  name: string;
  qualifiedName: string;
  parentQualifiedName: string | null;
  startLine: number;
  endLine: number;
  metrics: SymbolMetrics;
}): ParsedSymbol {
  return {
    ...input,
    astHash: hashAst([
      input.kind,
      input.qualifiedName,
      input.startLine,
      input.endLine,
      input.metrics.complexity,
    ]),
  };
}

export function qualify(filePath: string, parent: ParsedSymbol | null, name: string): string {
  if (parent && parent.kind !== 'MODULE') {
    return `${parent.qualifiedName}.${name}`;
  }
  return `${filePath}:${name}`;
}

export function finishParse(
  content: string,
  symbols: ParsedSymbol[],
  relations: ParsedRelation[],
  diagnostics: ParserDiagnostic[] = [],
): ParseResult {
  const limited = symbols.slice(0, MAX_SYMBOLS_PER_FILE);
  const allowed = new Set(limited.map((symbol) => symbol.qualifiedName));
  return {
    symbols: limited,
    relations: relations.filter((relation) => allowed.has(relation.sourceQualifiedName)),
    diagnostics,
    metrics: fileMetrics(
      content,
      limited.reduce((sum, symbol) => sum + symbol.metrics.complexity, 0),
    ),
  };
}

export function lineComplexity(text: string): number {
  const matches = text.match(/\b(if|elif|else if|for|while|case|catch|except|&&|\|\||\?)\b/g);
  return 1 + (matches?.length ?? 0);
}
