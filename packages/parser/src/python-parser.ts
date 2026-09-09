import { BaseParser, finishParse, lineComplexity, makeSymbol, moduleSymbol, qualify } from './base-parser';
import type { ParseResult, ParsedRelation, ParsedSymbol, SourceFile } from './types';

const CLASS_RE = /^(\s*)class\s+([A-Za-z_][\w]*)\s*(?:\(([^)]*)\))?/;
const DEF_RE = /^(\s*)(?:async\s+)?def\s+([A-Za-z_][\w]*)\s*\(/;
const FROM_IMPORT_RE = /^\s*from\s+(\S+)\s+import\s+(.+)$/;
const IMPORT_RE = /^\s*import\s+(.+)$/;
const CONST_RE = /^([A-Z][A-Z0-9_]*)\s*=/;

export class PythonParser extends BaseParser {
  async parse(file: SourceFile): Promise<ParseResult> {
    const lines = file.content.split(/\r?\n/);
    const symbols: ParsedSymbol[] = [moduleSymbol(file.path, lines.length)];
    const relations: ParsedRelation[] = [];
    const stack: Array<{ indent: number; symbol: ParsedSymbol }> = [
      { indent: -1, symbol: symbols[0] },
    ];
    let inString: '"""' | "'''" | null = null;

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const lineNo = i + 1;
      inString = updateStringState(line, inString);
      if (inString) {
        continue;
      }
      const trimmed = stripComment(line);
      if (!trimmed) {
        continue;
      }

      const classMatch = CLASS_RE.exec(trimmed);
      if (classMatch) {
        const indent = indentWidth(classMatch[1]);
        const parent = popTo(stack, indent, lineNo - 1);
        const symbol = makeNamed(file.path, parent, 'CLASS', classMatch[2], lineNo, indent);
        symbols.push(symbol);
        stack.push({ indent, symbol });
        for (const base of splitHeritage(classMatch[3])) {
          relations.push({
            type: 'extends',
            sourceQualifiedName: symbol.qualifiedName,
            targetQualifiedName: base,
            confidence: 0.7,
          });
        }
        continue;
      }

      const defMatch = DEF_RE.exec(trimmed);
      if (defMatch) {
        const indent = indentWidth(defMatch[1]);
        const parent = popTo(stack, indent, lineNo - 1);
        const kind = parent.kind === 'CLASS' || parent.kind === 'INTERFACE' ? 'METHOD' : 'FUNCTION';
        const symbol = makeNamed(file.path, parent, kind, defMatch[2], lineNo, indent);
        symbols.push(symbol);
        stack.push({ indent, symbol });
        continue;
      }

      const fromImport = FROM_IMPORT_RE.exec(trimmed);
      if (fromImport) {
        relations.push({
          type: 'imports',
          sourceQualifiedName: file.path,
          targetQualifiedName: fromImport[1],
          confidence: 0.9,
        });
        continue;
      }
      const directImport = IMPORT_RE.exec(trimmed);
      if (directImport) {
        for (const name of directImport[1].split(',').map((part) => part.trim().split(/\s+as\s+/)[0])) {
          if (name) {
            relations.push({
              type: 'imports',
              sourceQualifiedName: file.path,
              targetQualifiedName: name,
              confidence: 0.9,
            });
          }
        }
        continue;
      }

      if (stack[stack.length - 1]?.symbol.kind === 'MODULE' && CONST_RE.test(trimmed)) {
        const name = CONST_RE.exec(trimmed)?.[1];
        if (name) {
          symbols.push(makeNamed(file.path, symbols[0], 'CONSTANT', name, lineNo, 0, lineNo));
        }
      }
    }

    closeStack(stack, lines.length);
    applyBodyMetrics(symbols, lines);
    collectCalls(file.path, symbols, relations, lines);
    return finishParse(file.content, symbols, relations);
  }
}

function makeNamed(
  filePath: string,
  parent: ParsedSymbol,
  kind: string,
  name: string,
  startLine: number,
  indent: number,
  endLine = startLine,
): ParsedSymbol {
  return makeSymbol({
    kind,
    name,
    qualifiedName: qualify(filePath, parent, name),
    parentQualifiedName: parent.qualifiedName,
    startLine,
    endLine,
    metrics: { loc: 1, complexity: 1, nesting: Math.max(0, Math.floor(indent / 4)) },
  });
}

function popTo(
  stack: Array<{ indent: number; symbol: ParsedSymbol }>,
  indent: number,
  endLine: number,
): ParsedSymbol {
  while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
    const closed = stack.pop();
    if (closed && endLine >= closed.symbol.startLine) {
      closed.symbol.endLine = endLine;
      closed.symbol.metrics.loc = closed.symbol.endLine - closed.symbol.startLine + 1;
    }
  }
  return stack[stack.length - 1].symbol;
}

function closeStack(stack: Array<{ indent: number; symbol: ParsedSymbol }>, endLine: number): void {
  while (stack.length > 1) {
    const closed = stack.pop();
    if (closed) {
      closed.symbol.endLine = endLine;
      closed.symbol.metrics.loc = Math.max(1, closed.symbol.endLine - closed.symbol.startLine + 1);
    }
  }
  stack[0].symbol.endLine = endLine;
}

function applyBodyMetrics(symbols: ParsedSymbol[], lines: string[]): void {
  for (const symbol of symbols) {
    if (symbol.kind === 'MODULE') {
      continue;
    }
    const body = lines.slice(symbol.startLine - 1, symbol.endLine).join('\n');
    symbol.metrics.complexity = lineComplexity(body);
    symbol.astHash = makeSymbol(symbol).astHash;
  }
}

function collectCalls(
  filePath: string,
  symbols: ParsedSymbol[],
  relations: ParsedRelation[],
  lines: string[],
): void {
  for (const symbol of symbols) {
    if (symbol.kind !== 'FUNCTION' && symbol.kind !== 'METHOD') {
      continue;
    }
    const seen = new Set<string>();
    for (const line of lines.slice(symbol.startLine, symbol.endLine)) {
      const matches = line.matchAll(/\b([A-Za-z_][\w]*)\s*\(/g);
      for (const match of matches) {
        const name = match[1];
        if (!name || name === symbol.name || seen.has(name) || isKeyword(name)) {
          continue;
        }
        seen.add(name);
        relations.push({
          type: 'calls',
          sourceQualifiedName: symbol.qualifiedName,
          targetQualifiedName: name,
          confidence: 0.45,
        });
      }
    }
  }
  void filePath;
}

function splitHeritage(value?: string): string[] {
  return (value ?? '')
    .split(',')
    .map((part) => part.trim().split('.')[0])
    .filter((part) => part && part !== 'object');
}

function indentWidth(prefix: string): number {
  return [...prefix].reduce((sum, char) => sum + (char === '\t' ? 4 : 1), 0);
}

function stripComment(line: string): string {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if (char === '"' && !inSingle) {
      inDouble = !inDouble;
    } else if (char === '#' && !inSingle && !inDouble) {
      return line.slice(0, i);
    }
  }
  return line;
}

function updateStringState(line: string, current: '"""' | "'''" | null): '"""' | "'''" | null {
  if (current) {
    return line.includes(current) ? null : current;
  }
  const tripleDouble = (line.match(/"""/g) ?? []).length;
  const tripleSingle = (line.match(/'''/g) ?? []).length;
  if (tripleDouble % 2 === 1) {
    return '"""';
  }
  if (tripleSingle % 2 === 1) {
    return "'''";
  }
  return null;
}

function isKeyword(name: string): boolean {
  return (
    name === 'if' ||
    name === 'for' ||
    name === 'while' ||
    name === 'elif' ||
    name === 'class' ||
    name === 'def' ||
    name === 'lambda' ||
    name === 'return' ||
    name === 'print'
  );
}

export const pythonParser = new PythonParser();
