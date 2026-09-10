export type ComplexityTone = 'high' | 'medium' | 'low' | 'empty';

export function formatIsoDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().slice(0, 10);
}

export function complexityDisplay(complexity: number | null | undefined): {
  text: string;
  tone: ComplexityTone;
} {
  if (complexity == null || complexity <= 0) {
    return { text: '—', tone: 'empty' };
  }
  if (complexity >= 15) {
    return { text: `${complexity} High`, tone: 'high' };
  }
  if (complexity >= 6) {
    return { text: `${complexity} Med`, tone: 'medium' };
  }
  return { text: `${complexity} Low`, tone: 'low' };
}

export function symbolTableName(name: string, kind: string): string {
  if (kind === 'FUNCTION' || kind === 'METHOD') {
    return name.endsWith('()') ? name : `${name}()`;
  }
  return name;
}

export function innermostSymbolAtLine<T extends { startLine: number; endLine: number }>(
  symbols: T[],
  line: number,
): T | undefined {
  return symbols
    .filter((symbol) => line >= symbol.startLine && line <= symbol.endLine)
    .sort((left, right) => left.endLine - left.startLine - (right.endLine - right.startLine))[0];
}

export function pickBlameEvidence<T extends { confidence: number; commit: unknown }>(
  items: T[],
): T | undefined {
  return items
    .filter((item) => item.commit)
    .sort((left, right) => right.confidence - left.confidence)[0];
}

export function isRepositoriesNavActive(pathname: string): boolean {
  return pathname.endsWith('/repositories') || /\/repository\/[^/]+$/.test(pathname);
}

export function analysisContextLabel(pathname: string): string | null {
  if (/\/repository\/[^/]+\/code$/.test(pathname)) {
    return 'Explorer';
  }
  if (/\/repository\/[^/]+\/ask$/.test(pathname)) {
    return 'Investigation';
  }
  return null;
}

export type RelatedEvidenceChip = {
  key: string;
  label: string;
};

export function relatedEvidenceChips(
  items: Array<{
    sourceType: string;
    citation: string;
    excerpt: string;
    commitSha: string | null;
    path: string | null;
  }>,
): RelatedEvidenceChip[] {
  const chips: RelatedEvidenceChip[] = [];
  const seenCommits = new Set<string>();
  for (const item of items) {
    const sha = item.commitSha || (item.sourceType === 'COMMIT' ? item.citation : '');
    if (!sha) {
      continue;
    }
    const short = sha.length > 12 ? sha.slice(0, 7) : sha;
    if (seenCommits.has(short)) {
      continue;
    }
    seenCommits.add(short);
    const date = item.excerpt.match(/\d{4}-\d{2}-\d{2}/)?.[0];
    chips.push({
      key: `commit-${short}`,
      label: date ? `Commit ${short} (${date})` : `Commit ${short}`,
    });
    if (chips.length >= 3) {
      break;
    }
  }
  const files = [
    ...new Set(
      items
        .map((item) => item.path?.split('/').pop() || (item.sourceType === 'FILE' ? item.citation : null))
        .filter((name): name is string => Boolean(name)),
    ),
  ];
  if (files.length > 0) {
    chips.push({ key: 'files', label: `Files: ${files.slice(0, 4).join(', ')}` });
  }
  return chips;
}

export function uniqueEvidence<T extends { citation: string; commitSha: string | null; path: string | null }>(
  items: T[],
): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.commitSha || item.path || item.citation;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
