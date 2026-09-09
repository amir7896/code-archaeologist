import { EXAMPLE_COMMIT_SHA, EXAMPLE_FILE_ID } from '../../common/swagger/example-ids';

export const dnaProfileResponseExample = {
  subjectType: 'FILE',
  subjectId: EXAMPLE_FILE_ID,
  name: 'env.py',
  path: 'alembic/env.py',
  firstRevision: '20a7150',
  lastRevision: '20a7150',
  firstSeenAt: '2026-01-12T10:00:00.000Z',
  lastChangedAt: '2026-09-01T12:00:00.000Z',
  changeCount: 7,
  fanIn: 2,
  fanOut: 4,
  complexity: 6,
  loc: 71,
  dependencyCount: 4,
  coupling: 'medium',
  complexityLabel: 'medium',
  risk: {
    score: 41,
    level: 'MEDIUM',
    evidenceConfidence: 0.8,
    factors: [
      {
        key: 'churn',
        label: 'Change frequency',
        raw: 7,
        normalized: 0.233,
        weight: 0.2,
        contribution: 0.0466,
      },
    ],
  },
  contributors: [{ name: 'Ada Lovelace', email: 'dev@example.com', commits: 4 }],
  versions: [
    {
      revision: EXAMPLE_COMMIT_SHA,
      changeType: 'MODIFIED',
      loc: 71,
      complexity: 6,
      committedAt: '2026-09-01T12:00:00.000Z',
    },
  ],
  relatedCommits: [
    {
      sha: EXAMPLE_COMMIT_SHA,
      message: 'Tighten migration env',
      authorName: 'Ada Lovelace',
      committedAt: '2026-09-01T12:00:00.000Z',
    },
  ],
};

export const insightListResponseExample = {
  items: [
    {
      subjectType: 'FILE',
      subjectId: EXAMPLE_FILE_ID,
      name: 'env.py',
      path: 'alembic/env.py',
      score: 68,
      level: 'HIGH',
      changeCount: 12,
      complexity: 9,
      fanIn: 5,
    },
  ],
};

export const dnaHealthResponseExample = {
  revision: '20a7150',
  fileCount: 232,
  hotspotCount: 6,
  highRiskCount: 6,
  averageComplexity: 3.4,
};
