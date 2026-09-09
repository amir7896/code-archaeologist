import type { FileChangeTypeName, GitCommitChange, GitCommitSummary } from './types';

const RECORD = '\x1e';
const FIELD = '\x1f';

export function parseCommitLog(output: string): GitCommitSummary[] {
  return output
    .split(RECORD)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const [sha, authorName, authorEmail, authoredAt, committedAt, parents, ...messageParts] =
        block.split(FIELD);
      return {
        sha: sha?.trim() ?? '',
        authorName: authorName?.trim() || 'Unknown',
        authorEmail: authorEmail?.trim() || '',
        authoredAt: authoredAt?.trim() || committedAt?.trim() || new Date(0).toISOString(),
        committedAt: committedAt?.trim() || authoredAt?.trim() || new Date(0).toISOString(),
        parentShas: (parents ?? '').trim().split(/\s+/).filter(Boolean),
        message: messageParts.join(FIELD).replace(/^\n/, '').trimEnd(),
      };
    })
    .filter((commit) => commit.sha.length > 0);
}

export function parseNameStatusLog(output: string): Record<string, GitCommitChange[]> {
  const changes: Record<string, GitCommitChange[]> = {};
  for (const block of output.split(RECORD)) {
    const lines = block.split('\n').map((line) => line.trimEnd()).filter((line) => line.length > 0);
    if (lines.length === 0) {
      continue;
    }
    const sha = lines[0].trim();
    if (!sha) {
      continue;
    }
    changes[sha] = lines.slice(1).flatMap((line) => parseNameStatusLine(line) ?? []);
  }
  return changes;
}

export function parseNumstatLog(output: string): Record<string, Record<string, { additions: number; deletions: number }>> {
  const stats: Record<string, Record<string, { additions: number; deletions: number }>> = {};
  for (const block of output.split(RECORD)) {
    const lines = block.split('\n').map((line) => line.trimEnd()).filter((line) => line.length > 0);
    if (lines.length === 0) {
      continue;
    }
    const sha = lines[0].trim();
    if (!sha) {
      continue;
    }
    const byPath: Record<string, { additions: number; deletions: number }> = {};
    for (const line of lines.slice(1)) {
      const parsed = parseNumstatLine(line);
      if (parsed) {
        byPath[parsed.path] = { additions: parsed.additions, deletions: parsed.deletions };
      }
    }
    stats[sha] = byPath;
  }
  return stats;
}

export function applyNumstat(
  changes: Record<string, GitCommitChange[]>,
  stats: Record<string, Record<string, { additions: number; deletions: number }>>,
): Record<string, GitCommitChange[]> {
  const next: Record<string, GitCommitChange[]> = {};
  for (const [sha, rows] of Object.entries(changes)) {
    const byPath = stats[sha] ?? {};
    next[sha] = rows.map((row) => {
      const match =
        byPath[row.newPath] ??
        (row.oldPath ? byPath[row.oldPath] : undefined) ??
        byPath[`${row.oldPath} => ${row.newPath}`];
      return match ? { ...row, additions: match.additions, deletions: match.deletions } : row;
    });
  }
  return next;
}

export function parseNameStatusLine(line: string): GitCommitChange | null {
  const parts = line.split('\t');
  const code = parts[0]?.trim() ?? '';
  if (!code) {
    return null;
  }
  if (code.startsWith('R') && parts[1] && parts[2]) {
    return {
      changeType: 'RENAMED',
      oldPath: parts[1],
      newPath: parts[2],
      additions: 0,
      deletions: 0,
      similarity: parseSimilarity(code.slice(1)),
    };
  }
  if (code.startsWith('C') && parts[1] && parts[2]) {
    return {
      changeType: 'COPIED',
      oldPath: parts[1],
      newPath: parts[2],
      additions: 0,
      deletions: 0,
      similarity: parseSimilarity(code.slice(1)),
    };
  }
  const path = parts[1];
  if (!path) {
    return null;
  }
  const changeType = statusToChangeType(code[0] ?? code);
  if (!changeType) {
    return null;
  }
  return {
    changeType,
    oldPath: changeType === 'DELETED' ? path : null,
    newPath: path,
    additions: 0,
    deletions: 0,
    similarity: null,
  };
}

export function parseNumstatLine(
  line: string,
): { path: string; additions: number; deletions: number } | null {
  const match = /^([0-9-]+)\t([0-9-]+)\t(.+)$/.exec(line);
  if (!match) {
    return null;
  }
  const additions = match[1] === '-' ? 0 : Number.parseInt(match[1], 10);
  const deletions = match[2] === '-' ? 0 : Number.parseInt(match[2], 10);
  let path = match[3];
  const rename = / => /.exec(path);
  if (rename && rename.index !== undefined) {
    path = path.slice(rename.index + 4).replace(/^\{|\}$/g, '').trim();
    const nested = /\{(.+) => (.+)\}/.exec(match[3]);
    if (nested) {
      path = match[3].replace(/\{.+ => (.+)\}/, '$1');
    } else {
      path = match[3].slice(rename.index + 4).trim();
    }
  }
  return {
    path,
    additions: Number.isFinite(additions) ? additions : 0,
    deletions: Number.isFinite(deletions) ? deletions : 0,
  };
}

function statusToChangeType(code: string): FileChangeTypeName | null {
  switch (code) {
    case 'A':
      return 'ADDED';
    case 'M':
    case 'T':
      return 'MODIFIED';
    case 'D':
      return 'DELETED';
    default:
      return null;
  }
}

function parseSimilarity(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}
