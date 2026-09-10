import { EXAMPLE_WORKSPACE_ID } from '../../common/swagger/example-ids';

export const githubIntegrationExample = {
  provider: 'GITHUB',
  connected: true,
  oauthAvailable: false,
  accountLogin: 'octocat',
  lastSyncedAt: '2026-09-10T12:00:00.000Z',
  lastError: null,
  webhookUrl: `http://localhost:3000/api/v1/webhooks/github/${EXAMPLE_WORKSPACE_ID}`,
  webhookConfigured: true,
  webhookSecret: null,
};

export const connectGithubRequestExample = {
  token: 'ghp_exampletoken',
};

export const githubAuthorizeExample = {
  url: 'https://github.com/login/oauth/authorize?client_id=Iv1&state=abc',
};

export const threadListExample = {
  items: [
    {
      id: '11111111-1111-1111-1111-111111111111',
      kind: 'PULL_REQUEST',
      number: 12,
      title: 'Fix UserService timeout',
      state: 'merged',
      authorLogin: 'ada',
      url: 'https://github.com/acme/platform/pull/12',
      mergedAt: '2026-09-10T12:00:00.000Z',
      reviewCount: 2,
      linkCount: 3,
    },
  ],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
};
