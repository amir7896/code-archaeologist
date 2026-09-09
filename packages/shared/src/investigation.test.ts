import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  INVESTIGATION_MAX_CONFIDENCE,
  buildDeterministicAnswer,
  classifyInvestigationIntent,
  extractInvestigationTokens,
  numberInvestigationFacts,
  scoreInvestigationConfidence,
  validateCitedAnswer,
} from './investigation';

test('classifies the supported question families', () => {
  assert.equal(classifyInvestigationIntent('What depends on cart_service?'), 'depends_on');
  assert.equal(classifyInvestigationIntent('What happens if I change users.py?'), 'impact');
  assert.equal(classifyInvestigationIntent('Which modules are risky?'), 'risk');
  assert.equal(classifyInvestigationIntent('Who introduced add_item?'), 'who_introduced');
  assert.equal(classifyInvestigationIntent('When did auth change?'), 'when_changed');
  assert.equal(classifyInvestigationIntent('Why does this function exist?'), 'why_exists');
  assert.equal(classifyInvestigationIntent('How has payments evolved?'), 'evolution');
  assert.equal(
    classifyInvestigationIntent('can you tell me about the repository which i cloned and used here?'),
    'overview',
  );
});

test('extracts path and identifier tokens and drops filler words', () => {
  const tokens = extractInvestigationTokens('What depends on app/services/cart_service.py add_item?');
  assert.ok(tokens.includes('app/services/cart_service.py'));
  assert.ok(tokens.includes('add_item'));
  assert.ok(!tokens.includes('what'));
});

test('ranks subject tokens ahead of authorship filler', () => {
  const tokens = extractInvestigationTokens('Who introduced Stripe payments?');
  assert.ok(tokens.includes('stripe'));
  assert.ok(tokens.includes('payments'));
  assert.ok(!tokens.includes('introduced'));
  assert.ok(!tokens.includes('who'));
  assert.equal(tokens[0], 'payments');
});

test('deterministic answers cite retrieved facts and never claim certainty', () => {
  const facts = numberInvestigationFacts([
    {
      sourceType: 'FILE',
      sourceId: 'f1',
      citation: 'cart_service.py',
      excerpt: 'Indexed file in app/services',
      relevance: 0.9,
      path: 'app/services/cart_service.py',
    },
  ]);
  const result = buildDeterministicAnswer({
    question: 'Why does this file exist?',
    intent: 'why_exists',
    facts,
    usedModel: false,
  });
  assert.match(result.answer, /\[1\]/);
  assert.ok(result.confidence < 1);
  assert.ok(result.confidence <= INVESTIGATION_MAX_CONFIDENCE);
});

test('citation validation drops invented numbers and keeps real ones', () => {
  const checked = validateCitedAnswer('Auth changed in 2024 [1] and also [99].', 2);
  assert.deepEqual(checked.cited, [1]);
  assert.equal(checked.invented, true);
  assert.match(checked.answer, /removed/);
  assert.doesNotMatch(checked.answer, /\[99\]/);
});

test('confidence stays below certainty and falls when citations are invented', () => {
  const honest = scoreInvestigationConfidence({
    factCount: 4,
    citedCount: 3,
    usedModel: true,
    invented: false,
  });
  const invented = scoreInvestigationConfidence({
    factCount: 4,
    citedCount: 3,
    usedModel: true,
    invented: true,
  });
  assert.ok(honest > invented);
  assert.ok(honest < 1);
});
