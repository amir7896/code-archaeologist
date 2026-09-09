/**
 * Parser adapter contract from the project scope.
 * Phase 1 language is TypeScript/JavaScript. Implementations arrive in the AST phase.
 */
export interface SourceFile {
  path: string;
  language: 'typescript' | 'javascript' | 'unknown';
  content: string;
}

export interface ParserDiagnostic {
  message: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning';
}

export interface ParsedSymbol {
  kind: string;
  name: string;
  qualifiedName: string;
  startLine: number;
  endLine: number;
  astHash: string;
}

export interface ParsedRelation {
  type: 'imports' | 'exports' | 'calls' | 'references' | 'extends' | 'implements';
  sourceQualifiedName: string;
  targetQualifiedName: string;
  confidence: number;
}

export interface ParseResult {
  symbols: ParsedSymbol[];
  relations: ParsedRelation[];
  diagnostics: ParserDiagnostic[];
}

export interface LanguageParser {
  parse(file: SourceFile): Promise<ParseResult>;
  normalize(facts: ParseResult): Promise<ParsedSymbol[]>;
  compare(previous: ParseResult, current: ParseResult): Promise<{
    added: ParsedSymbol[];
    removed: ParsedSymbol[];
    changed: ParsedSymbol[];
  }>;
}

export class ParserNotImplementedError extends Error {
  constructor(language = 'typescript') {
    super(`No ${language} parser adapter is registered yet. AST analysis is a later phase.`);
    this.name = 'ParserNotImplementedError';
  }
}
