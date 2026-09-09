import { EXAMPLE_COMMIT_SHA, EXAMPLE_DATE } from '../../common/swagger/example-ids';
import { paginationExample } from '../../workspaces/swagger/workspace.schema';

export const branchListResponseExample = {
  items: [
    {
      id: 'b1111111-1111-4111-8111-111111111111',
      name: 'main',
      headSha: EXAMPLE_COMMIT_SHA,
      isDefault: true,
    },
  ],
};

export const commitSummaryExample = {
  sha: EXAMPLE_COMMIT_SHA,
  message: 'Add customer address and wishlist',
  authorName: 'amir7896',
  authorEmail: 'amir@example.com',
  authoredAt: EXAMPLE_DATE,
  committedAt: EXAMPLE_DATE,
  parentShas: ['11aa22bb33cc44dd55ee66ff77889900aabbccdd'],
  isMerge: false,
  additions: 4645,
  deletions: 140,
  changedFileCount: 28,
};

export const commitListResponseExample = {
  items: [commitSummaryExample],
  pagination: paginationExample,
};

export const commitDetailResponseExample = {
  ...commitSummaryExample,
  files: [
    {
      path: 'alembic/env.py',
      oldPath: null,
      changeType: 'MODIFIED',
      additions: 24,
      deletions: 3,
      similarity: null,
      language: 'python',
    },
  ],
};

export const fileHistoryResponseExample = {
  path: 'alembic/env.py',
  items: [
    {
      sha: EXAMPLE_COMMIT_SHA,
      message: 'Add customer address and wishlist',
      authorName: 'amir7896',
      committedAt: EXAMPLE_DATE,
      changeType: 'MODIFIED',
      oldPath: null,
      path: 'alembic/env.py',
      additions: 24,
      deletions: 3,
    },
  ],
  pagination: paginationExample,
};
