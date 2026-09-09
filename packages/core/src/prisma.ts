import { validateEnv } from '@code-archaeologist/shared';
import { Prisma, PrismaClient } from '../generated/client';

export function createPrismaClient(): PrismaClient {
  const env = validateEnv();
  return new PrismaClient({
    datasources: {
      db: { url: env.DATABASE_URL },
    },
  });
}

export async function pingDatabase(client: PrismaClient): Promise<boolean> {
  await client.$queryRaw`SELECT 1`;
  return true;
}

export { Prisma, PrismaClient };
