import { BaseParser, finishParse, lineComplexity, makeSymbol, moduleSymbol, qualify } from './base-parser';
import type { ParseResult, ParsedRelation, ParsedSymbol, SourceFile } from './types';

type SymbolRule = {
  kind: 'CLASS' | 'INTERFACE' | 'ENUM' | 'FUNCTION' | 'TYPE' | 'NAMESPACE';
  pattern: RegExp;
};

type LanguageRules = {
  symbols: SymbolRule[];
  imports: RegExp[];
};

const RULES: Record<string, LanguageRules> = {
  go: {
    symbols: [
      { kind: 'FUNCTION', pattern: /^\s*func\s+(?:\([^)]+\)\s*)?([A-Za-z_][\w]*)\s*\(/ },
      { kind: 'CLASS', pattern: /^\s*type\s+([A-Za-z_][\w]*)\s+struct\b/ },
      { kind: 'INTERFACE', pattern: /^\s*type\s+([A-Za-z_][\w]*)\s+interface\b/ },
    ],
    imports: [/^\s*import\s+"([^"]+)"/, /^\s*import\s+[\w.]+\s+"([^"]+)"/],
  },
  rust: {
    symbols: [
      { kind: 'FUNCTION', pattern: /^\s*(?:pub(?:\([^)]+\))?\s+)?(?:async\s+)?fn\s+([A-Za-z_][\w]*)\s*[<(]/ },
      { kind: 'CLASS', pattern: /^\s*(?:pub\s+)?struct\s+([A-Za-z_][\w]*)/ },
      { kind: 'ENUM', pattern: /^\s*(?:pub\s+)?enum\s+([A-Za-z_][\w]*)/ },
      { kind: 'INTERFACE', pattern: /^\s*(?:pub\s+)?trait\s+([A-Za-z_][\w]*)/ },
    ],
    imports: [/^\s*use\s+([\w:]+)/],
  },
  java: {
    symbols: [
      { kind: 'CLASS', pattern: /^\s*(?:public\s+|protected\s+|private\s+)?(?:final\s+|abstract\s+)?class\s+([A-Za-z_][\w]*)/ },
      { kind: 'INTERFACE', pattern: /^\s*(?:public\s+)?interface\s+([A-Za-z_][\w]*)/ },
      { kind: 'ENUM', pattern: /^\s*(?:public\s+)?enum\s+([A-Za-z_][\w]*)/ },
      { kind: 'FUNCTION', pattern: /^\s*(?:public|protected|private)\s+(?:static\s+)?[\w.<>,[\]\s]+\s+([A-Za-z_][\w]*)\s*\(/ },
    ],
    imports: [/^\s*import\s+([\w.]+)/],
  },
  kotlin: {
    symbols: [
      { kind: 'CLASS', pattern: /^\s*(?:public\s+|internal\s+|private\s+)?(?:data\s+|sealed\s+|abstract\s+)?class\s+([A-Za-z_][\w]*)/ },
      { kind: 'INTERFACE', pattern: /^\s*(?:public\s+)?interface\s+([A-Za-z_][\w]*)/ },
      { kind: 'FUNCTION', pattern: /^\s*(?:public\s+|private\s+|internal\s+)?(?:suspend\s+)?fun\s+([A-Za-z_][\w]*)\s*[<(]/ },
    ],
    imports: [/^\s*import\s+([\w.]+)/],
  },
  ruby: {
    symbols: [
      { kind: 'CLASS', pattern: /^\s*class\s+([A-Za-z_][\w]*)/ },
      { kind: 'NAMESPACE', pattern: /^\s*module\s+([A-Za-z_][\w]*)/ },
      { kind: 'FUNCTION', pattern: /^\s*def\s+([A-Za-z_][\w?!]*)/ },
    ],
    imports: [/^\s*require(?:_relative)?\s+['"]([^'"]+)['"]/],
  },
  php: {
    symbols: [
      { kind: 'CLASS', pattern: /^\s*(?:final\s+|abstract\s+)?class\s+([A-Za-z_][\w]*)/ },
      { kind: 'INTERFACE', pattern: /^\s*interface\s+([A-Za-z_][\w]*)/ },
      { kind: 'FUNCTION', pattern: /^\s*(?:public|protected|private|function)\s+function\s+([A-Za-z_][\w]*)/ },
    ],
    imports: [/^\s*use\s+([\w\\]+)/],
  },
  csharp: {
    symbols: [
      { kind: 'CLASS', pattern: /^\s*(?:public\s+|internal\s+|private\s+)?(?:static\s+|sealed\s+|abstract\s+)?class\s+([A-Za-z_][\w]*)/ },
      { kind: 'INTERFACE', pattern: /^\s*(?:public\s+)?interface\s+([A-Za-z_][\w]*)/ },
      { kind: 'ENUM', pattern: /^\s*(?:public\s+)?enum\s+([A-Za-z_][\w]*)/ },
      { kind: 'FUNCTION', pattern: /^\s*(?:public|protected|private|internal)\s+(?:static\s+|async\s+)*[\w.<>,[\]\s]+\s+([A-Za-z_][\w]*)\s*\(/ },
    ],
    imports: [/^\s*using\s+([\w.]+)/],
  },
  cpp: {
    symbols: [
      { kind: 'CLASS', pattern: /^\s*(?:class|struct)\s+([A-Za-z_][\w]*)/ },
      { kind: 'NAMESPACE', pattern: /^\s*namespace\s+([A-Za-z_][\w]*)/ },
      { kind: 'FUNCTION', pattern: /^\s*(?:[\w:*&<>]+\s+)+([A-Za-z_][\w]*)\s*\(/ },
    ],
    imports: [/^\s*#\s*include\s+[<"]([^>"]+)[>"]/],
  },
  c: {
    symbols: [
      { kind: 'TYPE', pattern: /^\s*typedef\s+struct\s+([A-Za-z_][\w]*)/ },
      { kind: 'FUNCTION', pattern: /^\s*(?:[\w*]+\s+)+([A-Za-z_][\w]*)\s*\(/ },
    ],
    imports: [/^\s*#\s*include\s+[<"]([^>"]+)[>"]/],
  },
  swift: {
    symbols: [
      { kind: 'CLASS', pattern: /^\s*(?:public\s+|private\s+|internal\s+)?(?:final\s+)?class\s+([A-Za-z_][\w]*)/ },
      { kind: 'CLASS', pattern: /^\s*(?:public\s+)?struct\s+([A-Za-z_][\w]*)/ },
      { kind: 'INTERFACE', pattern: /^\s*(?:public\s+)?protocol\s+([A-Za-z_][\w]*)/ },
      { kind: 'ENUM', pattern: /^\s*(?:public\s+)?enum\s+([A-Za-z_][\w]*)/ },
      { kind: 'FUNCTION', pattern: /^\s*(?:public\s+|private\s+)?func\s+([A-Za-z_][\w]*)\s*[<(]/ },
    ],
    imports: [/^\s*import\s+([A-Za-z_][\w]*)/],
  },
  scala: {
    symbols: [
      { kind: 'CLASS', pattern: /^\s*(?:case\s+)?class\s+([A-Za-z_][\w]*)/ },
      { kind: 'NAMESPACE', pattern: /^\s*object\s+([A-Za-z_][\w]*)/ },
      { kind: 'INTERFACE', pattern: /^\s*trait\s+([A-Za-z_][\w]*)/ },
      { kind: 'FUNCTION', pattern: /^\s*def\s+([A-Za-z_][\w]*)\s*[([:]/ },
    ],
    imports: [/^\s*import\s+([\w.]+)/],
  },
  dart: {
    symbols: [
      { kind: 'CLASS', pattern: /^\s*(?:abstract\s+)?class\s+([A-Za-z_][\w]*)/ },
      { kind: 'FUNCTION', pattern: /^\s*(?:[\w.<>,\s]+)\s+([A-Za-z_][\w]*)\s*\(/ },
    ],
    imports: [/^\s*import\s+['"]([^'"]+)['"]/],
  },
};

export class GenericParser extends BaseParser {
  constructor(private readonly language: string) {
    super();
  }

  async parse(file: SourceFile): Promise<ParseResult> {
    const rules = RULES[this.language] ?? RULES.java;
    const lines = file.content.split(/\r?\n/);
    const symbols: ParsedSymbol[] = [moduleSymbol(file.path, lines.length)];
    const relations: ParsedRelation[] = [];

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const lineNo = i + 1;
      let matched = false;
      for (const rule of rules.symbols) {
        const match = rule.pattern.exec(line);
        if (!match?.[1] || isNoiseName(match[1])) {
          continue;
        }
        const kind = this.language !== 'go' && this.language !== 'rust' && looksLikeMethod(line)
          ? 'METHOD'
          : rule.kind;
        const parent = kind === 'METHOD' ? lastType(symbols) ?? symbols[0] : symbols[0];
        symbols.push(
          makeSymbol({
            kind,
            name: match[1],
            qualifiedName: qualify(file.path, parent, match[1]),
            parentQualifiedName: parent.qualifiedName,
            startLine: lineNo,
            endLine: lineNo,
            metrics: { loc: 1, complexity: lineComplexity(line), nesting: 0 },
          }),
        );
        matched = true;
        break;
      }
      if (matched) {
        continue;
      }
      for (const pattern of rules.imports) {
        const match = pattern.exec(line);
        if (match?.[1]) {
          relations.push({
            type: 'imports',
            sourceQualifiedName: file.path,
            targetQualifiedName: match[1],
            confidence: 0.8,
          });
          break;
        }
      }
    }

    return finishParse(file.content, symbols, relations);
  }
}

function lastType(symbols: ParsedSymbol[]): ParsedSymbol | null {
  for (let i = symbols.length - 1; i >= 0; i -= 1) {
    if (symbols[i].kind === 'CLASS' || symbols[i].kind === 'INTERFACE' || symbols[i].kind === 'ENUM') {
      return symbols[i];
    }
  }
  return null;
}

function looksLikeMethod(line: string): boolean {
  return /^\s+(?:public|protected|private|internal|pub|fun|func|def)\b/.test(line);
}

function isNoiseName(name: string): boolean {
  return name === 'if' || name === 'for' || name === 'while' || name === 'switch' || name === 'return' || name === 'new';
}

const cache = new Map<string, GenericParser>();

export function genericParserFor(language: string): GenericParser {
  const current = cache.get(language);
  if (current) {
    return current;
  }
  const created = new GenericParser(language);
  cache.set(language, created);
  return created;
}
