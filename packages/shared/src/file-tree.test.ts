import assert from 'node:assert/strict';
import { test } from 'node:test';
import { listFileTreeChildren, toFileTreeSearchNodes } from './file-tree';

const files = [
  { id: '1', path: 'README.md', language: 'markdown', loc: 12 },
  { id: '2', path: 'app/services/cart_service.py', language: 'python', loc: 40 },
  { id: '3', path: 'app/services/order_service.py', language: 'python', loc: 30 },
  { id: '4', path: 'app/routers/cart.py', language: 'python', loc: 20 },
];

test('lists top-level folders and files', () => {
  const nodes = listFileTreeChildren(files);
  assert.deepEqual(
    nodes.map((node) => `${node.kind}:${node.name}`),
    ['folder:app', 'file:README.md'],
  );
  assert.equal(nodes[0].fileCount, 3);
});

test('lists one folder level at a time', () => {
  const app = listFileTreeChildren(files, 'app');
  assert.deepEqual(
    app.map((node) => `${node.kind}:${node.name}`),
    ['folder:routers', 'folder:services'],
  );
  const services = listFileTreeChildren(files, 'app/services');
  assert.deepEqual(
    services.map((node) => node.name),
    ['cart_service.py', 'order_service.py'],
  );
  assert.equal(services[0].fileId, '2');
});

test('search nodes keep the full path and a short name', () => {
  const nodes = toFileTreeSearchNodes(files.slice(1, 2));
  assert.equal(nodes[0].name, 'cart_service.py');
  assert.equal(nodes[0].path, 'app/services/cart_service.py');
});
