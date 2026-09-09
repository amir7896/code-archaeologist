import { describe, expect, it } from 'vitest';
import { formatActivity, formatRole, formatStatus, formatWhen } from './format';

describe('format', () => {
  it('uses product labels for roles and status', () => {
    expect(formatRole('OWNER')).toBe('Owner');
    expect(formatStatus('ARCHIVED')).toBe('Archived');
  });

  it('uses readable activity copy instead of raw action codes', () => {
    expect(formatActivity('MEMBER_INVITE')).toBe('Added a member');
    expect(formatActivity('AUTH_REGISTER')).toBe('Started the workspace');
    expect(formatActivity('WORKSPACE_ARCHIVED')).toBe('Archived the workspace');
  });

  it('returns an empty string for invalid dates', () => {
    expect(formatWhen('not-a-date')).toBe('');
  });
});
