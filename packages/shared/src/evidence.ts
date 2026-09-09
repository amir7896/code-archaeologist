/** Heuristic mappings are never stored as certainty. */
export const EVIDENCE_MAX_CONFIDENCE = 0.92;
export const EVIDENCE_HUNK_LIMIT = 250;

export type LineSpan = {
  startLine: number;
  endLine: number;
};

export type EvidenceMethodName = 'LINE_OVERLAP' | 'FILE_TOUCH' | 'FILE_ADDED' | 'FILE_RENAMED';
export type EvidenceConfidenceLabel = 'possible' | 'likely' | 'strong';

export type SymbolCommitLink = {
  method: EvidenceMethodName;
  confidence: number;
  overlapLines: number;
};

const HUNK_RE = /@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/g;

export function clampEvidenceConfidence(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.min(EVIDENCE_MAX_CONFIDENCE, Math.max(0, Number(value.toFixed(3))));
}

export function evidenceConfidenceLabel(confidence: number): EvidenceConfidenceLabel {
  if (confidence >= 0.7) {
    return 'strong';
  }
  if (confidence >= 0.45) {
    return 'likely';
  }
  return 'possible';
}

/** Parse unified-diff hunk headers into new-file line spans. */
export function parseUnifiedHunks(diff: string): LineSpan[] {
  const spans: LineSpan[] = [];
  for (const match of diff.matchAll(HUNK_RE)) {
    const startLine = Number(match[1]);
    const count = match[2] === undefined ? 1 : Number(match[2]);
    if (!Number.isFinite(startLine) || startLine < 1 || count <= 0) {
      continue;
    }
    spans.push({ startLine, endLine: startLine + count - 1 });
  }
  return mergeSpans(spans);
}

export function overlapLines(symbol: LineSpan, hunks: LineSpan[]): number {
  let total = 0;
  for (const hunk of hunks) {
    const start = Math.max(symbol.startLine, hunk.startLine);
    const end = Math.min(symbol.endLine, hunk.endLine);
    if (end >= start) {
      total += end - start + 1;
    }
  }
  return total;
}

export function scoreFileCommitLink(changeType: string): { method: EvidenceMethodName; confidence: number } {
  if (changeType === 'ADDED') {
    return { method: 'FILE_ADDED', confidence: clampEvidenceConfidence(0.78) };
  }
  if (changeType === 'RENAMED' || changeType === 'COPIED') {
    return { method: 'FILE_RENAMED', confidence: clampEvidenceConfidence(0.52) };
  }
  return { method: 'FILE_TOUCH', confidence: clampEvidenceConfidence(0.32) };
}

export function scoreSymbolCommitLink(input: {
  changeType: string;
  symbol: LineSpan;
  hunks: LineSpan[];
}): SymbolCommitLink {
  if (input.changeType === 'ADDED') {
    return { method: 'FILE_ADDED', confidence: clampEvidenceConfidence(0.78), overlapLines: 0 };
  }
  if (input.changeType === 'RENAMED' || input.changeType === 'COPIED') {
    return { method: 'FILE_RENAMED', confidence: clampEvidenceConfidence(0.52), overlapLines: 0 };
  }
  if (input.hunks.length > 0) {
    const span = Math.max(1, input.symbol.endLine - input.symbol.startLine + 1);
    const overlap = overlapLines(input.symbol, input.hunks);
    if (overlap > 0) {
      return {
        method: 'LINE_OVERLAP',
        confidence: clampEvidenceConfidence(0.55 + 0.35 * (overlap / span)),
        overlapLines: overlap,
      };
    }
    return { method: 'FILE_TOUCH', confidence: clampEvidenceConfidence(0.22), overlapLines: 0 };
  }
  return { method: 'FILE_TOUCH', confidence: clampEvidenceConfidence(0.32), overlapLines: 0 };
}

function mergeSpans(spans: LineSpan[]): LineSpan[] {
  if (spans.length <= 1) {
    return spans;
  }
  const sorted = [...spans].sort((left, right) => left.startLine - right.startLine);
  const merged: LineSpan[] = [sorted[0]];
  for (const span of sorted.slice(1)) {
    const last = merged[merged.length - 1];
    if (span.startLine <= last.endLine + 1) {
      last.endLine = Math.max(last.endLine, span.endLine);
    } else {
      merged.push({ ...span });
    }
  }
  return merged;
}
