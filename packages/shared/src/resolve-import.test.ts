import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileLinksFromImports, resolveImportPath } from './resolve-import';

const known = new Set([
  'app/services/cart_service.py',
  'app/models/cart.py',
  'app/api/v1/endpoints/cart.py',
  'app/core/exceptions.py',
  'app/__init__.py',
  'src/auth/login.ts',
  'src/db/client.ts',
]);

test('resolves Python dotted imports onto indexed files', () => {
  assert.equal(
    resolveImportPath('app.models.cart', 'app/services/cart_service.py', known),
    'app/models/cart.py',
  );
  assert.equal(
    resolveImportPath('app.core.exceptions', 'app/services/cart_service.py', known),
    'app/core/exceptions.py',
  );
  assert.equal(resolveImportPath('app', 'app/services/cart_service.py', known), 'app/__init__.py');
});

test('leaves stdlib and third-party imports unresolved', () => {
  assert.equal(resolveImportPath('uuid', 'app/services/cart_service.py', known), null);
  assert.equal(resolveImportPath('decimal', 'app/services/cart_service.py', known), null);
  assert.equal(resolveImportPath('sqlalchemy', 'app/services/cart_service.py', known), null);
});

test('resolves relative TypeScript imports', () => {
  assert.equal(resolveImportPath('../db/client', 'src/auth/login.ts', known), 'src/db/client.ts');
  assert.equal(resolveImportPath('./login', 'src/auth/session.ts', known), 'src/auth/login.ts');
});

test('fileLinksFromImports turns resolved imports into file edges', () => {
  const links = fileLinksFromImports({
    files: [
      { id: 'svc', path: 'app/services/cart_service.py' },
      { id: 'http', path: 'app/api/v1/endpoints/cart.py' },
      { id: 'model', path: 'app/models/cart.py' },
    ],
    symbols: [
      { id: 'sym-http', fileId: 'http' },
      { id: 'sym-svc', fileId: 'svc' },
    ],
    imports: [
      { sourceId: 'sym-http', targetKey: 'app.services.cart_service', confidence: 0.9 },
      { sourceId: 'sym-svc', targetKey: 'app.models.cart', confidence: 0.9 },
      { sourceId: 'sym-svc', targetKey: 'uuid', confidence: 0.9 },
    ],
  });
  assert.deepEqual(
    links.sort((left, right) => left.from.localeCompare(right.from)),
    [
      { from: 'http', to: 'svc', confidence: 0.9 },
      { from: 'svc', to: 'model', confidence: 0.9 },
    ],
  );
});
