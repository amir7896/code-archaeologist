import { spawn } from 'node:child_process';
import { access, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  applyNumstat,
  classifyCloneFailure,
  parseCommitLog,
  parseNameStatusLog,
  parseNumstatLog,
  sanitizeGitError,
  type GitCloneRequest,
  type GitCommitChange,
  type GitCredential,
  type GitHistoryPage,
  type GitHistoryQuery,
  type GitProvider,
  type GitBranchSummary,
  type GitTreeEntry,
} from '@code-archaeologist/git';

const DEFAULT_TIMEOUT_MS = 10 * 60_000;
const COMMIT_FORMAT = `%x1e%H%x1f%an%x1f%ae%x1f%aI%x1f%cI%x1f%P%x1f%B`;

export class GitCliProvider implements GitProvider {
  constructor(private readonly timeoutMs = DEFAULT_TIMEOUT_MS) {}

  async ensureMirror(request: GitCloneRequest): Promise<void> {
    if (await isGitDir(request.destination)) {
      await this.fetch(request.destination, request.credential);
      return;
    }
    await rm(request.destination, { recursive: true, force: true });
    await mkdir(dirname(request.destination), { recursive: true });
    await this.run(['clone', '--bare', '--no-tags', '--', request.url, request.destination], {
      env: gitAuthEnv(request.credential),
    });
  }

  async fetch(repositoryPath: string, credential?: GitCredential): Promise<void> {
    await this.run(['fetch', '--prune', '--no-tags', 'origin', '+refs/heads/*:refs/heads/*'], {
      cwd: repositoryPath,
      env: gitAuthEnv(credential),
    });
  }

  async detectDefaultBranch(repositoryPath: string): Promise<string> {
    try {
      const head = await this.run(['symbolic-ref', '--short', 'HEAD'], { cwd: repositoryPath });
      return head.replace(/^refs\/heads\//, '') || 'main';
    } catch {
      try {
        const remoteHead = await this.run(['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], {
          cwd: repositoryPath,
        });
        return remoteHead.replace(/^origin\//, '') || 'main';
      } catch {
        return 'main';
      }
    }
  }

  async resolveRevision(repositoryPath: string, revision?: string): Promise<string> {
    return this.run(['rev-parse', revision?.trim() || 'HEAD'], { cwd: repositoryPath });
  }

  async listBranches(repositoryPath: string): Promise<GitBranchSummary[]> {
    const defaultBranch = await this.detectDefaultBranch(repositoryPath);
    let raw = '';
    try {
      raw = await this.run(['for-each-ref', '--format=%(refname:short)%00%(objectname)', 'refs/heads'], {
        cwd: repositoryPath,
      });
    } catch {
      raw = '';
    }
    let rows = parseBranchRefs(raw);
    if (rows.length === 0) {
      try {
        const remotes = await this.run(
          ['for-each-ref', '--format=%(refname:short)%00%(objectname)', 'refs/remotes/origin'],
          { cwd: repositoryPath },
        );
        rows = parseBranchRefs(remotes)
          .map((row) => ({ ...row, name: row.name.replace(/^origin\//, '') }))
          .filter((row) => row.name && row.name !== 'HEAD');
      } catch {
        rows = [];
      }
    }
    return rows.map((row) => ({
      ...row,
      isDefault: row.name === defaultBranch,
    }));
  }

  async isAncestor(repositoryPath: string, maybeAncestor: string, revision: string): Promise<boolean> {
    try {
      await this.run(['merge-base', '--is-ancestor', maybeAncestor, revision], {
        cwd: repositoryPath,
      });
      return true;
    } catch {
      return false;
    }
  }

  async listHistory(repositoryPath: string, query: GitHistoryQuery): Promise<GitHistoryPage> {
    const range = query.sinceSha ? `${query.sinceSha}..${query.revision}` : query.revision;
    const limit = ['--max-count', String(query.maxCount)];
    const commits = parseCommitLog(
      await this.run(['log', `--format=${COMMIT_FORMAT}`, ...limit, range], { cwd: repositoryPath }),
    );
    const nameStatus = parseNameStatusLog(
      await this.run(['log', '--name-status', '-M', '-C', `--format=${RECORD_SHA}`, ...limit, range], {
        cwd: repositoryPath,
      }),
    );
    const numstat = parseNumstatLog(
      await this.run(['log', '--numstat', '-M', '-C', `--format=${RECORD_SHA}`, ...limit, range], {
        cwd: repositoryPath,
      }),
    );
    const changes = applyNumstat(nameStatus, numstat);
    for (const commit of commits) {
      if (commit.parentShas.length > 1 && (changes[commit.sha]?.length ?? 0) === 0) {
        changes[commit.sha] = await this.listCommitChanges(repositoryPath, commit.sha);
      }
    }
    return { commits, changes };
  }

  async listCommitChanges(repositoryPath: string, sha: string): Promise<GitCommitChange[]> {
    const parents = (await this.run(['rev-list', '--parents', '-n', '1', sha], { cwd: repositoryPath }))
      .split(/\s+/)
      .slice(1);
    const args = ['diff-tree', '--no-commit-id', '-r', '-M', '-C'];
    if (parents.length === 0) {
      args.push('--root');
    }
    if (parents.length > 1) {
      args.push('--first-parent');
    }
    const nameStatus = parseNameStatusLog(`${RECORD_VALUE}${sha}\n${await this.run([...args, '--name-status', sha], { cwd: repositoryPath })}`);
    const numstat = parseNumstatLog(
      `${RECORD_VALUE}${sha}\n${await this.run([...args, '--numstat', sha], { cwd: repositoryPath })}`,
    );
    return applyNumstat(nameStatus, numstat)[sha] ?? [];
  }

  async listTree(repositoryPath: string, revision: string): Promise<GitTreeEntry[]> {
    const raw = await this.run(['ls-tree', '-r', '--long', revision], { cwd: repositoryPath });
    return parseLsTree(raw);
  }

  async readBlob(repositoryPath: string, revision: string, path: string): Promise<string> {
    return this.run(['show', `${revision}:${path}`], { cwd: repositoryPath });
  }

  private run(
    args: string[],
    options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn('git', args, {
        cwd: options.cwd,
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: '0',
          ...options.env,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error('Git command timed out'));
      }, this.timeoutMs);

      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString('utf8');
      });
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8');
      });
      child.on('error', (error: Error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.on('close', (code: number | null) => {
        clearTimeout(timer);
        if (code === 0) {
          resolve(stdout.trim());
          return;
        }
        const detail = sanitizeGitError(stderr || stdout || `git ${args[0]} failed`);
        reject(new Error(args[0] === 'clone' ? classifyCloneFailure(detail) : detail));
      });
    });
  }
}

const RECORD_SHA = '%x1e%H';
const RECORD_VALUE = '\x1e';

export function parseLsTree(raw: string): GitTreeEntry[] {
  const rows: GitTreeEntry[] = [];
  for (const line of raw.split('\n')) {
    if (!line) {
      continue;
    }
    const tab = line.indexOf('\t');
    if (tab < 0) {
      continue;
    }
    const meta = line.slice(0, tab).trim().split(/\s+/);
    const path = line.slice(tab + 1);
    if (meta[1] !== 'blob' || !path) {
      continue;
    }
    rows.push({
      path,
      hash: meta[2] ?? '',
      size: Number.parseInt(meta[3] ?? '0', 10) || 0,
    });
  }
  return rows;
}

function parseBranchRefs(raw: string): Array<{ name: string; sha: string }> {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, sha] = line.split('\0');
      return { name: name?.trim() ?? '', sha: sha?.trim() ?? '' };
    })
    .filter((row) => row.name && row.sha);
}

async function isGitDir(path: string): Promise<boolean> {
  try {
    await access(join(path, 'HEAD'));
    return true;
  } catch {
    return false;
  }
}

function gitAuthEnv(credential?: GitCredential): NodeJS.ProcessEnv {
  if (!credential?.secret) {
    return {};
  }
  const basic = Buffer.from(`${credential.username || 'x-access-token'}:${credential.secret}`).toString(
    'base64',
  );
  return {
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'http.extraHeader',
    GIT_CONFIG_VALUE_0: `Authorization: Basic ${basic}`,
  };
}
