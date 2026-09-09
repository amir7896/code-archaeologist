import { classifyCloneFailure, parseHttpsGitUrl, sanitizeGitError } from '@code-archaeologist/git';

describe('parseHttpsGitUrl', () => {
  it('accepts a public GitHub URL', () => {
    const parsed = parseHttpsGitUrl('https://github.com/acme/platform.git');
    expect(parsed.provider).toBe('GITHUB');
    expect(parsed.name).toBe('platform');
    expect(parsed.url).toBe('https://github.com/acme/platform.git');
  });

  it('rejects credentials in the URL', () => {
    expect(() => parseHttpsGitUrl('https://user:token@github.com/acme/platform.git')).toThrow(
      /access token separately/,
    );
  });

  it('rejects SSH URLs', () => {
    expect(() => parseHttpsGitUrl('git@github.com:acme/platform.git')).toThrow(/valid HTTPS/);
  });
});

describe('git error sanitization', () => {
  it('strips embedded credentials', () => {
    const cleaned = sanitizeGitError('fatal: https://octocat:ghp_secret@github.com/acme/platform.git');
    expect(cleaned.includes('ghp_secret')).toBe(false);
    expect(cleaned.includes('***')).toBe(true);
  });

  it('maps auth failures', () => {
    expect(classifyCloneFailure('Authentication failed')).toMatch(/access token/);
  });
});
