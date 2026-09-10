import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeBaseUrl, toQuery } from './query';

test('normalizes self-hosted API URLs onto /api/v1', () => {
  assert.equal(normalizeBaseUrl('http://localhost:3000'), 'http://localhost:3000/api/v1');
  assert.equal(normalizeBaseUrl('http://localhost:3000/'), 'http://localhost:3000/api/v1');
  assert.equal(normalizeBaseUrl('http://localhost:3000/api/v1'), 'http://localhost:3000/api/v1');
});

test('omits empty query values', () => {
  assert.equal(toQuery({ page: 2, q: undefined, limit: 20 }), '?page=2&limit=20');
});
