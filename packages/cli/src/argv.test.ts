import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flagBoolean, flagString, parseArgs } from './argv';

test('parses commands, positionals, and flags', () => {
  const parsed = parseArgs(['ask', 'Why does this module exist?', '--json', '--file', 'src/a.ts']);
  assert.equal(parsed.command, 'ask');
  assert.deepEqual(parsed.positionals, ['Why does this module exist?']);
  assert.equal(flagBoolean(parsed.flags, 'json'), true);
  assert.equal(flagString(parsed.flags, 'file'), 'src/a.ts');
});

test('accepts --flag=value and aliases', () => {
  const parsed = parseArgs(['status', '--api=http://127.0.0.1:3000', '-h']);
  assert.equal(flagString(parsed.flags, 'api'), 'http://127.0.0.1:3000');
  assert.equal(flagBoolean(parsed.flags, 'help'), true);
});
