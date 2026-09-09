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
    expect(formatChange('RENAMED')).toBe('Renamed');
    expect(commitSubject('Add login\n\nDetails')).toBe('Add login');
    expect(formatDiffstat(4, 1)).toBe('+4 / −1');
  });

  it('returns an empty string for invalid dates', () => {
    expect(formatWhen('not-a-date')).toBe('');
  });
});
