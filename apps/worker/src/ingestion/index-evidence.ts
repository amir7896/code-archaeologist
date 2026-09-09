import { type PrismaClient } from '@code-archaeologist/core';
import { type GitProvider } from '@code-archaeologist/git';
import {
  EVIDENCE_HUNK_LIMIT,
  scoreFileCommitLink,
  scoreSymbolCommitLink,
  type LineSpan,
} from '@code-archaeologist/shared';

const WRITE_BATCH = 400;
const SKIP_SYMBOL_KINDS = new Set(['MODULE', 'VARIABLE']);

type EvidenceRow = {
  repositoryId: string;
  kind: 'COMMIT_SYMBOL' | 'FILE_COMMIT';
  method: 'LINE_OVERLAP' | 'FILE_TOUCH' | 'FILE_ADDED' | 'FILE_RENAMED';
  subjectType: 'FILE' | 'SYMBOL';
  subjectId: string;
  sourceType: string;
  sourceId: string;
  commitId: string;
  fileId: string;
  symbolId: string | null;
  confidence: number;
  details: {
    changeType: string;
    path: string;
    overlapLines: number;
    additions: number;
    deletions: number;
  };
};

export async function indexEvidence(input: {
  prisma: PrismaClient;
  git: GitProvider;
  gitDir: string;
  repositoryId: string;
  revision: string;
  onProgress?: (progress: number) => Promise<void>;
}): Promise<void> {
  const { prisma, git, gitDir, repositoryId, revision } = input;
  const current = await prisma.repository.findUnique({
    where: { id: repositoryId },
    select: { lastEvidenceRevision: true },
  });
  if (current?.lastEvidenceRevision === revision) {
    await input.onProgress?.(99);
    return;
  }

  await input.onProgress?.(97);
  const [files, symbols, commitFiles] = await Promise.all([
    prisma.repoFile.findMany({
      where: { repositoryId },
      select: { id: true, path: true },
    }),
    prisma.codeSymbol.findMany({
      where: { file: { repositoryId }, kind: { notIn: ['MODULE', 'VARIABLE'] } },
      select: { id: true, fileId: true, startLine: true, endLine: true, kind: true },
    }),
    prisma.commitFile.findMany({
      where: { file: { repositoryId } },
      select: {
        fileId: true,
        changeType: true,
        newPath: true,
        additions: true,
        deletions: true,
        commit: {
          select: { id: true, sha: true, committedAt: true },
        },
      },
      orderBy: { commit: { committedAt: 'desc' } },
    }),
  ]);

  const symbolsByFile = new Map<string, typeof symbols>();
  for (const symbol of symbols) {
    if (SKIP_SYMBOL_KINDS.has(symbol.kind)) {
      continue;
    }
    const list = symbolsByFile.get(symbol.fileId) ?? [];
    list.push(symbol);
    symbolsByFile.set(symbol.fileId, list);
  }
  const filesById = new Map(files.map((file) => [file.id, file]));
  const hunkCache = new Map<string, LineSpan[]>();
  const hunkCandidates = new Set(
    commitFiles
      .filter((row) => row.changeType !== 'DELETED')
      .slice(0, EVIDENCE_HUNK_LIMIT)
      .map((row) => `${row.commit.sha}:${row.newPath}`),
  );

  const rows: EvidenceRow[] = [];
  for (const row of commitFiles) {
    const file = filesById.get(row.fileId);
    if (!file) {
      continue;
    }
    const fileScore = scoreFileCommitLink(row.changeType);
    rows.push({
      repositoryId,
      kind: 'FILE_COMMIT',
      method: fileScore.method,
      subjectType: 'FILE',
      subjectId: file.id,
      sourceType: 'COMMIT',
      sourceId: row.commit.id,
      commitId: row.commit.id,
      fileId: file.id,
      symbolId: null,
      confidence: fileScore.confidence,
      details: {
        changeType: row.changeType,
        path: file.path,
        overlapLines: 0,
        additions: row.additions,
        deletions: row.deletions,
      },
    });

    if (row.changeType === 'DELETED') {
      continue;
    }
    const fileSymbols = symbolsByFile.get(file.id) ?? [];
    if (fileSymbols.length === 0) {
      continue;
    }
    const hunks = await loadHunks(git, gitDir, hunkCache, hunkCandidates, row.commit.sha, row.newPath);
    for (const symbol of fileSymbols) {
      const link = scoreSymbolCommitLink({
        changeType: row.changeType,
        symbol: { startLine: symbol.startLine, endLine: symbol.endLine },
        hunks,
      });
      rows.push({
        repositoryId,
        kind: 'COMMIT_SYMBOL',
        method: link.method,
        subjectType: 'SYMBOL',
        subjectId: symbol.id,
        sourceType: 'COMMIT',
        sourceId: row.commit.id,
        commitId: row.commit.id,
        fileId: file.id,
        symbolId: symbol.id,
        confidence: link.confidence,
        details: {
          changeType: row.changeType,
          path: file.path,
          overlapLines: link.overlapLines,
          additions: row.additions,
          deletions: row.deletions,
        },
      });
    }
  }

  await prisma.evidence.deleteMany({ where: { repositoryId } });
  for (let offset = 0; offset < rows.length; offset += WRITE_BATCH) {
    await prisma.evidence.createMany({ data: rows.slice(offset, offset + WRITE_BATCH) });
  }
  await prisma.repository.update({
    where: { id: repositoryId },
    data: { lastEvidenceRevision: revision },
  });
  await input.onProgress?.(99);
}

async function loadHunks(
  git: GitProvider,
  gitDir: string,
  cache: Map<string, LineSpan[]>,
  candidates: Set<string>,
  sha: string,
  path: string,
): Promise<LineSpan[]> {
  const key = `${sha}:${path}`;
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }
  if (!candidates.has(key) || !git.listChangedSpans) {
    cache.set(key, []);
    return [];
  }
  try {
    const hunks = await git.listChangedSpans(gitDir, sha, path);
    cache.set(key, hunks);
    return hunks;
  } catch {
    cache.set(key, []);
    return [];
  }
}
