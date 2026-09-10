import { type CodeArchaeologistClient } from '@code-archaeologist/sdk';
import { APP_VERSION } from '@code-archaeologist/shared';
import { type FlagValue, flagBoolean, flagNumber, flagString } from './argv';
import { type ResolvedConfig, saveProjectConfig, saveUserConfig } from './config';
import { requireScope } from './context';
import { EXIT } from './exit';
import { readOriginUrl } from './git-remote';
import { formatList, progress, writeOk, type Io } from './output';

export type CommandInput = {
  io: Io;
  json: boolean;
  flags: Record<string, FlagValue>;
  positionals: string[];
  config: ResolvedConfig;
  client: CodeArchaeologistClient;
  cwd: string;
};

export async function runInit(input: CommandInput): Promise<number> {
  const email = flagString(input.flags, 'email') ?? input.config.email;
  const password = flagString(input.flags, 'password') ?? input.config.password;
  const name = flagString(input.flags, 'name');
  const token = flagString(input.flags, 'token');
  const workspaceName = flagString(input.flags, 'workspace-name');
  let workspaceId = flagString(input.flags, 'workspace') ?? input.config.workspaceId;
  let repositoryId = flagString(input.flags, 'repository') ?? input.config.repositoryId;
  const url = flagString(input.flags, 'url') ?? readOriginUrl(input.cwd);

  if (!input.config.accessToken) {
    if (!email || !password) {
      throw usage('init requires --email and --password, or CA_ACCESS_TOKEN');
    }
    if (flagBoolean(input.flags, 'register')) {
      if (!name) {
        throw usage('init --register requires --name');
      }
      progress(input.io, 'Creating account…');
      await input.client.auth.register({ email, password, name });
    } else {
      progress(input.io, 'Signing in…');
      await input.client.auth.login({ email, password });
    }
  }

  if (!workspaceId) {
    const listed = await input.client.workspaces.list({ limit: 100 });
    const match = workspaceName
      ? listed.items.find((item) => item.name === workspaceName || item.slug === workspaceName)
      : listed.items[0];
    if (match) {
      workspaceId = match.id;
    } else if (workspaceName) {
      progress(input.io, `Creating workspace ${workspaceName}…`);
      workspaceId = (await input.client.workspaces.create(workspaceName)).id;
    } else {
      throw usage('init needs --workspace, --workspace-name, or an existing workspace');
    }
  }

  if (!repositoryId) {
    if (!url) {
      throw usage('init needs --url or a git origin in this directory');
    }
    const listed = await input.client.repositories.list(workspaceId, { limit: 100 });
    const existing = listed.items.find((item) => normalizeUrl(item.url) === normalizeUrl(url));
    if (existing) {
      repositoryId = existing.id;
    } else {
      progress(input.io, `Connecting ${url}…`);
      const created = await input.client.repositories.create(workspaceId, {
        url,
        name: name ?? basenameFromUrl(url),
        credential: token ? { type: 'HTTPS_TOKEN', secret: token } : undefined,
      });
      repositoryId = created.id;
    }
  }

  saveUserConfig(input.config.userConfigPath, {
    apiUrl: input.config.apiUrl,
    workspaceId,
    repositoryId,
    ...input.client.getTokens(),
  });
  saveProjectConfig(input.config.projectConfigPath, {
    apiUrl: input.config.apiUrl,
    workspaceId,
    repositoryId,
  });

  writeOk(input.io, input.json, 'init', { workspaceId, repositoryId, apiUrl: input.config.apiUrl }, formatList([
    ['API', input.config.apiUrl],
    ['Workspace', workspaceId],
    ['Repository', repositoryId],
    ['Project config', input.config.projectConfigPath],
  ]));
  return EXIT.ok;
}

export async function runAnalyze(input: CommandInput): Promise<number> {
  const { workspaceId, repositoryId } = requireScope(input.config);
  progress(input.io, 'Queueing analysis…');
  let repository = await input.client.repositories.sync(workspaceId, repositoryId);
  if (!flagBoolean(input.flags, 'no-wait')) {
    const waited = await input.client.repositories.waitForAnalysis(workspaceId, repositoryId, {
      timeoutMs: (flagNumber(input.flags, 'timeout') ?? 600) * 1000,
      onProgress: (message) => progress(input.io, message),
    });
    repository = waited.repository;
    writeStatus(input, 'analyze', repository);
    return waited.failed ? EXIT.failed : EXIT.ok;
  }
  writeStatus(input, 'analyze', repository);
  return EXIT.ok;
}

export async function runStatus(input: CommandInput): Promise<number> {
  const { workspaceId, repositoryId } = requireScope(input.config);
  const repository = await input.client.repositories.status(workspaceId, repositoryId);
  writeStatus(input, 'status', repository);
  return repository.status === 'FAILED' || repository.latestRun?.status === 'FAILED'
    ? EXIT.failed
    : EXIT.ok;
}

export async function runAsk(input: CommandInput): Promise<number> {
  const { workspaceId, repositoryId } = requireScope(input.config);
  const question = input.positionals.join(' ').trim();
  if (question.length < 8) {
    throw usage('ask requires a question of at least 8 characters');
  }
  const filePath = flagString(input.flags, 'file');
  const fileId = filePath
    ? (await input.client.repositories.findFile(workspaceId, repositoryId, filePath))?.id
    : undefined;
  if (filePath && !fileId) {
    throw notFound(`Indexed file not found: ${filePath}`);
  }
  progress(input.io, 'Asking…');
  let investigation = await input.client.investigations.create(workspaceId, repositoryId, {
    question,
    fileId,
  });
  if (!flagBoolean(input.flags, 'no-wait')) {
    const waited = await input.client.investigations.wait(workspaceId, repositoryId, investigation.id, {
      timeoutMs: (flagNumber(input.flags, 'timeout') ?? 180) * 1000,
      onProgress: (message) => progress(input.io, message),
    });
    investigation = waited.investigation;
    writeInvestigation(input, investigation);
    return waited.failed ? EXIT.failed : EXIT.ok;
  }
  writeInvestigation(input, investigation);
  return EXIT.ok;
}

export async function runImpact(input: CommandInput): Promise<number> {
  const { workspaceId, repositoryId } = requireScope(input.config);
  const path = input.positionals[0];
  if (!path) {
    throw usage('impact requires a file path');
  }
  const file = await input.client.repositories.findFile(workspaceId, repositoryId, path);
  if (!file) {
    throw notFound(`Indexed file not found: ${path}`);
  }
  const report = await input.client.impact.get(workspaceId, repositoryId, {
    fileId: file.id,
    depth: flagNumber(input.flags, 'depth') ?? 2,
  });
  writeOk(
    input.io,
    input.json,
    'impact',
    report,
    formatList([
      ['File', report.origin.path],
      ['Risk', `${report.origin.riskLevel} (${report.origin.riskScore})`],
      ['Affected files', String(report.stats.affectedFileCount)],
      ['Consumers', String(report.stats.consumerCount)],
      ['Dependencies', String(report.stats.dependencyCount)],
      ['Tests', String(report.stats.testCount)],
    ]),
  );
  return EXIT.ok;
}

export async function runHotspots(input: CommandInput): Promise<number> {
  const { workspaceId, repositoryId } = requireScope(input.config);
  const result = await input.client.insights.hotspots(workspaceId, repositoryId, flagNumber(input.flags, 'limit') ?? 20);
  const text =
    result.items.length === 0
      ? 'No hotspots yet. Analyze the repository first.'
      : result.items
          .map((item) => `${item.level.padEnd(8)} ${item.score.toFixed(1).padStart(5)}  ${item.path ?? item.name}`)
          .join('\n');
  writeOk(input.io, input.json, 'hotspots', result, text);
  return EXIT.ok;
}

export async function runReport(input: CommandInput): Promise<number> {
  const { workspaceId, repositoryId } = requireScope(input.config);
  const [repository, health, hotspots] = await Promise.all([
    input.client.repositories.status(workspaceId, repositoryId),
    input.client.insights.health(workspaceId, repositoryId),
    input.client.insights.hotspots(workspaceId, repositoryId, 10),
  ]);
  const data = {
    generatedAt: new Date().toISOString(),
    repository: {
      id: repository.id,
      name: repository.name,
      status: repository.status,
      revision: repository.currentRevision,
      lastError: repository.lastError,
      healthScore: repository.healthScore ?? null,
      languages: repository.languages ?? [],
    },
    health,
    hotspots: hotspots.items,
  };
  const json = input.json || !flagString(input.flags, 'format') || flagString(input.flags, 'format') === 'json';
  writeOk(
    input.io,
    json,
    'report',
    data,
    formatList([
      ['Repository', repository.name],
      ['Status', repository.status],
      ['Files', String(health.fileCount)],
      ['Hotspots', String(health.hotspotCount)],
      ['High risk', String(health.highRiskCount)],
    ]),
  );
  return repository.status === 'FAILED' ? EXIT.failed : EXIT.ok;
}

export async function runDoctor(input: CommandInput): Promise<number> {
  const checks: Array<{ name: string; ok: boolean; detail: string }> = [
    { name: 'node', ok: Number(process.versions.node.split('.')[0]) >= 20, detail: process.versions.node },
    {
      name: 'config',
      ok: true,
      detail: [
        input.config.accessToken ? 'tokens=set' : 'tokens=missing',
        input.config.workspaceId ? 'workspace=set' : 'workspace=missing',
        input.config.repositoryId ? 'repository=set' : 'repository=missing',
      ].join(' '),
    },
  ];

  try {
    const live = await input.client.health.live();
    checks.push({ name: 'api', ok: live.status === 'ok', detail: `${live.service} ${live.version || APP_VERSION}` });
  } catch (error) {
    checks.push({ name: 'api', ok: false, detail: error instanceof Error ? error.message : 'unreachable' });
  }

  try {
    const ready = await input.client.health.ready();
    checks.push({
      name: 'ready',
      ok: ready.status === 'ok',
      detail: `postgres=${ready.checks?.postgres ?? '?'} redis=${ready.checks?.redis ?? '?'}`,
    });
  } catch (error) {
    checks.push({ name: 'ready', ok: false, detail: error instanceof Error ? error.message : 'degraded' });
  }

  if (input.config.accessToken) {
    try {
      const user = await input.client.auth.me();
      checks.push({ name: 'auth', ok: true, detail: user.email });
    } catch (error) {
      checks.push({ name: 'auth', ok: false, detail: error instanceof Error ? error.message : 'invalid' });
    }
  }

  if (input.config.workspaceId && input.config.repositoryId) {
    try {
      const ai = await input.client.insights.ai(input.config.workspaceId, input.config.repositoryId);
      checks.push({
        name: 'ai',
        ok: true,
        detail: `${ai.provider} ${ai.model} ${ai.available ? 'available' : 'optional'}`,
      });
    } catch (error) {
      checks.push({ name: 'ai', ok: false, detail: error instanceof Error ? error.message : 'unavailable' });
    }
  }

  const failed = checks.filter((item) => !item.ok);
  writeOk(
    input.io,
    input.json,
    'doctor',
    { checks },
    checks.map((item) => `${item.ok ? 'ok   ' : 'fail '} ${item.name.padEnd(8)} ${item.detail}`).join('\n'),
  );
  if (failed.some((item) => item.name === 'auth')) {
    return EXIT.auth;
  }
  if (failed.some((item) => item.name === 'ready')) {
    return EXIT.failed;
  }
  return failed.length > 0 ? EXIT.error : EXIT.ok;
}

function writeStatus(
  input: CommandInput,
  command: string,
  repository: Awaited<ReturnType<CodeArchaeologistClient['repositories']['status']>>,
): void {
  const run = repository.latestRun;
  writeOk(
    input.io,
    input.json,
    command,
    repository,
    formatList([
      ['Repository', repository.name],
      ['Status', repository.status],
      ['Revision', repository.currentRevision ?? '—'],
      ['Run', run ? `${run.status} ${run.progress}%` : 'none'],
      ['Error', repository.lastError ?? run?.error ?? '—'],
    ]),
  );
}

function writeInvestigation(
  input: CommandInput,
  investigation: Awaited<ReturnType<CodeArchaeologistClient['investigations']['get']>>,
): void {
  const answer = investigation.messages?.find((item) => item.role === 'ASSISTANT')?.content ?? investigation.status;
  const citations = (investigation.evidence ?? []).map((item) => `- ${item.citation}`).join('\n');
  writeOk(
    input.io,
    input.json,
    'ask',
    investigation,
    `${answer}\n\nConfidence: ${investigation.confidenceLabel ?? '—'}\n${citations}`.trim(),
  );
}

function normalizeUrl(url: string): string {
  return url.replace(/\.git$/i, '').replace(/\/+$/, '').toLowerCase();
}

function basenameFromUrl(url: string): string {
  const parts = url.replace(/\.git$/i, '').split('/').filter(Boolean);
  return parts[parts.length - 1] ?? 'repository';
}

function usage(message: string): Error {
  return Object.assign(new Error(message), { exitCode: EXIT.usage, code: 'USAGE' });
}

function notFound(message: string): Error {
  return Object.assign(new Error(message), { exitCode: EXIT.notFound, code: 'NOT_FOUND' });
}
