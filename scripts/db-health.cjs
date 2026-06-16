const path = require("node:path");
const {
  MAIN_TABLES,
  assertDevelopmentDatabasePath,
  collectDatabaseSnapshot,
  loadEnvFilesWithoutOverride,
  resolveSqliteFileFromDatabaseUrl,
} = require("./lib/database-safety.cjs");

loadEnvFilesWithoutOverride();

const { PrismaClient } = require("@prisma/client");

async function main() {
  const databasePath = assertDevelopmentDatabasePath(resolveSqliteFileFromDatabaseUrl(process.env.DATABASE_URL));
  const prisma = new PrismaClient();

  try {
    const snapshot = await collectDatabaseSnapshot(prisma, databasePath, {
      logicalName: "development",
      tables: MAIN_TABLES,
    });

    console.log("Database health check: ok");
    console.log("Database mode: development read-only health check");
    console.log(`Database file: ${path.basename(databasePath)}`);
    console.log(`Integrity check: ${snapshot.integrityCheck}`);
    console.log("Table counts:");
    for (const table of MAIN_TABLES) {
      console.log(`  ${table}: ${snapshot.tableCounts[table]}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Database health check failed:");
  console.error(error.message);
  process.exit(1);
});
