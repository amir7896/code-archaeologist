import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import {
  buildCodeIndex,
  createGithubOAuthState,
  extractThreadMentions,
  hashGithubPayload,
  linkThreadToCode,
  mapPool,
  readGithubOAuthState,
  resolveIndexedFile,
  verifyGithubWebhookSignature,
} from './github';

test('verifies GitHub webhook signatures and rejects mismatches', () => {
  const payload = '{"action":"opened"}';
  const secret = 'hook-secret';
  const signature = `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;
  assert.equal(verifyGithubWebhookSignature({ payload, signature, secret }), true);
  assert.equal(verifyGithubWebhookSignature({ payload, signature: 'sha256=deadbeef', secret }), false);
  assert.equal(verifyGithubWebhookSignature({ payload, signature: undefined, secret }), false);
  assert.equal(hashGithubPayload(payload).length, 64);
});

test('signs and reads a short-lived OAuth state', () => {
  const state = createGithubOAuthState('ws-1', 'oauth-secret', 1_000);
  assert.equal(readGithubOAuthState(state, 'oauth-secret', 2_000), 'ws-1');
  assert.equal(readGithubOAuthState(state, 'wrong', 2_000), null);
  assert.equal(readGithubOAuthState(state, 'oauth-secret', 20 * 60 * 1000), null);
});

test('extracts path and symbol mentions from issue text', () => {
  const mentions = extractThreadMentions(
    'Fix UserService in apps/api/src/users/users.service.ts and also touch format.ts',
  );
  assert.ok(mentions.paths.includes('apps/api/src/users/users.service.ts'));
  assert.ok(mentions.paths.includes('format.ts'));
  assert.ok(mentions.symbols.includes('UserService'));
});

test('links pull-request files, review paths, and unique symbol mentions', () => {
  const index = buildCodeIndex(
    [
      { id: 'f1', path: 'apps/api/src/users/users.service.ts' },
      { id: 'f2', path: 'apps/web/src/lib/format.ts' },
    ],
    [{ id: 's1', name: 'UserService', fileId: 'f1', path: 'apps/api/src/users/users.service.ts' }],
  );
  assert.equal(resolveIndexedFile(index, 'users.service.ts')?.id, 'f1');
  const links = linkThreadToCode({
    index,
    title: 'Fix UserService timeout',
    body: 'See apps/api/src/users/users.service.ts',
    commitIds: new Map([['abc1234deadbeef', 'c1']]),
    filePaths: ['apps/api/src/users/users.service.ts'],
    reviewPaths: ['apps/web/src/lib/format.ts'],
  });
  assert.ok(links.some((link) => link.method === 'PR_COMMIT' && link.commitId === 'c1'));
  assert.ok(links.some((link) => link.method === 'PR_FILE' && link.fileId === 'f1'));
  assert.ok(links.some((link) => link.method === 'REVIEW_PATH' && link.fileId === 'f2'));
  assert.ok(links.some((link) => link.method === 'TEXT_SYMBOL' && link.symbolId === 's1'));
});

test('mapPool keeps input order', async () => {
  const values = await mapPool([1, 2, 3, 4], 2, async (value) => value * 2);
  assert.deepEqual(values, [2, 4, 6, 8]);
});
