import {
  EXAMPLE_COMMIT_SHA,
  EXAMPLE_DATE,
  EXAMPLE_FILE_ID,
  EXAMPLE_SYMBOL_ID,
} from '../../common/swagger/example-ids';

const origin = {
  subjectType: 'SYMBOL',
  subjectId: EXAMPLE_SYMBOL_ID,
  name: 'CartService.add_item',
  path: 'app/services/cart_service.py',
  fileId: EXAMPLE_FILE_ID,
  symbolId: EXAMPLE_SYMBOL_ID,
};

const commit = {
  sha: EXAMPLE_COMMIT_SHA,
  message: 'Tighten cart totals',
  authorName: 'Ada',
  committedAt: EXAMPLE_DATE,
};

const evidenceItem = {
  id: EXAMPLE_FILE_ID,
  kind: 'COMMIT_SYMBOL',
  method: 'LINE_OVERLAP',
  subjectType: 'SYMBOL',
  subjectId: EXAMPLE_SYMBOL_ID,
  confidence: 0.82,
  confidenceLabel: 'strong',
  excerpt: null,
  details: { changeType: 'MODIFIED', overlapLines: 6, path: 'app/services/cart_service.py' },
  commit,
};

const note =
  'Symbol locations come from the current tree. Commit links are scored from changed files and line ranges, never certain.';

export const evidenceListResponseExample = {
  revision: '20a7150',
  origin,
  note,
  items: [evidenceItem],
};

export const evidenceResolveResponseExample = {
  revision: '20a7150',
  requestedRevision: EXAMPLE_COMMIT_SHA,
  matched: true,
  origin,
  note,
  items: [evidenceItem],
  versions: [
    {
      revision: EXAMPLE_COMMIT_SHA,
      contentHash: 'a1b2c3',
      changeType: 'MODIFIED',
      startLine: 12,
      endLine: 48,
      commitSha: EXAMPLE_COMMIT_SHA,
    },
  ],
};

export const evolutionResponseExample = {
  revision: '20a7150',
  origin,
  note,
  stats: {
    commitCount: 1,
    strongCount: 1,
    likelyCount: 0,
    possibleCount: 0,
    versionCount: 1,
  },
  timeline: [
    {
      sha: EXAMPLE_COMMIT_SHA,
      message: 'Tighten cart totals',
      authorName: 'Ada',
      committedAt: EXAMPLE_DATE,
      method: 'LINE_OVERLAP',
      confidence: 0.82,
      confidenceLabel: 'strong',
      changeType: 'MODIFIED',
      additions: 8,
      deletions: 2,
      overlapLines: 6,
    },
  ],
  versions: evidenceResolveResponseExample.versions,
};
