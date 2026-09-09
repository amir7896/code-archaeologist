import { spawn } from 'node:child_process';
import { sanitizeGitError } from '@code-archaeologist/git';

export function readGitBlob(repositoryPath: string, revision: string, path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['show', `${revision}:${path}`], {
      cwd: repositoryPath,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('Git command timed out'));
    }, 30_000);
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
        resolve(stdout);
        return;
      }
      reject(new Error(sanitizeGitError(stderr || stdout || 'Could not read file')));
    });
  });
}
