import {
  applyNumstat,
  detectLanguage,
  normalizeAuthorEmail,
  parseCommitLog,
  parseNameStatusLine,
  parseNumstatLine,
} from '@code-archaeologist/git';

describe('history parsers', () => {
  it('parses commit metadata and parent shas', () => {
    const [commit] = parseCommitLog(
      `\x1eabc123\x1fAda\x1fada@example.com\x1f2026-01-01T00:00:00Z\x1f2026-01-01T00:00:00Z\x1fparent1 parent2\x1fAdd login\n\nDetails`,
    );
    expect(commit.sha).toBe('abc123');
    expect(commit.parentShas).toEqual(['parent1', 'parent2']);
    expect(commit.message).toContain('Add login');
  });

  it('maps rename and copy status with similarity', () => {
    expect(parseNameStatusLine('R100\told.ts\tnew.ts')).toMatchObject({
      changeType: 'RENAMED',
      oldPath: 'old.ts',
      newPath: 'new.ts',
      similarity: 100,
    });
    expect(parseNameStatusLine('C80\tsrc/a.ts\tsrc/b.ts')).toMatchObject({
      changeType: 'COPIED',
      similarity: 80,
    });
    expect(parseNameStatusLine('A\tsrc/new.ts')?.changeType).toBe('ADDED');
  });

  it('applies numstat additions and deletions', () => {
    const changes = applyNumstat(
      {
        abc: [
          {
            changeType: 'MODIFIED',
            oldPath: null,
            newPath: 'src/a.ts',
            additions: 0,
            deletions: 0,
            similarity: null,
          },
        ],
      },
      { abc: { 'src/a.ts': { additions: 4, deletions: 1 } } },
    );
    expect(changes.abc[0]).toMatchObject({ additions: 4, deletions: 1 });
    expect(parseNumstatLine('12\t3\tsrc/a.ts')).toEqual({
      path: 'src/a.ts',
      additions: 12,
      deletions: 3,
    });
  });

  it('normalizes missing emails and detects languages', () => {
    expect(normalizeAuthorEmail('', 'Ada Lovelace')).toBe('ada.lovelace@unknown.local');
    expect(detectLanguage('apps/web/src/App.tsx')).toBe('typescript');
    expect(detectLanguage('Dockerfile')).toBe('dockerfile');
  });
});
