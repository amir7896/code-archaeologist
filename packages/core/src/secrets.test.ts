import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decryptSecret, encryptSecret, newSecretRef } from './secrets';

test('encryptSecret round-trips a credential payload', () => {
  const secret = 'local-dev-credentials-secret-change-me-32';
  const payload = encryptSecret(JSON.stringify({ username: 'git', secret: 'token-value' }), secret);
  const decoded = JSON.parse(decryptSecret(payload, secret)) as { username: string; secret: string };
  assert.equal(decoded.username, 'git');
  assert.equal(decoded.secret, 'token-value');
  assert.notEqual(payload.includes('token-value'), true);
});

test('newSecretRef is unique and not the ciphertext', () => {
  assert.notEqual(newSecretRef(), newSecretRef());
  assert.match(newSecretRef(), /^scr_[a-f0-9]{32}$/);
});
