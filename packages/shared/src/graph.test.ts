import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findCycles, moduleKey, parseModuleGrouping, walkNeighbors } from './graph';

test('moduleKey uses the first folder, or two levels under src/app', () => {
  assert.equal(moduleKey('alembic/env.py'), 'alembic');
  assert.equal(moduleKey('src/auth/login.ts'), 'src/auth');
  assert.equal(moduleKey('app/models/user.py'), 'app/models');
  assert.equal(moduleKey('readme.md'), 'readme.md');
});

test('moduleKey can group at a fixed folder depth', () => {
  assert.equal(moduleKey('src/auth/login.ts', 1), 'src');
  assert.equal(moduleKey('src/auth/login.ts', 2), 'src/auth');
  assert.equal(moduleKey('src/auth/login.ts', 3), 'src/auth/login.ts');
  assert.equal(parseModuleGrouping('2'), 2);
  assert.equal(parseModuleGrouping('auto'), 'auto');
});

test('findCycles returns the A→B→C→A loop and ignores a line', () => {
  const cycles = findCycles([
    { from: 'a', to: 'b' },
    { from: 'b', to: 'c' },
    { from: 'c', to: 'a' },
    { from: 'd', to: 'e' },
  ]);
  assert.deepEqual(cycles, [['a', 'b', 'c']]);
});

test('findCycles treats a self-loop as a cycle', () => {
  assert.deepEqual(findCycles([{ from: 'a', to: 'a' }]), [['a']]);
});

test('walkNeighbors follows outgoing edges up to the depth cap', () => {
  const links = [
    { from: 'a', to: 'b' },
    { from: 'b', to: 'c' },
    { from: 'c', to: 'd' },
  ];
  assert.deepEqual(
    walkNeighbors(links, 'a', 'out', 2),
    [
      { id: 'b', depth: 1 },
      { id: 'c', depth: 2 },
    ],
  );
  assert.deepEqual(walkNeighbors(links, 'c', 'in', 2), [
    { id: 'b', depth: 1 },
    { id: 'a', depth: 2 },
  ]);
});
