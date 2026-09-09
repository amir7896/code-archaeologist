import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  GitProviderNotImplementedError,
  classifyCloneFailure,
  sanitizeGitError,
  type GitCloneRequest,
  type GitCommitSummary,
  type GitProvider,
} from '@code-archaeologist/git';

const DEFAULT_TIMEOUT_MS = 5 * 60_000;

export class GitCliProvider implements GitProvider {
  constructor(private readonly timeoutMs = DEFAULT_TIMEOUT_MS) {}

  async clone(request: GitCloneRequest): Promise<void> {
    await rm(request.destination, { recursive: true, force: true });
    await mkdir(dirname(request.destination), { recursive: true });
    const args = ['clone', '--depth', '1', '--no-tags', '--single-branch'];
    if (request.branch) {
      args.push('--branch', request.branch);
    }
    args.push('--', request.url, request.destination);
    await this.run(args, { env: gitAuthEnv(request.credential) });
  }

  async fetch(repositoryPath: string): Promise<void> {
    await this.run(['fetch', '--depth', '1', '--no-tags', 'origin'], { cwd: repositoryPath });
  }

  async detectDefaultBranch(repositoryPath: string): Promise<string> {
    try {
      const remoteHead = await this.run(['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], {
        cwd: repositoryPath,
      });
      return remoteHead.replace(/^origin\//, '') || 'main';
    } catch {
      const current = await this.run(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repositoryPath });
      return current === 'HEAD' ? 'main' : current;
    }
  }

  async resolveRevision(repositoryPath: string, revision?: string): Promise<string> {
    return this.run(['rev-parse', revision?.trim() || 'HEAD'], { cwd: repositoryPath });
  }

  async listCommits(): Promise<GitCommitSummary[]> {
    throw new GitProviderNotImplementedError();
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

function gitAuthEnv(credential?: { username: string; secret: string }): NodeJS.ProcessEnv {
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
