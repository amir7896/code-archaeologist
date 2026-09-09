require('../scripts/load-db-env.cjs');

const { PrismaClient } = require('../generated/client');

async function main() {
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
  });
  try {
    await prisma.schemaMeta.upsert({
      where: { id: 'code-archaeologist' },
      create: { id: 'code-archaeologist', phase: '0-foundation' },
      update: { phase: '0-foundation' },
    });
    console.log('Seed complete: schema_meta phase 0-foundation');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
