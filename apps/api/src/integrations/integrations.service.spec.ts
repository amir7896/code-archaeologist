import { IntegrationsService } from './integrations.service';

describe('IntegrationsService', () => {
  const env = {
    CREDENTIALS_ENCRYPTION_KEY: 'local-dev-credentials-secret-change-me-32',
    JWT_ACCESS_SECRET: 'local-dev-access-secret-change-me-32',
    WEB_ORIGIN: 'http://localhost:5173',
    GITHUB_CLIENT_ID: '',
    GITHUB_CLIENT_SECRET: '',
    GITHUB_OAUTH_CALLBACK: '',
  };

  it('stores a GitHub token after the user endpoint succeeds', async () => {
    const created: unknown[] = [];
    const prisma = {
      workspace: { findFirst: jest.fn().mockResolvedValue({ id: 'ws-1', status: 'ACTIVE' }) },
      integration: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(async ({ data }: { data: unknown }) => {
          created.push(data);
          return { id: 'int-1', status: 'ACTIVE', accountLogin: 'octocat', lastSyncedAt: null, lastError: null, webhookSecretEnc: 'enc' };
        }),
      },
    };
    const audit = { record: jest.fn() };
    const service = new IntegrationsService(prisma as never, audit as never, env as never);
    const result = await service.connectWithToken(
      'ws-1',
      { id: 'user-1' } as never,
      { token: 'ghp_exampletoken' },
      'http://localhost:3000',
      jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ login: 'octocat', id: 1 }),
      }),
    );
    expect(result.connected).toBe(true);
    expect(result.accountLogin).toBe('octocat');
    expect(result.webhookSecret).toMatch(/^whsec_/);
    expect(result.webhookUrl).toContain('/api/v1/webhooks/github/ws-1');
    expect(prisma.integration.create).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'GITHUB_CONNECT' }));
  });

  it('rejects an invalid GitHub token', async () => {
    const prisma = {
      workspace: { findFirst: jest.fn().mockResolvedValue({ id: 'ws-1', status: 'ACTIVE' }) },
    };
    const service = new IntegrationsService(prisma as never, { record: jest.fn() } as never, env as never);
    await expect(
      service.connectWithToken(
        'ws-1',
        { id: 'user-1' } as never,
        { token: 'ghp_badtoken' },
        undefined,
        jest.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }),
      ),
    ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'GITHUB_TOKEN_INVALID' }) });
  });

  it('accepts a signed webhook once and then reports a duplicate', async () => {
    const { encryptSecret } = await import('@code-archaeologist/core');
    const { createHmac } = await import('node:crypto');
    const secret = 'hook-secret';
    const rawBody = Buffer.from('{"action":"opened","number":2,"repository":{"full_name":"acme/platform"}}');
    const signature = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
    const prisma = {
      integration: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({
            id: 'int-1',
            status: 'ACTIVE',
            webhookSecretEnc: encryptSecret(secret, env.CREDENTIALS_ENCRYPTION_KEY),
          })
          .mockResolvedValueOnce({
            id: 'int-1',
            status: 'ACTIVE',
            webhookSecretEnc: encryptSecret(secret, env.CREDENTIALS_ENCRYPTION_KEY),
          }),
      },
      webhookEvent: {
        findUnique: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'evt-1' }),
        create: jest.fn(),
      },
      repository: {
        findMany: jest.fn().mockResolvedValue([{ id: 'repo-1', url: 'https://github.com/acme/platform.git' }]),
      },
    };
    const service = new IntegrationsService(prisma as never, { record: jest.fn() } as never, env as never);
    const first = await service.receiveWebhook({
      workspaceId: 'ws-1',
      deliveryId: 'del-1',
      event: 'pull_request',
      signature,
      rawBody,
    });
    expect(first.status).toBe('accepted');
    expect(prisma.webhookEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          repositoryId: 'repo-1',
          externalNumber: 2,
          status: 'RECEIVED',
        }),
      }),
    );
    const second = await service.receiveWebhook({
      workspaceId: 'ws-1',
      deliveryId: 'del-1',
      event: 'pull_request',
      signature,
      rawBody,
    });
    expect(second.status).toBe('duplicate');
  });
});
