import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  EVIDENCE_MAX_CONFIDENCE,
  evidenceConfidenceLabel,
  overlapLines,
  parseUnifiedHunks,
  scoreFileCommitLink,
  scoreSymbolCommitLink,
} from './evidence';

test('parseUnifiedHunks reads new-file line ranges', () => {
  const hunks = parseUnifiedHunks(
    [
      '@@ -10,2 +20,4 @@ class Cart',
      '+a',
      '@@ -40 +80,1 @@',
    ].join('\n'),
  );
  assert.deepEqual(hunks, [
    { startLine: 20, endLine: 23 },
    { startLine: 80, endLine: 80 },
  ]);
});

test('overlapLines counts intersecting symbol and hunk lines', () => {
  assert.equal(overlapLines({ startLine: 10, endLine: 20 }, [{ startLine: 18, endLine: 30 }]), 3);
  assert.equal(overlapLines({ startLine: 10, endLine: 12 }, [{ startLine: 40, endLine: 50 }]), 0);
});

test('line overlap is stronger than a bare file touch and never certain', () => {
  const overlap = scoreSymbolCommitLink({
    changeType: 'MODIFIED',
    symbol: { startLine: 10, endLine: 20 },
    hunks: [{ startLine: 10, endLine: 20 }],
  });
  const touch = scoreSymbolCommitLink({
    changeType: 'MODIFIED',
    symbol: { startLine: 10, endLine: 20 },
    hunks: [],
  });
  assert.equal(overlap.method, 'LINE_OVERLAP');
  assert.equal(touch.method, 'FILE_TOUCH');
  assert.ok(overlap.confidence > touch.confidence);
  assert.ok(overlap.confidence <= EVIDENCE_MAX_CONFIDENCE);
  assert.equal(evidenceConfidenceLabel(overlap.confidence), 'strong');
  assert.equal(evidenceConfidenceLabel(0.3), 'possible');
});

test('added files use a file-added heuristic, not certainty', () => {
  const link = scoreSymbolCommitLink({
    changeType: 'ADDED',
    symbol: { startLine: 1, endLine: 40 },
    hunks: [],
  });
  assert.equal(link.method, 'FILE_ADDED');
  assert.ok(link.confidence < 1);
  assert.equal(scoreFileCommitLink('ADDED').method, 'FILE_ADDED');
  assert.equal(scoreFileCommitLink('MODIFIED').method, 'FILE_TOUCH');
});
