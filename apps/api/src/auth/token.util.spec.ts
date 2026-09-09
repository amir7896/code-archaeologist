import { hashToken, slugifyName, ttlToSeconds } from './token.util';

describe('token.util', () => {
  it('parses JWT TTL strings', () => {
    expect(ttlToSeconds('15m')).toBe(900);
    expect(ttlToSeconds('7d')).toBe(604800);
    expect(ttlToSeconds('bogus')).toBe(900);
  });

  it('hashes tokens with sha256', () => {
    expect(hashToken('abc')).toHaveLength(64);
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).not.toBe(hashToken('def'));
  });

  it('builds unique slugs from a name', () => {
    const first = slugifyName('Platform Team');
    const second = slugifyName('Platform Team');
    expect(first.startsWith('platform-team-')).toBe(true);
    expect(first).not.toBe(second);
  });
});
