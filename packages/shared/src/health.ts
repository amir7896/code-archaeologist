import { clamp01 } from './risk';

export function repositoryHealthScore(input: {
  fileCount: number;
  highRiskCount: number;
  averageComplexity: number;
}): number {
  if (input.fileCount <= 0) {
    return 0;
  }
  const hotspotRatio = clamp01(input.highRiskCount / input.fileCount);
  const complexityRatio = clamp01(input.averageComplexity / 20);
  return Math.round(100 * (1 - 0.65 * hotspotRatio - 0.35 * complexityRatio));
}

export type LanguageShare = {
  language: string;
  count: number;
  percent: number;
};

export function summarizeLanguages(
  rows: Array<{ language: string | null; count: number }>,
): LanguageShare[] {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  if (total <= 0) {
    return [];
  }
  const known = rows
    .filter((row) => row.language && row.language !== 'unknown')
    .sort((left, right) => right.count - left.count);
  const top = known.slice(0, 3);
  const otherCount =
    total - top.reduce((sum, row) => sum + row.count, 0);
  const shares = top.map((row) => ({
    language: row.language as string,
    count: row.count,
    percent: 0,
  }));
  if (otherCount > 0) {
    shares.push({ language: 'other', count: otherCount, percent: 0 });
  }
  let remaining = 100;
  for (const [index, share] of shares.entries()) {
    if (index === shares.length - 1) {
      share.percent = remaining;
      break;
    }
    share.percent = Math.round((share.count / total) * 100);
    remaining -= share.percent;
  }
  return shares;
}

export function isOpenThreadState(state: string): boolean {
  const normalized = state.trim().toLowerCase();
  return normalized === 'open' || normalized === 'opened' || normalized === 'new';
}

export const OPEN_THREAD_STATES = ['open', 'opened', 'OPEN', 'NEW', 'Open'] as const;
