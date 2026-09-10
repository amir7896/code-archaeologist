import { describe, expect, it } from 'vitest';
import {
  complexityDisplay,
  analysisContextLabel,
  formatIsoDate,
  relatedEvidenceChips,
  uniqueEvidence,
  innermostSymbolAtLine,
  isRepositoriesNavActive,
  pickBlameEvidence,
  symbolTableName,
} from './explorer';

describe('explorer helpers', () => {
  it('labels complexity the way the explorer badges do', () => {
    expect(complexityDisplay(0)).toEqual({ text: '—', tone: 'empty' });
    expect(complexityDisplay(3)).toEqual({ text: '3 Low', tone: 'low' });
    expect(complexityDisplay(7)).toEqual({ text: '7 Med', tone: 'medium' });
    expect(complexityDisplay(15)).toEqual({ text: '15 High', tone: 'high' });
  });

  it('formats history dates as YYYY-MM-DD', () => {
    expect(formatIsoDate('2026-01-10T12:00:00.000Z')).toBe('2026-01-10');
    expect(formatIsoDate('not-a-date')).toBe('');
  });

  it('picks the innermost symbol covering a line', () => {
    const symbols = [
      { id: 'class', startLine: 1, endLine: 64 },
      { id: 'method', startLine: 18, endLine: 29 },
    ];
    expect(innermostSymbolAtLine(symbols, 24)?.id).toBe('method');
    expect(innermostSymbolAtLine(symbols, 2)?.id).toBe('class');
    expect(innermostSymbolAtLine(symbols, 90)).toBeUndefined();
  });

  it('adds parentheses to callable symbols', () => {
    expect(symbolTableName('createUser', 'METHOD')).toBe('createUser()');
    expect(symbolTableName('UserService', 'CLASS')).toBe('UserService');
  });

  it('picks the strongest evidence that has a commit', () => {
    expect(
      pickBlameEvidence([
        { confidence: 0.4, commit: { sha: 'aaa' } },
        { confidence: 0.81, commit: { sha: 'bbb' } },
        { confidence: 0.9, commit: null },
      ])?.commit,
    ).toEqual({ sha: 'bbb' });
  });

  it('keeps Repositories active only on connect and overview', () => {
    expect(isRepositoriesNavActive('/work-space/ws/repositories')).toBe(true);
    expect(isRepositoriesNavActive('/work-space/ws/repository/repo-1')).toBe(true);
    expect(isRepositoriesNavActive('/work-space/ws/repository/repo-1/code')).toBe(false);
    expect(analysisContextLabel('/work-space/ws/repository/repo-1/code')).toBe('Explorer');
    expect(analysisContextLabel('/work-space/ws/repository/repo-1/ask')).toBe('Investigation');
    expect(analysisContextLabel('/work-space/ws/repository/repo-1')).toBeNull();
  });

  it('builds related-evidence chips without repeating the same commit', () => {
    expect(
      relatedEvidenceChips([
        {
          sourceType: 'COMMIT',
          citation: '817esf7',
          excerpt: 'File added · 2026-08-28',
          commitSha: '817esf7aaaaaaa',
          path: null,
        },
        {
          sourceType: 'EVIDENCE',
          citation: '817esf7',
          excerpt: 'File added · 2026-08-28',
          commitSha: '817esf7aaaaaaa',
          path: null,
        },
        {
          sourceType: 'FILE',
          citation: 'order_service.py',
          excerpt: 'app/services/order_service.py',
          commitSha: null,
          path: 'app/services/order_service.py',
        },
      ]),
    ).toEqual([
      { key: 'commit-817esf7', label: 'Commit 817esf7 (2026-08-28)' },
      { key: 'files', label: 'Files: order_service.py' },
    ]);
    expect(
      uniqueEvidence([
        { citation: '817esf7', commitSha: 'aaa', path: null },
        { citation: '817esf7', commitSha: 'aaa', path: null },
        { citation: 'file', commitSha: null, path: 'app/a.py' },
      ]),
    ).toHaveLength(2);
  });
});
