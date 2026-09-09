import assert from 'node:assert/strict';
import { test } from 'node:test';
import { QUEUE_NAMES } from './queues';

test('queue names match the project scope', () => {
  assert.deepEqual(Object.values(QUEUE_NAMES).sort(), [
    'analysis-run',
    'ast-parse',
    'cleanup',
    'embedding',
    'git-history',
    'graph-build',
    'integration-sync',
    'metrics',
    'report-generation',
    'repository-sync',
    'risk',
  ]);
});
