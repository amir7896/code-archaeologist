import { createHash, randomBytes } from 'node:crypto';

const TTL_UNITS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};

export function hashToken(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function pendingSessionHash(): string {
  return `pending:${randomBytes(16).toString('hex')}`;
}

export function ttlToSeconds(ttl: string, fallback = 900): number {
  const match = /^(\d+)([smhd])$/.exec(ttl.trim());
  if (!match) {
    return fallback;
  }
  return Number(match[1]) * TTL_UNITS[match[2]];
}

export function slugifyName(name: string): string {
  const base =
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'workspace';
  return `${base}-${randomBytes(3).toString('hex')}`;
}
