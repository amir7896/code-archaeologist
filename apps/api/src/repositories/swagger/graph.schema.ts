import {
  EXAMPLE_FILE_ID,
  EXAMPLE_REPOSITORY_ID,
} from '../../common/swagger/example-ids';

export const graphMapResponseExample = {
  revision: '20a7150',
  modules: [
    {
      id: 'alembic',
      path: 'alembic',
      fileCount: 4,
      fanIn: 0,
      fanOut: 1,
      inCycle: false,
      files: [{ id: EXAMPLE_FILE_ID, path: 'alembic/env.py' }],
    },
    {
      id: 'app',
      path: 'app',
      fileCount: 18,
      fanIn: 1,
      fanOut: 0,
      inCycle: false,
      files: [{ id: EXAMPLE_REPOSITORY_ID, path: 'app/main.py' }],
    },
  ],
  edges: [
    {
      sourceId: 'alembic',
      targetId: 'app',
      type: 'DEPENDS_ON',
      weight: 2,
      confidence: 0.9,
    },
  ],
  cycles: [],
  stats: {
    fileCount: 22,
    moduleCount: 2,
    edgeCount: 1,
    cycleCount: 0,
    unresolvedImportCount: 6,
  },
};

export const graphNeighborsResponseExample = {
  fileId: EXAMPLE_FILE_ID,
  path: 'alembic/env.py',
  direction: 'dependencies',
  depth: 2,
  items: [{ fileId: EXAMPLE_REPOSITORY_ID, path: 'app/main.py', depth: 1 }],
};

export const graphCyclesResponseExample = {
  modules: [{ id: 'cycle-1', nodes: ['app', 'alembic'] }],
  files: [
    {
      id: 'file-cycle-1',
      nodes: [
        { id: EXAMPLE_FILE_ID, path: 'alembic/env.py' },
        { id: EXAMPLE_REPOSITORY_ID, path: 'app/main.py' },
      ],
    },
  ],
};
