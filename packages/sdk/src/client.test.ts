import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createClient } from './client';
import { ApiError } from './errors';
import { iteratePages } from './pagination';
import { SDK_USER_AGENT } from './version';
import { verifyGithubWebhookSignature } from './webhooks';
import { createHmac } from 'node:crypto';

type MockCall = { url: string; init?: RequestInit };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('creates a versioned client and logs in without leaking the password in errors', async () => {
  const calls: MockCall[] = [];
  const client = createClient({
    baseUrl: 'http://127.0.0.1:3000',
    fetch: async (input, init) => {
      calls.push({ url: String(input), init });
      return jsonResponse(200, {
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
        tokenType: 'Bearer',
        expiresIn: 900,
        user: { id: 'u1', email: 'dev@example.com', name: 'Dev', status: 'ACTIVE', createdAt: '2026-01-01' },
      });
    },
  });

  const session = await client.auth.login({ email: 'dev@example.com', password: 'super-secret' });
  assert.equal(session.user.email, 'dev@example.com');
  assert.equal(client.getTokens().accessToken, 'access-1');
  assert.match(calls[0].url, /\/api\/v1\/auth\/login$/);
  assert.equal((calls[0].init?.headers as Headers).get('User-Agent'), SDK_USER_AGENT);
  assert.doesNotMatch(JSON.stringify(calls[0].init?.headers), /super-secret/);
});

test('refreshes once on 401 and retries the original request', async () => {
  let statusCalls = 0;
  const client = createClient({
    baseUrl: 'http://127.0.0.1:3000',
    accessToken: 'expired',
    refreshToken: 'refresh-1',
    fetch: async (input) => {
      const url = String(input);
      if (url.endsWith('/auth/refresh')) {
        return jsonResponse(200, { accessToken: 'access-2', refreshToken: 'refresh-2' });
      }
      statusCalls += 1;
      if (statusCalls === 1) {
        return jsonResponse(401, { code: 'AUTH_UNAUTHORIZED', message: 'Authentication required' });
      }
      return jsonResponse(200, { id: 'repo-1', status: 'READY', latestRun: null });
    },
  });

  const repo = await client.repositories.status('ws-1', 'repo-1');
  assert.equal(repo.id, 'repo-1');
  assert.equal(client.getTokens().accessToken, 'access-2');
});

test('maps API errors and supports pagination iteration', async () => {
  const client = createClient({
    baseUrl: 'http://127.0.0.1:3000',
    fetch: async (input) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith('/workspaces')) {
        const page = Number(url.searchParams.get('page') ?? '1');
        return jsonResponse(200, {
          items: [{ id: `ws-${page}`, name: `W${page}` }],
          pagination: { page, limit: 1, total: 2, totalPages: 2 },
        });
      }
      return jsonResponse(404, { code: 'WORKSPACE_NOT_FOUND', message: 'Workspace not found' });
    },
  });

  await assert.rejects(() => client.workspaces.get('missing'), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 404);
    assert.equal(error.code, 'WORKSPACE_NOT_FOUND');
    return true;
  });

  const ids: string[] = [];
  for await (const item of iteratePages((query) => client.workspaces.list(query), { limit: 1 })) {
    ids.push(item.id);
  }
  assert.deepEqual(ids, ['ws-1', 'ws-2']);
});

test('re-exports webhook signature verification', () => {
  const payload = '{"ok":true}';
  const secret = 'hook-secret';
  const signature = `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;
  assert.equal(verifyGithubWebhookSignature({ payload, signature, secret }), true);
});
