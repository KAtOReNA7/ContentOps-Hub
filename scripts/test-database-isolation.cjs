const fs = require("node:fs");
const { spawnSync } = require("node:child_process");
const {
  MAIN_TABLES,
  REPO_ROOT,
  cleanupSqliteFiles,
  collectDatabaseSnapshot,
  compareDevelopmentSnapshots,
  databaseUrlForPrismaFile,
  initializeTestDatabaseFromDevelopmentSchema,
  loadEnvFilesWithoutOverride,
  resolveSqliteFileFromDatabaseUrl,
  assertDevelopmentDatabasePath,
} = require("./lib/database-safety.cjs");

const WRITE_TESTS = ["import", "rating", "rating-openai", "title-intro", "batch-recovery"];

async function main() {
  loadEnvFilesWithoutOverride();
  const devDatabasePath = assertDevelopmentDatabasePath(resolveSqliteFileFromDatabaseUrl(process.env.DATABASE_URL));
  const { PrismaClient } = require("@prisma/client");

  const before = await snapshotDevelopment(PrismaClient, devDatabasePath);

  await testEnvironmentPriority();

  const usedDatabases = new Set();
  for (const testName of WRITE_TESTS) {
    const dbFile = expectedDbFileFor(testName);
    assert(!usedDatabases.has(dbFile), `Test database file reused: ${dbFile}`);
    usedDatabases.add(dbFile);
    runExpectedSuccess([process.execPath, "scripts/run-isolated-db-test.cjs", testName], `isolated write test ${testName}`);
    assertTestDatabaseCleaned(dbFile);
  }

  runExpectedFailure([process.execPath, "scripts/run-isolated-db-test.cjs", "intentional-failure"], "intentional isolated failure");
  assertTestDatabaseCleaned("test-intentional-failure.db");

  const after = await snapshotDevelopment(PrismaClient, devDatabasePath);
  const comparison = compareDevelopmentSnapshots(before, after);

  if (!comparison.unchanged) {
    console.error("Development database changed during isolated database tests.");
    console.error(JSON.stringify(comparison, null, 2));
    process.exit(1);
  }

  console.log("Development database unchanged");
  console.log(`Before SHA-256: ${comparison.beforeSha256}`);
  console.log(`After SHA-256: ${comparison.afterSha256}`);
  if (comparison.fileHashChanged || comparison.fileSizeChanged) {
    console.warn("Development database file bytes changed, but protected business table counts and logic digests are unchanged.");
  }
  console.log("Database isolation tests passed.");
}

async function snapshotDevelopment(PrismaClient, databasePath) {
  const prisma = new PrismaClient();
  try {
    return await collectDatabaseSnapshot(prisma, databasePath, {
      logicalName: "development",
      tables: MAIN_TABLES,
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function testEnvironmentPriority() {
  const database = databaseUrlForPrismaFile("test-env-priority.db");
  const env = {
    ...process.env,
    DATABASE_URL: database.databaseUrl,
    NODE_ENV: "test",
    TEST_DATABASE_FILE: database.fileName,
  };

  cleanupSqliteFiles(database.absolutePath);
  try {
    initializeTestDatabaseFromDevelopmentSchema(database.absolutePath);
    runExpectedSuccess([process.execPath, "scripts/test-database-env-child.cjs"], "environment priority child", env);
  } finally {
    cleanupSqliteFiles(database.absolutePath);
  }
}

function expectedDbFileFor(testName) {
  return {
    import: "test-import.db",
    rating: "test-rating.db",
    "rating-openai": "test-rating-openai.db",
    "title-intro": "test-title-intro.db",
    "batch-recovery": "test-batch-recovery.db",
  }[testName];
}

function assertTestDatabaseCleaned(fileName) {
  const database = databaseUrlForPrismaFile(fileName);
  for (const suffix of ["", "-wal", "-shm", "-journal"]) {
    const target = `${database.absolutePath}${suffix}`;
    assert(!fs.existsSync(target), `Isolated database file was not cleaned: ${fileName}${suffix}`);
  }
}

function runExpectedSuccess(commandAndArgs, label, env = process.env) {
  const [command, ...args] = commandAndArgs;
  const result = spawnSync(command, args, {
    cwd: REPO_ROOT,
    env,
    stdio: "inherit",
    shell: process.platform === "win32" && command === "npm",
  });
  if (result.error) throw result.error;
  assert(result.status === 0, `${label} failed with status ${result.status}`);
}

function runExpectedFailure(commandAndArgs, label) {
  const [command, ...args] = commandAndArgs;
  const result = spawnSync(command, args, {
    cwd: REPO_ROOT,
    env: process.env,
    stdio: "inherit",
    shell: false,
  });
  if (result.error) throw result.error;
  assert(result.status !== 0, `${label} unexpectedly succeeded.`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
