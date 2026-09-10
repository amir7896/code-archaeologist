import assert from 'node:assert/strict';
import { test } from 'node:test';
import { repositoryHealthScore, summarizeLanguages } from './health';

test('health score is 100 for a quiet analyzed repository', () => {
  assert.equal(
    repositoryHealthScore({ fileCount: 100, highRiskCount: 0, averageComplexity: 0 }),
    100,
  );
});

test('health score falls as hotspots and complexity rise', () => {
  const quiet = repositoryHealthScore({ fileCount: 100, highRiskCount: 0, averageComplexity: 2 });
  const hot = repositoryHealthScore({ fileCount: 100, highRiskCount: 40, averageComplexity: 12 });
  assert.ok(quiet > hot);
  assert.ok(hot > 0);
  assert.ok(hot < 100);
});

test('health score is 0 when nothing has been indexed', () => {
  assert.equal(repositoryHealthScore({ fileCount: 0, highRiskCount: 0, averageComplexity: 0 }), 0);
});

test('summarizeLanguages keeps the top three and folds the rest into Other', () => {
  const shares = summarizeLanguages([
    { language: 'typescript', count: 78 },
    { language: 'javascript', count: 14 },
    { language: 'sql', count: 5 },
    { language: 'python', count: 2 },
    { language: 'unknown', count: 1 },
  ]);
  assert.equal(shares[0]?.language, 'typescript');
  assert.equal(shares[0]?.percent, 78);
  assert.equal(shares[3]?.language, 'other');
  assert.equal(
    shares.reduce((sum, row) => sum + row.percent, 0),
    100,
  );
});
