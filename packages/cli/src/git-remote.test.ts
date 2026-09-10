import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toHttpsGitUrl } from './git-remote';

test('converts SSH remotes to HTTPS for the API', () => {
  assert.equal(toHttpsGitUrl('git@github.com:org/repo.git'), 'https://github.com/org/repo.git');
  assert.equal(toHttpsGitUrl('https://github.com/org/repo.git'), 'https://github.com/org/repo.git');
  assert.equal(toHttpsGitUrl('ssh://git@github.com/org/repo.git'), null);
});
