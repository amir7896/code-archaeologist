import { type PrismaClient } from '@code-archaeologist/core';
import {
  OllamaProvider,
  INVESTIGATION_SYSTEM_PROMPT,
  buildInvestigationUserPrompt,
  type LlmProvider,
} from '@code-archaeologist/ai';
import {
  INVESTIGATION_LIMITATIONS,
  buildDeterministicAnswer,
  buildInvestigationContext,
  classifyInvestigationIntent,
  extractInvestigationTokens,
  investigationConfidenceLabel,
  numberInvestigationFacts,
  scoreInvestigationConfidence,
  validateCitedAnswer,
  walkNeighbors,
  type AppEnv,
  type InvestigationFact,
  type InvestigationIntent,
} from '@code-archaeologist/shared';

type LoggerLike = {
  log(message: string): void;
  warn(message: string): void;
};

export async function processInvestigation(
  investigationId: string,
  deps: {
    prisma: PrismaClient;
    env: AppEnv;
    llm?: LlmProvider;
    logger?: LoggerLike;
  },
): Promise<void> {
  const { prisma, env } = deps;
  const investigation = await prisma.investigation.findUnique({
    where: { id: investigationId },
    include: { repository: { select: { id: true, deletedAt: true, workspaceId: true } } },
  });
  if (!investigation || investigation.repository.deletedAt || investigation.status === 'SUCCEEDED') {
    return;
  }

  await prisma.investigation.update({
    where: { id: investigation.id },
    data: { status: 'RUNNING', error: null },
  });

  try {
    const intent = classifyInvestigationIntent(investigation.question);
    const tokens = extractInvestigationTokens(investigation.question);
    const facts = await collectFacts(prisma, {
      repositoryId: investigation.repositoryId,
      intent,
      tokens,
      fileId: investigation.subjectFileId,
      symbolId: investigation.subjectSymbolId,
    });
    const numbered = numberInvestigationFacts(facts);
    const llm = deps.llm ?? new OllamaProvider(env.OLLAMA_BASE_URL);
    const health = await llm.health();
    let usedModel = false;
    let answer = buildDeterministicAnswer({
      question: investigation.question,
      intent,
      facts: numbered,
      usedModel: false,
    }).answer;
    let promptTokens: number | undefined;
    let completionTokens: number | undefined;
    let invented = false;
    let cited = numbered.map((fact) => fact.index);

    if (health.ok && numbered.length > 0) {
      try {
        const generated = await llm.chat({
          model: env.OLLAMA_MODEL,
          temperature: 0.1,
          messages: [
            { role: 'system', content: INVESTIGATION_SYSTEM_PROMPT },
            {
              role: 'user',
              content: buildInvestigationUserPrompt({
                question: investigation.question,
                context: buildInvestigationContext(numbered),
              }),
            },
          ],
        });
        if (generated.content.trim()) {
          const checked = validateCitedAnswer(generated.content, numbered.length);
          answer = `${checked.answer}\n\n${INVESTIGATION_LIMITATIONS}`;
          cited = checked.cited;
          invented = checked.invented;
          usedModel = true;
          promptTokens = generated.promptTokens;
          completionTokens = generated.completionTokens;
        }
      } catch (error) {
        deps.logger?.warn(
          `Local model failed for investigation ${investigation.id}: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
      }
    }

    const confidence = scoreInvestigationConfidence({
      factCount: numbered.length,
      citedCount: cited.length,
      usedModel,
      invented,
    });

    await prisma.investigationEvidence.deleteMany({ where: { investigationId: investigation.id } });
    await prisma.investigationMessage.deleteMany({ where: { investigationId: investigation.id } });
    if (numbered.length > 0) {
      await prisma.investigationEvidence.createMany({
        data: numbered.map((fact) => ({
          investigationId: investigation.id,
          sourceType: fact.sourceType,
          sourceId: fact.sourceId,
          excerpt: fact.excerpt,
          relevance: fact.relevance,
          citation: `[${fact.index}] ${fact.citation}`,
          fileId: fact.fileId ?? null,
          symbolId: fact.symbolId ?? null,
          commitSha: fact.commitSha ?? null,
          path: fact.path ?? null,
        })),
      });
    }
    await prisma.investigationMessage.createMany({
      data: [
        { investigationId: investigation.id, role: 'user', content: investigation.question },
        {
          investigationId: investigation.id,
          role: 'assistant',
          content: answer,
          promptTokens,
          completionTokens,
        },
      ],
    });
    await prisma.investigation.update({
      where: { id: investigation.id },
      data: {
        status: 'SUCCEEDED',
        usedModel,
        confidence,
        model: usedModel ? env.OLLAMA_MODEL : 'evidence',
        error: null,
      },
    });
    deps.logger?.log(
      `Investigation ${investigation.id} finished (${investigationConfidenceLabel(confidence)})`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Investigation failed';
    await prisma.investigation.update({
      where: { id: investigation.id },
      data: { status: 'FAILED', error: message },
    });
  }
}

async function collectFacts(
  prisma: PrismaClient,
  input: {
    repositoryId: string;
    intent: InvestigationIntent;
    tokens: string[];
    fileId: string | null;
    symbolId: string | null;
  },
): Promise<InvestigationFact[]> {
  const facts: InvestigationFact[] = [];
  const tokens = input.tokens.slice(0, 4);
  const wantsOverview = input.intent === 'overview' || input.intent === 'general';
  const [files, symbols, commits, risks] = await Promise.all([
    prisma.repoFile.findMany({
      where: {
        repositoryId: input.repositoryId,
        ...(input.fileId
          ? { id: input.fileId }
          : tokenPathFilter(tokens, wantsOverview && tokens.length === 0)),
      },
      select: { id: true, path: true, loc: true, complexity: true, language: true },
      take: input.fileId ? 1 : 8,
      orderBy: { path: 'asc' },
    }),
    prisma.codeSymbol.findMany({
      where: {
        file: { repositoryId: input.repositoryId },
        ...(input.symbolId
          ? { id: input.symbolId }
          : tokenSymbolFilter(tokens, wantsOverview && tokens.length === 0)),
      },
      select: {
        id: true,
        name: true,
        qualifiedName: true,
        kind: true,
        fileId: true,
        file: { select: { path: true } },
      },
      take: input.symbolId ? 1 : 8,
      orderBy: { qualifiedName: 'asc' },
    }),
    prisma.commit.findMany({
      where: {
        repositoryId: input.repositoryId,
        ...tokenMessageFilter(tokens, wantsOverview || input.intent === 'who_introduced' || input.intent === 'when_changed'),
      },
      select: { id: true, sha: true, message: true, authorName: true, committedAt: true },
      orderBy: { committedAt: input.intent === 'who_introduced' ? 'asc' : 'desc' },
      take: wantsOverview ? 6 : 8,
    }),
    prisma.riskScore.findMany({
      where: { repositoryId: input.repositoryId, subjectType: 'FILE' },
      select: { subjectId: true, score: true, level: true },
      orderBy: { score: 'desc' },
      take: 6,
    }),
  ]);

  if (files.length === 0 && !input.fileId && (tokens.length === 0 || wantsOverview)) {
    const hot = await prisma.repoFile.findMany({
      where: { repositoryId: input.repositoryId },
      select: { id: true, path: true, loc: true, complexity: true, language: true },
      orderBy: { path: 'asc' },
      take: 6,
    });
    files.push(...hot);
  }

  if (wantsOverview) {
    facts.push(...(await collectRepositoryOverview(prisma, input.repositoryId)));
  }

  for (const file of files) {
    facts.push({
      sourceType: 'FILE',
      sourceId: file.id,
      citation: file.path.split('/').pop() || file.path,
      excerpt: `${file.path} · ${file.language ?? 'unknown language'} · ${file.loc ?? 0} lines · complexity ${file.complexity ?? 0}`,
      relevance: fileRelevance(file.path, tokens, input.fileId === file.id),
      fileId: file.id,
      path: file.path,
    });
  }
  for (const symbol of symbols) {
    facts.push({
      sourceType: 'SYMBOL',
      sourceId: symbol.id,
      citation: symbol.qualifiedName || symbol.name,
      excerpt: `${symbol.kind.toLowerCase()} in ${symbol.file.path}`,
      relevance: input.symbolId === symbol.id ? 0.96 : 0.78,
      fileId: symbol.fileId,
      symbolId: symbol.id,
      path: symbol.file.path,
    });
  }
  for (const commit of commits) {
    facts.push({
      sourceType: 'COMMIT',
      sourceId: commit.id,
      citation: commit.sha.slice(0, 7),
      excerpt: `${commit.message.split('\n')[0]} · author ${commit.authorName} · ${commit.committedAt.toISOString().slice(0, 10)}`,
      relevance: input.intent === 'who_introduced' || input.intent === 'when_changed' ? 0.84 : wantsOverview ? 0.6 : 0.55,
      commitSha: commit.sha,
    });
  }

  const subjectIds = [
    ...files.map((file) => file.id),
    ...symbols.map((symbol) => symbol.id),
  ];
  if (subjectIds.length > 0) {
    const evidence = await prisma.evidence.findMany({
      where: { repositoryId: input.repositoryId, subjectId: { in: subjectIds } },
      include: {
        commit: { select: { sha: true, message: true, authorName: true, committedAt: true } },
      },
      orderBy: { confidence: 'desc' },
      take: 12,
    });
    evidence.sort((left, right) => evidenceMethodRank(right.method) - evidenceMethodRank(left.method));
    for (const row of evidence.slice(0, 10)) {
      const authored = row.commit
        ? `author ${row.commit.authorName} · ${row.commit.message.split('\n')[0]} · ${row.commit.committedAt.toISOString().slice(0, 10)}`
        : 'linked commit';
      facts.push({
        sourceType: 'EVIDENCE',
        sourceId: row.id,
        citation: row.commit?.sha.slice(0, 7) || row.method,
        excerpt: `${row.method.replaceAll('_', ' ').toLowerCase()} · ${authored} · confidence ${row.confidence}`,
        relevance: Math.min(0.94, 0.48 + row.confidence / 2 + evidenceMethodRank(row.method) * 0.04),
        fileId: row.fileId,
        symbolId: row.symbolId,
        commitSha: row.commit?.sha ?? null,
      });
    }
  }

  if (input.intent === 'risk' || wantsOverview) {
    const riskFiles = await prisma.repoFile.findMany({
      where: { repositoryId: input.repositoryId, id: { in: risks.map((risk) => risk.subjectId) } },
      select: { id: true, path: true },
    });
    const paths = new Map(riskFiles.map((file) => [file.id, file.path]));
    for (const risk of risks) {
      facts.push({
        sourceType: 'RISK',
        sourceId: risk.subjectId,
        citation: paths.get(risk.subjectId)?.split('/').pop() || risk.subjectId,
        excerpt: `Risk ${risk.level.toLowerCase()} · score ${Math.round(risk.score)}`,
        relevance: 0.7,
        fileId: risk.subjectId,
        path: paths.get(risk.subjectId) ?? null,
      });
    }
  }

  const originFileId = input.fileId || files[0]?.id;
  if (originFileId && (input.intent === 'depends_on' || input.intent === 'impact' || wantsOverview)) {
    const edges = await prisma.graphEdge.findMany({
      where: { repositoryId: input.repositoryId, type: 'DEPENDS_ON', sourceType: 'FILE', targetType: 'FILE' },
      select: { sourceId: true, targetId: true },
      take: 800,
    });
    const links = edges
      .filter((edge): edge is { sourceId: string; targetId: string } => Boolean(edge.targetId))
      .map((edge) => ({ from: edge.sourceId, to: edge.targetId }));
    const consumers = walkNeighbors(links, originFileId, 'in', 2);
    const dependencies = walkNeighbors(links, originFileId, 'out', 2);
    const neighborIds = [...consumers, ...dependencies].map((hop) => hop.id);
    if (neighborIds.length > 0) {
      const neighbors = await prisma.repoFile.findMany({
        where: { repositoryId: input.repositoryId, id: { in: neighborIds } },
        select: { id: true, path: true },
      });
      const hops = new Map<string, string>([
        ...consumers.map((hop): [string, string] => [hop.id, 'used by']),
        ...dependencies.map((hop): [string, string] => [hop.id, 'depends on']),
      ]);
      for (const neighbor of neighbors) {
        facts.push({
          sourceType: 'GRAPH',
          sourceId: neighbor.id,
          citation: neighbor.path.split('/').pop() || neighbor.path,
          excerpt: `${hops.get(neighbor.id) ?? 'related'} ${neighbor.path}`,
          relevance: 0.74,
          fileId: neighbor.id,
          path: neighbor.path,
        });
      }
    }
  }

  return facts;
}

function tokenPathFilter(tokens: string[], allowUnfiltered = false) {
  if (tokens.length === 0) {
    return allowUnfiltered ? {} : { id: { in: [] } };
  }
  return {
    OR: tokens.map((token) => ({ path: { contains: token, mode: 'insensitive' as const } })),
  };
}

function tokenSymbolFilter(tokens: string[], allowUnfiltered = false) {
  if (tokens.length === 0) {
    return allowUnfiltered ? {} : { id: { in: [] } };
  }
  return {
    OR: tokens.flatMap((token) => [
      { name: { contains: token, mode: 'insensitive' as const } },
      { qualifiedName: { contains: token, mode: 'insensitive' as const } },
    ]),
  };
}

function tokenMessageFilter(tokens: string[], allowUnfiltered: boolean) {
  if (tokens.length === 0) {
    return allowUnfiltered ? {} : { id: { in: [] } };
  }
  return {
    OR: tokens.map((token) => ({ message: { contains: token, mode: 'insensitive' as const } })),
  };
}

function fileRelevance(path: string, tokens: string[], pinned: boolean): number {
  if (pinned) {
    return 0.95;
  }
  const lower = path.toLowerCase();
  if (tokens.some((token) => token.includes('.') && lower.includes(token))) {
    return 0.92;
  }
  if (tokens.some((token) => lower.includes(token))) {
    return 0.84;
  }
  return 0.45;
}

function evidenceMethodRank(method: string): number {
  if (method === 'FILE_ADDED') {
    return 4;
  }
  if (method === 'FILE_RENAMED') {
    return 3;
  }
  if (method === 'LINE_OVERLAP') {
    return 2;
  }
  return 1;
}

async function collectRepositoryOverview(
  prisma: PrismaClient,
  repositoryId: string,
): Promise<InvestigationFact[]> {
  const [repository, fileCount, languageRows] = await Promise.all([
    prisma.repository.findUnique({
      where: { id: repositoryId },
      select: { id: true, name: true, url: true, defaultBranch: true, status: true },
    }),
    prisma.repoFile.count({ where: { repositoryId } }),
    prisma.repoFile.groupBy({
      by: ['language'],
      where: { repositoryId, language: { not: null } },
      _count: { _all: true },
    }),
  ]);
  if (!repository) {
    return [];
  }
  const languages = languageRows
    .filter((row) => row.language)
    .sort((left, right) => right._count._all - left._count._all)
    .slice(0, 6)
    .map((row) => `${row.language} (${row._count._all})`)
    .join(', ');
  return [
    {
      sourceType: 'REPO',
      sourceId: repository.id,
      citation: repository.name,
      excerpt: `${repository.name} · branch ${repository.defaultBranch ?? 'unknown'} · ${fileCount} indexed files · languages ${languages || 'unknown'} · status ${repository.status.toLowerCase()}`,
      relevance: 0.97,
    },
  ];
}
