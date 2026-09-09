import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug']).default('info'),
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
  POSTGRES_HOST: z.string().min(1).default('localhost'),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
  POSTGRES_DB: z.string().min(1),
  POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
  REDIS_URL: z.string().min(1).optional(),
  REDIS_HOST: z.string().min(1).default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(2),
  OLLAMA_BASE_URL: z.string().optional().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().optional().default('llama3.1:8b'),
  JWT_ACCESS_SECRET: z.string().min(32).default('local-dev-access-secret-change-me-32'),
  JWT_REFRESH_SECRET: z.string().min(32).default('local-dev-refresh-secret-change-me-32'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(7),
  CREDENTIALS_ENCRYPTION_KEY: z
    .string()
    .min(32)
    .default('local-dev-credentials-secret-change-me-32'),
  REPOSITORY_WORK_DIR: z.string().min(1).optional(),
});

type ParsedEnv = z.infer<typeof envSchema>;

export type AppEnv = ParsedEnv & {
  DATABASE_URL: string;
  REDIS_URL: string;
  REPOSITORY_WORK_DIR: string;
};

function unwrap(value: string): string {
  return value.replace(/^['"]|['"]$/g, '');
}

export function buildDatabaseUrl(source: {
  POSTGRES_HOST: string;
  POSTGRES_USER: string;
  POSTGRES_PASSWORD: string;
  POSTGRES_DB: string;
  POSTGRES_PORT: number;
}): string {
  const user = encodeURIComponent(unwrap(source.POSTGRES_USER));
  const password = encodeURIComponent(unwrap(source.POSTGRES_PASSWORD));
  return `postgresql://${user}:${password}@${source.POSTGRES_HOST}:${source.POSTGRES_PORT}/${source.POSTGRES_DB}?schema=public`;
}

export function buildRedisUrl(source: {
  REDIS_URL?: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
}): string {
  if (source.REDIS_URL && source.REDIS_URL.length > 0) {
    return source.REDIS_URL;
  }
  return `redis://${source.REDIS_HOST}:${source.REDIS_PORT}`;
}

export function defaultRepositoryWorkDir(cwd = process.cwd()): string {
  let dir = cwd;
  for (let i = 0; i < 6; i += 1) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) {
      return join(dir, '.data', 'repositories');
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return join(cwd, '.data', 'repositories');
}

export function validateEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment: ${details}`);
  }

  const env: AppEnv = {
    ...parsed.data,
    POSTGRES_PASSWORD: unwrap(parsed.data.POSTGRES_PASSWORD),
    DATABASE_URL: buildDatabaseUrl(parsed.data),
    REDIS_URL: buildRedisUrl(parsed.data),
    REPOSITORY_WORK_DIR: parsed.data.REPOSITORY_WORK_DIR ?? defaultRepositoryWorkDir(),
  };

  process.env.DATABASE_URL = env.DATABASE_URL;
  process.env.REDIS_URL = env.REDIS_URL;
  return env;
}
