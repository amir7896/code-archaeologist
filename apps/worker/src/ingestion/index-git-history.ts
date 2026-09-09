import { type PrismaClient } from '@code-archaeologist/core';
import {
  detectLanguage,
  normalizeAuthorEmail,
  normalizeAuthorName,
  type GitCommitChange,
  type GitCommitSummary,
  type GitProvider,
} from '@code-archaeologist/git';
import { HISTORY_COMMIT_LIMIT } from '@code-archaeologist/shared';

type HistoryGit = Pick<GitProvider, 'isAncestor' | 'listBranches' | 'listHistory'>;

export async function indexGitHistory(input: {
  prisma: PrismaClient;
  git: HistoryGit;
  gitDir: string;
  repositoryId: string;
  defaultBranch: string;
  currentRevision: string;
  maxCount?: number;
  onProgress?: (progress: number) => Promise<void>;
}): Promise<void> {
  const { prisma, git, gitDir, repositoryId, defaultBranch, currentRevision } = input;
  const maxCount = input.maxCount ?? HISTORY_COMMIT_LIMIT;
  const branches = await git.listBranches(gitDir);
  const known = branches.length
    ? branches
    : [{ name: defaultBranch, sha: currentRevision, isDefault: true }];

  const existingHeads = await prisma.branch.findMany({
    where: { repositoryId },
    select: { name: true, headCommit: { select: { sha: true } } },
  });
  const previousHead = new Map(
    existingHeads.map((row) => [row.name, row.headCommit?.sha ?? null] as const),
  );

  for (const [index, branch] of known.entries()) {
    const prior = previousHead.get(branch.name) ?? null;
    const canIncrement = Boolean(
      prior && (await git.isAncestor(gitDir, prior, branch.sha)),
    );
    const page = await git.listHistory(gitDir, {
      revision: branch.sha,
      sinceSha: canIncrement && prior ? prior : undefined,
      maxCount,
    });
    if (!page.commits.some((commit) => commit.sha === branch.sha)) {
      const head = await git.listHistory(gitDir, { revision: branch.sha, maxCount: 1 });
      page.commits.push(...head.commits.filter((commit) => !page.commits.some((row) => row.sha === commit.sha)));
      Object.assign(page.changes, head.changes);
    }
    await persistHistory(prisma, repositoryId, page.commits, page.changes);
    await persistBranch(prisma, {
      repositoryId,
      name: branch.name,
      sha: branch.sha,
      isDefault: branch.isDefault || branch.name === defaultBranch,
    });
    const links = page.commits.map((commit) => commit.sha);
    if (!links.includes(branch.sha)) {
      links.push(branch.sha);
    }
    await linkBranchCommits(prisma, repositoryId, branch.name, links);
    await input.onProgress?.(70 + Math.floor(((index + 1) / known.length) * 25));
  }

  await prisma.branch.updateMany({
    where: { repositoryId, name: { not: defaultBranch } },
    data: { isDefault: false },
  });
  await prisma.branch.updateMany({
    where: { repositoryId, name: defaultBranch },
    data: { isDefault: true },
  });
  await prisma.repository.update({
    where: { id: repositoryId },
    data: { lastIndexedRevision: currentRevision },
  });
}

async function persistHistory(
  prisma: PrismaClient,
  repositoryId: string,
  commits: GitCommitSummary[],
  changes: Record<string, GitCommitChange[]>,
): Promise<void> {
  const developers = new Map<string, string>();
  for (const commit of commits) {
    const canonicalEmail = normalizeAuthorEmail(commit.authorEmail, commit.authorName);
    const canonicalName = normalizeAuthorName(commit.authorName);
    let developerId = developers.get(canonicalEmail);
    if (!developerId) {
      const developer = await prisma.developer.upsert({
        where: { repositoryId_canonicalEmail: { repositoryId, canonicalEmail } },
        create: { repositoryId, canonicalName, canonicalEmail },
        update: { canonicalName },
      });
      developerId = developer.id;
      developers.set(canonicalEmail, developerId);
    }

    const row = await prisma.commit.upsert({
      where: { repositoryId_sha: { repositoryId, sha: commit.sha } },
      create: {
        repositoryId,
        sha: commit.sha,
        message: commit.message.slice(0, 8000),
        authorName: canonicalName,
        authorEmail: commit.authorEmail.trim() || canonicalEmail,
        authoredAt: new Date(commit.authoredAt),
        committedAt: new Date(commit.committedAt),
        parentShas: commit.parentShas,
        isMerge: commit.parentShas.length > 1,
        developerId,
      },
      update: {
        developerId,
      },
    });

    for (const change of changes[commit.sha] ?? []) {
      const path = change.newPath || change.oldPath;
      if (!path) {
        continue;
      }
      const file = await prisma.repoFile.upsert({
        where: { repositoryId_path: { repositoryId, path } },
        create: {
          repositoryId,
          path,
          language: detectLanguage(path),
          firstRevision: commit.sha,
          lastRevision: commit.sha,
        },
        update: {
          lastRevision: commit.sha,
          language: detectLanguage(path),
        },
      });
      await prisma.commitFile.upsert({
        where: { commitId_fileId: { commitId: row.id, fileId: file.id } },
        create: {
          commitId: row.id,
          fileId: file.id,
          changeType: change.changeType,
          oldPath: change.oldPath,
          newPath: path,
          additions: change.additions,
          deletions: change.deletions,
          similarity: change.similarity,
        },
        update: {
          changeType: change.changeType,
          oldPath: change.oldPath,
          newPath: path,
          additions: change.additions,
          deletions: change.deletions,
          similarity: change.similarity,
        },
      });
    }
  }
}

async function persistBranch(
  prisma: PrismaClient,
  input: { repositoryId: string; name: string; sha: string; isDefault: boolean },
): Promise<void> {
  const head = await prisma.commit.findUnique({
    where: { repositoryId_sha: { repositoryId: input.repositoryId, sha: input.sha } },
    select: { id: true },
  });
  await prisma.branch.upsert({
    where: { repositoryId_name: { repositoryId: input.repositoryId, name: input.name } },
    create: {
      repositoryId: input.repositoryId,
      name: input.name,
      isDefault: input.isDefault,
      headCommitId: head?.id ?? null,
    },
    update: {
      isDefault: input.isDefault,
      headCommitId: head?.id ?? null,
    },
  });
}

async function linkBranchCommits(
  prisma: PrismaClient,
  repositoryId: string,
  branchName: string,
  shas: string[],
): Promise<void> {
  const branch = await prisma.branch.findUnique({
    where: { repositoryId_name: { repositoryId, name: branchName } },
    select: { id: true },
  });
  if (!branch || shas.length === 0) {
    return;
  }
  const commits = await prisma.commit.findMany({
    where: { repositoryId, sha: { in: shas } },
    select: { id: true },
  });
  if (commits.length === 0) {
    return;
  }
  await prisma.branchCommit.createMany({
    data: commits.map((commit) => ({ branchId: branch.id, commitId: commit.id })),
    skipDuplicates: true,
  });
}
