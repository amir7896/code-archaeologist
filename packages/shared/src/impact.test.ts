import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  classifyFileRole,
  clampImpactDepth,
  groupImpactModules,
  impactPriority,
  walkBlastRadius,
} from './impact';

test('clampImpactDepth stays inside 1–6', () => {
  assert.equal(clampImpactDepth(undefined), 2);
  assert.equal(clampImpactDepth(0), 1);
  assert.equal(clampImpactDepth(9), 6);
  assert.equal(clampImpactDepth(3.8), 3);
});

test('classifyFileRole tags tests and HTTP entry files', () => {
  assert.equal(classifyFileRole('src/auth/login.test.ts'), 'test');
  assert.equal(classifyFileRole('tests/test_users.py'), 'test');
  assert.equal(classifyFileRole('src/users/users.controller.ts'), 'endpoint');
  assert.equal(classifyFileRole('app/routers/items.py'), 'endpoint');
  assert.equal(classifyFileRole('src/auth/login.ts'), 'file');
});

test('walkBlastRadius returns consumers and dependencies with path confidence', () => {
  const walk = walkBlastRadius(
    [
      { from: 'svc', to: 'db', confidence: 0.9 },
      { from: 'http', to: 'svc', confidence: 0.8 },
      { from: 'test', to: 'svc', confidence: 1 },
    ],
    'svc',
    2,
  );
  assert.deepEqual(
    walk.consumers.map((hop) => hop.id),
    ['http', 'test'],
  );
  assert.deepEqual(
    walk.dependencies.map((hop) => hop.id),
    ['db'],
  );
  assert.equal(walk.consumers.find((hop) => hop.id === 'http')?.confidence, 0.8);
  assert.equal(walk.truncated, false);
});

test('walkBlastRadius respects depth and a walk cap', () => {
  const walk = walkBlastRadius(
    [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'c' },
      { from: 'c', to: 'd' },
    ],
    'a',
    2,
  );
  assert.deepEqual(
    walk.dependencies.map((hop) => ({ id: hop.id, depth: hop.depth })),
    [
      { id: 'b', depth: 1 },
      { id: 'c', depth: 2 },
    ],
  );

  const capped = walkBlastRadius(
    [
      { from: 'hub', to: 'a' },
      { from: 'hub', to: 'b' },
      { from: 'hub', to: 'c' },
    ],
    'hub',
    2,
    2,
  );
  assert.equal(capped.dependencies.length, 2);
  assert.equal(capped.truncated, true);
});

test('impactPriority ranks closer high-risk files first', () => {
  assert.ok(impactPriority(1, 40) > impactPriority(2, 80));
  assert.ok(impactPriority(1, 90) > impactPriority(1, 10));
});

test('groupImpactModules counts consumers and dependencies per folder', () => {
  const modules = groupImpactModules([
    { path: 'src/auth/login.ts', direction: 'consumer' },
    { path: 'src/auth/session.ts', direction: 'dependency' },
    { path: 'src/db/client.ts', direction: 'dependency' },
  ]);
  assert.deepEqual(modules[0], {
    id: 'src/auth',
    path: 'src/auth',
    consumerCount: 1,
    dependencyCount: 1,
  });
});
