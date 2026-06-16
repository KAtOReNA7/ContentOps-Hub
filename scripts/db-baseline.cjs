const path = require("node:path");
const {
  MAIN_TABLES,
  REPO_ROOT,
  assertDevelopmentDatabasePath,
  collectDatabaseSnapshot,
  loadEnvFilesWithoutOverride,
  resolveSqliteFileFromDatabaseUrl,
  safeJsonWrite,
} = require("./lib/database-safety.cjs");

loadEnvFilesWithoutOverride();

const { PrismaClient } = require("@prisma/client");

async function main() {
  const databasePath = assertDevelopmentDatabasePath(resolveSqliteFileFromDatabaseUrl(process.env.DATABASE_URL));
  const prisma = new PrismaClient();
  const timestamp = timestampForFile();
  const outputPath = path.join(REPO_ROOT, "backups", "baselines", `${timestamp}.json`);

  try {
    const snapshot = await collectDatabaseSnapshot(prisma, databasePath, {
      logicalName: "development",
      tables: MAIN_TABLES,
    });
    safeJsonWrite(outputPath, snapshot);

    console.log("Database baseline created.");
    console.log(`Output: backups/baselines/${timestamp}.json`);
    console.log(`Database file: ${snapshot.databaseFileName}`);
    console.log(`Integrity check: ${snapshot.integrityCheck}`);
    console.log(`SHA-256: ${snapshot.sha256}`);
    console.log(`Work count: ${snapshot.tableCounts.Work}`);
  } finally {
    await prisma.$disconnect();
  }
}

function timestampForFile() {
  return new Date().toISOString().replace(/[:.]/gu, "-");
}

main().catch((error) => {
  console.error("Database baseline failed:");
  console.error(error.message);
  process.exit(1);
});
