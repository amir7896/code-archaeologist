import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { type CodeArchaeologistClient } from '@code-archaeologist/sdk';
import { EXIT } from './exit';
import { runCli } from './run';

function memoryIo() {
  let stdout = '';
  let stderr = '';
  return {
    stdout: { write: (chunk: string) => { stdout += chunk; } },
    stderr: { write: (chunk: string) => { stderr += chunk; } },
    read: () => ({ stdout, stderr }),
  };
}

function mockClient(): CodeArchaeologistClient {
  return {
    baseUrl: 'http://127.0.0.1:3000/api/v1',
    apiPrefix: 'api/v1',
    setTokens: () => undefined,
    getTokens: () => ({ accessToken: 'access', refreshToken: 'refresh' }),
    request: async () => {
      throw new Error('unused');
    },
    auth: {
      login: async () => ({
        accessToken: 'access',
        refreshToken: 'refresh',
        user: { id: 'u1', email: 'dev@example.com', name: 'Dev', status: 'ACTIVE', createdAt: '' },
      }),
      register: async () => {
        throw new Error('unused');
      },
      refresh: async () => ({ accessToken: 'access', refreshToken: 'refresh' }),
      logout: async () => ({ status: 'ok' }),
      me: async () => ({ id: 'u1', email: 'dev@example.com', name: 'Dev', status: 'ACTIVE', createdAt: '' }),
    },
    workspaces: {
      list: async () => ({ items: [{ id: 'ws-1', name: 'Demo', slug: 'demo', ownerId: 'u1', status: 'ACTIVE', role: 'OWNER', createdAt: '', updatedAt: '' }], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } }),
      create: async () => ({ id: 'ws-1', name: 'Demo', slug: 'demo', ownerId: 'u1', status: 'ACTIVE', role: 'OWNER', createdAt: '', updatedAt: '' }),
      get: async () => ({ id: 'ws-1', name: 'Demo', slug: 'demo', ownerId: 'u1', status: 'ACTIVE', role: 'OWNER', createdAt: '', updatedAt: '' }),
      iterate: async function* () {},
    },
    repositories: {
      list: async () => ({ items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } }),
      create: async () => ({
        id: 'repo-1',
        workspaceId: 'ws-1',
        name: 'repo',
        url: 'https://github.com/org/repo.git',
        provider: 'GITHUB',
        defaultBranch: 'main',
        currentRevision: null,
        status: 'PENDING',
        hasCredential: false,
        lastError: null,
        lastSyncedAt: null,
        createdAt: '',
        updatedAt: '',
        latestRun: null,
      }),
      get: async () => {
        throw new Error('unused');
      },
      status: async () => ({
        id: 'repo-1',
        workspaceId: 'ws-1',
        name: 'repo',
        url: 'https://github.com/org/repo.git',
        provider: 'GITHUB',
        defaultBranch: 'main',
        currentRevision: 'abc',
        status: 'READY',
        hasCredential: false,
        lastError: null,
        lastSyncedAt: null,
        createdAt: '',
        updatedAt: '',
        latestRun: { id: 'run-1', revision: 'abc', type: 'INGESTION', status: 'SUCCEEDED', progress: 100, error: null, createdAt: '', tasks: [] },
      }),
      sync: async () => {
        throw new Error('unused');
      },
      iterate: async function* () {},
      files: async () => ({ items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } }),
      findFile: async () => null,
      waitForAnalysis: async () => {
        throw new Error('unused');
      },
    },
    investigations: {
      create: async () => {
        throw new Error('unused');
      },
      get: async () => {
        throw new Error('unused');
      },
      list: async () => ({ items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } }),
      wait: async () => {
        throw new Error('unused');
      },
    },
    insights: {
      hotspots: async () => ({ items: [] }),
      health: async () => ({ revision: 'abc', fileCount: 10, hotspotCount: 1, highRiskCount: 0, averageComplexity: 2 }),
      ai: async () => ({ provider: 'ollama', model: 'llama3.1:8b', available: false }),
    },
    impact: {
      get: async () => {
        throw new Error('unused');
      },
    },
    health: {
      live: async () => ({ status: 'ok', service: 'api', version: '0.1.0' }),
      ready: async () => ({ status: 'ok', service: 'api', version: '0.1.0', checks: { postgres: true, redis: true } }),
    },
  };
}

test('prints help and rejects unknown commands', async () => {
  const help = memoryIo();
  assert.equal(await runCli({ argv: [], io: help }), EXIT.ok);
  assert.match(help.read().stdout, /code-archaeologist/);

  const unknown = memoryIo();
  assert.equal(await runCli({ argv: ['wat'], io: unknown }), EXIT.usage);
  assert.match(unknown.read().stderr, /Unknown command/);
});

test('doctor and status use JSON exit codes for CI', async () => {
  const cwd = mkdtempSync(join(tmpdir(), 'ca-cli-'));
  const env = { CA_CONFIG: join(cwd, 'user.json'), CA_ACCESS_TOKEN: 'access', CA_WORKSPACE_ID: 'ws-1', CA_REPOSITORY_ID: 'repo-1' };
  const doctor = memoryIo();
  const doctorCode = await runCli({
    argv: ['doctor', '--json'],
    env,
    cwd,
    io: doctor,
    createClient: () => mockClient(),
  });
  assert.equal(doctorCode, EXIT.ok);
  assert.match(doctor.read().stdout, /"ok":true/);

  const status = memoryIo();
  const statusCode = await runCli({
    argv: ['status', '--json'],
    env,
    cwd,
    io: status,
    createClient: () => mockClient(),
  });
  assert.equal(statusCode, EXIT.ok);
  assert.match(status.read().stdout, /"READY"/);
});

test('impact exits 5 when the file is not indexed', async () => {
  const cwd = mkdtempSync(join(tmpdir(), 'ca-cli-'));
  const io = memoryIo();
  const code = await runCli({
    argv: ['impact', 'src/missing.ts'],
    env: { CA_CONFIG: join(cwd, 'user.json'), CA_ACCESS_TOKEN: 'access', CA_WORKSPACE_ID: 'ws-1', CA_REPOSITORY_ID: 'repo-1' },
    cwd,
    io,
    createClient: () => mockClient(),
  });
  assert.equal(code, EXIT.notFound);
});
