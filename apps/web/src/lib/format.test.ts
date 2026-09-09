import { describe, expect, it } from 'vitest';
import {
  commitSubject,
  formatActivity,
  formatChange,
  formatDiffstat,
  formatRole,
  formatStatus,
  formatTask,
  formatWhen,
  repositoryHost,
  repositorySummary,
} from './format';

describe('format', () => {
  it('uses product labels for roles and status', () => {
    expect(formatRole('OWNER')).toBe('Owner');
    expect(formatStatus('ARCHIVED')).toBe('Archived');
    expect(formatStatus('SYNCING')).toBe('Syncing');
  });

  it('uses readable activity copy instead of raw action codes', () => {
    expect(formatActivity('MEMBER_INVITE')).toBe('Added a member');
    expect(formatActivity('AUTH_REGISTER')).toBe('Started the workspace');
    expect(formatActivity('WORKSPACE_ARCHIVED')).toBe('Archived the workspace');
    expect(formatActivity('REPOSITORY_CREATE')).toBe('Added a repository');
    expect(formatTask('CLONE')).toBe('Copying the repository');
    expect(formatTask('INDEX_HISTORY')).toBe('Reading commit history');
    expect(formatTask('PARSE_AST')).toBe('Reading source files');
    expect(formatChange('RENAMED')).toBe('Renamed');
    expect(commitSubject('Add login\n\nDetails')).toBe('Add login');
    expect(formatDiffstat(4, 1)).toBe('+4 / −1');
  });

  it('returns an empty string for invalid dates', () => {
    expect(formatWhen('not-a-date')).toBe('');
  });
});

describe('repositorySummary', () => {
  it('shows status, branch, and short revision', () => {
    expect(repositoryHost('https://github.com/amir7896/fastapi-nexus.git')).toBe('github.com');
    expect(
      repositorySummary({
        status: 'READY',
        defaultBranch: 'main',
        currentRevision: '20a7150c8f3b9d4e',
      }),
    ).toBe('Ready · main · 20a7150');
  });
});
