import { Inject, Injectable } from '@nestjs/common';
import { decryptSecret, encryptSecret, newSecretRef, processGithubSync } from '@code-archaeologist/core';
import { parseHttpsGitUrl } from '@code-archaeologist/git';
import {
  createGithubOAuthState,
  githubApiHeaders,
  githubOAuthConfigured,
  hashGithubPayload,
  newGithubWebhookSecret,
  readGithubOAuthState,
  verifyGithubWebhookSignature,
  type AppEnv,
} from '@code-archaeologist/shared';
import { AuditService } from '../audit/audit.service';
import { type RequestUser } from '../auth/auth.types';
import { ApiErrors } from '../common/api-exception';
import {
  paginationMeta,
  paginationSkip,
  resolvePagination,
} from '../common/pagination.dto';
import { APP_ENV } from '../config/env.service';
import { PrismaService } from '../database/prisma.service';
import {
  type ConnectGithubDto,
  type GithubAuthorizeResponseDto,
  type GithubIntegrationResponseDto,
  type GithubOAuthDto,
  type ThreadDetailResponseDto,
  type ThreadListQueryDto,
  type ThreadListResponseDto,
  type WebhookAckDto,
} from './dto/integration.dto';

type FetchLike = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

@Injectable()
export class IntegrationsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  async getGithub(workspaceId: string, requestOrigin?: string): Promise<GithubIntegrationResponseDto> {
    await this.requireWorkspace(workspaceId);
    return this.toGithubResponse(workspaceId, await this.findGithub(workspaceId), requestOrigin);
  }

  async connectWithToken(
    workspaceId: string,
    user: RequestUser,
    input: ConnectGithubDto,
    requestOrigin?: string,
    fetchImpl: FetchLike = globalThis.fetch,
  ): Promise<GithubIntegrationResponseDto> {
    await this.requireActiveWorkspace(workspaceId);
    const token = input.token.trim();
    const account = await this.fetchGithubUser(token, fetchImpl);
    const created = await this.persistGithub(workspaceId, {
      token,
      accountLogin: account.login,
      accountId: account.id,
    });
    await this.audit.record({
      workspaceId,
      userId: user.id,
      action: 'GITHUB_CONNECT',
      resource: `integration:${created.integration.id}`,
      metadata: { login: account.login, method: 'token' },
    });
    return this.toGithubResponse(workspaceId, created.integration, requestOrigin, created.webhookSecret);
  }

  authorizeUrl(workspaceId: string): GithubAuthorizeResponseDto {
    if (!githubOAuthConfigured(this.env)) {
      throw ApiErrors.badRequest('GITHUB_OAUTH_UNAVAILABLE', 'GitHub OAuth is not configured on this instance.');
    }
    const state = createGithubOAuthState(workspaceId, this.env.JWT_ACCESS_SECRET);
    const callback = this.oauthCallback();
    const url = new URL('https://github.com/login/oauth/authorize');
    url.searchParams.set('client_id', this.env.GITHUB_CLIENT_ID);
    url.searchParams.set('scope', 'repo read:user');
    url.searchParams.set('state', state);
    if (callback) {
      url.searchParams.set('redirect_uri', callback);
    }
    return { url: url.toString() };
  }

  async connectWithOAuth(
    workspaceIdFromPath: string,
    user: RequestUser,
    input: GithubOAuthDto,
    requestOrigin?: string,
    fetchImpl: FetchLike = globalThis.fetch,
  ): Promise<GithubIntegrationResponseDto> {
    if (!githubOAuthConfigured(this.env)) {
      throw ApiErrors.badRequest('GITHUB_OAUTH_UNAVAILABLE', 'GitHub OAuth is not configured on this instance.');
    }
    const workspaceId = readGithubOAuthState(input.state, this.env.JWT_ACCESS_SECRET);
    if (!workspaceId || workspaceId !== workspaceIdFromPath) {
      throw ApiErrors.badRequest('GITHUB_OAUTH_STATE', 'GitHub authorization expired. Start again.');
    }
    await this.requireActiveWorkspace(workspaceId);
    const token = await this.exchangeOAuthCode(input.code.trim(), fetchImpl);
    const account = await this.fetchGithubUser(token, fetchImpl);
    const created = await this.persistGithub(workspaceId, {
      token,
      accountLogin: account.login,
      accountId: account.id,
    });
    await this.audit.record({
      workspaceId,
      userId: user.id,
      action: 'GITHUB_CONNECT',
      resource: `integration:${created.integration.id}`,
      metadata: { login: account.login, method: 'oauth' },
    });
    return this.toGithubResponse(workspaceId, created.integration, requestOrigin, created.webhookSecret);
  }

  async requestSync(workspaceId: string, user: RequestUser, requestOrigin?: string): Promise<GithubIntegrationResponseDto> {
    const integration = await this.requireActiveGithub(workspaceId);
    const updated = await this.prisma.integration.update({
      where: { id: integration.id },
      data: { syncRequestedAt: new Date(), lastError: null },
    });
    await processGithubSync(
      { workspaceId, integrationId: updated.id },
      { prisma: this.prisma, env: this.env },
    );
    await this.audit.record({
      workspaceId,
      userId: user.id,
      action: 'GITHUB_SYNC',
      resource: `integration:${integration.id}`,
    });
    return this.getGithub(workspaceId, requestOrigin);
  }

  async disconnect(workspaceId: string, user: RequestUser): Promise<void> {
    const integration = await this.findGithub(workspaceId);
    if (!integration) {
      return;
    }
    await this.prisma.integration.update({
      where: { id: integration.id },
      data: {
        status: 'DISCONNECTED',
        encryptedPayload: encryptSecret(JSON.stringify({ token: '' }), this.env.CREDENTIALS_ENCRYPTION_KEY),
        webhookSecretEnc: null,
        lastError: null,
      },
    });
    await this.audit.record({
      workspaceId,
      userId: user.id,
      action: 'GITHUB_DISCONNECT',
      resource: `integration:${integration.id}`,
    });
  }

  async receiveWebhook(input: {
    workspaceId: string;
    deliveryId: string | undefined;
    event: string | undefined;
    signature: string | undefined;
    rawBody: Buffer;
  }): Promise<WebhookAckDto> {
    const integration = await this.findGithub(input.workspaceId);
    if (!integration || integration.status !== 'ACTIVE' || !integration.webhookSecretEnc) {
      throw ApiErrors.notFound('GITHUB_WEBHOOK', 'GitHub webhook is not configured');
    }
    const secret = decryptSecret(integration.webhookSecretEnc, this.env.CREDENTIALS_ENCRYPTION_KEY);
    if (!verifyGithubWebhookSignature({ payload: input.rawBody, signature: input.signature, secret })) {
      throw ApiErrors.unauthorized('Invalid GitHub webhook signature');
    }
    const deliveryId = (input.deliveryId || hashGithubPayload(input.rawBody)).slice(0, 120);
    const existing = await this.prisma.webhookEvent.findUnique({
      where: { integrationId_providerEventId: { integrationId: integration.id, providerEventId: deliveryId } },
    });
    if (existing) {
      return { status: 'duplicate' };
    }
    const payload = parseJson(input.rawBody);
    const eventType = (input.event || 'unknown').slice(0, 80);
    if (eventType === 'ping') {
      await this.prisma.webhookEvent.create({
        data: {
          integrationId: integration.id,
          providerEventId: deliveryId,
          type: 'ping',
          payloadHash: hashGithubPayload(input.rawBody),
          status: 'IGNORED',
          processedAt: new Date(),
        },
      });
      return { status: 'ignored' };
    }
    const hint = extractWebhookHint(payload);
    const repositoryId = hint.fullName
      ? await this.matchRepository(input.workspaceId, hint.fullName)
      : null;
    await this.prisma.webhookEvent.create({
      data: {
        integrationId: integration.id,
        providerEventId: deliveryId,
        type: eventType,
        action: hint.action,
        payloadHash: hashGithubPayload(input.rawBody),
        repositoryId,
        externalNumber: hint.number,
        status: 'RECEIVED',
      },
    });
    return { status: 'accepted' };
  }

  async listThreads(
    workspaceId: string,
    repositoryId: string,
    query: ThreadListQueryDto,
  ): Promise<ThreadListResponseDto> {
    await this.requireRepository(workspaceId, repositoryId);
    const { page, limit } = resolvePagination(query);
    const where = {
      repositoryId,
      ...(query.kind ? { kind: query.kind } : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.repositoryThread.count({ where }),
      this.prisma.repositoryThread.findMany({
        where,
        orderBy: [{ providerUpdatedAt: 'desc' }, { createdAt: 'desc' }],
        skip: paginationSkip(page, limit),
        take: limit,
        include: { _count: { select: { reviews: true, links: true } } },
      }),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        kind: row.kind,
        number: row.number,
        title: row.title,
        state: row.state,
        authorLogin: row.authorLogin,
        url: row.url,
        mergedAt: row.mergedAt,
        reviewCount: row._count.reviews,
        linkCount: row._count.links,
      })),
      pagination: paginationMeta(page, limit, total),
    };
  }

  async getThread(workspaceId: string, repositoryId: string, threadId: string): Promise<ThreadDetailResponseDto> {
    await this.requireRepository(workspaceId, repositoryId);
    const row = await this.prisma.repositoryThread.findFirst({
      where: { id: threadId, repositoryId },
      include: {
        links: { orderBy: { confidence: 'desc' }, take: 40 },
        commits: { select: { sha: true }, take: 40 },
        _count: { select: { reviews: true, links: true } },
      },
    });
    if (!row) {
      throw ApiErrors.notFound('THREAD_NOT_FOUND', 'Issue or pull request not found');
    }
    return {
      id: row.id,
      kind: row.kind,
      number: row.number,
      title: row.title,
      state: row.state,
      authorLogin: row.authorLogin,
      url: row.url,
      mergedAt: row.mergedAt,
      reviewCount: row._count.reviews,
      linkCount: row._count.links,
      body: row.body,
      commitShas: row.commits.map((commit) => commit.sha),
      links: row.links.map((link) => ({
        id: link.id,
        method: link.method,
        confidence: link.confidence,
        path: link.path,
        excerpt: link.excerpt,
        fileId: link.fileId,
        symbolId: link.symbolId,
        commitId: link.commitId,
      })),
    };
  }

  private async persistGithub(
    workspaceId: string,
    input: { token: string; accountLogin: string; accountId: string },
  ): Promise<{ integration: { id: string; status: string; accountLogin: string | null; lastSyncedAt: Date | null; lastError: string | null; webhookSecretEnc: string | null }; webhookSecret: string }> {
    const webhookSecret = newGithubWebhookSecret();
    const payload = encryptSecret(JSON.stringify({ token: input.token }), this.env.CREDENTIALS_ENCRYPTION_KEY);
    const webhookSecretEnc = encryptSecret(webhookSecret, this.env.CREDENTIALS_ENCRYPTION_KEY);
    const existing = await this.findGithub(workspaceId);
    const data = {
      status: 'ACTIVE' as const,
      accountLogin: input.accountLogin,
      accountId: input.accountId,
      encryptedPayload: payload,
      webhookSecretEnc,
      lastError: null,
      syncRequestedAt: new Date(),
    };
    const integration = existing
      ? await this.prisma.integration.update({ where: { id: existing.id }, data })
      : await this.prisma.integration.create({
          data: {
            workspaceId,
            provider: 'GITHUB',
            encryptedSecretRef: newSecretRef(),
            ...data,
          },
        });
    return { integration, webhookSecret };
  }

  private async fetchGithubUser(
    token: string,
    fetchImpl: FetchLike,
  ): Promise<{ login: string; id: string }> {
    const response = await fetchImpl('https://api.github.com/user', {
      headers: githubApiHeaders(token),
    });
    if (!response.ok) {
      throw ApiErrors.badRequest('GITHUB_TOKEN_INVALID', 'GitHub rejected that token.');
    }
    const body = (await response.json()) as { login?: string; id?: number };
    if (!body.login) {
      throw ApiErrors.badRequest('GITHUB_TOKEN_INVALID', 'GitHub rejected that token.');
    }
    return { login: body.login, id: String(body.id ?? body.login) };
  }

  private async exchangeOAuthCode(code: string, fetchImpl: FetchLike): Promise<string> {
    const response = await fetchImpl('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.env.GITHUB_CLIENT_ID,
        client_secret: this.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: this.oauthCallback() || undefined,
      }),
    });
    const body = (await response.json()) as { access_token?: string; error?: string };
    if (!response.ok || !body.access_token) {
      throw ApiErrors.badRequest('GITHUB_OAUTH_FAILED', 'GitHub did not return an access token.');
    }
    return body.access_token;
  }

  private oauthCallback(): string {
    return this.env.GITHUB_OAUTH_CALLBACK.trim();
  }

  private async toGithubResponse(
    workspaceId: string,
    integration: {
      status: string;
      accountLogin: string | null;
      lastSyncedAt: Date | null;
      lastError: string | null;
      webhookSecretEnc: string | null;
    } | null,
    requestOrigin?: string,
    webhookSecret: string | null = null,
  ): Promise<GithubIntegrationResponseDto> {
    return {
      provider: 'GITHUB',
      connected: integration?.status === 'ACTIVE',
      oauthAvailable: githubOAuthConfigured(this.env),
      accountLogin: integration?.status === 'ACTIVE' ? integration.accountLogin : null,
      lastSyncedAt: integration?.status === 'ACTIVE' ? integration.lastSyncedAt : null,
      lastError: integration?.status === 'ACTIVE' ? integration.lastError : null,
      webhookUrl: this.webhookUrl(workspaceId, requestOrigin),
      webhookConfigured: Boolean(integration?.status === 'ACTIVE' && integration.webhookSecretEnc),
      webhookSecret,
    };
  }

  private webhookUrl(workspaceId: string, requestOrigin?: string): string {
    const origin = (requestOrigin || this.env.WEB_ORIGIN.replace(':5173', ':3000')).replace(/\/$/, '');
    return `${origin}/api/v1/webhooks/github/${workspaceId}`;
  }

  private async findGithub(workspaceId: string) {
    return this.prisma.integration.findUnique({
      where: { workspaceId_provider: { workspaceId, provider: 'GITHUB' } },
    });
  }

  private async requireActiveGithub(workspaceId: string) {
    const integration = await this.findGithub(workspaceId);
    if (!integration || integration.status !== 'ACTIVE') {
      throw ApiErrors.badRequest('GITHUB_NOT_CONNECTED', 'Connect GitHub before syncing.');
    }
    return integration;
  }

  private async requireWorkspace(workspaceId: string) {
    const workspace = await this.prisma.workspace.findFirst({ where: { id: workspaceId, deletedAt: null } });
    if (!workspace) {
      throw ApiErrors.notFound('WORKSPACE_NOT_FOUND', 'Workspace not found');
    }
    return workspace;
  }

  private async requireActiveWorkspace(workspaceId: string) {
    const workspace = await this.requireWorkspace(workspaceId);
    if (workspace.status !== 'ACTIVE') {
      throw ApiErrors.forbidden('This workspace is archived');
    }
    return workspace;
  }

  private async requireRepository(workspaceId: string, repositoryId: string) {
    const repository = await this.prisma.repository.findFirst({
      where: { id: repositoryId, workspaceId, deletedAt: null },
    });
    if (!repository) {
      throw ApiErrors.notFound('REPOSITORY_NOT_FOUND', 'Repository not found');
    }
    return repository;
  }

  private async matchRepository(workspaceId: string, fullName: string): Promise<string | null> {
    const repositories = await this.prisma.repository.findMany({
      where: { workspaceId, provider: 'GITHUB', deletedAt: null },
      select: { id: true, url: true },
    });
    const match = repositories.find((repository) => {
      try {
        const parsed = parseHttpsGitUrl(repository.url);
        return `${parsed.owner}/${parsed.name}`.toLowerCase() === fullName.toLowerCase();
      } catch {
        return false;
      }
    });
    return match?.id ?? null;
  }
}

function parseJson(raw: Buffer): unknown {
  try {
    return JSON.parse(raw.toString('utf8'));
  } catch {
    return {};
  }
}

function extractWebhookHint(payload: unknown): { action: string | null; fullName: string | null; number: number | null } {
  const record = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const repository = record.repository && typeof record.repository === 'object' ? (record.repository as Record<string, unknown>) : {};
  const issue = record.issue && typeof record.issue === 'object' ? (record.issue as Record<string, unknown>) : {};
  const pull = record.pull_request && typeof record.pull_request === 'object' ? (record.pull_request as Record<string, unknown>) : {};
  const number =
    (typeof pull.number === 'number' && pull.number) ||
    (typeof issue.number === 'number' && issue.number) ||
    (typeof record.number === 'number' && record.number) ||
    null;
  return {
    action: typeof record.action === 'string' ? record.action.slice(0, 40) : null,
    fullName: typeof repository.full_name === 'string' ? repository.full_name : null,
    number,
  };
}
