import { EXAMPLE_FILE_ID, EXAMPLE_SYMBOL_ID } from '../../common/swagger/example-ids';
import { paginationExample } from '../../workspaces/swagger/workspace.schema';

export const sourceFileResponseExample = {
  id: EXAMPLE_FILE_ID,
  path: 'alembic/env.py',
  language: 'python',
  size: 1840,
  loc: 71,
  complexity: 4,
  symbolCount: 3,
  lastRevision: '20a7150',
};

export const sourceFileListResponseExample = {
  items: [sourceFileResponseExample],
  pagination: paginationExample,
};

export const sourcePreviewResponseExample = {
  fileId: EXAMPLE_FILE_ID,
  path: 'alembic/env.py',
  language: 'python',
  content: 'def run_migrations_online():\n    connectable = engine_from_config()\n',
  truncated: false,
};

export const symbolResponseExample = {
  id: EXAMPLE_SYMBOL_ID,
  fileId: EXAMPLE_FILE_ID,
  path: 'alembic/env.py',
  kind: 'FUNCTION',
  name: 'run_migrations_online',
  qualifiedName: 'alembic/env.py:run_migrations_online',
  startLine: 52,
  endLine: 71,
  loc: 20,
  complexity: 2,
  nesting: 0,
};

export const symbolListResponseExample = {
  items: [symbolResponseExample],
  pagination: paginationExample,
};

export const symbolDetailResponseExample = {
  ...symbolResponseExample,
  parentSymbolId: null,
  relations: [
    {
      type: 'CALLS',
      targetQualifiedName: 'engine_from_config',
      targetSymbolId: null,
      confidence: 0.45,
    },
  ],
};
