import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildDatabaseUrl, validateEnv } from './env';

test('validateEnv accepts postgres parts and builds a URL', () => {
  const env = validateEnv({
    POSTGRES_USER: 'codearch',
    POSTGRES_PASSWORD: 'codearch',
    POSTGRES_DB: 'code_archaeologist',
    REDIS_URL: 'redis://localhost:6379',
  });

  assert.equal(env.API_PORT, 3000);
  assert.equal(env.POSTGRES_PORT, 5432);
  assert.equal(
    env.DATABASE_URL,
    'postgresql://codearch:codearch@localhost:5432/code_archaeologist?schema=public',
  );
});

test('validateEnv rejects missing postgres user', () => {
  assert.throws(
    () =>
      validateEnv({
        POSTGRES_PASSWORD: 'codearch',
        POSTGRES_DB: 'code_archaeologist',
        REDIS_URL: 'redis://localhost:6379',
      }),
    /POSTGRES_USER/,
  );
});

test('buildDatabaseUrl encodes special characters in the password', () => {
  const url = buildDatabaseUrl({
    POSTGRES_HOST: 'localhost',
    POSTGRES_USER: 'root',
    POSTGRES_PASSWORD: 'Amir-AS@*7896',
    POSTGRES_DB: 'code_archaeologist',
    POSTGRES_PORT: 5432,
  });

  assert.equal(
    url,
    'postgresql://root:Amir-AS%40%2A7896@localhost:5432/code_archaeologist?schema=public',
  );
});
