import ts from 'typescript';

export function lineSpan(source: ts.SourceFile, node: ts.Node): { startLine: number; endLine: number } {
  const start = source.getLineAndCharacterOfPosition(node.getStart(source, false));
  const end = source.getLineAndCharacterOfPosition(node.getEnd());
  return { startLine: start.line + 1, endLine: end.line + 1 };
}

export function fileMetrics(content: string, complexity: number): { loc: number; sloc: number; complexity: number } {
  const lines = content.split(/\r?\n/);
  const sloc = lines.filter((line) => {
    const trimmed = line.trim();
    return trimmed.length > 0 && !trimmed.startsWith('//') && trimmed !== '/*' && !trimmed.startsWith('*');
  }).length;
  return { loc: lines.length, sloc, complexity };
}

export function nodeComplexity(node: ts.Node): number {
  let score = 1;
  const visit = (current: ts.Node) => {
    if (isDecision(current)) {
      score += 1;
    }
    ts.forEachChild(current, visit);
  };
  ts.forEachChild(node, visit);
  return score;
}

export function nodeNesting(node: ts.Node): number {
  let max = 0;
  const visit = (current: ts.Node, depth: number) => {
    const next = ts.isBlock(current) || ts.isSourceFile(current) ? depth + 1 : depth;
    if (next > max) {
      max = next;
    }
    ts.forEachChild(current, (child) => visit(child, next));
  };
  visit(node, 0);
  return Math.max(0, max - 1);
}

function isDecision(node: ts.Node): boolean {
  if (
    ts.isIfStatement(node) ||
    ts.isForStatement(node) ||
    ts.isForInStatement(node) ||
    ts.isForOfStatement(node) ||
    ts.isWhileStatement(node) ||
    ts.isDoStatement(node) ||
    ts.isCaseClause(node) ||
    ts.isCatchClause(node) ||
    ts.isConditionalExpression(node)
  ) {
    return true;
  }
  if (ts.isBinaryExpression(node)) {
    return (
      node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
      node.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
      node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
    );
  }
  return false;
}
