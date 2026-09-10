import assert from 'node:assert/strict';
import { test } from 'node:test';
import { redactSecrets, redactUnknown } from './redact';

test('redacts tokens, JWTs, and password fields', () => {
  assert.equal(redactSecrets('Bearer abc.def'), '[redacted]');
  assert.match(redactSecrets('token ghp_abcdefghijklmnop'), /\[redacted\]/);
  assert.match(redactSecrets('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0In0.signaturexx'), /\[redacted\]/);
  assert.deepEqual(redactUnknown({ password: 'secret', email: 'a@b.c' }), {
    password: '[redacted]',
    email: 'a@b.c',
  });
});
