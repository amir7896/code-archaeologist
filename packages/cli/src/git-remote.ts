import { execFileSync } from 'node:child_process';

export function toHttpsGitUrl(remote: string): string | null {
  const trimmed = remote.trim();
  if (!trimmed) {
    return null;
  }
  const ssh = trimmed.match(/^git@([^:]+):(.+)$/);
  if (ssh) {
    const path = ssh[2].replace(/\.git$/i, '');
    return `https://${ssh[1]}/${path}.git`;
  }
  if (/^https:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/+$/, '');
  }
  return null;
}

export function readOriginUrl(
  cwd: string,
  exec: typeof execFileSync = execFileSync,
): string | null {
  try {
    const remote = exec('git', ['remote', 'get-url', 'origin'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return toHttpsGitUrl(remote);
  } catch {
    return null;
  }
}
