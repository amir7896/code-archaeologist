import assert from 'node:assert/strict';
import { test } from 'node:test';
import { redactSecrets, redactUnknown } from './redact';

test('redactSecrets strips bearer tokens and GitHub PATs', () => {
  assert.equal(redactSecrets('Authorization: Bearer abc.def.ghi'), 'Authorization: [redacted]');
  assert.match(redactSecrets('token ghp_abcdefghijklmnop'), /\[redacted\]/);
  assert.doesNotMatch(redactSecrets('clone failed for acme/platform'), /\[redacted\]/);
});

test('redactUnknown hides secret-shaped keys', () => {
  assert.deepEqual(
    redactUnknown({
      password: 'hunter2',
      refreshToken: 'abc',
      path: 'src/auth.ts',
    }),
    {
      password: '[redacted]',
      refreshToken: '[redacted]',
      path: 'src/auth.ts',
    },
  );
});
