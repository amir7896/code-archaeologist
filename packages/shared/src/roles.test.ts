import assert from 'node:assert/strict';
import { test } from 'node:test';
import { roleAtLeast } from './roles';

test('owner satisfies every workspace role', () => {
  assert.equal(roleAtLeast('OWNER', 'VIEWER'), true);
  assert.equal(roleAtLeast('OWNER', 'ADMIN'), true);
  assert.equal(roleAtLeast('OWNER', 'OWNER'), true);
});

test('viewer cannot perform admin actions', () => {
  assert.equal(roleAtLeast('VIEWER', 'ADMIN'), false);
  assert.equal(roleAtLeast('ANALYST', 'ADMIN'), false);
  assert.equal(roleAtLeast('ADMIN', 'OWNER'), false);
});
