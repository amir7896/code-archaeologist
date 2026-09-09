import { type PrismaClient } from '@code-archaeologist/core';
import { daysSince, moduleKey, scoreRisk } from '@code-archaeologist/shared';
import { collectFileHistoryStats, type FileHistoryStat } from './file-history-stats';

const WRITE_BATCH = 400;

type FileRow = { id: string; path: string; loc: number | null; complexity: number | null };
type SymbolRow = {
  id: string;
  fileId: string;
  qualifiedName: string;
  name: string;
  kind: string;
  astHash: string;
  startLine: number;
  endLine: number;
  loc: number;
  complexity: number;
  nesting: number;
};

export async function indexDna(input: {
  prisma: PrismaClient;
  repositoryId: string;
  revision: string;
  onProgress?: (progress: number) => Promise<void>;
}): Promise<void> {
  const { prisma, repositoryId, revision } = input;
  const current = await prisma.repository.findUnique({
    where: { id: repositoryId },
    select: { lastDnaRevision: true },
  });
  if (current?.lastDnaRevision === revision) {
    await input.onProgress?.(97);
    return;
  }

  await input.onProgress?.(94);
  const [files, symbols, fileEdges, symbolEdges, historyRows, headCommit] = await Promise.all([
    prisma.repoFile.findMany({
      where: { repositoryId },
      select: { id: true, path: true, loc: true, complexity: true },
    }),
    prisma.codeSymbol.findMany({
      where: { file: { repositoryId } },
      select: {
        id: true,
        fileId: true,
        qualifiedName: true,
        name: true,
        kind: true,
        astHash: true,
        startLine: true,
        endLine: true,
        loc: true,
        complexity: true,
        nesting: true,
      },
    }),
    prisma.graphEdge.findMany({
      where: { repositoryId, type: 'DEPENDS_ON', sourceType: 'FILE', targetType: 'FILE' },
      select: { sourceId: true, targetId: true },
    }),
    prisma.graphEdge.findMany({
      where: {
        repositoryId,
        sourceType: 'SYMBOL',
        targetType: 'SYMBOL',
        type: { in: ['IMPORTS', 'CALLS', 'REFERENCES', 'EXTENDS', 'IMPLEMENTS'] },
      },
      select: { sourceId: true, targetId: true },
    }),
    prisma.commitFile.findMany({
      where: { file: { repositoryId } },
      select: {
        fileId: true,
        additions: true,
        deletions: true,
        commit: {
          select: { sha: true, authorName: true, authorEmail: true, committedAt: true },
        },
      },
    }),
    prisma.commit.findUnique({
      where: { repositoryId_sha: { repositoryId, sha: revision } },
      select: { id: true },
    }),
  ]);

  await input.onProgress?.(96);
  const history = collectFileHistoryStats(
    historyRows.map((row) => ({
      fileId: row.fileId,
      additions: row.additions,
      deletions: row.deletions,
      authorName: row.commit.authorName,
      authorEmail: row.commit.authorEmail,
      committedAt: row.commit.committedAt,
      sha: row.commit.sha,
    })),
  );
  const fileFan = countDegree(fileEdges);
  const symbolFan = countDegree(symbolEdges);
  const now = Date.now();

  await writeSymbolVersions(prisma, {
    symbols,
    revision,
    commitId: headCommit?.id ?? null,
  });

  const fileProfiles = files.map((file) =>
    profileFile(file, history.get(file.id), fileFan.get(file.id), now),
  );
  const moduleProfiles = groupModules(fileProfiles);
  const symbolProfiles = symbols
    .filter((symbol) => symbol.kind !== 'MODULE' && symbol.kind !== 'VARIABLE')
    .map((symbol) => {
      const file = fileProfiles.find((item) => item.id === symbol.fileId);
      const fan = symbolFan.get(symbol.id) ?? { in: 0, out: 0 };
      return profileSymbol(symbol, file, fan, now);
    });

  await prisma.riskScore.deleteMany({ where: { repositoryId } });
  await prisma.metricsSnapshot.deleteMany({ where: { repositoryId } });

  const risks = [...fileProfiles, ...moduleProfiles, ...symbolProfiles].map((profile) => ({
    repositoryId,
    subjectType: profile.subjectType,
    subjectId: profile.id,
    revision,
    score: profile.risk.score,
    level: profile.risk.level,
    factors: profile.risk.factors,
    evidenceConfidence: profile.risk.evidenceConfidence,
  }));
  const snapshots = [
    {
      repositoryId,
      revision,
      scope: 'REPOSITORY',
      subjectId: repositoryId,
      metrics: {
        fileCount: files.length,
        symbolCount: symbols.length,
        highRiskCount: risks.filter((item) => item.level === 'HIGH' || item.level === 'CRITICAL').length,
      },
    },
    ...fileProfiles.map((profile) => ({
      repositoryId,
      revision,
      scope: 'FILE',
      subjectId: profile.id,
      metrics: profile.metrics,
    })),
    ...moduleProfiles.map((profile) => ({
      repositoryId,
      revision,
      scope: 'MODULE',
      subjectId: profile.id,
      metrics: profile.metrics,
    })),
  ];

  for (let offset = 0; offset < risks.length; offset += WRITE_BATCH) {
    await prisma.riskScore.createMany({ data: risks.slice(offset, offset + WRITE_BATCH) });
  }
  for (let offset = 0; offset < snapshots.length; offset += WRITE_BATCH) {
    await prisma.metricsSnapshot.createMany({ data: snapshots.slice(offset, offset + WRITE_BATCH) });
  }

  await prisma.repository.update({
    where: { id: repositoryId },
    data: { lastDnaRevision: revision },
  });
  await input.onProgress?.(97);
}

async function writeSymbolVersions(
  prisma: PrismaClient,
  input: { symbols: SymbolRow[]; revision: string; commitId: string | null },
): Promise<void> {
  if (input.symbols.length === 0) {
    return;
  }
  const fileIds = [...new Set(input.symbols.map((symbol) => symbol.fileId))];
  const previous = await prisma.symbolVersion.findMany({
    where: { fileId: { in: fileIds } },
    orderBy: { createdAt: 'asc' },
    select: { fileId: true, qualifiedName: true, contentHash: true, revision: true },
  });
  const lastHash = new Map<string, { contentHash: string; revision: string }>();
  for (const row of previous) {
    lastHash.set(`${row.fileId}\0${row.qualifiedName}`, { contentHash: row.contentHash, revision: row.revision });
  }
  const already = new Set(
    previous.filter((row) => row.revision === input.revision).map((row) => `${row.fileId}\0${row.qualifiedName}`),
  );

  const drafts = input.symbols.flatMap((symbol) => {
    const key = `${symbol.fileId}\0${symbol.qualifiedName}`;
    if (already.has(key)) {
      return [];
    }
    const prior = lastHash.get(key);
    if (prior?.contentHash === symbol.astHash) {
      return [];
    }
    return [
      {
        fileId: symbol.fileId,
        qualifiedName: symbol.qualifiedName,
        symbolId: symbol.id,
        commitId: input.commitId,
        revision: input.revision,
        contentHash: symbol.astHash,
        startLine: symbol.startLine,
        endLine: symbol.endLine,
        loc: symbol.loc,
        complexity: symbol.complexity,
        nesting: symbol.nesting,
        changeType: prior ? ('MODIFIED' as const) : ('ADDED' as const),
      },
    ];
  });

  for (let offset = 0; offset < drafts.length; offset += WRITE_BATCH) {
    await prisma.symbolVersion.createMany({ data: drafts.slice(offset, offset + WRITE_BATCH) });
  }
}

function countDegree(edges: Array<{ sourceId: string; targetId: string | null }>) {
  const degree = new Map<string, { in: number; out: number }>();
  function bump(id: string, side: 'in' | 'out') {
    const current = degree.get(id) ?? { in: 0, out: 0 };
    current[side] += 1;
    degree.set(id, current);
  }
  for (const edge of edges) {
    bump(edge.sourceId, 'out');
    if (edge.targetId) {
      bump(edge.targetId, 'in');
    }
  }
  return degree;
}

function emptyHistory(fileId: string): FileHistoryStat {
  return {
    fileId,
    changeCount: 0,
    additions: 0,
    deletions: 0,
    authorCount: 0,
    maxAuthorShare: 0,
    authors: [],
    firstCommittedAt: null,
    lastCommittedAt: null,
    firstSha: null,
    lastSha: null,
  };
}

function profileFile(
  file: FileRow,
  history: FileHistoryStat | undefined,
  fan: { in: number; out: number } | undefined,
  now: number,
) {
  const stat = history ?? emptyHistory(file.id);
  const fanIn = fan?.in ?? 0;
  const fanOut = fan?.out ?? 0;
  const complexity = file.complexity ?? 0;
  const risk = scoreRisk({
    fanIn,
    fanOut,
    changeCount: stat.changeCount,
    complexity,
    maxAuthorShare: stat.maxAuthorShare,
    daysSinceChange: daysSince(stat.lastCommittedAt, now),
  });
  return {
    subjectType: 'FILE' as const,
    id: file.id,
    path: file.path,
    risk,
    metrics: {
      loc: file.loc ?? 0,
      complexity,
      fanIn,
      fanOut,
      changeCount: stat.changeCount,
      authorCount: stat.authorCount,
    },
    stat,
    fanIn,
    fanOut,
    complexity,
  };
}

function profileSymbol(
  symbol: SymbolRow,
  file: ReturnType<typeof profileFile> | undefined,
  fan: { in: number; out: number },
  now: number,
) {
  const stat = file?.stat ?? emptyHistory(symbol.fileId);
  const risk = scoreRisk({
    fanIn: fan.in,
    fanOut: fan.out,
    changeCount: stat.changeCount,
    complexity: symbol.complexity,
    maxAuthorShare: stat.maxAuthorShare,
    daysSinceChange: daysSince(stat.lastCommittedAt, now),
  });
  return {
    subjectType: 'SYMBOL' as const,
    id: symbol.id,
    risk,
    metrics: {
      loc: symbol.loc,
      complexity: symbol.complexity,
      fanIn: fan.in,
      fanOut: fan.out,
      changeCount: stat.changeCount,
    },
  };
}

function groupModules(files: ReturnType<typeof profileFile>[]) {
  const modules = new Map<string, ReturnType<typeof profileFile>[]>();
  for (const file of files) {
    const key = moduleKey(file.path);
    const bucket = modules.get(key);
    if (bucket) {
      bucket.push(file);
    } else {
      modules.set(key, [file]);
    }
  }
  return [...modules.entries()].map(([id, members]) => {
    const fanIn = members.reduce((sum, file) => sum + file.fanIn, 0);
    const fanOut = members.reduce((sum, file) => sum + file.fanOut, 0);
    const complexity = members.reduce((sum, file) => sum + file.complexity, 0);
    const changeCount = members.reduce((sum, file) => sum + file.stat.changeCount, 0);
    const lastChanged = members.reduce<Date | null>((latest, file) => {
      const value = file.stat.lastCommittedAt;
      if (!value) {
        return latest;
      }
      return !latest || value > latest ? value : latest;
    }, null);
    const authors = new Map<string, number>();
    for (const file of members) {
      for (const author of file.stat.authors) {
        authors.set(author.email, (authors.get(author.email) ?? 0) + author.commits);
      }
    }
    const authorCommits = [...authors.values()];
    const totalAuthorCommits = authorCommits.reduce((sum, value) => sum + value, 0);
    const maxAuthorShare = totalAuthorCommits === 0 ? 0 : Math.max(...authorCommits) / totalAuthorCommits;
    const risk = scoreRisk({
      fanIn,
      fanOut,
      changeCount,
      complexity,
      maxAuthorShare,
      daysSinceChange: daysSince(lastChanged),
    });
    return {
      subjectType: 'MODULE' as const,
      id,
      risk,
      metrics: {
        fileCount: members.length,
        complexity,
        fanIn,
        fanOut,
        changeCount,
        authorCount: authors.size,
      },
    };
  });
}
