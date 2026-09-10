import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseRepositorySettings, repositorySettingsFromInput } from './repository-settings';

test('defaults both connect options on when settings are empty', () => {
  assert.deepEqual(parseRepositorySettings({}), {
    includePullRequests: true,
    respectGitignore: true,
  });
});

test('preserves explicit false flags', () => {
  assert.deepEqual(
    parseRepositorySettings({ includePullRequests: false, respectGitignore: false }),
    { includePullRequests: false, respectGitignore: false },
  );
});

test('create input defaults match the connect screen', () => {
  assert.deepEqual(repositorySettingsFromInput({}), {
    includePullRequests: true,
    respectGitignore: true,
  });
  assert.deepEqual(
    repositorySettingsFromInput({ includePullRequests: false, respectGitignore: true }),
    { includePullRequests: false, respectGitignore: true },
  );
});
