export type HistoryTouch = {
  fileId: string;
  additions: number;
  deletions: number;
  authorName: string;
  authorEmail: string;
  committedAt: Date;
  sha: string;
};

export type FileAuthor = {
  name: string;
  email: string;
  commits: number;
};

export type FileHistoryStat = {
  fileId: string;
  changeCount: number;
  additions: number;
  deletions: number;
  authorCount: number;
  maxAuthorShare: number;
  authors: FileAuthor[];
  firstCommittedAt: Date | null;
  lastCommittedAt: Date | null;
  firstSha: string | null;
  lastSha: string | null;
};

/** Collapse commit-file rows into per-file churn and ownership. */
export function collectFileHistoryStats(rows: HistoryTouch[]): Map<string, FileHistoryStat> {
  const grouped = new Map<string, HistoryTouch[]>();
  for (const row of rows) {
    const list = grouped.get(row.fileId);
    if (list) {
      list.push(row);
    } else {
      grouped.set(row.fileId, [row]);
    }
  }

  const stats = new Map<string, FileHistoryStat>();
  for (const [fileId, touches] of grouped) {
    const ordered = [...touches].sort((left, right) => left.committedAt.getTime() - right.committedAt.getTime());
    const authors = new Map<string, FileAuthor>();
    let additions = 0;
    let deletions = 0;
    for (const touch of ordered) {
      additions += touch.additions;
      deletions += touch.deletions;
      const key = touch.authorEmail.toLowerCase();
      const current = authors.get(key);
      if (current) {
        current.commits += 1;
      } else {
        authors.set(key, { name: touch.authorName, email: touch.authorEmail, commits: 1 });
      }
    }
    const authorList = [...authors.values()].sort((left, right) => right.commits - left.commits);
    const first = ordered[0];
    const last = ordered[ordered.length - 1];
    stats.set(fileId, {
      fileId,
      changeCount: ordered.length,
      additions,
      deletions,
      authorCount: authorList.length,
      maxAuthorShare: authorList.length === 0 ? 0 : authorList[0].commits / ordered.length,
      authors: authorList,
      firstCommittedAt: first?.committedAt ?? null,
      lastCommittedAt: last?.committedAt ?? null,
      firstSha: first?.sha ?? null,
      lastSha: last?.sha ?? null,
    });
  }
  return stats;
}
