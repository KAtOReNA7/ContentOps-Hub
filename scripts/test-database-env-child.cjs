const { loadEnvFilesWithoutOverride } = require("./lib/database-safety.cjs");
const { assertIsolatedTestDatabase } = require("./lib/test-database-child-guard.cjs");

loadEnvFilesWithoutOverride();
assertIsolatedTestDatabase();

const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    const count = await prisma.work.count();
    console.log(`Environment priority child connected to isolated database. Work count: ${count}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
