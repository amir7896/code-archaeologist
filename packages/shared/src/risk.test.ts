import assert from 'node:assert/strict';
import { test } from 'node:test';
import { couplingLabel, hotspotScore, riskLevel, scoreRisk } from './risk';

test('a quiet isolated file stays low risk', () => {
  const result = scoreRisk({
    fanIn: 0,
    fanOut: 0,
    changeCount: 1,
    complexity: 1,
    maxAuthorShare: 1,
    daysSinceChange: 200,
  });
  assert.equal(result.level, 'LOW');
  assert.ok(result.score < 25);
  assert.equal(result.factors.length, 6);
});

test('high churn, complexity, and consumers raise the score', () => {
  const result = scoreRisk({
    fanIn: 20,
    fanOut: 15,
    changeCount: 30,
    complexity: 25,
    maxAuthorShare: 1,
    daysSinceChange: 3,
  });
  assert.equal(result.level, 'CRITICAL');
  assert.ok(result.score >= 75);
});

test('labels stay deterministic', () => {
  assert.equal(couplingLabel(1, 1), 'low');
  assert.equal(couplingLabel(4, 2), 'medium');
  assert.equal(couplingLabel(8, 8), 'high');
  assert.equal(riskLevel(24), 'LOW');
  assert.equal(riskLevel(49), 'MEDIUM');
  assert.equal(riskLevel(74), 'HIGH');
  assert.equal(hotspotScore({ changeCount: 4, complexity: 2, fanIn: 1 }), 24);
});
