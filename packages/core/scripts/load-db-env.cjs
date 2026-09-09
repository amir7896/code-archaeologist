const { existsSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');

function loadRootEnv() {
  const candidates = [resolve(__dirname, '../../../.env'), resolve(process.cwd(), '../../.env')];
  for (const path of candidates) {
    if (!existsSync(path)) {
      continue;
    }
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
        continue;
      }
      const separator = trimmed.indexOf('=');
      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();
      if (
        (value.startsWith("'") && value.endsWith("'")) ||
        (value.startsWith('"') && value.endsWith('"'))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
    return path;
  }
  return null;
}

function unwrap(value) {
  return String(value).replace(/^['"]|['"]$/g, '');
}

function applyDatabaseUrl(allowGenerateFallback) {
  const host = process.env.POSTGRES_HOST || 'localhost';
  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD;
  const database = process.env.POSTGRES_DB;
  const port = process.env.POSTGRES_PORT || '5432';

  if (!user || !password || !database) {
    if (allowGenerateFallback) {
      process.env.DATABASE_URL =
        'postgresql://codearch:codearch@localhost:5432/code_archaeologist?schema=public';
      return;
    }
    throw new Error(
      'Set POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, and POSTGRES_PORT in the repo-root .env',
    );
  }

  process.env.DATABASE_URL = `postgresql://${encodeURIComponent(unwrap(user))}:${encodeURIComponent(unwrap(password))}@${host}:${port}/${database}?schema=public`;
}

if (!loadRootEnv() && !process.env.POSTGRES_USER) {
  const isGenerate = process.argv.includes('generate');
  if (!isGenerate) {
    throw new Error('Could not find repo-root .env (expected at Code-Archaeologist/.env)');
  }
}
applyDatabaseUrl(process.argv.includes('generate'));
