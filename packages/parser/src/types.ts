export type ParserLanguage = string;

export interface SourceFile {
  path: string;
  language: ParserLanguage;
  content: string;
}

export interface ParserDiagnostic {
  message: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning';
}

export interface SymbolMetrics {
  loc: number;
  complexity: number;
  nesting: number;
}

export interface FileMetrics {
  loc: number;
  sloc: number;
  complexity: number;
}

export interface ParsedSymbol {
  kind: string;
  name: string;
  qualifiedName: string;
  parentQualifiedName: string | null;
  startLine: number;
  endLine: number;
  astHash: string;
  metrics: SymbolMetrics;
}

export type RelationType =
  | 'imports'
  | 'exports'
  | 'calls'
  | 'references'
  | 'extends'
  | 'implements';

export interface ParsedRelation {
  type: RelationType;
  sourceQualifiedName: string;
  targetQualifiedName: string;
  confidence: number;
}

export interface ParseResult {
  symbols: ParsedSymbol[];
  relations: ParsedRelation[];
  diagnostics: ParserDiagnostic[];
  metrics: FileMetrics;
}

export interface StructuralDiff {
  added: ParsedSymbol[];
  removed: ParsedSymbol[];
  changed: ParsedSymbol[];
}

export interface LanguageParser {
  parse(file: SourceFile): Promise<ParseResult>;
  normalize(facts: ParseResult): Promise<ParsedSymbol[]>;
  compare(previous: ParseResult, current: ParseResult): Promise<StructuralDiff>;
}

export class ParserNotImplementedError extends Error {
  constructor(language = 'typescript') {
    super(`No ${language} parser adapter is registered.`);
    this.name = 'ParserNotImplementedError';
  }
}
